const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { HOD, Employee, User, LeaveRequest } = require('../models');
const CCLWorkRequest = require('../models/CCLWorkRequest');
const { validateEmail } = require('../utils/validators');
const asyncHandler = require('express-async-handler');
const { sendPrincipalNotification, sendLeaveRejectionEmail } = require('../utils/emailService');

// Register HOD
const registerHod = async (req, res) => {
  try {
    const { name, email, password, department, HODId, phoneNumber } = req.body;
    
    // Check if email already exists
    let hodWithEmail = await HOD.findOne({ email });
    if (hodWithEmail) {
      return res.status(400).json({ msg: "HOD already registered with this email" });
    }
    
    // Check if department already has an HOD
    let hodWithDepartment = await HOD.findOne({ department });
    if (hodWithDepartment) {
      return res.status(400).json({ 
        msg: "This department already has an HOD registered. Please login with those credentials." 
      });
    }
    
    // Check if HODId is already taken
    let hodWithId = await HOD.findOne({ HODId });
    if (hodWithId) {
      return res.status(400).json({ msg: "Invalid HOD ID. This ID is already registered." });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const hod = new HOD({
      name,
      email,
      password: hashedPassword,
      department,
      HODId,
      phoneNumber,
      status: 'active'
    });
    
    await hod.save();
    res.status(201).json({ msg: "HOD registered successfully!" });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

// HOD login
const login = async (req, res) => {
  try {
    console.log('HOD login attempt:', req.body);
    const { email, password, campus, branchCode } = req.body;

    if (!email || !password || !campus || !branchCode) {
      console.log('Missing required fields:', { 
        email: !!email, 
        password: !!password, 
        campus: !!campus,
        branchCode: !!branchCode 
      });
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    if (!validateEmail(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ msg: 'Please provide a valid email' });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedBranchCode = branchCode.toUpperCase();
    const normalizedCampus = campus.toLowerCase();
    const campusType = campus.charAt(0).toUpperCase() + campus.slice(1);

    console.log('Normalized credentials:', {
      email: normalizedEmail,
      branchCode: normalizedBranchCode,
      campus: normalizedCampus,
      campusType
    });

    // Try HOD model first since that's the primary model
    let hod = await HOD.findOne({ 
      email: normalizedEmail,
      'department.code': normalizedBranchCode,
      'department.campusType': campusType
    });

    console.log('HOD search result in HOD model:', {
      found: !!hod,
      hodDetails: hod ? {
        id: hod._id,
        email: hod.email,
        department: hod.department,
        status: hod.status,
        hasPassword: !!hod.password
      } : null
    });

    let isUserModel = false;

    // If not found in HOD model, try User model
    if (!hod) {
      console.log('HOD not found in HOD model, trying User model');
      hod = await User.findOne({ 
        email: normalizedEmail,
        role: 'hod',
        campus: normalizedCampus,
        branchCode: normalizedBranchCode
      });
      isUserModel = !!hod;
      
      console.log('HOD search result in User model:', {
        found: !!hod,
        hodDetails: hod ? {
          id: hod._id,
          email: hod.email,
          campus: hod.campus,
          branchCode: hod.branchCode,
          status: hod.isActive,
          hasPassword: !!hod.password
        } : null
      });
    }

    if (!hod) {
      console.log('HOD not found in either model');
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // Check account status
    if (isUserModel) {
      if (!hod.isActive) {
        console.log('HOD account is not active (User model)');
        return res.status(401).json({ msg: 'Account is not active' });
      }
    } else {
      if (hod.status !== 'active') {
        console.log('HOD account is not active (HOD model)');
        return res.status(401).json({ msg: 'Account is not active' });
      }
    }

    // Check password
    console.log('Attempting password comparison with:', {
      providedPassword: password,
      hasStoredPassword: !!hod.password,
      model: isUserModel ? 'User' : 'HOD'
    });

    const isMatch = await hod.comparePassword(password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // Create token data based on model
    const tokenData = {
      id: hod._id.toString(),
      role: 'hod',
      campus: normalizedCampus,
      branchCode: normalizedBranchCode,
      model: isUserModel ? 'User' : 'HOD'
    };

    console.log('Creating token with data:', tokenData);

    const token = jwt.sign(
      tokenData,
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Update last login
    hod.lastLogin = Date.now();
    await hod.save();

    // Prepare response based on model
    const userResponse = {
      id: hod._id,
      name: hod.name || hod.email.split('@')[0],
      email: hod.email,
      campus: normalizedCampus,
      branchCode: normalizedBranchCode,
      role: 'hod',
      isActive: isUserModel ? hod.isActive : (hod.status === 'active'),
      lastLogin: hod.lastLogin,
      hodLeaveRequests: hod.hodLeaveRequests || []
    };

    console.log('Login successful for HOD:', {
      id: hod._id,
      email: hod.email,
      campus: normalizedCampus,
      branchCode: normalizedBranchCode,
      model: tokenData.model
    });

    res.json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('HOD Login Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get HOD Profile
const getProfile = async (req, res) => {
  try {
    console.log('Getting HOD profile, token data:', req.user);
    
    if (!req.user || !req.user.id || !req.user.branchCode || !req.user.campus || !req.user.model) {
      console.log('Invalid token data:', req.user);
      return res.status(401).json({ msg: 'Invalid token data' });
    }

    let hod;
    if (req.user.model === 'User') {
      hod = await User.findOne({
        _id: req.user.id,
        role: 'hod',
        campus: req.user.campus,
        branchCode: req.user.branchCode
      }).select('-password');
    } else {
      hod = await HOD.findOne({
        _id: req.user.id,
        'department.code': req.user.branchCode,
        'department.campusType': req.user.campus.charAt(0).toUpperCase() + req.user.campus.slice(1)
      }).select('-password');
    }
    
    if (!hod) {
      console.log('HOD not found in database with criteria:', {
        _id: req.user.id,
        role: 'hod',
        campus: req.user.campus,
        branchCode: req.user.branchCode,
        model: req.user.model
      });
      return res.status(404).json({ msg: 'HOD not found' });
    }

    console.log('HOD profile found:', { 
      id: hod._id, 
      email: hod.email, 
      campus: req.user.campus, 
      branchCode: req.user.branchCode,
      model: req.user.model
    });

    // Prepare response based on model
    const response = req.user.model === 'User' ? {
      id: hod._id,
      name: hod.name,
      email: hod.email,
      campus: hod.campus,
      branchCode: hod.branchCode,
      role: 'hod',
      isActive: hod.isActive,
      lastLogin: hod.lastLogin,
      hodLeaveRequests: hod.hodLeaveRequests || []
    } : {
      id: hod._id,
      name: hod.name,
      email: hod.email,
      campus: req.user.campus,
      branchCode: hod.department.code,
      role: 'hod',
      isActive: hod.status === 'active',
      lastLogin: hod.lastLogin,
      hodLeaveRequests: hod.hodLeaveRequests || []
    };

    res.json(response);
  } catch (error) {
    console.error('Get HOD Profile Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update HOD Profile
const updateProfile = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { name, email, phoneNumber } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ msg: 'Please provide a valid email' });
      }
      updates.email = email;
    }
    if (phoneNumber) updates.phoneNumber = phoneNumber;

    const hod = await User.findByIdAndUpdate(
      hodId,
      { $set: updates },
      { new: true }
    ).select('-password');

    res.json(hod);
  } catch (error) {
    console.error('Update HOD Profile Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ msg: 'Email already exists' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get HOD Details
const getHodDetails = async (req, res) => {
  try {
    const hod = await HOD.findById(req.hod.id).select("-password");
    if (!hod) {
      return res.status(404).json({ msg: "HOD not found" });
    }
    res.json(hod);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

// Get department leave requests
const getDepartmentLeaves = async (req, res) => {
  try {
    console.log('Getting department leaves, token data:', req.user);
    
    if (!req.user || !req.user.id || !req.user.branchCode || !req.user.campus || !req.user.model) {
      console.log('Invalid token data:', req.user);
      return res.status(401).json({ msg: 'Invalid token data' });
    }

    // Get all employees in this department with populated leave requests
    const employees = await Employee.find({
      department: req.user.branchCode,
      campus: req.user.campus.toLowerCase()
    })
    .select('name email employeeId department leaveRequests')
    .populate({
      path: 'leaveRequests.alternateSchedule.periods.substituteFaculty',
      select: 'name'
    });

    console.log('Found employees:', {
      count: employees.length,
      department: req.user.branchCode,
      campus: req.user.campus
    });

    // Collect all leave requests from employees with populated faculty details
    const departmentLeaves = employees.reduce((acc, employee) => {
      const employeeLeaves = employee.leaveRequests.map(request => ({
        ...request.toObject(),
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        employeeDepartment: employee.department,
        employeeEmployeeId: employee.employeeId,
        alternateSchedule: request.alternateSchedule.map(schedule => ({
          date: schedule.date,
          periods: schedule.periods.map(period => ({
            periodNumber: period.periodNumber,
            substituteFaculty: period.substituteFaculty ? period.substituteFaculty.name : 'Unknown Faculty',
            assignedClass: period.assignedClass
          }))
        }))
      }));
      return [...acc, ...employeeLeaves];
    }, []);

    // Sort by creation date, most recent first
    departmentLeaves.sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));

    console.log('Found department leave requests:', {
      count: departmentLeaves.length,
      department: req.user.branchCode,
      campus: req.user.campus
    });

    res.json(departmentLeaves);
  } catch (error) {
    console.error('Get Department Leaves Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update leave request
const updateLeaveRequest = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const { employeeId, leaveRequestId } = req.params;
    const hodId = req.user.id;

    // Validate required parameters
    if (!status || !['Rejected', 'Approved'].includes(status)) {
      console.log('Invalid or missing status in request body:', req.body);
      return res.status(400).json({ msg: 'Valid status (Rejected/Approved) is required' });
    }

    console.log('Updating leave request:', {
      leaveRequestId,
      employeeId,
      status,
      remarks,
      hodId
    });

    // Find the employee with the leave request
    const employee = await Employee.findOne({
      _id: employeeId,
      'leaveRequests._id': leaveRequestId,
      department: req.user.branchCode,
      campus: req.user.campus.toLowerCase()
    });

    if (!employee) {
      console.log('Employee or leave request not found:', {
        employeeId,
        leaveRequestId,
        department: req.user.branchCode,
        campus: req.user.campus
      });
      return res.status(404).json({ msg: 'Employee or leave request not found' });
    }

    // Get the specific leave request
    const leaveRequest = employee.leaveRequests.id(leaveRequestId);
    if (!leaveRequest) {
      console.log('Leave request not found in employee document:', {
        leaveRequestId,
        employeeId: employee._id
      });
      return res.status(404).json({ msg: 'Leave request not found' });
    }

    const hod = await HOD.findById(hodId);
    if (!hod) {
      console.log('HOD not found:', hodId);
      return res.status(404).json({ msg: 'HOD not found' });
    }

    // Update leave request status
    leaveRequest.hodStatus = status;
    leaveRequest.hodRemarks = remarks;
    leaveRequest.hodApprovalDate = new Date();

    if (status === 'Rejected') {
      leaveRequest.status = 'Rejected';
      await sendLeaveRejectionEmail(leaveRequest, employee, hod);
    } else if (status === 'Approved') {
      leaveRequest.status = 'Forwarded by HOD';
      await sendPrincipalNotification(leaveRequest, employee, hod);
    }

    // Save the employee document to persist the leave request changes
    await employee.save();

    console.log('Leave request updated successfully:', {
      leaveRequestId,
      status,
      employeeId: employee._id,
      hodId
    });

    res.json({ 
      msg: 'Leave request updated successfully',
      leaveRequest
    });
  } catch (error) {
    console.error('Error updating leave request:', error);
    res.status(500).json({ msg: 'Internal server error' });
  }
};

// Apply for HOD leave
const applyHodLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, alternateSchedule } = req.body;

    // Validate required fields
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Find HOD based on model type
    let hod;
    if (req.user.model === 'User') {
      hod = await User.findOne({
        _id: req.user.id,
        role: 'hod',
        campus: req.user.campus,
        branchCode: req.user.branchCode
      });
    } else {
      hod = await HOD.findOne({
        _id: req.user.id,
        'department.code': req.user.branchCode,
        'department.campusType': req.user.campus.charAt(0).toUpperCase() + req.user.campus.slice(1)
      });
    }

    if (!hod) {
      return res.status(404).json({ msg: 'HOD not found' });
    }

    // Create new leave request
    const leaveRequest = {
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: 'Pending',
      alternateSchedule: alternateSchedule || []
    };

    // Add to HOD's leave requests
    if (!hod.hodLeaveRequests) {
      hod.hodLeaveRequests = [];
    }
    hod.hodLeaveRequests.push(leaveRequest);
    await hod.save();

    res.json({
      msg: 'Leave request submitted successfully',
      leaveRequest
    });
  } catch (error) {
    console.error('Apply HOD Leave Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get HOD's own leave requests
const getHodLeaves = async (req, res) => {
  try {
    let hod;
    if (req.user.model === 'User') {
      hod = await User.findOne({
        _id: req.user.id,
        role: 'hod',
        campus: req.user.campus,
        branchCode: req.user.branchCode
      }).select('hodLeaveRequests leaveBalance');
    } else {
      hod = await HOD.findOne({
        _id: req.user.id,
        'department.code': req.user.branchCode,
        'department.campusType': req.user.campus.charAt(0).toUpperCase() + req.user.campus.slice(1)
      }).select('hodLeaveRequests leaveBalance');
    }

    if (!hod) {
      return res.status(404).json({ msg: 'HOD not found' });
    }

    res.json({
      leaveRequests: hod.hodLeaveRequests || [],
      leaveBalance: hod.leaveBalance || 12
    });
  } catch (error) {
    console.error('Get HOD Leaves Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get Employees for HOD's Department
const getDepartmentEmployees = async (req, res) => {
  try {
    console.log('Getting department employees for HOD:', req.user);

    const { branchCode, campus } = req.user;
    
    // Find all employees in the HOD's department
    const employees = await Employee.find({
      department: branchCode,
      campus: campus.toLowerCase(),
      status: 'active'
    }).select('name email employeeId department phoneNumber leaveBalance status role roleDisplayName designation');

    console.log(`Found ${employees.length} employees for department ${branchCode} in ${campus} campus`);

    res.json(employees);
  } catch (error) {
    console.error('Get Department Employees Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get dashboard data
const getDashboard = async (req, res) => {
  try {
    console.log('Getting dashboard data for HOD:', {
      id: req.user.id,
      model: req.user.model,
      campus: req.user.campus,
      branchCode: req.user.branchCode
    });

    let hod;
    if (req.user.model === 'User') {
      hod = await User.findOne({
        _id: req.user.id,
        role: 'hod',
        campus: req.user.campus,
        branchCode: req.user.branchCode
      }).select('-password').populate('campus');
    } else {
      hod = await HOD.findOne({
        _id: req.user.id,
        'department.code': req.user.branchCode,
        'department.campusType': req.user.campus.charAt(0).toUpperCase() + req.user.campus.slice(1)
      }).select('-password').populate('campus');
    }

    if (!hod) {
      console.log('HOD not found in database');
      return res.status(404).json({ msg: 'HOD not found' });
    }

    console.log('Found HOD:', {
      id: hod._id,
      name: hod.name,
      email: hod.email,
      campus: req.user.campus,
      branchCode: req.user.branchCode
    });

    // Get all employees in this department with populated leave requests
    const employees = await Employee.find({
      department: req.user.branchCode,
      campus: req.user.campus.toLowerCase(),
      status: 'active'
    })
    .select('name email employeeId department phoneNumber leaveBalance status role roleDisplayName designation leaveRequests')
    .populate({
      path: 'leaveRequests.alternateSchedule.periods.substituteFaculty',
      select: 'name'
    });

    console.log(`Found ${employees.length} employees in department`);

    // Collect all leave requests from employees with populated faculty details
    const departmentLeaves = employees.reduce((acc, employee) => {
      if (!employee.leaveRequests || !Array.isArray(employee.leaveRequests)) {
        console.log(`No leave requests found for employee ${employee.employeeId}`);
        return acc;
      }
      
      const employeeLeaves = employee.leaveRequests.map(leave => ({
        ...leave.toObject(),
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        employeeDepartment: employee.department,
        employeeEmployeeId: employee.employeeId,
        employeePhoneNumber: employee.phoneNumber,
        alternateSchedule: leave.alternateSchedule.map(schedule => ({
          date: schedule.date,
          periods: schedule.periods.map(period => ({
            periodNumber: period.periodNumber,
            substituteFaculty: period.substituteFaculty ? period.substituteFaculty.name : 'Unknown Faculty',
            assignedClass: period.assignedClass
          }))
        }))
      }));
      return [...acc, ...employeeLeaves];
    }, []);

    // Sort by creation date, most recent first
    departmentLeaves.sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));

    console.log(`Found ${departmentLeaves.length} department leave requests`);

    // Get department stats
    const stats = {
      totalEmployees: employees.length,
      pendingLeaves: departmentLeaves.filter(leave => leave.status === 'Pending').length,
      approvedLeaves: departmentLeaves.filter(leave => leave.status === 'Approved').length,
      rejectedLeaves: departmentLeaves.filter(leave => leave.status === 'Rejected').length,
      forwardedLeaves: departmentLeaves.filter(leave => leave.status === 'Forwarded by HOD').length
    };

    console.log('Department stats:', stats);

    const response = {
      hod: {
        name: hod.name,
        email: hod.email,
        department: req.user.model === 'User' ? {
          code: hod.branchCode,
          campusType: hod.campus
        } : hod.department,
        leaveBalance: hod.leaveBalance || 12,
        hodLeaveRequests: hod.hodLeaveRequests || []
      },
      departmentLeaves,
      stats,
      employees // Include employees in the response
    };

    console.log('Sending dashboard response');
    res.json(response);
  } catch (error) {
    console.error('Get Dashboard Error:', error);
    res.status(500).json({ 
      msg: error.message || 'Server error while fetching dashboard data',
      timestamp: new Date().toISOString()
    });
  }
};

// Get department statistics
const getDepartmentStats = async (req, res) => {
  try {
    // Get department leave requests
    const departmentLeaves = await LeaveRequest.find({
      'department.code': req.user.branchCode,
      'department.campusType': req.user.campus.charAt(0).toUpperCase() + req.user.campus.slice(1)
    });

    // Calculate statistics
    const stats = {
      totalEmployees: await User.countDocuments({
        role: 'employee',
        branchCode: req.user.branchCode,
        campus: req.user.campus
      }),
      leaveStats: {
        pending: departmentLeaves.filter(leave => leave.status === 'Pending').length,
        approved: departmentLeaves.filter(leave => leave.status === 'Approved').length,
        rejected: departmentLeaves.filter(leave => leave.status === 'Rejected').length,
        total: departmentLeaves.length
      },
      leaveTypes: departmentLeaves.reduce((acc, leave) => {
        acc[leave.leaveType] = (acc[leave.leaveType] || 0) + 1;
        return acc;
      }, {})
    };

    res.json(stats);
  } catch (error) {
    console.error('Get Department Stats Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update Employee Details
const updateEmployeeDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const updates = req.body;
    
    // Validate email if provided
    if (updates.email && !validateEmail(updates.email)) {
      return res.status(400).json({ msg: 'Please provide a valid email address' });
    }

    // Find the employee using employeeId field
    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // Verify HOD has authority over this employee
    if (employee.department !== req.user.branchCode || employee.campus !== req.user.campus) {
      return res.status(403).json({ msg: 'Not authorized to update this employee' });
    }

    // Remove sensitive fields from updates
    const allowedUpdates = ['name', 'email', 'phoneNumber', 'designation', 'status', 'role', 'roleDisplayName'];
    const sanitizedUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        sanitizedUpdates[key] = updates[key];
      }
    });

    // Check if email already exists
    if (sanitizedUpdates.email) {
      const existingEmployee = await Employee.findOne({
        email: sanitizedUpdates.email.toLowerCase(),
        employeeId: { $ne: employeeId }
      });
      if (existingEmployee) {
        return res.status(400).json({ msg: 'Email already exists' });
      }
      sanitizedUpdates.email = sanitizedUpdates.email.toLowerCase();
    }

    // Update employee
    const updatedEmployee = await Employee.findOneAndUpdate(
      { employeeId },
      { $set: sanitizedUpdates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedEmployee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    res.json({
      msg: 'Employee details updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Update Employee Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ msg: 'Email already exists' });
    }
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Reset Employee Password
const resetEmployeePassword = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { newPassword } = req.body;

    console.log('Password reset attempt:', {
      employeeId,
      hodDetails: {
        branchCode: req.user.branchCode,
        campus: req.user.campus
      }
    });

    if (!newPassword) {
      return res.status(400).json({ msg: 'Please provide a new password' });
    }

    // Find the employee
    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      console.log('Employee not found:', employeeId);
      return res.status(404).json({ msg: 'Employee not found' });
    }

    console.log('Found employee:', {
      id: employee._id,
      employeeId: employee.employeeId,
      department: employee.department,
      campus: employee.campus,
      status: employee.status
    });

    // Verify HOD has authority over this employee
    if (employee.department !== req.user.branchCode || employee.campus !== req.user.campus) {
      console.log('Authorization mismatch:', {
        employee: {
          department: employee.department,
          campus: employee.campus
        },
        hod: {
          branchCode: req.user.branchCode,
          campus: req.user.campus
        }
      });
      return res.status(403).json({ msg: 'Not authorized to reset password for this employee' });
    }

    try {
      // Hash the password directly
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update the password using findOneAndUpdate to avoid middleware issues
      const updatedEmployee = await Employee.findOneAndUpdate(
        { employeeId },
        { 
          $set: { 
            password: hashedPassword,
            lastLogin: null // Reset last login to force re-login
          }
        },
        { new: true }
      );

      if (!updatedEmployee) {
        throw new Error('Failed to update employee password');
      }
      
      console.log('Password updated successfully for employee:', employeeId);

      res.json({ 
        msg: 'Password reset successful',
        timestamp: new Date().toISOString()
      });
    } catch (saveError) {
      console.error('Error saving employee password:', {
        error: saveError.message,
        stack: saveError.stack,
        employeeId
      });
      throw saveError;
    }

  } catch (error) {
    console.error('Reset Employee Password Error:', {
      message: error.message,
      stack: error.stack,
      employeeId: req.params.employeeId
    });
    res.status(500).json({ 
      msg: 'Server error while resetting password',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get CCL work requests
const getCCLWorkRequests = async (req, res) => {
  try {
    console.log('Getting CCL work requests for HOD:', {
      department: req.user.branchCode,
      campus: req.user.campus
    });

    // Get all employees in this department
    const employees = await Employee.find({
      department: req.user.branchCode,
      campus: req.user.campus.toLowerCase()
    })
    .select('name email employeeId department')
    .populate({
      path: 'cclWork',
      match: { status: { $in: ['Pending', 'Forwarded to Principal', 'Approved', 'Rejected'] } },
      options: { sort: { createdAt: -1 } }
    });
    console.log(`Found ${employees.length} employees in department`);

    // Collect all CCL work requests
    const cclWorkRequests = employees.reduce((acc, employee) => {
      if (!employee.cclWork || !Array.isArray(employee.cclWork)) {
        console.log(`No CCL work requests found for employee ${employee.employeeId}`);
        return acc;
      }

      const employeeRequests = employee.cclWork.map(request => ({
        ...request.toObject(),
        employeeName: employee.name,
        employeeEmail: employee.email,
        employeeDepartment: employee.department,
        employeeEmployeeId: employee.employeeId,
        employeePhoneNumber: employee.phoneNumber
      }));
      
      console.log(`Found ${employeeRequests.length} pending CCL work requests for employee ${employee.employeeId}`);
      return [...acc, ...employeeRequests];
    }, []);

    console.log(`Total pending CCL work requests: ${cclWorkRequests.length}`);

    res.json({
      success: true,
      data: cclWorkRequests
    });
  } catch (error) {
    console.error('Get CCL Work Requests Error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Server error' 
    });
  }
};

// Update CCL work request status
const updateCCLWorkRequestStatus = async (req, res) => {
  try {
    const { workId } = req.params;
    const { status, remarks } = req.body;
    const { branchCode, campus } = req.user;

    console.log('Received CCL update request:', {
      workId,
      status,
      remarks,
      branchCode,
      campus,
      body: req.body
    });

    // Validate status
    if (!status || !['Forwarded to Principal', 'Rejected'].includes(status)) {
      console.log('Invalid status:', status);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status. Must be either "Forwarded to Principal" or "Rejected"' 
      });
    }

    // Find the CCL work request directly
    const cclWorkRequest = await CCLWorkRequest.findById(workId);
    if (!cclWorkRequest) {
      console.log('CCL work request not found:', workId);
      return res.status(404).json({ 
        success: false,
        message: 'CCL work request not found' 
      });
    }

    console.log('Found CCL work request:', {
      id: cclWorkRequest._id,
      currentStatus: cclWorkRequest.status,
      submittedBy: cclWorkRequest.submittedBy
    });

    // Find the employee who submitted the request
    const employee = await Employee.findOne({
      _id: cclWorkRequest.submittedBy,
      department: branchCode,
      campus: campus.toLowerCase()
    });

    if (!employee) {
      console.log('Employee not found or not in department:', {
        submittedBy: cclWorkRequest.submittedBy,
        department: branchCode,
        campus: campus.toLowerCase()
      });
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found or not in your department' 
      });
    }

    // Update the CCL work request
    try {
      cclWorkRequest.status = status;
      cclWorkRequest.hodRemarks = remarks || `${status} by HOD`;
      cclWorkRequest.hodApprovalDate = new Date();

      await cclWorkRequest.save();

      console.log('CCL work request updated successfully:', {
        workId,
        status,
        hodRemarks: cclWorkRequest.hodRemarks,
        hodApprovalDate: cclWorkRequest.hodApprovalDate
      });

      res.json({
        success: true,
        message: `CCL work request ${status.toLowerCase()}`,
        data: cclWorkRequest
      });
    } catch (saveError) {
      console.error('Error saving CCL work request:', saveError);
      return res.status(400).json({
        success: false,
        message: 'Error updating CCL work request: ' + saveError.message
      });
    }
  } catch (error) {
    console.error('Update CCL Work Request Status Error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Server error' 
    });
  }
};

module.exports = {
  registerHod,
  login,
  getProfile,
  updateProfile,
  getHodDetails,
  getDepartmentLeaves,
  updateLeaveRequest,
  applyHodLeave,
  getHodLeaves,
  getDepartmentEmployees,
  getDashboard,
  getDepartmentStats,
  updateEmployeeDetails,
  resetEmployeePassword,
  getCCLWorkRequests,
  updateCCLWorkRequestStatus
};