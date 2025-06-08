const { Employee, LeaveRequest } = require('../models');

// Get Employee Dashboard Data
exports.getDashboard = async (req, res) => {
  try {
    const employeeId = req.user.id;

    // Use populate to get substituteFaculty details
    const employee = await Employee.findById(employeeId)
      .select('-password')
      .populate({
        path: 'leaveRequests.alternateSchedule.periods.substituteFaculty',
        select: 'name employeeId'
      })
      .lean();

    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // No need for manual population now

    // Get leave statistics
    const leaveStats = {
      totalLeaves: employee.leaveBalance,
      pendingRequests: employee.leaveRequests.filter(lr => lr.status === 'Pending').length,
      approvedRequests: employee.leaveRequests.filter(lr => lr.status === 'Approved').length,
      rejectedRequests: employee.leaveRequests.filter(lr => lr.status === 'Rejected').length
    };

    // Get recent leave requests (last 5)
    const recentLeaveRequests = employee.leaveRequests
      .sort((a, b) => b.appliedOn - a.appliedOn)
      .slice(0, 5);

    // Calculate used leaves for display purposes only
    const usedLeaves = employee.leaveRequests
      .filter(lr => lr.status === 'Approved')
      .reduce((total, lr) => total + lr.numberOfDays, 0);

    // Use the stored balance directly instead of recalculating
    const remainingLeaves = employee.leaveBalance;

    // Calculate CCL balance
    const usedCCL = employee.leaveRequests
      .filter(lr => lr.status === 'Approved' && lr.leaveType === 'CCL')
      .reduce((total, lr) => total + lr.numberOfDays, 0);

    const remainingCCL = employee.cclBalance - usedCCL;

    // Log balance calculations
    console.log('Leave balance calculation:', {
      employeeId: employee._id,
      totalBalance: employee.leaveBalance,
      usedLeaves,
      remainingLeaves,
      cclBalance: employee.cclBalance,
      usedCCL,
      remainingCCL
    });

    res.json({
      employee: {
        name: employee.name,
        employeeId: employee.employeeId,
        department: employee.department,
        campus: employee.campus,
        designation: employee.designation
      },
      leaveStats,
      leaveBalance: {
        total: employee.leaveBalance,
        used: usedLeaves,
        remaining: remainingLeaves
      },
      cclBalance: {
        total: employee.cclBalance,
        used: usedCCL,
        remaining: remainingCCL
      },
      recentLeaveRequests,
      leaveRequests: employee.leaveRequests // include all leave requests with populated substituteFaculty
    });
  } catch (error) {
    console.error('Get Employee Dashboard Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Get Employee Leave History
exports.getLeaveHistory = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { status, startDate, endDate } = req.query;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    let leaveRequests = employee.leaveRequests;

    // Filter by status if provided
    if (status) {
      leaveRequests = leaveRequests.filter(lr => lr.status === status);
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      leaveRequests = leaveRequests.filter(lr => {
        const requestDate = new Date(lr.appliedOn);
        return requestDate >= start && requestDate <= end;
      });
    }

    // Sort by applied date (most recent first)
    leaveRequests.sort((a, b) => b.appliedOn - a.appliedOn);

    // Manually populate substituteFaculty in leaveRequests
    const { Employee: EmployeeModel } = require('../models');
    async function populateSubstituteFaculty(leaveRequests) {
      for (const leave of leaveRequests) {
        if (leave.alternateSchedule && Array.isArray(leave.alternateSchedule)) {
          for (const day of leave.alternateSchedule) {
            if (day.periods && Array.isArray(day.periods)) {
              for (const period of day.periods) {
                if (period.substituteFaculty && typeof period.substituteFaculty === 'object' && period.substituteFaculty.name) {
                  // Already populated
                  continue;
                }
                if (period.substituteFaculty) {
                  const faculty = await EmployeeModel.findById(period.substituteFaculty).select('name employeeId');
                  if (faculty) {
                    period.substituteFaculty = {
                      _id: faculty._id,
                      name: faculty.name,
                      employeeId: faculty.employeeId
                    };
                  }
                }
              }
            }
          }
        }
      }
    }
    await populateSubstituteFaculty(leaveRequests);

    res.json(leaveRequests);
  } catch (error) {
    console.error('Get Leave History Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Get Employee Profile
exports.getProfile = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const employee = await Employee.findById(employeeId)
      .select('-password -leaveRequests')
      .lean();

    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Get Employee Profile Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Update Employee Profile
exports.updateProfile = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { name, phoneNumber, email } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // Update allowed fields
    if (name) employee.name = name;
    if (phoneNumber) employee.phoneNumber = phoneNumber;
    if (email) {
      // Check if email is already in use by another employee
      const existingEmployee = await Employee.findOne({ email: email.toLowerCase(), _id: { $ne: employeeId } });
      if (existingEmployee) {
        return res.status(400).json({ msg: 'Email already in use' });
      }
      employee.email = email.toLowerCase();
    }

    await employee.save();

    res.json({
      msg: 'Profile updated successfully',
      employee: {
        name: employee.name,
        email: employee.email,
        phoneNumber: employee.phoneNumber
      }
    });
  } catch (error) {
    console.error('Update Employee Profile Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
}; 