const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const hrController = require('../controllers/hrController');

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

module.exports = router; 