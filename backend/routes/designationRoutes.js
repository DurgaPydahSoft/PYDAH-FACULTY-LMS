const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const designationController = require('../controllers/designationController');

// All routes require authentication
router.use(protect);

// HR routes
router.use(authorize('hr'));

// Get all designations (filtered by HR's campus)
router.get('/', designationController.getDesignations);

// Get designations by campus type
router.get('/campus/:campusType', designationController.getDesignationsByCampus);

// Get single designation
router.get('/:id', designationController.getDesignation);

// Create designation
router.post('/', designationController.createDesignation);

// Update designation
router.put('/:id', designationController.updateDesignation);

// Delete designation (soft delete)
router.delete('/:id', designationController.deleteDesignation);

// Hard delete designation (use with caution)
router.delete('/:id/hard', designationController.hardDeleteDesignation);

module.exports = router;

