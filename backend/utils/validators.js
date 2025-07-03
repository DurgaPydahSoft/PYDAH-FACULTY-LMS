// Email validation
exports.validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Password validation (skipped for principals)
exports.validatePassword = (password, role) => {
  // Skip validation for principals
  if (role === 'principal') return true;
  // For other roles, only require minimum length 6
  return typeof password === 'string' && password.length >= 6;
};

// Campus validation
exports.validateCampus = (campus) => {
  const validCampuses = ['engineering', 'degree', 'pharmacy', 'diploma'];
  return validCampuses.includes(campus.toLowerCase());
};

// Branch code validation
exports.validateBranchCode = (code) => {
  // Branch code should be 2-6 characters, uppercase letters and numbers only
  const branchCodeRegex = /^[A-Z0-9]{2,6}$/;
  return branchCodeRegex.test(code);
};

// Generate default password
exports.generateDefaultPassword = (name, role) => {
  // Remove spaces and special characters from name
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${cleanName.charAt(0).toUpperCase()}${cleanName.slice(1).toLowerCase()}@${role}${randomNum}`;
};

// Generate default email for HOD
exports.generateHODEmail = (name, branchCode, campus) => {
  const cleanName = name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
  return `hod.${cleanName}@${branchCode.toLowerCase()}.${campus}.edu`;
};

// Generate default email for employee
exports.generateEmployeeEmail = (name, employeeId, campus) => {
  const cleanName = name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
  return `${cleanName}.${employeeId}@${campus}.edu`;
};

// Generate default email for principal
exports.generatePrincipalEmail = (name, campus) => {
  const cleanName = name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
  return `principal.${cleanName}@${campus}.edu`;
};

// Validate leave request
exports.validateLeaveRequest = (startDate, endDate, leaveType) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, message: 'Invalid date format' };
  }

  // Check if end date is after start date
  if (end < start) {
    return { isValid: false, message: 'End date must be after start date' };
  }

  // Check if leave type is valid
  const validLeaveTypes = ['casual', 'sick', 'earned', 'other'];
  if (!validLeaveTypes.includes(leaveType)) {
    return { isValid: false, message: 'Invalid leave type' };
  }

  return { isValid: true };
};

// Validate alternate schedule
exports.validateAlternateSchedule = (schedule) => {
  if (!Array.isArray(schedule)) {
    return { isValid: false, message: 'Schedule must be an array' };
  }

  for (const entry of schedule) {
    // Check if date is valid
    const date = new Date(entry.date);
    if (isNaN(date.getTime())) {
      return { isValid: false, message: 'Invalid date in schedule' };
    }

    // Check if periods array is valid
    if (!Array.isArray(entry.periods) || entry.periods.length === 0) {
      return { isValid: false, message: 'Invalid periods in schedule' };
    }
  }

  return { isValid: true };
}; 