const mongoose = require('mongoose');

const cclWorkRequestSchema = new mongoose.Schema({
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  assignedTo: {
    type: String,
    enum: ['Principal', 'Dean', 'Vice Principal', 'DD'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Forwarded to Principal', 'Approved', 'Rejected'],
    default: 'Pending',
    validate: {
      validator: function(v) {
        return ['Pending', 'Forwarded to Principal', 'Approved', 'Rejected'].includes(v);
      },
      message: props => `${props.value} is not a valid status!`
    }
  },
  hodRemarks: {
    type: String
  },
  hodApprovalDate: {
    type: Date
  },
  principalRemarks: {
    type: String
  },
  principalApprovalDate: {
    type: Date
  },
  cclRequestId: {
    type: String,
    required: true,
    unique: true
  }
  ,
  // Mark whether this CCL work day has already been consumed for leave
  isUsed: {
    type: Boolean,
    default: false
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  usedInLeaveRequestId: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CCLWorkRequest', cclWorkRequestSchema); 