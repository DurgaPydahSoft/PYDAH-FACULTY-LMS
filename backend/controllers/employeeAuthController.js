const { Employee, Campus } = require('../models');
const jwt = require('jsonwebtoken');
const { validateEmail } = require('../utils/validators');

// Employee Registration
exports.register = async (req, res) => {
  try {
    console.log('Employee Registration Request:', {
      ...req.body,
      password: 'REDACTED'
    });

    const {
      firstName,
      lastName,
      email,
      password,
      employeeId,
      phoneNumber,
      campus,
      department,
      designation = 'Faculty', // Default designation
      role = 'faculty' // Default role
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !employeeId || !phoneNumber || !campus || !department) {
      console.log('Missing required fields:', {
        firstName: !!firstName,
        lastName: !!lastName,
        email: !!email,
        password: !!password,
        employeeId: !!employeeId,
        phoneNumber: !!phoneNumber,
        campus: !!campus,
        department: !!department
      });
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ msg: 'Please provide a valid email address' });
    }

    // Check if employee ID already exists
    const existingEmployeeId = await Employee.findOne({ employeeId });
    if (existingEmployeeId) {
      console.log('Employee ID already exists:', employeeId);
      return res.status(400).json({ msg: 'Employee ID already exists' });
    }

    // Check if email already exists
    const existingEmail = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      console.log('Email already exists:', email.toLowerCase());
      return res.status(400).json({ msg: 'Email already exists' });
    }

    // Validate campus and department
    const campusType = campus.charAt(0).toUpperCase() + campus.slice(1);
    console.log('Campus validation:', {
      receivedCampus: campus,
      normalizedCampusType: campusType,
      department
    });

    // Find the campus and check if it exists
    const campusDoc = await Campus.findOne({ name: campus.toLowerCase() });
    if (!campusDoc) {
      console.log('Invalid campus selected:', {
        campus,
        campusType
      });
      return res.status(400).json({ msg: 'Invalid campus selected' });
    }

    // Check if the department exists in the campus's branches
    const branchExists = campusDoc.branches.some(branch => 
      branch.code === department && branch.isActive
    );

    if (!branchExists) {
      console.log('Invalid department for campus:', {
        department,
        campus: campusType,
        validBranches: campusDoc.branches.map(b => b.code)
      });
      return res.status(400).json({ msg: 'Invalid department for selected campus' });
    }

    // Create new employee
    const employeeData = {
      name: `${firstName} ${lastName}`,
      email: email.toLowerCase(),
      password,
      employeeId,
      phoneNumber,
      designation,
      role,
      department,
      campus: campus.toLowerCase(),
      branchCode: department,
      status: 'active'
    };

    console.log('Creating employee with data:', {
      ...employeeData,
      password: 'REDACTED'
    });

    const employee = new Employee(employeeData);
    await employee.save();

    console.log('Employee created successfully:', {
      id: employee._id,
      name: employee.name,
      email: employee.email,
      employeeId: employee.employeeId,
      department: employee.department,
      campus: employee.campus,
      role: employee.role
    });

    res.status(201).json({
      msg: 'Employee registered successfully',
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department,
        campus: employee.campus,
        role: employee.role
      }
    });
  } catch (error) {
    console.error('Employee Registration Error:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      msg: error.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Employee Login
exports.login = async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Find employee by employee ID
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // Check if employee is active
    if (employee.status !== 'active') {
      return res.status(401).json({ msg: 'Account is inactive' });
    }

    // Verify password
    const isMatch = await employee.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // Update last login
    employee.lastLogin = Date.now();
    await employee.save();

    // Create token
    const token = jwt.sign(
      {
        id: employee._id,
        role: employee.role || 'faculty', // Default to faculty if role not set
        campus: employee.campus,
        department: employee.department
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department,
        campus: employee.campus,
        role: employee.role || 'faculty',
        lastLogin: employee.lastLogin
      }
    });
  } catch (error) {
    console.error('Employee Login Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
}; 