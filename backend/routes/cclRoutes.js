const express = require('express');
const router = express.Router();
const { authEmployee, authHOD, authPrincipal } = require('../middleware/auth');
const {
  submitCCLWork,
  getCCLWorkHistory,
  approveCCLWork,
  principalApproveCCLWork,
  getDepartmentCCLRequests
} = require('../controllers/cclController');

// Employee routes
router.post('/work', authEmployee, submitCCLWork);
router.get('/history', authEmployee, getCCLWorkHistory);

// HOD routes
router.get('/department', authHOD, getDepartmentCCLRequests);
router.put('/work/:employeeId/:cclWorkId/hod-approve', authHOD, approveCCLWork);

// Principal routes
router.put('/work/:employeeId/:cclWorkId/principal-approve', authPrincipal, principalApproveCCLWork);

module.exports = router; 