const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const hrController = require('../controllers/hrController');
const { upload, deleteProfilePicture } = require('../utils/s3Upload');
const taskController = require('../controllers/taskController');

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

// HR Task Management
router.post('/tasks', taskController.createTask);
router.get('/tasks', taskController.listTasks);

// Profile picture management for employees
router.post('/employees/:id/upload-profile-picture', upload.single('profilePicture'), hrController.uploadEmployeeProfilePicture);
router.delete('/employees/:id/delete-profile-picture', hrController.deleteEmployeeProfilePicture);

module.exports = router;