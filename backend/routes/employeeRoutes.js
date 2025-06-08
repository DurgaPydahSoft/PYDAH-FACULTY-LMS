const express = require("express");
const router = express.Router();
const { authEmployee } = require('../middleware/auth');
const employeeAuthController = require('../controllers/employeeAuthController');
const employeeDashboardController = require('../controllers/employeeDashboardController');
const employeeController = require("../controllers/employeeController.js");
const { Employee, Campus } = require('../models');
const { upload, deleteProfilePicture } = require('../utils/s3Upload');

// Debug middleware for employee routes
router.use((req, res, next) => {
  console.log('Employee Route accessed:', req.method, req.path);
  next();
});

// Auth routes (no auth required)
router.post('/register', employeeAuthController.register);
router.post('/login', employeeAuthController.login);

// Protected routes (auth required)
router.get('/dashboard', authEmployee, employeeDashboardController.getDashboard);
router.get('/leave-history', authEmployee, employeeDashboardController.getLeaveHistory);
router.get('/profile', authEmployee, employeeDashboardController.getProfile);
router.put('/profile', authEmployee, employeeDashboardController.updateProfile);

// Faculty list route (moved before :id route)
router.get('/faculty-list/:campus', authEmployee, async (req, res) => {
  try {
    const { campus } = req.params;
    
    // Validate campus parameter
    if (!campus) {
      return res.status(400).json({ message: 'Campus parameter is required' });
    }

    // Find all active employees in the specified campus (no role filter)
    const facultyList = await Employee.find({ 
      campus: campus.toLowerCase(),
      status: 'active'
    })
    .select('name employeeId department campus')
    .sort('name');
    
    if (!facultyList || facultyList.length === 0) {
      return res.status(404).json({ message: 'No employees found for this campus' });
    }

    res.json(facultyList);
  } catch (error) {
    console.error('Error fetching faculty list:', error);
    res.status(500).json({ message: 'Failed to fetch faculty list', error: error.message });
  }
});

// Leave balance route (moved before :id route)
router.get('/leave-balance', authEmployee, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      leaveBalance: employee.leaveBalance || 0,
      cclBalance: employee.cclBalance || 0
    });
  } catch (error) {
    console.error('Leave Balance Check Error:', error);
    res.status(500).json({ message: 'Error checking leave balance' });
  }
});

// CCL routes (must be before generic routes to prevent conflicts)
router.get('/ccl-history', authEmployee, employeeController.getCCLHistory);
router.get('/ccl-work-history', authEmployee, employeeController.getCCLWorkHistory);
router.post('/ccl-work', authEmployee, employeeController.submitCCLWorkRequest);

// Leave request routes
router.post('/leave-request', authEmployee, employeeController.addLeaveRequest);
router.get('/leave-request/:id', authEmployee, employeeController.getEmployeeById);
router.put('/leave-request/:id', authEmployee, employeeController.updateEmployee);

// Validate leave request dates
router.post('/validate-dates', authEmployee, async (req, res) => {
  try {
    const { startDate, endDate, numberOfDays } = req.body;
    
    // Convert dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Basic validations
    if (!start || !end || !numberOfDays) {
      return res.status(400).json({ 
        isValid: false, 
        message: 'Please provide all required fields' 
      });
    }

    // Calculate actual number of days
    const diffTime = Math.abs(end - start);
    const actualDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check if calculated days match requested days
    if (actualDays !== parseInt(numberOfDays)) {
      return res.status(400).json({ 
        isValid: false, 
        message: `Selected dates span ${actualDays} days, but requested ${numberOfDays} days` 
      });
    }

    res.json({ 
      isValid: true, 
      message: 'Dates are valid',
      days: actualDays 
    });
  } catch (error) {
    console.error('Date Validation Error:', error);
    res.status(500).json({ 
      isValid: false, 
      message: 'Error validating dates' 
    });
  }
});

// Check faculty availability
router.post('/check-faculty-availability', authEmployee, async (req, res) => {
  try {
    const { facultyId, date, periods } = req.body;

    // Find the faculty member
    const faculty = await Employee.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({ 
        isAvailable: false, 
        message: 'Faculty not found' 
      });
    }

    // Check if faculty has any leave requests for the given date
    const hasLeave = faculty.leaveRequests.some(leave => {
      const leaveDate = new Date(date);
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      return (
        leave.status !== 'Rejected' && 
        leaveDate >= startDate && 
        leaveDate <= endDate
      );
    });

    if (hasLeave) {
      return res.status(400).json({
        isAvailable: false,
        message: 'Faculty is on leave for the selected date'
      });
    }

    // Check if faculty is already assigned for any of the requested periods
    const hasConflict = faculty.cclWork.some(work => {
      const workDate = new Date(work.date);
      const requestDate = new Date(date);
      return (
        workDate.getTime() === requestDate.getTime() &&
        work.periods.some(p => periods.includes(p.periodNumber))
      );
    });

    if (hasConflict) {
      return res.status(400).json({
        isAvailable: false,
        message: 'Faculty is already assigned for some of the selected periods'
      });
    }

    res.json({
      isAvailable: true,
      message: 'Faculty is available'
    });
  } catch (error) {
    console.error('Faculty Availability Check Error:', error);
    res.status(500).json({ 
      isAvailable: false, 
      message: 'Error checking faculty availability' 
    });
  }
});

// Public: Get active branches for a campus
router.get('/branches', async (req, res) => {
  try {
    const { campus } = req.query;
    if (!campus) return res.status(400).json({ msg: 'Campus is required' });
    const campusDoc = await Campus.findOne({ name: campus.toLowerCase() });
    if (!campusDoc) return res.status(404).json({ msg: 'Campus not found' });
    const activeBranches = (campusDoc.branches || []).filter(b => b.isActive);
    res.json({ branches: activeBranches });
  } catch (error) {
    res.status(500).json({ msg: error.message || 'Server error' });
  }
});

// Profile picture upload route
router.post('/upload-profile-picture', authEmployee, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Delete old profile picture if exists
    if (employee.profilePicture) {
      await deleteProfilePicture(employee.profilePicture);
    }

    // Always construct the S3 URL if not present
    let imageUrl = req.file.location;
    if (!imageUrl && req.file.bucket && req.file.key) {
      imageUrl = `https://${req.file.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${req.file.key}`;
    }

    employee.profilePicture = imageUrl;
    await employee.save();

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: employee.profilePicture
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ message: 'Failed to upload profile picture' });
  }
});

// Delete profile picture route
router.delete('/delete-profile-picture', authEmployee, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employee.profilePicture) {
      await deleteProfilePicture(employee.profilePicture);
      employee.profilePicture = null;
      await employee.save();
    }

    res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });
  } catch (error) {
    console.error('Profile picture deletion error:', error);
    res.status(500).json({ message: 'Failed to delete profile picture' });
  }
});

// Generic employee routes (must be last to prevent conflicts)
router.get("/:id", authEmployee, employeeController.getEmployeeById);
router.put("/:id", authEmployee, employeeController.updateEmployee);
router.delete("/:id", authEmployee, employeeController.deleteEmployee);
router.put("/:id/leave-request/:leaveRequestId", authEmployee, employeeController.updateLeaveRequestStatus);

module.exports = router;
