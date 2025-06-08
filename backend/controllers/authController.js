const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Employee, User } = require("../models");

// Predefined admin credentials
const predefinedAdmins = [
  { employeeId: 1200, password: "pass1" },
  { employeeId: 1400, password: "pass" },
];

// Employee Registration
exports.registerEmployee = async (req, res) => {
  try {
  const {
      firstName,
      lastName,
    email,
    password,
    employeeId,
      phoneNumber,
      campus,
      department
  } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !employeeId || !phoneNumber || !campus || !department) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Check if employee ID already exists
    let employee = await Employee.findOne({ employeeId });
    if (employee) {
      return res.status(400).json({ msg: 'Employee with this ID already exists' });
    }

    // Check if email already exists
    employee = await Employee.findOne({ email: email.toLowerCase() });
    if (employee) {
      return res.status(400).json({ msg: 'Employee with this email already exists' });
    }

    // Create new employee
    employee = new Employee({
      name: `${firstName} ${lastName}`,
      email: email.toLowerCase(),
      password,
      employeeId,
      phoneNumber,
      designation: 'Faculty', // Default designation
      department,
      campus: campus.toLowerCase(),
      branchCode: department,
      status: 'active',
      leaveRequests: []
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(password, salt);
    
    await employee.save();

    res.status(201).json({
      msg: 'Employee registered successfully',
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department,
        campus: employee.campus
      }
    });
  } catch (err) {
    console.error('Employee Registration Error:', err);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
};

// Employee Login
exports.loginEmployee = async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    console.log('Login attempt:', { employeeId, password: '***' });

    if (!employeeId || !password) {
      console.log('Missing required fields:', { employeeId: !!employeeId, password: !!password });
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Find employee by employee ID (try both with and without toString)
    let employee = await Employee.findOne({ employeeId });
    if (!employee) {
      // Try with toString in case it's a number
      employee = await Employee.findOne({ employeeId: employeeId.toString() });
    }
    
    if (!employee) {
      console.log('Employee not found:', { employeeId });
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    console.log('Employee found:', { 
      id: employee._id,
      employeeId: employee.employeeId,
      status: employee.status
    });

    // Check if employee is active
    if (employee.status !== 'active') {
      console.log('Employee account inactive:', { employeeId, status: employee.status });
      return res.status(401).json({ msg: 'Account is inactive' });
    }

    // Use the schema's comparePassword method
    const isMatch = await employee.comparePassword(password);
    console.log('Password comparison result:', { employeeId, isMatch });
    
    if (!isMatch) {
      console.log('Password mismatch for employee:', { employeeId });
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      id: employee._id,
      role: 'employee',
      campus: employee.campus,
      department: employee.department
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    employee.lastLogin = Date.now();
    await employee.save();

    console.log('Login successful:', { 
      employeeId,
      name: employee.name,
      department: employee.department,
      campus: employee.campus
    });

    res.json({
      token,
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department,
        campus: employee.campus,
        lastLogin: employee.lastLogin
      }
    });
  } catch (err) {
    console.error('Employee Login Error:', err);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
};

// Admin Login
exports.loginAdmin = async (req, res) => {
  try {
    console.log("Admin login attempt - Request body:", req.body);
    const { employeeId, password } = req.body;

    // Validate input parameters
    if (!employeeId || !password) {
      console.log("Missing credentials:", { employeeId, password });
      return res.status(400).json({ msg: "Please provide all credentials" });
    }

    // Convert employeeId to number for comparison
    const numericEmployeeId = parseInt(employeeId);
    if (isNaN(numericEmployeeId)) {
      console.log("Invalid employeeId format:", employeeId);
      return res.status(400).json({ msg: "Invalid employee ID format" });
    }

    console.log("Checking admin credentials:", { numericEmployeeId, password });
    
    // Check against predefined admin credentials
    const admin = predefinedAdmins.find(
      admin => admin.employeeId === numericEmployeeId && admin.password === password
    );

    if (admin) {
      console.log("Admin credentials matched");
      
      // Create payload for JWT
      const payload = {
        admin: {
          id: numericEmployeeId,
          role: "admin"
        }
      };

      // Generate JWT token
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      console.log("Token generated successfully");
      
      // Send response with token and user data
      const responseData = {
        success: true,
        token,
        admin: {
          id: numericEmployeeId,
          role: "admin"
        },
        msg: "Admin login successful"
      };

      console.log("Sending response:", responseData);
      res.status(200).json(responseData);
    } else {
      console.log("Invalid admin credentials:", { numericEmployeeId, password });
      res.status(400).json({ msg: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
