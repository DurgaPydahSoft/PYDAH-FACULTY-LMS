const mongoose = require('mongoose');

const ASSIGNEE_MODELS = ['Employee', 'HOD'];
const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical'];
const TASK_STATUSES = ['draft', 'active', 'completed', 'archived'];
const RECURRENCE_FREQUENCIES = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
const ACK_STATUSES = ['pending', 'acknowledged', 'completed'];

const assignmentSchema = new mongoose.Schema({
  includeAllEmployees: {
    type: Boolean,
    default: false
  },
  includeAllHods: {
    type: Boolean,
    default: false
  },
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  hods: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HOD'
  }],
  departments: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  campuses: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, { _id: false });

const recurrenceSchema = new mongoose.Schema({
  frequency: {
    type: String,
    enum: RECURRENCE_FREQUENCIES,
    default: 'none'
  },
  interval: {
    type: Number,
    default: 1,
    min: 1
  },
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6
  }],
  endDate: Date
}, { _id: false });

const acknowledgementSchema = new mongoose.Schema({
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'assigneeModel',
    required: true
  },
  assigneeModel: {
    type: String,
    enum: ASSIGNEE_MODELS,
    required: true
  },
  status: {
    type: String,
    enum: ACK_STATUSES,
    default: 'acknowledged'
  },
  comment: {
    type: String,
    trim: true
  },
  proofUrl: {
    type: String,
    trim: true
  },
  respondedAt: Date
}, {
  timestamps: true
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  dueDate: Date,
  priority: {
    type: String,
    enum: PRIORITY_LEVELS,
    default: 'medium'
  },
  status: {
    type: String,
    enum: TASK_STATUSES,
    default: 'active'
  },
  assignedTo: {
    type: assignmentSchema,
    default: () => ({})
  },
  requireAcknowledgement: {
    type: Boolean,
    default: false
  },
  recurrence: {
    type: recurrenceSchema,
    default: () => ({})
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateName: {
    type: String,
    trim: true
  },
  attachments: [{
    type: String,
    trim: true
  }],
  acknowledgements: [acknowledgementSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  createdByRole: {
    type: String,
    enum: ['hr', 'hod', 'principal', 'superadmin'],
    default: 'hr'
  },
  givenBy: {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    role: {
      type: String,
      enum: ['hr', 'hod', 'principal']
    }
  }
}, {
  timestamps: true
});

module.exports = taskSchema;
