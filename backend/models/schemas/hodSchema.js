const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const hodSchema = new mongoose.Schema({
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
  phoneNumber: {
    type: String,
    required: false
  },
  password: {
    type: String,
    required: true
  },
  HODId: {
    type: String,
    required: true,
    unique: true
  },
  hodType: {
    type: String,
    enum: ['teaching', 'non-teaching'],
    default: 'teaching',
    required: true
  },
  department: {
    name: {
      type: String,
      required: function() {
        return this.hodType === 'teaching';
      }
    },
    code: {
      type: String,
      required: function() {
        return this.hodType === 'teaching';
      }
    },
    campusType: {
      type: String,
      required: function() {
        return this.hodType === 'teaching';
      },
      enum: ['Engineering', 'Diploma', 'Pharmacy', 'Degree']
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'createdByModel'
  },
  createdByModel: {
    type: String,
    required: true,
    enum: ['Principal', 'User', 'HR']
  },
  campus: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'campusModel'
  },
  campusModel: {
    type: String,
    required: true,
    enum: ['Principal', 'User']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  leaveRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveRequest'
  }],
  leaveBalance: { type: Number, default: 12 },
 
}, {
  timestamps: true
});

// Validate department code based on campus type and branches
hodSchema.pre('save', async function(next) {
  try {
    // Skip validation for non-teaching HODs
    if (this.hodType === 'non-teaching') {
      return next();
    }

    if (!this.isNew && !this.isModified('department')) return next();

    // For teaching HODs, validate department
    if (!this.department || !this.department.code) {
      throw new Error('Department is required for teaching HODs');
    }

    this.department.campusType = this.department.campusType.charAt(0).toUpperCase() + this.department.campusType.slice(1);

    let principal;
    if (this.campusModel === 'User') {
      principal = await mongoose.model('User').findOne({
        _id: this.campus,
        role: 'principal'
      });
    }

    if (!principal && this.campusModel === 'Principal') {
      principal = await mongoose.model('Principal').findById(this.campus);
    }
    
    if (!principal) {
      throw new Error(`Principal not found in ${this.campusModel} model`);
    }

    // Get the campus document
    const campus = await mongoose.model('Campus').findOne({
      principalId: principal._id,
      type: this.department.campusType
    });

    if (!campus) {
      throw new Error(`Campus not found for type ${this.department.campusType}`);
    }

    // Check if the department code exists in the campus's branches
    const branchExists = campus.branches.some(branch => 
      branch.code === this.department.code && branch.isActive
    );

    if (!branchExists) {
      throw new Error(`Invalid department code ${this.department.code} for campus type ${this.department.campusType}`);
    }

    let principalCampusType;
    if (this.campusModel === 'Principal') {
      principalCampusType = principal.campus.type;
    } else {
      principalCampusType = principal.campus.charAt(0).toUpperCase() + principal.campus.slice(1);
    }

    console.log('HOD Validation:', {
      hodDepartmentType: this.department.campusType,
      principalCampusType,
      principalModel: this.campusModel,
      principalId: this.campus
    });

    if (principalCampusType !== this.department.campusType) {
      throw new Error(`Department campus type (${this.department.campusType}) does not match principal campus type (${principalCampusType})`);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Hash password before saving
hodSchema.pre('save', async function(next) {
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
hodSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

module.exports = hodSchema; 