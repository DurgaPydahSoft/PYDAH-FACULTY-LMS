const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  campusTypes: [{
    type: String,
    enum: ['engineering', 'degree', 'pharmacy', 'diploma'],
    required: true
  }],
  employeeType: {
    type: String,
    enum: ['teaching', 'non-teaching', 'both'],
    default: 'both'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    required: true
  },
  createdByModel: {
    type: String,
    enum: ['HR', 'SuperAdmin'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
designationSchema.index({ campusTypes: 1, employeeType: 1, isActive: 1 });
designationSchema.index({ code: 1 });

module.exports = designationSchema;

