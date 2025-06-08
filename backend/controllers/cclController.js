const { Employee } = require('../models');

// Submit CCL work request
exports.submitCCLWork = async (req, res) => {
  try {
    const { date, periods, reason } = req.body;
    const employeeId = req.user.id;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // Create new CCL work entry
    employee.cclWork.push({
      date: new Date(date),
      periods,
      reason
    });

    await employee.save();

    res.json({
      msg: 'CCL work request submitted successfully',
      cclWork: employee.cclWork[employee.cclWork.length - 1]
    });
  } catch (error) {
    console.error('Submit CCL Work Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Get CCL work history
exports.getCCLWorkHistory = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const employee = await Employee.findById(employeeId)
      .select('cclWork cclBalance cclHistory')
      .populate('cclWork.periods.originalFaculty', 'name employeeId');

    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    res.json({
      cclWork: employee.cclWork,
      cclBalance: employee.cclBalance,
      cclHistory: employee.cclHistory
    });
  } catch (error) {
    console.error('Get CCL Work History Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
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
      // Calculate CCL days based on periods worked
      const cclDays = Math.ceil(cclWork.periods.length / 7); // Example: 7 periods = 1 CCL day
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
      // Calculate CCL days based on periods worked
      const cclDays = Math.ceil(cclWork.periods.length / 7); // Example: 7 periods = 1 CCL day
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