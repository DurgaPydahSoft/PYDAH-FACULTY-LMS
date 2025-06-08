// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]{5,}@[^\s@]{2,}\.[^\s@]{2,}$/;
  return emailRegex.test(email);
};

// Branch code validation
export const validateBranchCode = (code) => {
  // Branch code should be 2-6 characters, uppercase letters and numbers only
  const branchCodeRegex = /^[A-Z0-9]{2,6}$/;
  return branchCodeRegex.test(code);
};

// Campus validation
export const validateCampus = (campus) => {
  const validCampuses = ['engineering', 'degree', 'pharmacy', 'diploma'];
  return validCampuses.includes(campus.toLowerCase());
};

// Password validation
export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}; 