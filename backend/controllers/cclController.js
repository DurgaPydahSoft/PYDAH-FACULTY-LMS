const { Employee } = require('../models');
const CCLWorkRequest = require('../models/CCLWorkRequest');

// Submit CCL work request
exports.submitCCLWork = async (req, res) => {
  try {
    const { date, assignedTo, reason, isHalfDay } = req.body;
    const employeeId = req.user.id;

    console.log('Submitting CCL work request:', {
      employeeId,
      date,
      assignedTo,
      reason,
      isHalfDay
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
        
        // Success! Add the CCL work request ID to employee's cclWork array
        employee.cclWork.push(cclWorkRequest._id);
        await employee.save();
        
        console.log('CCL work request created successfully:', {
          requestId: cclWorkRequest._id,
          employeeId: employee._id,
          cclRequestId: cclWorkRequest.cclRequestId
        });

        return res.status(201).json({
          success: true,
          message: 'CCL work request submitted successfully',
          data: cclWorkRequest
        });
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
    throw new Error('Failed to generate unique CCL request ID after multiple attempts');
    
  } catch (error) {
    console.error('Submit CCL Work Error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Server error' 
    });
  }
};

// Get CCL work history
exports.getCCLWorkHistory = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const employee = await Employee.findById(employeeId)
      .select('cclWork cclBalance cclHistory')
      .populate({
        path: 'cclWork',
        model: 'CCLWorkRequest'
      });

    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    res.json({
      success: true,
      data: {
        cclWork: employee.cclWork || [],
        cclBalance: employee.cclBalance || 0,
        cclHistory: employee.cclHistory || []
      }
    });
  } catch (error) {
    console.error('Get CCL Work History Error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Server error' 
    });
  }
};

// HOD approve CCL work
exports.approveCCLWork = async (req, res) => {
  try {
    const { employeeId, cclWorkId } = req.params;
    const { approve, remarks } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    const cclWork = employee.cclWork.id(cclWorkId);
    if (!cclWork) {
      return res.status(404).json({ msg: 'CCL work request not found' });
    }

    // Verify HOD has authority
    if (employee.department !== req.user.branchCode || employee.campus !== req.user.campus) {
      return res.status(403).json({ msg: 'Not authorized to approve this CCL work' });
    }

    cclWork.approvedBy.hod = approve;
    if (remarks) {
      cclWork.remarks = remarks;
    }

    // If both HOD and Principal approved, update status and CCL balance
    if (cclWork.approvedBy.hod && cclWork.approvedBy.principal) {
      cclWork.status = 'Approved';
      // Earn 0.5 if marked half-day, else 1 full day (fallback to periods calc)
      let cclDays = cclWork.isHalfDay ? 0.5 : 1;
      if (typeof cclWork.isHalfDay === 'undefined' && Array.isArray(cclWork.periods)) {
        cclDays = Math.ceil(cclWork.periods.length / 7);
      }
      await employee.updateCCLBalance('earned', cclDays, cclWork._id, 'CCLWork', 'CCL earned from extra duty');
    }

    await employee.save();

    res.json({
      msg: `CCL work ${approve ? 'approved' : 'rejected'} by HOD`,
      cclWork
    });
  } catch (error) {
    console.error('Approve CCL Work Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Principal approve CCL work
exports.principalApproveCCLWork = async (req, res) => {
  try {
    const { employeeId, cclWorkId } = req.params;
    const { approve, remarks } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    const cclWork = employee.cclWork.id(cclWorkId);
    if (!cclWork) {
      return res.status(404).json({ msg: 'CCL work request not found' });
    }

    // Verify Principal has authority
    if (employee.campus !== req.user.campus) {
      return res.status(403).json({ msg: 'Not authorized to approve this CCL work' });
    }

    cclWork.approvedBy.principal = approve;
    if (remarks) {
      cclWork.remarks = remarks;
    }

    // If both HOD and Principal approved, update status and CCL balance
    if (cclWork.approvedBy.hod && cclWork.approvedBy.principal) {
      cclWork.status = 'Approved';
      let cclDays = cclWork.isHalfDay ? 0.5 : 1;
      if (typeof cclWork.isHalfDay === 'undefined' && Array.isArray(cclWork.periods)) {
        cclDays = Math.ceil(cclWork.periods.length / 7);
      }
      await employee.updateCCLBalance('earned', cclDays, cclWork._id, 'CCLWork', 'CCL earned from extra duty');
    }

    await employee.save();

    res.json({
      msg: `CCL work ${approve ? 'approved' : 'rejected'} by Principal`,
      cclWork
    });
  } catch (error) {
    console.error('Principal Approve CCL Work Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Get department CCL requests (for HOD)
exports.getDepartmentCCLRequests = async (req, res) => {
  try {
    const employees = await Employee.find({
      department: req.user.branchCode,
      campus: req.user.campus,
      'cclWork.status': 'Pending'
    })
    .select('name employeeId cclWork')
    .populate('cclWork.periods.originalFaculty', 'name employeeId');

    const pendingRequests = employees.flatMap(emp => 
      emp.cclWork
        .filter(work => work.status === 'Pending')
        .map(work => ({
          ...work.toObject(),
          employeeName: emp.name,
          employeeId: emp.employeeId
        }))
    );

    res.json(pendingRequests);
  } catch (error) {
    console.error('Get Department CCL Requests Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

module.exports = exports; 