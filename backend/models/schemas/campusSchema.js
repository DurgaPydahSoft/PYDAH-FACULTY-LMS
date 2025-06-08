const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Engineering', 'Diploma', 'Pharmacy', 'Degree'],
    required: true
  },
  location: {
    type: String,
    required: true
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

module.exports = campusSchema; 