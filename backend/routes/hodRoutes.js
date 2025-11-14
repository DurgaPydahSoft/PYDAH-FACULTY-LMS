const express = require('express');
const router = express.Router();
const { authHOD } = require('../middleware/auth');
const {
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
} = require('../controllers/hodController');
const taskController = require('../controllers/taskController');

// Auth routes (no auth required)
router.post('/register', registerHod);
router.post('/login', login);

// Protected routes (auth required)
router.use(authHOD);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Department routes
router.get('/department/leaves', getDepartmentLeaves);
router.get('/department/employees', getDepartmentEmployees);
router.get('/department/stats', getDepartmentStats);

// Leave management routes
router.put('/leaves/:employeeId/:leaveRequestId', updateLeaveRequest);
router.post('/leaves', applyHodLeave);
router.get('/leaves', getHodLeaves);

// Employee management routes
router.put('/employees/:employeeId', updateEmployeeDetails);
router.put('/employees/:employeeId/reset-password', resetEmployeePassword);

// Dashboard routes
router.get('/dashboard', getDashboard);

// CCL routes
router.get('/ccl-work-requests', getCCLWorkRequests);
router.put('/ccl-work-requests/:workId', updateCCLWorkRequestStatus);

// Task routes
router.get('/tasks', taskController.listTasksForHod); // Tasks assigned to HOD
router.get('/tasks/manage', taskController.listTasksByCreator); // Tasks created by HOD
router.post('/tasks/manage', taskController.createTask); // HOD can create tasks
router.put('/tasks/manage/:id', taskController.updateTask); // HOD can update tasks they created
router.delete('/tasks/manage/:id', taskController.deleteTask); // HOD can delete tasks they created
router.put('/tasks/:taskId/acknowledgements', taskController.updateTaskAcknowledgement);

module.exports = router;
