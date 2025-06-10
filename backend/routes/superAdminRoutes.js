const express = require('express');
const router = express.Router();
const { authSuperAdmin } = require('../middleware/auth');
const SuperAdminController = require('../controllers/superAdminController');

// Auth routes
router.post('/login', SuperAdminController.login);

// Public routes
router.get('/campuses/active', SuperAdminController.getActiveCampuses);

// Protected routes
router.use(authSuperAdmin); // Apply auth middleware to all routes below

// Campus management
router.post('/campuses', SuperAdminController.createCampus);
router.get('/campuses', SuperAdminController.getAllCampuses);
router.put('/campus-status', SuperAdminController.updateCampusStatus);

// Principal management
router.post('/principals', SuperAdminController.createPrincipal);
router.get('/principals', SuperAdminController.getAllPrincipals);
router.get('/principals/:id', SuperAdminController.getPrincipal);
router.put('/principals/:id', SuperAdminController.updatePrincipal);
router.delete('/principals/:id', SuperAdminController.deletePrincipal);

// Password management
router.put('/reset-principal-password', SuperAdminController.resetPrincipalPassword);

// Dashboard
router.get('/dashboard', SuperAdminController.getDashboard);

// HR management routes
router.post('/hrs', SuperAdminController.createHR);
router.get('/hrs', SuperAdminController.getAllHRs);
router.put('/hrs/status', SuperAdminController.updateHRStatus);
router.post('/hrs/reset-password', SuperAdminController.resetHRPassword);
router.put('/hrs/:id', SuperAdminController.updateHR);

module.exports = router; 