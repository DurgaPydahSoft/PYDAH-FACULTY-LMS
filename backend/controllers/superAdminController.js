const { User, Campus, SuperAdmin, Principal, HR, Employee, HOD } = require('../models');
const jwt = require('jsonwebtoken');
const { validateEmail, validatePassword } = require('../utils/validators');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Super Admin login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    if (!superAdmin) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    if (superAdmin.status !== 'active') {
      return res.status(401).json({ msg: 'Account is inactive' });
    }

    const isMatch = await superAdmin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // Update lastLogin
    superAdmin.lastLogin = Date.now();
    await superAdmin.save();

    const token = jwt.sign(
      { id: superAdmin._id, role: 'superadmin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: 'superadmin',
        lastLogin: superAdmin.lastLogin
      }
    });
  } catch (error) {
    console.error('Super Admin Login Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Create Campus
exports.createCampus = async (req, res) => {
  try {
    const { name, displayName, type } = req.body;

    // Validate required input
    if (!name || !displayName) {
      return res.status(400).json({ msg: 'Please provide name and display name' });
    }

    // Check if campus already exists
    const existingCampus = await Campus.findOne({ name });
    if (existingCampus) {
      return res.status(400).json({ msg: 'Campus already exists' });
    }

    // Create a temporary principal for initial campus creation
    const tempPrincipal = new Principal({
      name: 'Temporary Principal',
      email: `temp.${name}@pydah.edu.in`,
      password: 'temporary123',
      campus: {
        type: type || 'Engineering', // Provide a default type for the principal
        name: name,
        location: 'Visakhapatnam'
      },
      status: 'inactive'
    });

    await tempPrincipal.save();

    // Create new campus with required fields
    const campus = new Campus({
      name,
      displayName,
      type: type || undefined, // Only include type if provided
      principalId: tempPrincipal._id,
      principalModel: 'Principal',
      isActive: true,
      branches: [] // Initialize empty branches array
    });

    await campus.save();

    res.status(201).json({
      msg: 'Campus created successfully',
      campus: {
        id: campus._id,
        name: campus.name,
        displayName: campus.displayName,
        type: campus.type,
        isActive: campus.isActive,
        principalId: campus.principalId
      }
    });
  } catch (error) {
    console.error('Create Campus Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Get All Campuses
exports.getAllCampuses = async (req, res) => {
  try {
    const campuses = await Campus.find()
      .populate({
        path: 'principalId',
        select: 'name email lastLogin status',
        model: Principal // Use the actual Principal model instead of dynamic reference
      })
      .sort({ createdAt: -1 });

    // Format response to include principal status
    const formattedCampuses = campuses.map(campus => {
      const campusObj = campus.toObject();
      if (campusObj.principalId) {
        campusObj.principalId.isActive = campusObj.principalId.status === 'active';
      }
      return campusObj;
    });

    res.json(formattedCampuses);
  } catch (error) {
    console.error('Get Campuses Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Get Active Campuses
exports.getActiveCampuses = async (req, res) => {
  try {
    const campuses = await Campus.find({ isActive: true })
      .select('name displayName type location')
      .sort({ name: 1 });

    // If displayName is not set, use name as displayName
    const formattedCampuses = campuses.map(campus => ({
      ...campus.toObject(),
      displayName: campus.displayName || campus.name.charAt(0).toUpperCase() + campus.name.slice(1)
    }));

    res.json(formattedCampuses);
  } catch (error) {
    console.error('Get Active Campuses Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Create Principal and Assign to Campus
exports.createPrincipal = async (req, res) => {
  try {
    const { name, email, password, campusId } = req.body;

    // Validate input
    if (!name || !email || !password || !campusId) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Check if campus exists
    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(400).json({ msg: 'Campus not found' });
    }

    // Check if email is already in use
    const existingPrincipal = await Principal.findOne({ email: email.toLowerCase() });
    if (existingPrincipal) {
      return res.status(400).json({ msg: 'Email already in use' });
    }

    // Create principal in Principal model
    const principal = new Principal({
      name,
      email: email.toLowerCase(),
      password,
      campus: {
        type: campus.type,
        name: campus.name,
        location: campus.location
      },
      status: 'active'
    });

    await principal.save();

    // Delete the temporary principal if it exists
    if (campus.principalId) {
      await Principal.findByIdAndDelete(campus.principalId);
    }

    // Update campus with new principal ID
    campus.principalId = principal._id;
    campus.principalModel = 'Principal';
    await campus.save();

    res.status(201).json({
      msg: 'Principal created and assigned successfully',
      principal: {
        id: principal._id,
        name: principal.name,
        email: principal.email,
        campus: principal.campus
      }
    });
  } catch (error) {
    console.error('Create Principal Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Update Campus Status
exports.updateCampusStatus = async (req, res) => {
  try {
    const { campusId, isActive } = req.body;

    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(404).json({ msg: 'Campus not found' });
    }

    campus.isActive = isActive;

    // If deactivating campus, also deactivate principal
    if (!isActive && campus.principalId) {
      await User.findByIdAndUpdate(campus.principalId, { isActive: false });
    }

    await campus.save();

    res.json({ 
      msg: 'Campus status updated successfully',
      campus: await Campus.findById(campusId).populate('principalId', 'name email lastLogin')
    });
  } catch (error) {
    console.error('Update Campus Status Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Reset Principal Password
exports.resetPrincipalPassword = async (req, res) => {
  try {
    const { principalId, newPassword } = req.body;

    const principal = await Principal.findById(principalId);

    if (!principal) {
      return res.status(404).json({ msg: 'Principal not found' });
    }

    principal.password = newPassword;
    await principal.save();

    res.json({ msg: 'Principal password reset successfully' });
  } catch (error) {
    console.error('Reset Principal Password Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get all principals
exports.getAllPrincipals = async (req, res) => {
  try {
    const principals = await Principal.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(principals);
  } catch (error) {
    console.error('Get All Principals Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get single principal
exports.getPrincipal = async (req, res) => {
  try {
    const principal = await Principal.findById(req.params.id)
      .select('-password');

    if (!principal) {
      return res.status(404).json({ msg: 'Principal not found' });
    }

    res.json(principal);
  } catch (error) {
    console.error('Get Principal Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update principal
exports.updatePrincipal = async (req, res) => {
  try {
    const { name, email } = req.body;
    const principalId = req.params.id;

    const principal = await Principal.findById(principalId);
    if (!principal) {
      return res.status(404).json({ msg: 'Principal not found' });
    }

    // Validate email if provided
    if (email && email !== principal.email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ msg: 'Please provide a valid email address' });
      }
      const existingPrincipal = await Principal.findOne({ email: email.toLowerCase() });
      if (existingPrincipal) {
        return res.status(400).json({ msg: 'Email already in use' });
      }
      principal.email = email.toLowerCase();
    }

    if (name) principal.name = name;

    await principal.save();

    res.json({
      msg: 'Principal updated successfully',
      principal: {
        id: principal._id,
        name: principal.name,
        email: principal.email,
        campus: principal.campus,
        status: principal.status
      }
    });
  } catch (error) {
    console.error('Update Principal Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Delete principal
exports.deletePrincipal = async (req, res) => {
  try {
    const principal = await Principal.findById(req.params.id);
    if (!principal) {
      return res.status(404).json({ msg: 'Principal not found' });
    }

    await principal.remove();
    res.json({ msg: 'Principal removed' });
  } catch (error) {
    console.error('Delete Principal Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get dashboard data
exports.getDashboard = async (req, res) => {
  try {
    const totalPrincipals = await Principal.countDocuments();
    const activePrincipals = await Principal.countDocuments({ status: 'active' });
    const inactivePrincipals = await Principal.countDocuments({ status: 'inactive' });

    const campusTypeDistribution = await Principal.aggregate([
      {
        $group: {
          _id: '$campus.type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalPrincipals,
      activePrincipals,
      inactivePrincipals,
      campusTypeDistribution
    });
  } catch (error) {
    console.error('Get Dashboard Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Create HR
exports.createHR = async (req, res) => {
  try {
    const { name, email, password, campusId, leaveBalance, leaveBalanceByExperience } = req.body;

    // Validate input
    if (!name || !email || !password || !campusId) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Check if campus exists
    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(400).json({ msg: 'Campus not found' });
    }

    // Check if email is already in use
    const existingHR = await HR.findOne({ email: email.toLowerCase() });
    if (existingHR) {
      return res.status(400).json({ msg: 'Email already in use' });
    }

    // Create HR
    const hr = new HR({
      name,
      email: email.toLowerCase(),
      password,
      campus: {
        type: campus.type,
        name: campus.name,
        location: campus.location
      },
      status: 'active',
      leaveBalance: leaveBalance ? parseInt(leaveBalance) : 12,
      leaveBalanceByExperience: leaveBalanceByExperience ? parseInt(leaveBalanceByExperience) : 0
    });

    await hr.save();

    res.status(201).json({
      msg: 'HR created successfully',
      hr: {
        id: hr._id,
        name: hr.name,
        email: hr.email,
        campus: hr.campus,
        status: hr.status,
        leaveBalance: hr.leaveBalance,
        leaveBalanceByExperience: hr.leaveBalanceByExperience
      }
    });
  } catch (error) {
    console.error('Create HR Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Get All HRs
exports.getAllHRs = async (req, res) => {
  try {
    const hrs = await HR.find()
      .select('-password') // Exclude password from response
      .sort({ createdAt: -1 });

    res.json(hrs);
  } catch (error) {
    console.error('Get HRs Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Update HR Status
exports.updateHRStatus = async (req, res) => {
  try {
    const { hrId, status } = req.body;

    if (!hrId || !status) {
      return res.status(400).json({ msg: 'Please provide HR ID and status' });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const hr = await HR.findById(hrId);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }

    hr.status = status;
    await hr.save();

    res.json({
      msg: 'HR status updated successfully',
      hr: {
        id: hr._id,
        name: hr.name,
        email: hr.email,
        status: hr.status
      }
    });
  } catch (error) {
    console.error('Update HR Status Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Reset HR Password
exports.resetHRPassword = async (req, res) => {
  try {
    const { hrId, newPassword } = req.body;

    if (!hrId || !newPassword) {
      return res.status(400).json({ msg: 'Please provide HR ID and new password' });
    }

    // Validate password
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        msg: 'Password must be at least 6 characters long'
      });
    }

    const hr = await HR.findById(hrId);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }

    // Assign new password directly; pre-save hook will hash it
    hr.password = newPassword;
    hr.lastLogin = null; // Force re-login
    await hr.save();

    res.json({ msg: 'HR password reset successfully' });
  } catch (error) {
    console.error('Reset HR Password Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Update HR
exports.updateHR = async (req, res) => {
  try {
    const { name, email, leaveBalance, leaveBalanceByExperience } = req.body;
    const hrId = req.params.id;

    const hr = await HR.findById(hrId);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }

    // Validate email if provided
    if (email && email !== hr.email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ msg: 'Please provide a valid email address' });
      }
      const existingHR = await HR.findOne({ email: email.toLowerCase() });
      if (existingHR) {
        return res.status(400).json({ msg: 'Email already in use' });
      }
      hr.email = email.toLowerCase();
    }

    if (name) hr.name = name;
    if (leaveBalance !== undefined) hr.leaveBalance = parseInt(leaveBalance);
    if (leaveBalanceByExperience !== undefined) hr.leaveBalanceByExperience = parseInt(leaveBalanceByExperience);

    await hr.save();

    res.json({
      msg: 'HR updated successfully',
      hr: {
        id: hr._id,
        name: hr.name,
        email: hr.email,
        campus: hr.campus,
        status: hr.status,
        leaveBalance: hr.leaveBalance,
        leaveBalanceByExperience: hr.leaveBalanceByExperience
      }
    });
  } catch (error) {
    console.error('Update HR Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ==================== EMPLOYEE MANAGEMENT ====================

// Get all employees from all campuses
exports.getAllEmployees = async (req, res) => {
  try {
    const { search, campus, department, status, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    // Add campus filter
    if (campus && campus !== 'all') {
      query.campus = campus.toLowerCase();
    }

    // Add department filter
    if (department && department !== 'all') {
      query.department = department;
    }

    // Add status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get total count for pagination
    const totalEmployees = await Employee.countDocuments(query);

    // Get employees with pagination
    const employees = await Employee.find(query)
      .select('name email employeeId department campus status phoneNumber designation role roleDisplayName branchCode leaveBalance leaveBalanceByExperience profilePicture createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get unique campuses and departments for filters
    const campuses = await Employee.distinct('campus');
    const departments = await Employee.distinct('department');

    res.json({
      employees,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalEmployees / limitNum),
        totalEmployees,
        hasNext: pageNum < Math.ceil(totalEmployees / limitNum),
        hasPrev: pageNum > 1
      },
      filters: {
        campuses: campuses.sort(),
        departments: departments.sort()
      }
    });
  } catch (error) {
    console.error('Get All Employees Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get employee by ID
exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .select('-password');

    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Get Employee Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update employee details
exports.updateEmployee = async (req, res) => {
  try {
    const { name, email, phoneNumber, department, role, roleDisplayName, status, specialPermission, specialLeaveMaxDays, leaveBalance } = req.body;

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // Update fields
    if (name) employee.name = name;
    if (email) employee.email = email.toLowerCase();
    if (phoneNumber) employee.phoneNumber = phoneNumber;
    if (department) employee.department = department;
    if (role) employee.role = role;
    if (roleDisplayName) employee.roleDisplayName = roleDisplayName;
    if (status) employee.status = status;
    if (specialPermission !== undefined) employee.specialPermission = specialPermission;
    if (specialLeaveMaxDays !== undefined) employee.specialLeaveMaxDays = specialLeaveMaxDays;
    if (leaveBalance !== undefined) employee.leaveBalance = leaveBalance;

    await employee.save();

    res.json({
      msg: 'Employee updated successfully',
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department,
        campus: employee.campus,
        role: employee.role,
        status: employee.status
      }
    });
  } catch (error) {
    console.error('Update Employee Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update employee status (activate/deactivate)
exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    employee.status = status;
    await employee.save();

    res.json({
      msg: `Employee ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      employee: {
        id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        status: employee.status
      }
    });
  } catch (error) {
    console.error('Update Employee Status Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Reset employee password
exports.resetEmployeePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters long' });
    }

    // Update password
    employee.password = newPassword;
    await employee.save();

    res.json({
      msg: 'Employee password reset successfully',
      employee: {
        id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId
      }
    });
  } catch (error) {
    console.error('Reset Employee Password Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    await Employee.findByIdAndDelete(req.params.id);

    res.json({
      msg: 'Employee deleted successfully',
      employee: {
        id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId
      }
    });
  } catch (error) {
    console.error('Delete Employee Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get all HR Leave Requests (for SuperAdmin)
// Get all HR Leave Requests (for SuperAdmin)
exports.getHRLeaveRequests = async (req, res) => {
  try {
    const { status, campus } = req.query;

    // Build query for HRs
    let hrQuery = { status: 'active' };
    if (campus) {
      hrQuery['campus.type'] = campus;
    }

    // Find all active HRs
    const hrs = await HR.find(hrQuery).select('name email campus leaveRequests');

    // Extract and enrich leave requests
    let allLeaveRequests = [];
    hrs.forEach(hr => {
      if (Array.isArray(hr.leaveRequests) && hr.leaveRequests.length > 0) {
        hr.leaveRequests.forEach(request => {
          // Apply status filter if provided
          if (status && request.status !== status) {
            return;
          }

          allLeaveRequests.push({
            ...request.toObject(),
            hrId: hr._id,
            hrName: hr.name,
            hrEmail: hr.email,
            hrCampus: hr.campus.name || hr.campus.type || 'Unknown'
          });
        });
      }
    });

    // Sort by appliedOn date, most recent first
    allLeaveRequests.sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));

    res.json({
      success: true,
      leaveRequests: allLeaveRequests,
      total: allLeaveRequests.length
    });
  } catch (error) {
    console.error('Get HR Leave Requests Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};


// Get all HODs
exports.getAllHODs = async (req, res) => {
  try {
    const hods = await HOD.find()
      .select('name email department campus hodType status')
      .sort({ createdAt: -1 });
    res.json(hods);
  } catch (error) {
    console.error('Get All HODs Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update HR Leave Request (SuperAdmin approval/rejection)
exports.updateHRLeaveRequest = async (req, res) => {
  try {
    const { hrId, leaveRequestId } = req.params;
    const { status, remarks } = req.body;

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ msg: 'Please provide valid status (Approved/Rejected)' });
    }

    const hr = await HR.findById(hrId);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }

    const leaveRequest = hr.leaveRequests.id(leaveRequestId);
    if (!leaveRequest) {
      return res.status(404).json({ msg: 'Leave request not found' });
    }

    // Only allow SuperAdmin to update pending or forwarded requests
    if (!['Pending', 'Forwarded to SuperAdmin'].includes(leaveRequest.status)) {
      return res.status(400).json({ msg: 'Leave request cannot be modified in current status' });
    }

    leaveRequest.status = status;
    leaveRequest.rejectionBy = status === 'Rejected' ? 'SuperAdmin' : undefined;
    leaveRequest.superAdminRemarks = remarks || '';
    leaveRequest.superAdminApprovalDate = new Date();

    // If approved, deduct leave balance for CL
    if (status === 'Approved' && leaveRequest.leaveType === 'CL') {
      const daysToDeduct = leaveRequest.numberOfDays || 0;
      if (hr.leaveBalance < daysToDeduct) {
        return res.status(400).json({ 
          msg: `Insufficient leave balance for HR. Available: ${hr.leaveBalance} days, Required: ${daysToDeduct} days` 
        });
      }
      hr.leaveBalance -= daysToDeduct;
    }

    await hr.save();

    res.json({
      success: true,
      msg: `HR leave request ${status.toLowerCase()} successfully`,
      leaveRequest: leaveRequest.toObject()
    });
  } catch (error) {
    console.error('Update HR Leave Request Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
}; 