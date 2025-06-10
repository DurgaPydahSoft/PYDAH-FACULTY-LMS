const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  type: {
    type: String
  },
  location: {
    type: String,
    required: true,
    default: 'Visakhapatnam'
  },
  principalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Principal'
  },
  branches: [{
    name: {
      type: String,
      required: true
    },
    code: {
      type: String,
      required: true,
      uppercase: true
    },
    hodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HOD'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add index for faster queries
campusSchema.index({ name: 1, type: 1 });

module.exports = campusSchema; 