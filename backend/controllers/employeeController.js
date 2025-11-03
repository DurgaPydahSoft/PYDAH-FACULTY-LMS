const { Employee, LeaveRequest } = require('../models');
const CCLWorkRequest = require('../models/CCLWorkRequest');
const asyncHandler = require('express-async-handler');
const { sendLeaveApplicationEmails } = require('../utils/emailService');
const mongoose = require('mongoose');

// Get Employee by ID
const getEmployeeById = async (req, res) => {
  try {
    const employeeDoc = await Employee.findOne({ employeeId: req.params.id })
      .select('-password')
      .populate({
        path: 'leaveRequests.alternateSchedule.periods.substituteFaculty',
        select: 'name employeeId'
      });
    
    if (!employeeDoc) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // Derive CCL worked dates for each leave with usedCCLDays
    const employee = employeeDoc.toObject();
    const allUsedIds = (employee.leaveRequests || [])
      .filter(lr => lr.leaveType === 'CCL' && Array.isArray(lr.usedCCLDays) && lr.usedCCLDays.length > 0)
      .flatMap(lr => lr.usedCCLDays.map(id => id.toString()));

    let idToDate = {};
    if (allUsedIds.length > 0) {
      const uniqueIds = Array.from(new Set(allUsedIds));
      const workDocs = await CCLWorkRequest.find({ _id: { $in: uniqueIds } }).select('_id date');
      idToDate = workDocs.reduce((acc, doc) => {
        acc[doc._id.toString()] = new Date(doc.date).toISOString().split('T')[0];
        return acc;
      }, {});
    }

    employee.leaveRequests = (employee.leaveRequests || []).map(lr => {
      if (lr.leaveType === 'CCL' && Array.isArray(lr.usedCCLDays)) {
        const dates = lr.usedCCLDays
          .map(id => idToDate[id.toString()])
          .filter(Boolean);
        return { ...lr, cclWorkedDates: dates };
      }
      return lr;
    });

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

// Delete a leave request (only if Pending and belongs to current employee)
const deleteLeaveRequest = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { leaveRequestId } = req.params;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // Try by subdocument _id first
    let leaveRequest = employee.leaveRequests.id(leaveRequestId);

    // Fallback: try match by business leaveRequestId field
    if (!leaveRequest) {
      leaveRequest = (employee.leaveRequests || []).find(lr => lr.leaveRequestId === leaveRequestId);
    }

    if (!leaveRequest) {
      return res.status(404).json({ msg: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ msg: 'Only pending leave requests can be deleted' });
    }

    // If this was a CCL leave, unmark any used CCL work days
    try {
      if (leaveRequest.leaveType === 'CCL') {
        const usedIds = Array.isArray(leaveRequest.usedCCLDays) ? leaveRequest.usedCCLDays.map(id => id.toString()) : [];
        if (usedIds.length > 0) {
          await CCLWorkRequest.updateMany(
            { _id: { $in: usedIds } },
            { $set: { isUsed: false, usedBy: null, usedInLeaveRequestId: null } }
          );
        } else if (leaveRequest.leaveRequestId) {
          // Fallback: free any work entries linked by leaveRequestId
          await CCLWorkRequest.updateMany(
            { usedInLeaveRequestId: leaveRequest.leaveRequestId },
            { $set: { isUsed: false, usedBy: null, usedInLeaveRequestId: null } }
          );
        }
      }
    } catch (freeErr) {
      console.error('Failed to free CCL work days on delete:', freeErr);
      // continue deletion even if freeing fails
    }

    // If this was a CCL leave with mapped work days, free them up before deletion
    try {
      if (leaveRequest.leaveType === 'CCL' && Array.isArray(leaveRequest.usedCCLDays) && leaveRequest.usedCCLDays.length > 0) {
        await CCLWorkRequest.updateMany(
          { _id: { $in: leaveRequest.usedCCLDays } },
          { $set: { isUsed: false, usedBy: null, usedInLeaveRequestId: null } }
        );
      }
    } catch (e) {
      console.error('Error unmarking CCL work days on delete:', e);
      // continue; not fatal for delete
    }

    // Remove the subdocument and save
    try {
      if (typeof leaveRequest.remove === 'function') {
        leaveRequest.remove();
      } else {
        // Fallback: remove by index
        const idx = employee.leaveRequests.findIndex(lr => String(lr._id) === String(leaveRequest._id));
        if (idx !== -1) {
          employee.leaveRequests.splice(idx, 1);
        } else {
          // As an extra fallback, try by leaveRequestId
          const idxByBusinessId = employee.leaveRequests.findIndex(lr => lr.leaveRequestId === leaveRequest.leaveRequestId);
          if (idxByBusinessId !== -1) {
            employee.leaveRequests.splice(idxByBusinessId, 1);
          }
        }
      }
    } catch (e) {
      console.error('Error removing leave subdocument:', e);
      return res.status(500).json({ msg: 'Failed to delete leave request' });
    }

    await employee.save();

    return res.json({ msg: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('Delete Leave Request Error:', error);
    return res.status(500).json({ msg: 'Server error' });
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
      alternateSchedule,
      selectedCCLDays = []
    } = req.body;

    // Debug log
    console.log('Received leave request data:', {
      leaveType,
      isHalfDay,
      session,
      startDate,
      endDate,
      numberOfDays,
      reason,
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

    // Generate leaveRequestId globally
    const LeaveRequest = require('../models/schemas/leaveRequestSchema');
    const currentYear = new Date().getFullYear();
    const department = employee.department;
    const latestRequest = await mongoose.model('Employee').aggregate([
      { $unwind: '$leaveRequests' },
      { $match: { 'leaveRequests.leaveType': leaveType, 'leaveRequests.leaveRequestId': { $regex: `^${leaveType}${currentYear}${department}` } } },
      { $sort: { 'leaveRequests.leaveRequestId': -1 } },
      { $limit: 1 },
      { $project: { leaveRequestId: '$leaveRequests.leaveRequestId' } }
    ]);
    let sequenceNumber = 1;
    if (latestRequest.length > 0) {
      const lastSequence = parseInt(latestRequest[0].leaveRequestId.slice(-4));
      if (!isNaN(lastSequence)) sequenceNumber = lastSequence + 1;
    }
    const leaveRequestId = `${leaveType}${currentYear}${department}${sequenceNumber.toString().padStart(4, '0')}`;

    // Create new leave request with generated ID
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

    // If CCL leave and selected CCL day ids are provided, attach them
    if (leaveType === 'CCL' && Array.isArray(selectedCCLDays) && selectedCCLDays.length > 0) {
      newLeaveRequest.usedCCLDays = selectedCCLDays.map(id => id);
    }

    if (leaveType === 'CL') {
      // Monthly CL rule: at most 1 CL day approved per calendar month
      const reqStart = new Date(startDate);
      const requestedMonth = reqStart.getMonth();
      const requestedYear = reqStart.getFullYear();
      const approvedCLThisMonth = (employee.leaveRequests || []).filter(lr => (
        lr.leaveType === 'CL' &&
        lr.status === 'Approved' &&
        new Date(lr.startDate).getMonth() === requestedMonth &&
        new Date(lr.startDate).getFullYear() === requestedYear
      ));
      const allowedCLDays = approvedCLThisMonth.length === 0 ? 1 : 0;

      const requestedDays = numberOfDays;
      const clDays = Math.min(allowedCLDays, requestedDays);
      const lopDays = Math.max(0, requestedDays - clDays);
      newLeaveRequest.clDays = clDays;
      newLeaveRequest.lopDays = lopDays;
    }

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

    // If this is a CCL leave and selected CCL days were provided, mark them as used
    if (leaveType === 'CCL' && Array.isArray(selectedCCLDays) && selectedCCLDays.length > 0) {
      try {
        // Update the CCLWorkRequest documents to mark them used and link to this leaveRequestId
        await CCLWorkRequest.updateMany(
          { _id: { $in: selectedCCLDays } },
          { $set: { isUsed: true, usedBy: employee._id, usedInLeaveRequestId: leaveRequestId } }
        );
      } catch (e) {
        console.error('Failed to mark CCL work days as used:', e);
        // Non-fatal: continue but log error
      }
    }

    // Send email notification to employee only
    try {
      await sendLeaveApplicationEmails(savedLeaveRequest, employee);
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the request if email fails
    }

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

    // Add this logic inside your leave request creation function, after validating input and before saving the leave request
    
    if (leaveType === 'CL') {
    // Get the month and year of the requested leave
    const requestedMonth = new Date(startDate).getMonth();
    const requestedYear = new Date(startDate).getFullYear();
    
    // Find existing CL requests for this employee in the same month and year
    const existingCLThisMonth = employee.leaveRequests.filter(lr =>
    lr.leaveType === 'CL' &&
    lr.status === 'Approved' &&
    new Date(lr.startDate).getMonth() === requestedMonth &&
    new Date(lr.startDate).getFullYear() === requestedYear
    );
    
    // Determine allowed CL days
    let allowedCLDays = existingCLThisMonth.length === 0 ? 1 : 0;
    let requestedDays = numberOfDays;
    let clDays = Math.min(allowedCLDays, requestedDays);
    let lopDays = requestedDays - clDays;
    
    // Set the split in the leave request
    leaveRequest.clDays = clDays;
    leaveRequest.lopDays = lopDays;
    }

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
        const clDaysToDeduct = typeof leaveRequest.clDays === 'number' ? leaveRequest.clDays : leaveRequest.numberOfDays;
        if (employee.leaveBalance < clDaysToDeduct) {
          return res.status(400).json({ 
            msg: `Insufficient CL balance. Available: ${employee.leaveBalance} days, Required: ${clDaysToDeduct} days`
          });
        }
        // Deduct only CL portion
        employee.leaveBalance -= clDaysToDeduct;
        // Add to leave history
        employee.leaveHistory = employee.leaveHistory || [];
        employee.leaveHistory.push({
          type: 'used',
          date: new Date(),
          days: clDaysToDeduct,
          reference: leaveRequest._id,
          referenceModel: 'LeaveRequest',
          remarks: `Leave approved (CL: ${clDaysToDeduct}, LOP: ${leaveRequest.lopDays || 0})`
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
        const clDaysToRestore = typeof leaveRequest.clDays === 'number' ? leaveRequest.clDays : leaveRequest.numberOfDays;
        employee.leaveBalance += clDaysToRestore;
        // Add to leave history
        employee.leaveHistory = employee.leaveHistory || [];
        employee.leaveHistory.push({
          type: 'restored',
          date: new Date(),
          days: clDaysToRestore,
          reference: leaveRequest._id,
          referenceModel: 'LeaveRequest',
          remarks: `Leave rejected after approval (CL: ${clDaysToRestore}, LOP: ${leaveRequest.lopDays || 0})`
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

    // Generate unique cclRequestId with retry logic to handle race conditions
    const currentYear = new Date(date).getFullYear();
    // Use 'NT' for non-teaching employees, otherwise use department code or 'GEN'
    const dept = employee.employeeType === 'non-teaching' ? 'NT' : (employee.department || 'GEN');
    
    let cclRequestId;
    let attempts = 0;
    const maxAttempts = 10;
    let cclWorkRequest;
    
    while (attempts < maxAttempts) {
      // Find all requests for this year+dept pattern
      const prefix = `CCLW${currentYear}${dept}`;
      const regex = new RegExp(`^${prefix}\\d{4}$`);
      
      // Get all matching requests and extract sequence numbers
      const matchingRequests = await CCLWorkRequest.find({ 
        cclRequestId: { $regex: regex } 
      }).select('cclRequestId').lean();
      
      let maxSeq = 0;
      matchingRequests.forEach(req => {
        const seqStr = req.cclRequestId.slice(-4); // Get last 4 digits
        const seqNum = parseInt(seqStr, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      });
      
      // Generate next sequence
      const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
      cclRequestId = `${prefix}${nextSeq}`;
      
      // Try to create the document
      try {
        cclWorkRequest = new CCLWorkRequest({
          submittedBy: employeeId,
          date: new Date(date),
          assignedTo,
          reason,
          status: 'Pending',
          cclRequestId
        });
        
        // Save the CCL work request
        await cclWorkRequest.save();
        
        // Success! Break out of retry loop
        break;
      } catch (saveError) {
        // If duplicate key error, retry with incremented sequence
        if (saveError.code === 11000 && saveError.keyPattern?.cclRequestId) {
          attempts++;
          console.log(`Duplicate CCL request ID detected (${cclRequestId}), retrying... Attempt ${attempts}/${maxAttempts}`);
          // Wait a bit before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 50 * attempts));
          continue;
        }
        // Other errors, throw them
        throw saveError;
      }
    }
    
    // If we exhausted all attempts, return error
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique CCL request ID after multiple attempts');
    }

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
        cclRequestId: work.cclRequestId || null,
        isUsed: work.isUsed || false,
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
  getCCLWorkHistory,
  deleteLeaveRequest
};