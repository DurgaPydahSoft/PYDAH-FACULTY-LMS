const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const cclWorkSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  periods: [{
    periodNumber: Number,
    class: String,
    subject: String,
    originalFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }
  }],
  reason: String,
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  approvedBy: {
    hod: {
      type: Boolean,
      default: false
    },
    principal: {
      type: Boolean,
      default: false
    }
  },
  remarks: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  password: {
    type: String,
    required: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  designation: {
    type: String
  },
  specialPermission: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: [
      'associate_professor',
      'assistant_professor',
      'lab_incharge',
      'lab_assistant',
      'technician',
      'librarian',
      'pet',
      'senior_lecturer',
      'lecturer',
      'faculty',
      'other'
    ],
    default: 'faculty'
  },
  roleDisplayName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  campus: {
    type: String,
    enum: ['engineering', 'degree', 'pharmacy', 'diploma'],
    required: true
  },
  branchCode: {
    type: String,
    required: true,
    uppercase: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  leaveBalance: {
    type: Number,
    default: 12
  },
  leaveBalanceByExperience: {
    type: Number,
    default: 0
  },
  lastLeaveBalanceReset: {
    type: Date,
    default: Date.now
  },
  cclBalance: {
    type: Number,
    default: 0
  },
  cclHistory: [{
    type: {
      type: String,
      enum: ['earned', 'used'],
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    days: {
      type: Number,
      required: true
    },
    reference: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'cclHistory.referenceModel'
    },
    referenceModel: {
      type: String,
      enum: ['LeaveRequest', 'CCLWork']
    },
    remarks: String
  }],
  cclWork: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CCLWorkRequest'
  }],
  leaveRequests: [{
    leaveRequestId: {
      type: String,
      unique: false,
      required: true
    },
    leaveType: {
      type: String,
      required: true,
      enum: ['CL', 'CCL', 'OD']
    },
    isHalfDay: {
      type: Boolean,
      default: false
    },
    startDate: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD`
      }
    },
    endDate: {
      type: String,
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
    reason: {
      type: String,
      required: true
    },
    alternateSchedule: [{
      date: {
        type: String,
        required: true,
        validate: {
          validator: function(v) {
            return /^\d{4}-\d{2}-\d{2}$/.test(v);
          },
          message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD`
        }
      },
      periods: [{
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
      }]
    }],
    status: {
      type: String,
      enum: ['Pending', 'Forwarded by HOD', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    remarks: String,
    appliedOn: {
      type: String,
      default: () => new Date().toISOString().split('T')[0]
    },
    approvedBy: {
      hod: {
        type: Boolean,
        default: false
      },
      principal: {
        type: Boolean,
        default: false
      }
    },
    approvedAt: {
      type: Date,
      default: null
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to update CCL balance
employeeSchema.methods.updateCCLBalance = async function(type, days, reference, referenceModel, remarks = '') {
  const change = type === 'earned' ? days : -days;
  this.cclBalance += change;
  
  this.cclHistory.push({
    type,
    date: new Date(),
    days,
    reference,
    referenceModel,
    remarks
  });

  await this.save();
  return this.cclBalance;
};

// Add leave request validation middleware
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('leaveRequests')) {
    return next();
  }

  try {
    // Get the latest leave request
    const latestLeaveRequest = this.leaveRequests[this.leaveRequests.length - 1];
    if (!latestLeaveRequest) {
      return next();
    }

    // Convert string dates to Date objects for validation
    const startDate = new Date(latestLeaveRequest.startDate);
    const endDate = new Date(latestLeaveRequest.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }

    // Check if end date is not before start date
    if (endDate < startDate) {
      throw new Error('End date cannot be before start date');
    }

    // Special validation for half-day leave
    if (latestLeaveRequest.isHalfDay) {
      if (latestLeaveRequest.startDate !== latestLeaveRequest.endDate) {
        throw new Error('For half-day leave, start and end date must be the same');
      }
      if (latestLeaveRequest.numberOfDays !== 0.5) {
        throw new Error('Half-day leave must be exactly 0.5 days');
      }
    } else {
      // Validate number of days matches date range for full-day leaves
      const diffTime = Math.abs(endDate - startDate);
      const actualDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (actualDays !== latestLeaveRequest.numberOfDays) {
        throw new Error(`Date range spans ${actualDays} days but ${latestLeaveRequest.numberOfDays} days were requested`);
      }
    }

    // Validate maximum leave duration
    if (latestLeaveRequest.numberOfDays > 20) {
      throw new Error('Leave duration cannot exceed 20 days');
    }

    // Validate leave balance
    if (latestLeaveRequest.leaveType === 'CL') {
      if (this.leaveBalance < latestLeaveRequest.numberOfDays) {
        throw new Error(`Insufficient leave balance. Available: ${this.leaveBalance} days`);
      }
    } else if (latestLeaveRequest.leaveType === 'CCL') {
      // For CCL, check if this is a new leave request being added
      if (latestLeaveRequest.isNew) {
        const daysToCheck = latestLeaveRequest.isHalfDay ? 0.5 : latestLeaveRequest.numberOfDays;
        if (this.cclBalance < daysToCheck) {
          throw new Error(`Insufficient CCL balance. Available: ${this.cclBalance} days`);
        }
      }
    }

    // Validate alternate schedule if employee is faculty
    if (this.role === 'faculty' && !latestLeaveRequest.isHalfDay) {
      if (!latestLeaveRequest.alternateSchedule || !Array.isArray(latestLeaveRequest.alternateSchedule) || latestLeaveRequest.alternateSchedule.length === 0) {
        throw new Error('Faculty must provide alternate schedule for leave days');
      }

      // Validate schedule for each day
      const scheduleDates = latestLeaveRequest.alternateSchedule.map(s => s.date);
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (!scheduleDates.includes(dateStr)) {
          throw new Error(`Alternate schedule not provided for ${dateStr}`);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Validate each schedule entry
      for (const schedule of latestLeaveRequest.alternateSchedule) {
        // Check for duplicate periods
        const periodNumbers = schedule.periods.map(p => p.periodNumber);
        if (new Set(periodNumbers).size !== periodNumbers.length) {
          throw new Error(`Duplicate periods found in schedule for ${schedule.date}`);
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Add pre-save middleware to generate leaveRequestId for new leave requests
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('leaveRequests')) {
    return next();
  }

  try {
    // Get the latest leave request
    const latestLeaveRequest = this.leaveRequests[this.leaveRequests.length - 1];
    if (!latestLeaveRequest) {
      return next();
    }
    // Only generate if not already present
    if (!latestLeaveRequest.leaveRequestId) {
      const currentYear = new Date().getFullYear();
      const department = this.department;
      const leaveType = latestLeaveRequest.leaveType;
      // Find the highest sequence number for this type/year/department
      let maxSeq = 0;
      this.leaveRequests.forEach(lr => {
        if (
          lr.leaveRequestId &&
          lr.leaveRequestId.startsWith(`${leaveType}${currentYear}${department}`)
        ) {
          const seq = parseInt(lr.leaveRequestId.slice(-4));
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      });
      const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
      latestLeaveRequest.leaveRequestId = `${leaveType}${currentYear}${department}${nextSeq}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Add static method for role/campus validation
employeeSchema.statics.validateRoleForCampus = function(campus, role) {
  const validRoles = {
    engineering: [
      'associate_professor', 'assistant_professor', 'lab_incharge', 'lab_assistant', 'technician', 'librarian', 'pet', 'other'
    ],
    diploma: [
      'senior_lecturer', 'lecturer', 'lab_incharge', 'lab_assistant', 'technician', 'other'
    ],
    pharmacy: [
      'associate_professor', 'assistant_professor', 'lab_incharge', 'lab_assistant', 'technician', 'other'
    ],
    degree: [
      'associate_professor', 'assistant_professor', 'lab_incharge', 'lab_assistant', 'technician', 'other'
    ]
  };
  if (!validRoles[campus]) {
    throw new Error('Invalid campus type');
  }
  if (!validRoles[campus].includes(role)) {
    throw new Error(`Invalid role for ${campus} campus`);
  }
  return true;
};

// Method to reset leave balance based on experience
employeeSchema.methods.resetLeaveBalance = async function() {
  const currentYear = new Date().getFullYear();
  const lastResetYear = new Date(this.lastLeaveBalanceReset).getFullYear();
  
  // Only reset if it's a new year
  if (currentYear > lastResetYear) {
    // Store the old balance in history before resetting
    if (this.leaveBalance !== this.leaveBalanceByExperience) {
      this.leaveHistory = this.leaveHistory || [];
      this.leaveHistory.push({
        type: 'reset',
        date: new Date(),
        days: this.leaveBalanceByExperience - this.leaveBalance,
        remarks: `Annual leave balance reset to ${this.leaveBalanceByExperience} days based on experience`
      });
    }
    
    // Reset to the experience-based balance
    this.leaveBalance = this.leaveBalanceByExperience;
    this.lastLeaveBalanceReset = new Date();
    await this.save();
    
    console.log('Leave balance reset:', {
      employeeId: this._id,
      employeeName: this.name,
      oldBalance: this.leaveBalance,
      newBalance: this.leaveBalanceByExperience,
      resetDate: this.lastLeaveBalanceReset
    });
  }
};

// Add pre-save middleware to check and reset leave balance if needed
employeeSchema.pre('save', async function(next) {
  try {
    // Check if this is a new document
    if (this.isNew) {
      // For new employees, set initial leave balance based on experience
      if (this.leaveBalanceByExperience > 0) {
        this.leaveBalance = this.leaveBalanceByExperience;
      }
      return next();
    }

    // For existing employees, check if leave balance needs to be reset
    if (this.isModified('leaveBalanceByExperience')) {
      // If experience-based balance is updated, update current balance
      this.leaveBalance = this.leaveBalanceByExperience;
      this.lastLeaveBalanceReset = new Date();
    } else {
      // Check if it's time for annual reset
      await this.resetLeaveBalance();
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = employeeSchema; 