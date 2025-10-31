const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const hrController = require('../controllers/hrController');
const { upload, deleteProfilePicture } = require('../utils/s3Upload');
const taskController = require('../controllers/taskController');
const { Campus } = require('../models');

// Public routes
router.post('/login', hrController.login);

// Protected routes
router.use(protect);
router.use(authorize('hr'));

// Profile management
router.get('/profile', hrController.getProfile);
router.put('/profile', hrController.updateProfile);

// Employee management
router.post('/employees', hrController.registerEmployee);
router.get('/employees', hrController.getCampusEmployees);
router.put('/employees/:id', hrController.updateEmployee);
router.post('/employees/:id/reset-password', hrController.resetEmployeePassword);
router.get('/roles', hrController.getCampusRoles);
router.post('/employees/bulk', hrController.bulkRegisterEmployees);


// HR Leave Requests
router.get('/leave-requests', hrController.getCampusLeaveRequests);
router.put('/leave-requests/:id/update-status', hrController.updateLeaveRequestStatus);

// HR Task Management
router.post('/tasks', taskController.createTask);
router.get('/tasks', taskController.listTasks);
router.put('/tasks/:id', taskController.updateTask);
router.delete('/tasks/:id', taskController.deleteTask);

// Branches
router.get('/branches', async (req, res) => {
  try {
    console.log('Branches endpoint hit. User:', req.user);
    
    // Get the HR's campus type from the authenticated user
    const hrCampusType = req.user?.campus?.type;
    
    if (!hrCampusType) {
      console.error('HR campus type not found in user object:', req.user);
      return res.status(400).json({ 
        success: false,
        msg: 'HR campus information not found',
        user: req.user // Include user object for debugging
      });
    }
    
    console.log('Fetching branches for HR campus type:', hrCampusType);
    
    // Find the campus document that matches the HR's campus type
    const campus = await Campus.findOne({
      type: { $regex: new RegExp(`^${hrCampusType}$`, 'i') },
      isActive: true
    }).lean();
    
    console.log('Found campus:', campus ? 'Yes' : 'No');
    
    if (!campus) {
      console.error(`No active campus found for type: ${hrCampusType}`);
      return res.status(404).json({ 
        success: false,
        msg: `Campus not found for type: ${hrCampusType}`
      });
    }
    
    // Get active branches from the campus
    const branches = (campus.branches || [])
      .filter(branch => branch.isActive !== false)
      .map(branch => ({
        name: branch.name || 'Unnamed Branch',
        code: branch.code || 'N/A',
        campusType: campus.type || 'Unknown',
        isActive: branch.isActive !== false
      }));
    
    console.log(`Found ${branches.length} active branches for campus:`, hrCampusType);
    console.log('Sample branch data:', branches[0]);
    
    res.json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    console.error('Error in /branches endpoint:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error while fetching branches',
      error: error.message
    });
  }
});

// Profile picture management for employees
router.post('/employees/:id/upload-profile-picture', upload.single('profilePicture'), hrController.uploadEmployeeProfilePicture);
router.delete('/employees/:id/delete-profile-picture', hrController.deleteEmployeeProfilePicture);

// HOD Management
router.get('/hods', hrController.getAllHODs);
router.post('/hods', hrController.createHOD);
router.put('/hods/:id', hrController.updateHOD);
router.delete('/hods/:id', hrController.deleteHOD);
router.post('/hods/:id/reset-password', hrController.resetHODPassword);
router.get('/departments', hrController.getDepartments);

module.exports = router;