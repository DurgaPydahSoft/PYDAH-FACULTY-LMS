const mongoose = require('mongoose');

const periodAssignmentSchema = new mongoose.Schema({
  periodNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  substituteFaculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  assignedClass: {
    type: String,
    required: true
  }
});

const dayScheduleSchema = new mongoose.Schema({
  date: {
    type: String, // Store as YYYY-MM-DD string
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD`
    }
  },
  periods: [periodAssignmentSchema]
});

const leaveRequestSchema = new mongoose.Schema({
  leaveRequestId: {
    type: String,
    unique: true,
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'employeeModel'
  },
  employeeModel: {
    type: String,
    required: true,
    enum: ['Employee', 'HOD', 'User']
  },
  leaveType: {
    type: String,
    required: true,
    enum: ['CL', 'CCL', 'Medical', 'Maternity', 'OD', 'Others']
  },
  isHalfDay: {
    type: Boolean,
    default: false
  },
  session: {
    type: String,
    enum: ['morning', 'afternoon'],
    required: function() {
      return this.isHalfDay;
    }
  },
  // Original dates requested by employee
  startDate: {
    type: String, // Store as YYYY-MM-DD string
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD`
    }
  },
  endDate: {
    type: String, // Store as YYYY-MM-DD string
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD`
    }
  },
  numberOfDays: {
    type: Number,
    required: true
  },
  // Original dates before modification by principal
  originalStartDate: {
    type: String, // Store as YYYY-MM-DD string
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD`
    }
  },
  originalEndDate: {
    type: String, // Store as YYYY-MM-DD string
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD`
    }
  },
  originalNumberOfDays: {
    type: Number,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return v >= 0.5;
      },
      message: 'Original number of days must be at least 0.5'
    }
  },
  reason: {
    type: String,
    required: true
  },
  alternateSchedule: [dayScheduleSchema],
  status: {
    type: String,
    enum: ['Pending', 'Forwarded by HOD', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  hodRemarks: {
    type: String,
    default: ''
  },
  hodApprovalDate: {
    type: Date
  },
  principalRemarks: {
    type: String,
    default: ''
  },
  principalApprovalDate: {
    type: Date
  },
  appliedOn: {
    type: Date,
    default: Date.now
  },
  // New fields for principal date modifications
  approvedStartDate: {
    type: String, // Store as YYYY-MM-DD string
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD`
    }
  },
  approvedEndDate: {
    type: String, // Store as YYYY-MM-DD string
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD`
    }
  },
  approvedNumberOfDays: {
    type: Number,
    min: 0.5,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return v >= 0.5;
      },
      message: 'Approved number of days must be at least 0.5'
    }
  },
  isModifiedByPrincipal: {
    type: Boolean,
    default: false
  },
  principalModificationDate: {
    type: Date
  },
  principalModificationReason: {
    type: String,
    default: ''
  },
  // New fields for CL/LOP split
  clDays: {
    type: Number,
    default: 0
  },
  lopDays: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate unique leave request ID
leaveRequestSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findById(this.employeeId);
      
      if (!employee) {
        throw new Error('Employee not found');
      }

      const currentYear = new Date().getFullYear();
      const department = employee.department;
      
      // Find the latest leave request for this type, year, and department
      const latestRequest = await this.constructor.findOne({
        leaveType: this.leaveType,
        leaveRequestId: new RegExp(`^${this.leaveType}${currentYear}${department}`)
      }).sort({ leaveRequestId: -1 });

      let sequenceNumber = 1;
      if (latestRequest) {
        // Extract the sequence number from the latest request's ID
        const lastSequence = parseInt(latestRequest.leaveRequestId.slice(-4));
        sequenceNumber = lastSequence + 1;
      }

      // Generate the new ID
      this.leaveRequestId = `${this.leaveType}${currentYear}${department}${sequenceNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      next(error);
      return;
    }
  }
  next();
});

// Validate dates and number of days
leaveRequestSchema.pre('validate', function(next) {
  // Convert string dates to Date objects for validation
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if dates are valid
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    next(new Error('Invalid date format'));
    return;
  }

  // Check if end date is not before start date
  if (endDate < startDate) {
    next(new Error('End date cannot be before start date'));
    return;
  }

  // Special validation for half-day leave
  if (this.isHalfDay) {
    if (this.startDate !== this.endDate) {
      next(new Error('For half-day leave, start and end date must be the same'));
      return;
    }
    if (this.numberOfDays !== 0.5) {
      next(new Error('Half-day leave must be exactly 0.5 days'));
      return;
    }
  } else {
    // Validate number of days matches date range for full-day leaves
    const diffTime = Math.abs(endDate - startDate);
    const actualDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (actualDays !== this.numberOfDays) {
      next(new Error(`Date range spans ${actualDays} days but ${this.numberOfDays} days were requested`));
      return;
    }
  }

  // Validate leave balance and alternate schedule before save
  leaveRequestSchema.pre('save', async function(next) {
    try {
      const Employee = this.model('Employee');
      const employee = await Employee.findById(this.employeeId);
      
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Check leave balance based on leave type
      if (this.isNew || this.isModified('leaveType') || this.isModified('numberOfDays')) {
        switch(this.leaveType) {
          case 'CCL':
            if (employee.cclBalance < this.numberOfDays) {
              throw new Error(`Insufficient CCL balance. Available: ${employee.cclBalance} days`);
            }
            break;
          case 'CL':
            if (employee.leaveBalance < this.numberOfDays) {
              throw new Error(`Insufficient leave balance. Available: ${employee.leaveBalance} days`);
            }
            break;
          case 'OD':
            // No balance check needed for OD
            break;
          default:
            throw new Error('Invalid leave type');
        }
      }

      // Validate alternate schedule if provided
      if (this.alternateSchedule && this.alternateSchedule.length > 0) {
        // Check if alternate schedule is provided for each day
        const scheduleDates = this.alternateSchedule.map(schedule => schedule.date);

        let currentDate = new Date(this.startDate);
        const endDate = new Date(this.endDate);
        
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          if (!scheduleDates.includes(dateStr)) {
            throw new Error(`Alternate schedule not provided for ${dateStr}`);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Validate each schedule entry
        for (const schedule of this.alternateSchedule) {
          // Check for duplicate periods
          const periodNumbers = schedule.periods.map(p => p.periodNumber);
          if (new Set(periodNumbers).size !== periodNumbers.length) {
            throw new Error(`Duplicate periods found in schedule for ${schedule.date}`);
          }

          // Check faculty availability for each period
          for (const period of schedule.periods) {
            const faculty = await Employee.findById(period.substituteFaculty);
            if (!faculty) {
              throw new Error(`Substitute faculty not found for period ${period.periodNumber}`);
            }

            // Check if faculty has leave on this date
            const hasLeave = faculty.leaveRequests.some(leave => 
              leave.status !== 'Rejected' &&
              new Date(schedule.date) >= new Date(leave.startDate) &&
              new Date(schedule.date) <= new Date(leave.endDate)
            );

            if (hasLeave) {
              throw new Error(`Faculty ${faculty.name} is on leave on ${schedule.date}`);
            }

            // Check if faculty is already assigned elsewhere
            const hasConflict = faculty.cclWork.some(work => 
              new Date(work.date).toISOString().split('T')[0] === schedule.date &&
              work.periods.some(p => p.periodNumber === period.periodNumber)
            );

            if (hasConflict) {
              throw new Error(`Faculty ${faculty.name} is already assigned for period ${period.periodNumber}`);
            }
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  });
});
module.exports = leaveRequestSchema;