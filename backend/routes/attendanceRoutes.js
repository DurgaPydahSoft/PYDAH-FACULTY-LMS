const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');
const multer = require('multer');

// Configure multer for memory storage (for Excel files)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) and CSV files are allowed.'), false);
    }
  }
});

// Protected routes
router.use(protect);
router.use(authorize('hr'));

// Upload attendance Excel and get preview
router.post('/preview', upload.single('file'), attendanceController.uploadAttendancePreview);

// Submit attendance records
router.post('/submit', attendanceController.submitAttendance);

// Get attendance by date
router.get('/date/:date', attendanceController.getAttendanceByDate);

// Get employee attendance history
router.get('/employee/:employeeId', attendanceController.getEmployeeAttendance);

// Update attendance record
router.put('/:id', attendanceController.updateAttendance);

// Delete attendance record
router.delete('/:id', attendanceController.deleteAttendance);

module.exports = router;

