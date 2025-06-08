const express = require('express');
const router = express.Router();
const { authPrincipal } = require('../middleware/auth');
const {
  login,
  getProfile,
  updateProfile,
  getCampusLeaves,
  updateLeaveRequest,
  applyPrincipalLeave,
  getPrincipalLeaves,
  getDashboard,
  getCampusStats,
  getCampusHods,
  updateHodDetails,
  resetHodPassword,
  createHOD,
  getCampusEmployees,
  registerPrincipal,
  getCCLWorkRequests,
  updateCCLWorkRequestStatus,
  createBranch,
  listBranches,
  editBranch,
  deleteBranch,
  updateEmployeeDetails,
  deleteEmployee
} = require('../controllers/principalController');

// Public routes
router.post('/login', login);

// Protected routes - apply auth middleware
router.use(authPrincipal);

// Profile routes
router.get('/me', getProfile);
router.put('/profile', updateProfile);

// HOD management routes
router.get('/hods', getCampusHods);
router.post('/hods', createHOD);
router.put('/hods/:hodId', updateHodDetails);
router.post('/hods/:hodId/reset-password', resetHodPassword);

// Employee management routes
router.get('/employees', getCampusEmployees);
router.put('/employees/:id', updateEmployeeDetails);
router.delete('/employees/:id', deleteEmployee);

// Leave management routes
router.get('/campus-leaves', getCampusLeaves);
router.get('/leaves', getPrincipalLeaves);
router.post('/leave-request', applyPrincipalLeave);
router.put('/leave-request/:id', updateLeaveRequest);

// Dashboard routes
router.get('/dashboard', getDashboard);
router.get('/campus-stats', getCampusStats);

// CCL work request routes
router.get('/ccl-work-requests', getCCLWorkRequests);
router.put('/ccl-work-requests/:workId', updateCCLWorkRequestStatus);

// Branch management routes
router.post('/branches', createBranch);
router.get('/branches', listBranches);
router.put('/branches/:branchId', editBranch);
router.delete('/branches/:branchId', deleteBranch);

module.exports = router; 