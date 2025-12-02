const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { HOD, Employee, User, LeaveRequest, Campus, Principal } = require('../models');
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
    const { email, password, campus, branchCode, hodType } = req.body;

    // Validate required fields
    if (!email || !password || !campus) {
      console.log('Missing required fields:', { 
        email: !!email, 
        password: !!password, 
        campus: !!campus
      });
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // For teaching HODs, branchCode is required
    if (hodType === 'teaching' && !branchCode) {
      return res.status(400).json({ msg: 'Branch code is required for teaching HODs' });
    }

    if (!validateEmail(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ msg: 'Please provide a valid email' });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedCampus = campus.toLowerCase();
    const campusType = campus.charAt(0).toUpperCase() + campus.slice(1);

    console.log('Normalized credentials:', {
      email: normalizedEmail,
      campus: normalizedCampus,
      campusType,
      hodType,
      branchCode
    });

    // Determine HOD type if not provided (for backward compatibility)
    const isTeaching = hodType !== 'non-teaching';

    let hod;
    let isUserModel = false;

    if (isTeaching && branchCode) {
      // Teaching HOD - requires department/branch
      const normalizedBranchCode = branchCode.toUpperCase();

      // Try HOD model first since that's the primary model
      hod = await HOD.findOne({ 
        email: normalizedEmail,
        'department.code': normalizedBranchCode,
        'department.campusType': campusType,
        hodType: 'teaching'
      });

      console.log('HOD search result in HOD model (teaching):', {
        found: !!hod,
        hodDetails: hod ? {
          id: hod._id,
          email: hod.email,
          department: hod.department,
          status: hod.status,
          hasPassword: !!hod.password,
          hodType: hod.hodType
        } : null
      });

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
        
        console.log('HOD search result in User model (teaching):', {
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
    } else {
      // Non-teaching HOD - no department/branch required
      // Find Principal(s) for this campus type to get the campus reference
      let campusRefs = [];
      
      // Try to find Principal in Principal model
      const principals = await Principal.find({});
      for (const principal of principals) {
        const campusDoc = await Campus.findOne({
          principalId: principal._id,
          type: campusType,
          isActive: true
        });
        if (campusDoc) {
          campusRefs.push({ ref: principal._id, model: 'Principal' });
        }
      }

      // Try to find Principal in User model
      const principalUsers = await User.find({ 
        role: 'principal',
        campus: normalizedCampus
      });
      for (const principalUser of principalUsers) {
        campusRefs.push({ ref: principalUser._id, model: 'User' });
      }

      if (campusRefs.length === 0) {
        console.log('Could not find campus reference for non-teaching HOD');
        return res.status(401).json({ msg: 'Invalid campus' });
      }

      // Query HODs with any of the found campus references
      const orConditions = campusRefs.map(({ ref, model }) => ({
        campus: ref,
        campusModel: model
      }));

      hod = await HOD.findOne({ 
        email: normalizedEmail,
        hodType: 'non-teaching',
        $or: orConditions
      });

      console.log('HOD search result in HOD model (non-teaching):', {
        found: !!hod,
        campusRefs: campusRefs.length,
        hodDetails: hod ? {
          id: hod._id,
          email: hod.email,
          status: hod.status,
          hasPassword: !!hod.password,
          hodType: hod.hodType
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
      model: isUserModel ? 'User' : 'HOD'
    };

    // Add branchCode only for teaching HODs
    if (isTeaching && branchCode) {
      const normalizedBranchCode = branchCode.toUpperCase();
      tokenData.branchCode = normalizedBranchCode;
    }

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
      role: 'hod',
      isActive: isUserModel ? hod.isActive : (hod.status === 'active'),
      lastLogin: hod.lastLogin,
      hodLeaveRequests: hod.hodLeaveRequests || []
    };

    // Add branchCode only for teaching HODs
    if (isTeaching && branchCode) {
      const normalizedBranchCode = branchCode.toUpperCase();
      userResponse.branchCode = normalizedBranchCode;
    }

    // Add hodType if available
    if (hod.hodType) {
      userResponse.hodType = hod.hodType;
    }

    console.log('Login successful for HOD:', {
      id: hod._id,
      email: hod.email,
      campus: normalizedCampus,
      branchCode: isTeaching && branchCode ? branchCode.toUpperCase() : 'N/A',
      hodType: hod.hodType || 'teaching',
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
    
    if (!req.user || !req.user.id || !req.user.campus || !req.user.model) {
      console.log('Invalid token data:', req.user);
      return res.status(401).json({ msg: 'Invalid token data' });
    }

    // branchCode is only required for teaching HODs
    const isTeaching = req.user.hodType !== 'non-teaching' && !!req.user.branchCode;

    let hod;
    if (req.user.model === 'User') {
      // User model is only for teaching HODs
      hod = await User.findOne({
        _id: req.user.id,
        role: 'hod',
        campus: req.user.campus,
        branchCode: req.user.branchCode
      }).select('-password');
    } else {
      // HOD model - handle both teaching and non-teaching
      if (isTeaching) {
        hod = await HOD.findOne({
          _id: req.user.id,
          'department.code': req.user.branchCode,
          'department.campusType': req.user.campus.charAt(0).toUpperCase() + req.user.campus.slice(1),
          hodType: 'teaching'
        }).select('-password');
      } else {
        // Non-teaching HOD - find by ID and hodType only
        hod = await HOD.findOne({
          _id: req.user.id,
          hodType: 'non-teaching'
        }).select('-password');
      }
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

    // Prepare response based on model and HOD type
    const response = req.user.model === 'User' ? {
      id: hod._id,
      name: hod.name,
      email: hod.email,
      campus: hod.campus,
      branchCode: hod.branchCode,
      role: 'hod',
      isActive: hod.isActive,
      lastLogin: hod.lastLogin,
      hodLeaveRequests: hod.hodLeaveRequests || [],
      hodType: 'teaching'
    } : {
      id: hod._id,
      name: hod.name,
      email: hod.email,
      campus: req.user.campus,
      branchCode: isTeaching && hod.department ? hod.department.code : undefined,
      role: 'hod',
      isActive: hod.status === 'active',
      lastLogin: hod.lastLogin,
      hodLeaveRequests: hod.hodLeaveRequests || [],
      hodType: hod.hodType || 'teaching'
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
    
    if (!req.user || !req.user.id || !req.user.campus || !req.user.model) {
      console.log('Invalid token data:', req.user);
      return res.status(401).json({ msg: 'Invalid token data' });
    }

    // Get HOD to determine type
    let hod;
    if (req.user.model === 'User') {
      hod = await User.findOne({
        _id: req.user.id,
        role: 'hod',
        campus: req.user.campus,
        branchCode: req.user.branchCode
      });
    } else {
      hod = await HOD.findById(req.user.id);
    }

    if (!hod) {
      return res.status(404).json({ msg: 'HOD not found' });
    }

    // Build query based on HOD type
    let employeeQuery = {
      campus: req.user.campus.toLowerCase(),
      status: 'active'
    };

    if (hod.hodType === 'teaching') {
      // Teaching HOD: get employees by department
      if (!req.user.branchCode) {
        return res.status(400).json({ msg: 'Branch code required for teaching HOD' });
      }
      employeeQuery.department = req.user.branchCode;
      employeeQuery.employeeType = 'teaching';
    } else {
      // Non-teaching HOD: get employees assigned to this HOD
      employeeQuery.assignedHodId = hod._id;
      employeeQuery.employeeType = 'non-teaching';
    }

    // Get all employees matching the query with populated leave requests
    const employees = await Employee.find(employeeQuery)
    .select('name email employeeId department employeeType assignedHodId leaveRequests')
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
    let departmentLeaves = employees.reduce((acc, employee) => {
      const employeeLeaves = employee.leaveRequests.map(request => ({
        ...request.toObject(),
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        employeeDepartment: employee.employeeType === 'non-teaching' ? 'Non-Teaching' : (employee.department || 'N/A'),
        employeeEmployeeId: employee.employeeId,
        employeeType: employee.employeeType,
        alternateSchedule: request.alternateSchedule ? request.alternateSchedule.map(schedule => ({
          date: schedule.date,
          periods: schedule.periods.map(period => ({
            periodNumber: period.periodNumber,
            substituteFaculty: period.substituteFaculty ? period.substituteFaculty.name : 'Unknown Faculty',
            assignedClass: period.assignedClass
          }))
        })) : []
      }));
      return [...acc, ...employeeLeaves];
    }, []);

    // Enrich CCL leaves with worked dates
    const allUsedIds = departmentLeaves
      .filter(lr => lr.leaveType === 'CCL' && Array.isArray(lr.usedCCLDays) && lr.usedCCLDays.length > 0)
      .flatMap(lr => lr.usedCCLDays.map(id => id.toString()));
    if (allUsedIds.length > 0) {
      const uniqueIds = Array.from(new Set(allUsedIds));
      const workDocs = await CCLWorkRequest.find({ _id: { $in: uniqueIds } }).select('_id date');
      const idToDate = workDocs.reduce((acc, doc) => {
        acc[doc._id.toString()] = new Date(doc.date).toISOString().split('T')[0];
        return acc;
      }, {});
      departmentLeaves = departmentLeaves.map(lr => {
        if (lr.leaveType === 'CCL' && Array.isArray(lr.usedCCLDays)) {
          const dates = lr.usedCCLDays.map(id => idToDate[id.toString()]).filter(Boolean);
          return { ...lr, cclWorkedDates: dates };
        }
        return lr;
      });
    }

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
    // For teaching HODs: match by department and branchCode
    // For non-teaching HODs: match by assignedHodId
    let employeeQuery = {
      _id: employeeId,
      'leaveRequests._id': leaveRequestId,
      campus: req.user.campus.toLowerCase()
    };

    // Determine HOD type from token or fetch HOD
    const hod = await HOD.findById(hodId);
    if (!hod) {
      console.log('HOD not found:', hodId);
      return res.status(404).json({ msg: 'HOD not found' });
    }

    if (hod.hodType === 'teaching') {
      // Teaching HOD: match by department
      employeeQuery.department = req.user.branchCode;
      employeeQuery.employeeType = 'teaching';
    } else {
      // Non-teaching HOD: match by assignedHodId
      employeeQuery.assignedHodId = hodId;
      employeeQuery.employeeType = 'non-teaching';
    }

    const employee = await Employee.findOne(employeeQuery);

    if (!employee) {
      console.log('Employee or leave request not found:', {
        employeeId,
        leaveRequestId,
        hodType: hod.hodType,
        query: employeeQuery
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

    // Update leave request status
    leaveRequest.hodStatus = status;
    leaveRequest.hodRemarks = remarks;
    leaveRequest.hodApprovalDate = new Date();

    if (status === 'Rejected') {
      leaveRequest.status = 'Rejected';
      leaveRequest.rejectionBy = 'HOD';
      // Try to send rejection email, but don't block the update if it fails
      try {
        await sendLeaveRejectionEmail(leaveRequest, employee, hod);
      } catch (emailError) {
        console.error('Error sending rejection email (non-blocking):', emailError.message);
        // Continue with the update even if email fails
      }
    } else if (status === 'Approved') {
      // Determine forward destination based on employee type
      if (employee.employeeType === 'non-teaching') {
        // Non-teaching: forward to HR
        leaveRequest.status = 'Forwarded to HR';
        // No HR notification - status change only
      } else {
        // Teaching: forward to Principal (existing flow)
        leaveRequest.status = 'Forwarded by HOD';
        // Try to send principal notification, but don't block the update if it fails
        try {
          await sendPrincipalNotification(leaveRequest, employee, hod);
        } catch (emailError) {
          console.error('Error sending principal notification email (non-blocking):', emailError.message);
          // Continue with the update even if email fails
        }
      }
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
    const isTeaching = req.user.hodType !== 'non-teaching' && !!req.user.branchCode;
    
    let hod;
    if (req.user.model === 'User') {
      // User model is only for teaching HODs
      hod = await User.findOne({
        _id: req.user.id,
        role: 'hod',
        campus: req.user.campus,
        branchCode: req.user.branchCode
      });
    } else {
      // HOD model - handle both teaching and non-teaching
      if (isTeaching) {
        hod = await HOD.findOne({
          _id: req.user.id,
          'department.code': req.user.branchCode,
          'department.campusType': req.user.campus.charAt(0).toUpperCase() + req.user.campus.slice(1),
          hodType: 'teaching'
        });
      } else {
        // Non-teaching HOD - find by ID and hodType only
        hod = await HOD.findOne({
          _id: req.user.id,
          hodType: 'non-teaching'
        });
      }
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
    const isTeaching = req.user.hodType !== 'non-teaching' && !!req.user.branchCode;
    
    let hod;
    if (req.user.model === 'User') {
      // User model is only for teaching HODs
      hod = await User.findOne({
        _id: req.user.id,
        role: 'hod',
        campus: req.user.campus,
        branchCode: req.user.branchCode
      }).select('hodLeaveRequests leaveBalance');
    } else {
      // HOD model - handle both teaching and non-teaching
      if (isTeaching) {
        hod = await HOD.findOne({
          _id: req.user.id,
          'department.code': req.user.branchCode,
          'department.campusType': req.user.campus.charAt(0).toUpperCase() + req.user.campus.slice(1),
          hodType: 'teaching'
        }).select('hodLeaveRequests leaveBalance');
      } else {
        // Non-teaching HOD - find by ID and hodType only
        hod = await HOD.findOne({
          _id: req.user.id,
          hodType: 'non-teaching'
        }).select('hodLeaveRequests leaveBalance');
      }
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

    const { campus } = req.user;
    
    // Get HOD to determine type
    let hod;
    if (req.user.model === 'User') {
      hod = await User.findOne({
        _id: req.user.id,
        role: 'hod',
        campus: req.user.campus,
        branchCode: req.user.branchCode
      });
    } else {
      hod = await HOD.findById(req.user.id);
    }

    if (!hod) {
      return res.status(404).json({ msg: 'HOD not found' });
    }

    // Build query based on HOD type
    let employeeQuery = {
      campus: campus.toLowerCase(),
      status: 'active'
    };

    if (hod.hodType === 'teaching') {
      // Teaching HOD: get employees by department
      if (!req.user.branchCode) {
        return res.status(400).json({ msg: 'Branch code required for teaching HOD' });
      }
      employeeQuery.department = req.user.branchCode;
      employeeQuery.employeeType = 'teaching';
    } else {
      // Non-teaching HOD: get employees assigned to this HOD
      employeeQuery.assignedHodId = hod._id;
      employeeQuery.employeeType = 'non-teaching';
    }

    // Find all employees matching the query
    const employees = await Employee.find(employeeQuery)
      .select('name email employeeId department employeeType assignedHodId phoneNumber leaveBalance status role roleDisplayName designation');

    console.log(`Found ${employees.length} employees for ${hod.hodType} HOD in ${campus} campus`);

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
      branchCode: req.user.branchCode,
      hodType: req.user.hodType
    });

    const isTeaching = req.user.hodType !== 'non-teaching' && !!req.user.branchCode;
    
    let hod;
    if (req.user.model === 'User') {
      // User model is only for teaching HODs
      hod = await User.findOne({
        _id: req.user.id,
        role: 'hod',
        campus: req.user.campus,
        branchCode: req.user.branchCode
      }).select('-password').populate('campus');
    } else {
      // HOD model - handle both teaching and non-teaching
      if (isTeaching) {
        hod = await HOD.findOne({
          _id: req.user.id,
          'department.code': req.user.branchCode,
          'department.campusType': req.user.campus.charAt(0).toUpperCase() + req.user.campus.slice(1),
          hodType: 'teaching'
        }).select('-password').populate('campus');
      } else {
        // Non-teaching HOD - find by ID and hodType only
        hod = await HOD.findOne({
          _id: req.user.id,
          hodType: 'non-teaching'
        }).select('-password').populate('campus');
      }
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
      branchCode: req.user.branchCode,
      hodType: hod.hodType
    });

    // Build query based on HOD type
    let employeeQuery = {
      campus: req.user.campus.toLowerCase(),
      status: 'active'
    };

    if (hod.hodType === 'teaching') {
      // Teaching HOD: get employees by department
      if (!req.user.branchCode) {
        return res.status(400).json({ msg: 'Branch code required for teaching HOD' });
      }
      employeeQuery.department = req.user.branchCode;
      employeeQuery.employeeType = 'teaching';
    } else {
      // Non-teaching HOD: get employees assigned to this HOD
      employeeQuery.assignedHodId = hod._id;
      employeeQuery.employeeType = 'non-teaching';
    }

    // Get all employees matching the query with populated leave requests
    const employees = await Employee.find(employeeQuery)
    .select('name email employeeId department employeeType assignedHodId phoneNumber leaveBalance status role roleDisplayName designation leaveRequests')
    .populate({
      path: 'leaveRequests.alternateSchedule.periods.substituteFaculty',
      select: 'name'
    });

    console.log(`Found ${employees.length} employees for ${hod.hodType} HOD`);

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
        employeeDepartment: employee.employeeType === 'non-teaching' ? 'Non-Teaching' : (employee.department || 'N/A'),
        employeeEmployeeId: employee.employeeId,
        employeePhoneNumber: employee.phoneNumber,
        employeeType: employee.employeeType,
        alternateSchedule: leave.alternateSchedule ? leave.alternateSchedule.map(schedule => ({
          date: schedule.date,
          periods: schedule.periods.map(period => ({
            periodNumber: period.periodNumber,
            substituteFaculty: period.substituteFaculty ? period.substituteFaculty.name : 'Unknown Faculty',
            assignedClass: period.assignedClass
          }))
        })) : []
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
      forwardedLeaves: departmentLeaves.filter(leave => 
        leave.status === 'Forwarded by HOD' || leave.status === 'Forwarded to HR'
      ).length
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

    // Find the employee - try by employeeId field first, then by MongoDB _id
    let employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      // Try finding by MongoDB _id if employeeId field lookup failed
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(employeeId)) {
        employee = await Employee.findById(employeeId);
      }
    }
    
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
      const emailCheckQuery = {
        email: sanitizedUpdates.email.toLowerCase(),
        _id: { $ne: employee._id }
      };
      const existingEmployee = await Employee.findOne(emailCheckQuery);
      if (existingEmployee) {
        return res.status(400).json({ msg: 'Email already exists' });
      }
      sanitizedUpdates.email = sanitizedUpdates.email.toLowerCase();
    }

    // Update employee using the correct identifier
    const updateQuery = employee.employeeId === employeeId 
      ? { employeeId } 
      : { _id: employee._id };
    
    const updatedEmployee = await Employee.findOneAndUpdate(
      updateQuery,
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

    // Find the employee - try by employeeId field first, then by MongoDB _id
    let employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      // Try finding by MongoDB _id if employeeId field lookup failed
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(employeeId)) {
        employee = await Employee.findById(employeeId);
      }
    }
    
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
      const updateQuery = employee.employeeId === employeeId 
        ? { employeeId } 
        : { _id: employee._id };
      
      const updatedEmployee = await Employee.findOneAndUpdate(
        updateQuery,
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
    const isTeaching = req.user.hodType !== 'non-teaching' && !!req.user.branchCode;
    
    console.log('Getting CCL work requests for HOD:', {
      department: req.user.branchCode,
      campus: req.user.campus,
      hodType: req.user.hodType
    });

    // Build employee query based on HOD type
    let employeeQuery = {
      campus: req.user.campus.toLowerCase(),
      status: 'active'
    };

    if (isTeaching) {
      // Teaching HOD: get employees by department
      if (!req.user.branchCode) {
        return res.status(400).json({ msg: 'Branch code required for teaching HOD' });
      }
      employeeQuery.department = req.user.branchCode;
      employeeQuery.employeeType = 'teaching';
    } else {
      // Non-teaching HOD: get employees assigned to this HOD
      employeeQuery.assignedHodId = req.user.id;
      employeeQuery.employeeType = 'non-teaching';
    }

    // Get all employees in this department or assigned to this HOD
    const employees = await Employee.find(employeeQuery)
    .select('name email employeeId department employeeType assignedHodId phoneNumber')
    .populate({
      path: 'cclWork',
      match: { status: 'Pending' }, // Only get pending requests for HOD
      options: { sort: { createdAt: -1 } }
    });
    console.log(`Found ${employees.length} employees in department`);

    // Collect all pending CCL work requests
    const cclWorkRequests = employees.reduce((acc, employee) => {
      if (!employee.cclWork || !Array.isArray(employee.cclWork) || employee.cclWork.length === 0) {
        console.log(`No pending CCL work requests found for employee ${employee.employeeId}`);
        return acc;
      }

      const employeeRequests = employee.cclWork
        .filter(request => request.status === 'Pending') // Double check status
        .map(request => ({
          ...request.toObject(),
          employeeName: employee.name,
          employeeEmail: employee.email,
          employeeDepartment: employee.employeeType === 'non-teaching' ? 'Non-Teaching' : (employee.department || 'N/A'),
          employeeEmployeeId: employee.employeeId,
          employeePhoneNumber: employee.phoneNumber,
          employeeType: employee.employeeType || 'teaching'
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
    const isTeaching = req.user.hodType !== 'non-teaching' && !!branchCode;
    
    let employeeQuery = {
      _id: cclWorkRequest.submittedBy,
      campus: campus.toLowerCase()
    };

    if (isTeaching) {
      // Teaching HOD: check by department
      if (!branchCode) {
        return res.status(400).json({ 
          success: false,
          message: 'Branch code required for teaching HOD' 
        });
      }
      employeeQuery.department = branchCode;
      employeeQuery.employeeType = 'teaching';
    } else {
      // Non-teaching HOD: check by assignedHodId
      employeeQuery.assignedHodId = req.user.id;
      employeeQuery.employeeType = 'non-teaching';
    }

    const employee = await Employee.findOne(employeeQuery);

    if (!employee) {
      console.log('Employee not found or not authorized:', {
        submittedBy: cclWorkRequest.submittedBy,
        branchCode,
        campus: campus.toLowerCase(),
        isTeaching,
        hodId: req.user.id
      });
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found or not authorized' 
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