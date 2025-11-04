const mongoose = require('mongoose');

// Import all schemas
const userSchema = require('./schemas/userSchema');
const principalSchema = require('./schemas/principalSchema');
const hodSchema = require('./schemas/hodSchema');
const employeeSchema = require('./schemas/employeeSchema');
const superAdminSchema = require('./schemas/superAdminSchema');
const campusSchema = require('./schemas/campusSchema');
const leaveRequestSchema = require('./schemas/leaveRequestSchema');
const cclWorkRequestSchema = require('./CCLWorkRequest').schema;
const hrSchema = require('./schemas/hrSchema');
const taskSchema = require('./schemas/taskSchema');
const attendanceSchema = require('./schemas/attendanceSchema');

// Register models only if they haven't been registered
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Principal = mongoose.models.Principal || mongoose.model('Principal', principalSchema);
const HOD = mongoose.models.HOD || mongoose.model('HOD', hodSchema);
const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
const SuperAdmin = mongoose.models.SuperAdmin || mongoose.model('SuperAdmin', superAdminSchema);
const Campus = mongoose.models.Campus || mongoose.model('Campus', campusSchema);
const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema);
const CCLWorkRequest = mongoose.models.CCLWorkRequest || mongoose.model('CCLWorkRequest', cclWorkRequestSchema);

const HR = mongoose.models.HR || mongoose.model('HR', hrSchema);
const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

module.exports = {
  User,
  Principal,
  HOD,
  Employee,
  SuperAdmin,
  Campus,
  LeaveRequest,
  CCLWorkRequest,
  HR,
  Task,
  Attendance
};