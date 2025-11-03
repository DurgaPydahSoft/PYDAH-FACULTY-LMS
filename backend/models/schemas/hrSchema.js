const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const hrSchema = new mongoose.Schema({
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
  password: {
    type: String,
    required: true
  },
  campus: {
    type: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    }
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
    session: {
      type: String,
      enum: ['Morning', 'Afternoon']
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
    status: {
      type: String,
      enum: ['Pending', 'Forwarded to SuperAdmin', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    appliedOn: {
      type: String,
      default: function() {
        return new Date().toISOString().split('T')[0];
      }
    },
    remarks: {
      type: String
    },
    superAdminRemarks: {
      type: String
    },
    superAdminApprovalDate: {
      type: Date
    },
    rejectionBy: {
      type: String,
      enum: ['HR', 'SuperAdmin']
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
hrSchema.pre('save', async function(next) {
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
hrSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

module.exports = hrSchema; 