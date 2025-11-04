const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    ref: 'Employee',
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD format
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD`
    },
    index: true
  },
  inTime: {
    type: String, // HH:MM format (24-hour)
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format! Use HH:MM (24-hour)`
    }
  },
  outTime: {
    type: String, // HH:MM format (24-hour)
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format! Use HH:MM (24-hour)`
    }
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half-Day Present', 'Incomplete', 'Leave'],
    required: true
  },
  leaveRequestId: {
    type: String,
    default: null
  },
  remarks: {
    type: String,
    default: ''
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HR',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  isManual: {
    type: Boolean,
    default: false
  },
  employeeName: {
    type: String,
    default: ''
  },
  employeeDepartment: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate attendance for same employee-date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Index for date-based queries
attendanceSchema.index({ date: 1 });

// Index for employee-based queries
attendanceSchema.index({ employeeId: 1, date: -1 });

module.exports = attendanceSchema;

