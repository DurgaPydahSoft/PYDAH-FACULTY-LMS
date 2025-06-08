const { HR, Employee, User } = require('../models');
const jwt = require('jsonwebtoken');
const { validateEmail } = require('../utils/validators');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');

// HR login
exports.login = async (req, res) => {
  try {
    const { email, password, campus } = req.body;

    if (!email || !password || !campus) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Map campus code to type
    const campusTypeMap = {
      engineering: 'Engineering',
      degree: 'Degree',
      pharmacy: 'Pharmacy',
      diploma: 'Diploma'
    };

    const campusType = campusTypeMap[campus.toLowerCase()];
    if (!campusType) {
      return res.status(400).json({ msg: 'Invalid campus' });
    }

    // Find HR with matching email and campus type
    const hr = await HR.findOne({ 
      email: email.toLowerCase(),
      'campus.type': campusType
    });

    if (!hr) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    if (hr.status !== 'active') {
      return res.status(401).json({ msg: 'Account is inactive' });
    }

    const isMatch = await hr.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // Update lastLogin
    hr.lastLogin = Date.now();
    await hr.save();

    // Create token
    const token = jwt.sign(
      { 
        id: hr._id, 
        role: 'hr',
        campus: hr.campus.type,
        modelType: 'HR'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: hr._id,
        name: hr.name,
        email: hr.email,
        role: 'hr',
        campus: hr.campus,
        lastLogin: hr.lastLogin
      }
    });
  } catch (error) {
    console.error('HR Login Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get campus-specific roles
const getCampusRoles = (campus) => {
  const roles = {
    engineering: [
      { value: 'associate_professor', label: 'Associate Professor' },
      { value: 'assistant_professor', label: 'Assistant Professor' },
      { value: 'lab_incharge', label: 'Lab Incharge' },
      
  { value: 'librarian', label: 'Librarian' },
  { value: 'pet', label: 'PET' },
      { value: 'technician', label: 'Technician' }
    ],
    diploma: [
      { value: 'senior_lecturer', label: 'Senior Lecturer' },
      { value: 'junior_lecturer', label: 'Junior Lecturer' },
      { value: 'lab_incharge', label: 'Lab Incharge' }
    ],
    pharmacy: [
      { value: 'associate_professor', label: 'Associate Professor' },
      { value: 'assistant_professor', label: 'Assistant Professor' },
      { value: 'lab_incharge', label: 'Lab Incharge' },
      { value: 'librarian', label: 'Librarian' }
    ],
    degree: [
      { value: 'associate_professor', label: 'Associate Professor' },
      { value: 'assistant_professor', label: 'Assistant Professor' },
      { value: 'lab_incharge', label: 'Lab Incharge' },
      { value: 'librarian', label: 'Librarian' }
    ]
  };
  return roles[campus.toLowerCase()] || [{ value: 'faculty', label: 'Faculty' }];
};

// Register new employee
exports.registerEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      employeeId,
      department,
      role,
      customRole,
      leaveBalanceByExperience
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !employeeId || !department || !role) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ msg: 'Please provide a valid email address' });
    }

    // Check if employee ID already exists
    const existingEmployeeId = await Employee.findOne({ employeeId });
    if (existingEmployeeId) {
      return res.status(400).json({ msg: 'Employee ID already exists' });
    }

    // Check if email already exists
    const existingEmail = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ msg: 'Email already exists' });
    }

    // Get HR's campus
    const hr = await HR.findById(req.user.id);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }

    // Validate role for campus using static method before creating the employee
    try {
      Employee.validateRoleForCampus(hr.campus.name.toLowerCase(), role);
    } catch (error) {
      return res.status(400).json({ msg: error.message });
    }

    // Determine roleDisplayName
    let roleDisplayName = '';
    if (role === 'other') {
      if (!customRole || !customRole.trim()) {
        return res.status(400).json({ msg: 'Please provide a custom role name.' });
      }
      roleDisplayName = customRole.trim();
    } else {
      // Find the label for the selected role
      const campusRoles = getCampusRoles(hr.campus.name.toLowerCase());
      const found = campusRoles.find(r => r.value === role);
      roleDisplayName = found ? found.label : role;
    }

    // Create new employee
    const leaveBalanceExpNum = typeof leaveBalanceByExperience === 'number' ? leaveBalanceByExperience : (leaveBalanceByExperience ? Number(leaveBalanceByExperience) : 0);
    const employee = new Employee({
      name,
      email: email.toLowerCase(),
      password,
      phoneNumber,
      employeeId,
      department,
      branchCode: department, // For compatibility
      role,
      roleDisplayName,
      campus: hr.campus.name.toLowerCase(),
      status: 'active',
      leaveBalance: leaveBalanceExpNum > 0 ? leaveBalanceExpNum : 12,
      cclBalance: 0, // Default CCL balance
      leaveBalanceByExperience: leaveBalanceExpNum
    });

    await employee.save();

    res.status(201).json({
      msg: 'Employee registered successfully',
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department,
        role: employee.role,
        status: employee.status
      }
    });
  } catch (error) {
    console.error('Register Employee Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Add a new endpoint to get campus-specific roles
exports.getCampusRoles = async (req, res) => {
  try {
    const roles = getCampusRoles(req.user.campus.name);
    res.json(roles);
  } catch (error) {
    console.error('Get Campus Roles Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Get all employees for HR's campus
exports.getCampusEmployees = async (req, res) => {
  try {
    const { search, department, status } = req.query;
    
    // Build query
    let query = {
      campus: req.user.campus.name.toLowerCase()
    };

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    // Add department filter
    if (department) {
      query.department = department;
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    const employees = await Employee.find(query)
      .select('name email employeeId department status phoneNumber designation role branchCode leaveBalance leaveBalanceByExperience')
      .sort({ name: 1 });

    res.json(employees);
  } catch (error) {
    console.error('Get Campus Employees Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Update employee details
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find employee in HR's campus (normalize campus to lowercase)
    const employee = await Employee.findOne({
      _id: id,
      campus: req.user.campus.name.toLowerCase()
    });

    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // Only allow certain fields to be updated
    const allowedUpdates = ['name', 'email', 'phoneNumber', 'role', 'status', 'leaveBalance', 'leaveBalanceByExperience'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        // Convert leaveBalance to number if it exists
        if (field === 'leaveBalance') {
          employee[field] = Number(updates[field]);
        } else {
          employee[field] = updates[field];
        }
      }
    });

    // Department/branchCode update (for compatibility)
    if (updates.department) {
      employee.branchCode = updates.department;
      employee.department = updates.department;
    }

    // Handle role and customRole
    if (updates.role) {
      try {
        Employee.validateRoleForCampus(req.user.campus.name.toLowerCase(), updates.role);
      } catch (error) {
        return res.status(400).json({ msg: error.message });
      }
      employee.role = updates.role;
      if (updates.role === 'other') {
        if (!updates.customRole || !updates.customRole.trim()) {
          return res.status(400).json({ msg: 'Please provide a custom role name.' });
        }
        employee.roleDisplayName = updates.customRole.trim();
      } else {
        // Find the label for the selected role
        const campusRoles = getCampusRoles(req.user.campus.name.toLowerCase());
        const found = campusRoles.find(r => r.value === updates.role);
        employee.roleDisplayName = found ? found.label : updates.role;
      }
    }

    // Save the employee document
    await employee.save();

    // Fetch the updated employee to ensure we have the latest data
    const updatedEmployee = await Employee.findById(id)
      .select('name email employeeId department status phoneNumber role roleDisplayName branchCode leaveBalance');

    // Log the update for debugging
    console.log('Employee updated:', {
      employeeId: id,
      updates,
      newLeaveBalance: updatedEmployee.leaveBalance
    });

    res.json({
      msg: 'Employee updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Update Employee Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Reset employee password
exports.resetEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ msg: 'Please provide a valid password (min 6 characters)' });
    }

    // Find employee in HR's campus
    const employee = await Employee.findOne({
      _id: id,
      $or: [
        { campus: req.user.campus.name },
        { 'campus.name': req.user.campus.name }
      ]
    });

    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // Set password directly, let pre-save hook hash it
    employee.password = newPassword;
    employee.lastLogin = null; // Reset last login to force re-login
    await employee.save();

    res.json({ msg: 'Employee password reset successfully' });
  } catch (error) {
    console.error('Reset Employee Password Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Get HR profile
exports.getProfile = async (req, res) => {
  try {
    const hr = await HR.findById(req.user.id).select('-password');
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }
    res.json(hr);
  } catch (error) {
    console.error('Get HR Profile Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Update HR profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (phoneNumber) updates.phoneNumber = phoneNumber;

    const hr = await HR.findById(req.user.id);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }

    Object.assign(hr, updates);
    await hr.save();

    res.json({
      msg: 'Profile updated successfully',
      hr: {
        id: hr._id,
        name: hr.name,
        email: hr.email,
        phoneNumber: hr.phoneNumber,
        campus: hr.campus
      }
    });
  } catch (error) {
    console.error('Update HR Profile Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Bulk register employees
exports.bulkRegisterEmployees = async (req, res) => {
  try {
    const employeesData = req.body.employees;
    if (!Array.isArray(employeesData) || employeesData.length === 0) {
      return res.status(400).json({ msg: 'No employee data provided.' });
    }

    // Get HR's campus
    const hr = await HR.findById(req.user.id);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }
    const campus = hr.campus.name.toLowerCase();

    const results = [];
    for (const [index, emp] of employeesData.entries()) {
      const {
        name,
        email,
        employeeId,
        phoneNumber,
        role,
        customRole,
        department,
        branchCode,
        status = 'active',
        designation = '',
        leaveBalanceByExperience
      } = emp;

      // Prepare result object for this row
      const result = { row: index + 1, employeeId, email };

      // Validate required fields
      if (!name || !email || !employeeId || !phoneNumber || !role || !department || !branchCode) {
        result.success = false;
        result.error = 'Missing required fields';
        results.push(result);
        continue;
      }

      // Validate email format
      if (!validateEmail(email)) {
        result.success = false;
        result.error = 'Invalid email format';
        results.push(result);
        continue;
      }

      // Check for unique employeeId and email
      const existingEmployeeId = await Employee.findOne({ employeeId });
      if (existingEmployeeId) {
        result.success = false;
        result.error = 'Employee ID already exists';
        results.push(result);
        continue;
      }
      const existingEmail = await Employee.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        result.success = false;
        result.error = 'Email already exists';
        results.push(result);
        continue;
      }

      // Validate role for campus
      try {
        Employee.validateRoleForCampus(campus, role);
      } catch (error) {
        result.success = false;
        result.error = error.message;
        results.push(result);
        continue;
      }

      // Handle custom role
      let roleDisplayName = '';
      if (role === 'other') {
        if (!customRole || !customRole.trim()) {
          result.success = false;
          result.error = 'Custom role required for role "other"';
          results.push(result);
          continue;
        }
        roleDisplayName = customRole.trim();
      } else {
        // Find the label for the selected role
        const campusRoles = getCampusRoles(campus);
        const found = campusRoles.find(r => r.value === role);
        roleDisplayName = found ? found.label : role;
      }

      // Generate password: employeeId + first 4 digits of phoneNumber
      const password = employeeId + (phoneNumber ? String(phoneNumber).slice(0, 4) : '0000');

      // Create new employee
      const leaveBalanceExpNum = typeof leaveBalanceByExperience === 'number' ? leaveBalanceByExperience : (leaveBalanceByExperience ? Number(leaveBalanceByExperience) : 0);
      const employee = new Employee({
        name,
        email: email.toLowerCase(),
        password,
        phoneNumber,
        employeeId,
        department,
        branchCode: branchCode.toUpperCase(),
        role,
        roleDisplayName,
        campus,
        status,
        designation,
        leaveBalance: leaveBalanceExpNum > 0 ? leaveBalanceExpNum : 12,
        cclBalance: 0,
        leaveBalanceByExperience: leaveBalanceExpNum
      });

      try {
        await employee.save();
        result.success = true;
      } catch (err) {
        result.success = false;
        result.error = err.message;
      }
      results.push(result);
    }

    res.json({ results });
  } catch (error) {
    console.error('Bulk Register Employees Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
}; 