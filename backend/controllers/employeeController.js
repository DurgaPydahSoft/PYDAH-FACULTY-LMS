const { Employee, LeaveRequest } = require('../models');
const CCLWorkRequest = require('../models/CCLWorkRequest');
const asyncHandler = require('express-async-handler');

// Get Employee by ID
const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findOne({ employeeId: req.params.id })
      .select('-password')
      .populate({
        path: 'leaveRequests.alternateSchedule.periods.substituteFaculty',
        select: 'name employeeId'
      });
    
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Get Employee Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update Employee
const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ employeeId: req.params.id });
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // Update fields
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (key !== 'password' && key !== '_id') {
        employee[key] = updates[key];
      }
    });

    await employee.save();
    res.json({ msg: 'Employee updated successfully', employee });
  } catch (error) {
    console.error('Update Employee Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Delete Employee
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ employeeId: req.params.id });
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    await employee.remove();
    res.json({ msg: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete Employee Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Add Leave Request
const addLeaveRequest = async (req, res) => {
  try {
    const {
      leaveType,
      isHalfDay,
      session,
      startDate,
      endDate,
      numberOfDays,
      reason,
      alternateSchedule
    } = req.body;

    // Debug log
    console.log('Received leave request data:', {
      leaveType,
      isHalfDay,
      session,
      startDate,
      endDate,
      numberOfDays,
      alternateSchedule
    });

    // Validate required fields
    if (!leaveType || !startDate || !endDate || !numberOfDays || !reason) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Validate session for half-day leave
    if (isHalfDay && !session) {
      return res.status(400).json({ msg: 'Please select session for half-day leave' });
    }

    // Find employee
    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // Check for existing leave request with same dates and status
    const existingRequest = employee.leaveRequests.find(request => 
      request.startDate === startDate && 
      request.endDate === endDate && 
      request.status === 'Pending'
    );

    if (existingRequest) {
      return res.status(400).json({ 
        msg: 'A pending leave request already exists for these dates' 
      });
    }

    // Create new leave request
    // Generate leaveRequestId (global per leaveType, year, across all departments)
    const currentYear = new Date().getFullYear();
    const department = employee.department;
    // Find the highest sequence number for this type/year across all employees (ignore department)
    const allEmployees = await Employee.find({}, { leaveRequests: 1 });
    let maxSeq = 0;
    allEmployees.forEach(emp => {
      (emp.leaveRequests || []).forEach(lr => {
        if (
          lr.leaveType === leaveType &&
          lr.startDate && lr.startDate.startsWith(currentYear.toString()) &&
          lr.leaveRequestId &&
          lr.leaveRequestId.startsWith(`${leaveType}${currentYear}`)
        ) {
          const seq = parseInt(lr.leaveRequestId.slice(-4));
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      });
    });
    const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
    const leaveRequestId = `${leaveType}${currentYear}${department}${nextSeq}`;

    const newLeaveRequest = {
      leaveRequestId,
      leaveType,
      isHalfDay: isHalfDay || false,
      session: isHalfDay ? session : undefined,
      startDate,
      endDate,
      numberOfDays,
      reason,
      status: 'Pending',
      appliedOn: new Date().toISOString().split('T')[0],
      approvedBy: {
        hod: false,
        principal: false
      }
    };

    // Add alternate schedule if provided
    if (alternateSchedule && Array.isArray(alternateSchedule)) {
      newLeaveRequest.alternateSchedule = alternateSchedule.map(schedule => ({
        date: schedule.date,
        periods: schedule.periods.map(period => ({
          periodNumber: parseInt(period.periodNumber),
          substituteFaculty: period.substituteFaculty,
          assignedClass: period.assignedClass
        }))
      }));
    }

    // Add leave request to employee's leaveRequests array
    employee.leaveRequests.push(newLeaveRequest);

    // Save employee document
    await employee.save();

    // Get the saved leave request with the generated ID
    const savedLeaveRequest = employee.leaveRequests[employee.leaveRequests.length - 1];

    res.status(201).json({
      msg: 'Leave request submitted successfully',
      leaveRequest: savedLeaveRequest
    });
  } catch (error) {
    console.error('Add Leave Request Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Update Leave Request Status
const updateLeaveRequestStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    const leaveRequest = employee.leaveRequests.id(req.params.leaveRequestId);
    if (!leaveRequest) {
      return res.status(404).json({ msg: 'Leave request not found' });
    }

    // Store previous status for balance adjustment
    const previousStatus = leaveRequest.status;

    // Update leave request status
    leaveRequest.status = status;
    if (remarks) {
      leaveRequest.remarks = remarks;
    }

    // Update approval status based on role
    if (req.user.role === 'hod') {
      leaveRequest.approvedBy.hod = true;
      leaveRequest.hodApprovalDate = new Date();
    } else if (req.user.role === 'principal') {
      leaveRequest.approvedBy.principal = true;
      leaveRequest.principalApprovalDate = new Date();
    }

    // Handle balance updates
    if (status === 'Approved' && previousStatus !== 'Approved') {
      // Check balance before approving
      if (leaveRequest.leaveType === 'CL') {
        if (employee.leaveBalance < leaveRequest.numberOfDays) {
          return res.status(400).json({ 
            msg: `Insufficient leave balance. Available: ${employee.leaveBalance} days, Required: ${leaveRequest.numberOfDays} days`
          });
        }
        // Deduct balance only if not previously approved
        employee.leaveBalance -= leaveRequest.numberOfDays;
        // Add to leave history
        employee.leaveHistory = employee.leaveHistory || [];
        employee.leaveHistory.push({
          type: 'used',
          date: new Date(),
          days: leaveRequest.numberOfDays,
          reference: leaveRequest._id,
          referenceModel: 'LeaveRequest',
          remarks: 'Leave approved'
        });
      } else if (leaveRequest.leaveType === 'CCL') {
        // For CCL, ensure we're using the correct number of days (0.5 for half-day)
        const daysToDeduct = leaveRequest.isHalfDay ? 0.5 : leaveRequest.numberOfDays;
        if (employee.cclBalance < daysToDeduct) {
          return res.status(400).json({ 
            msg: `Insufficient CCL balance. Available: ${employee.cclBalance} days, Required: ${daysToDeduct} days`
          });
        }
        employee.cclBalance -= daysToDeduct;
        // Add to CCL history
        employee.cclHistory = employee.cclHistory || [];
        employee.cclHistory.push({
          type: 'used',
          date: new Date(),
          days: daysToDeduct,
          reference: leaveRequest._id,
          referenceModel: 'LeaveRequest',
          remarks: `CCL leave approved${leaveRequest.isHalfDay ? ' (Half-day)' : ''}`
        });
      }
    } else if (status === 'Rejected' && previousStatus === 'Approved') {
      // Restore balance if previously approved
      if (leaveRequest.leaveType === 'CL') {
        employee.leaveBalance += leaveRequest.numberOfDays;
        // Add to leave history
        employee.leaveHistory = employee.leaveHistory || [];
        employee.leaveHistory.push({
          type: 'restored',
          date: new Date(),
          days: leaveRequest.numberOfDays,
          reference: leaveRequest._id,
          referenceModel: 'LeaveRequest',
          remarks: 'Leave rejected after approval'
        });
      } else if (leaveRequest.leaveType === 'CCL') {
        // For CCL, ensure we're using the correct number of days (0.5 for half-day)
        const daysToRestore = leaveRequest.isHalfDay ? 0.5 : leaveRequest.numberOfDays;
        employee.cclBalance += daysToRestore;
        // Add to CCL history
        employee.cclHistory = employee.cclHistory || [];
        employee.cclHistory.push({
          type: 'restored',
          date: new Date(),
          days: daysToRestore,
          reference: leaveRequest._id,
          referenceModel: 'LeaveRequest',
          remarks: `CCL leave rejected after approval${leaveRequest.isHalfDay ? ' (Half-day)' : ''}`
        });
      }
    }

    await employee.save();
    
    // Log the balance update with detailed information
    console.log('Leave balance updated:', {
      employeeId: employee._id,
      leaveType: leaveRequest.leaveType,
      isHalfDay: leaveRequest.isHalfDay,
      previousStatus,
      newStatus: status,
      days: leaveRequest.numberOfDays,
      actualDaysDeducted: leaveRequest.isHalfDay ? 0.5 : leaveRequest.numberOfDays,
      newBalance: leaveRequest.leaveType === 'CL' ? employee.leaveBalance : employee.cclBalance,
      requestId: leaveRequest._id
    });

    res.json({
      leaveRequest,
      newBalance: leaveRequest.leaveType === 'CL' ? employee.leaveBalance : employee.cclBalance
    });
  } catch (error) {
    console.error('Update Leave Request Status Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Submit CCL work request
const submitCCLWorkRequest = async (req, res) => {
  try {
    const { date, assignedTo, reason } = req.body;
    const employeeId = req.user.id;

    console.log('Submitting CCL work request:', {
      employeeId,
      date,
      assignedTo,
      reason
    });

    // Validate required fields
    if (!date || !assignedTo || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: date, assignedTo, and reason'
      });
    }

    // Find the employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Generate unique cclRequestId
    const currentYear = new Date(date).getFullYear();
    const dept = employee.department || 'GEN';
    // Find max sequence for this year+dept
    const regex = new RegExp(`^CCLW${currentYear}${dept}`);
    const lastRequest = await CCLWorkRequest.findOne({ cclRequestId: { $regex: regex } })
      .sort({ cclRequestId: -1 });
    let nextSeq = '0001';
    if (lastRequest && lastRequest.cclRequestId) {
      const lastSeq = parseInt(lastRequest.cclRequestId.slice(-4));
      if (!isNaN(lastSeq)) nextSeq = (lastSeq + 1).toString().padStart(4, '0');
    }
    const cclRequestId = `CCLW${currentYear}${dept}${nextSeq}`;
    const cclWorkRequest = new CCLWorkRequest({
      submittedBy: employeeId,
      date: new Date(date),
      assignedTo,
      reason,
      status: 'Pending',
      cclRequestId
    });

    // Save the CCL work request
    await cclWorkRequest.save();

    // Add the CCL work request to employee's cclWork array
    employee.cclWork.push(cclWorkRequest._id);
    await employee.save();

    console.log('CCL work request created successfully:', {
      requestId: cclWorkRequest._id,
      employeeId: employee._id
    });

    res.status(201).json({
      success: true,
      message: 'CCL work request submitted successfully',
      data: cclWorkRequest
    });
  } catch (error) {
    console.error('Error submitting CCL work request:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit CCL work request'
    });
  }
};

// Get CCL History
const getCCLHistory = async (req, res) => {
  try {
    console.log('Fetching CCL history for employee:', req.user.id);
    
    const employee = await Employee.findById(req.user.id)
      .populate({
        path: 'cclWork',
        options: { sort: { date: -1 } }
      });

    if (!employee) {
      console.log('Employee not found:', req.user.id);
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    // Format CCL work history, handle null/undefined cclWork array
    const formattedWorkHistory = (employee.cclWork || []).map(work => ({
      _id: work._id,
      date: work.date,
      assignedTo: work.assignedTo || '',
      reason: work.reason || '',
      status: work.status || 'Pending',
      hodRemarks: work.hodRemarks || '',
      hodApprovalDate: work.hodApprovalDate || null,
      principalRemarks: work.principalRemarks || '',
      principalApprovalDate: work.principalApprovalDate || null
    }));

    console.log('CCL history response:', {
      cclBalance: employee.cclBalance || 0,
      historyCount: (employee.cclHistory || []).length,
      workHistoryCount: formattedWorkHistory.length
    });

    res.json({
      success: true,
      data: {
        cclBalance: employee.cclBalance || 0,
        cclHistory: employee.cclHistory || [],
        cclWork: formattedWorkHistory
      }
    });
  } catch (error) {
    console.error('Get CCL History Error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch CCL history',
      error: error.message 
    });
  }
};

// Get CCL work history
const getCCLWorkHistory = asyncHandler(async (req, res) => {
  try {
    const employeeId = req.user.id;
    console.log('Fetching CCL work history for employee:', employeeId); // Debug log

    // Find the employee and populate the cclWork field
    const employee = await Employee.findById(employeeId)
      .select('cclWork')
      .populate({
        path: 'cclWork',
        options: { 
          sort: { createdAt: -1 } // Sort by creation date, most recent first
        }
      });

    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }

    console.log('Found employee CCL work:', employee.cclWork); // Debug log

    // Format the dates and ensure all fields are present
    const formattedWorkHistory = (employee.cclWork || []).map(work => {
      const formattedWork = {
        _id: work._id,
        date: work.date ? new Date(work.date).toISOString().split('T')[0] : null,
        assignedTo: work.assignedTo || null,
        reason: work.reason || null,
        status: work.status || 'Pending',
        hodRemarks: work.hodRemarks || null,
        principalRemarks: work.principalRemarks || null,
        createdAt: work.createdAt
      };
      console.log('Formatted work item:', formattedWork); // Debug log
      return formattedWork;
    });

    console.log('Sending formatted work history:', formattedWorkHistory); // Debug log

    // Return the formatted CCL work requests
    res.status(200).json({
      success: true,
      data: formattedWorkHistory
    });
  } catch (error) {
    console.error('Error fetching CCL work history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch CCL work history'
    });
  }
});

module.exports = {
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  addLeaveRequest,
  updateLeaveRequestStatus,
  submitCCLWorkRequest,
  getCCLHistory,
  getCCLWorkHistory
};
