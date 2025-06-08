const jwt = require('jsonwebtoken');
const { User, SuperAdmin, Principal, HOD, Employee, HR } = require('../models');

// Generic protect middleware
exports.protect = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user based on role and model type
    let user;
    switch (decoded.role) {
      case 'superadmin':
        user = await SuperAdmin.findById(decoded.id);
        break;
      case 'principal':
        user = await Principal.findById(decoded.id);
        break;
      case 'hod':
        user = await HOD.findById(decoded.id);
        break;
      case 'employee':
        user = await Employee.findById(decoded.id);
        break;
      case 'hr':
        user = await HR.findById(decoded.id);
        break;
      default:
        return res.status(401).json({ msg: 'Invalid role' });
    }

    if (!user || user.status !== 'active') {
      return res.status(401).json({ msg: 'Token is not valid' });
    }

    req.user = {
      id: user._id,
      role: decoded.role,
      campus: user.campus,
      modelType: decoded.modelType
    };

    next();
  } catch (error) {
    console.error('Protect Middleware Error:', error);
    res.status(401).json({ msg: 'Authentication failed' });
  }
};

// Role-based authorization middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        msg: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Principal authentication
exports.authPrincipal = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'principal') {
      return res.status(403).json({ msg: 'Access denied. Principal only.' });
    }

    // First try Principal model
    let principal = await Principal.findById(decoded.id);
    let isUserModel = false;
    
    // If not found in Principal model, try User model
    if (!principal) {
      principal = await User.findOne({
        _id: decoded.id,
        role: 'principal'
      });
      isUserModel = true;
    }

    if (!principal || (principal.status !== 'active' && !principal.isActive)) {
      return res.status(401).json({ msg: 'Token is not valid' });
    }

    // Get campus type from token
    const campusType = decoded.campus;

    // Validate that the principal belongs to the requested campus
    if (isUserModel) {
      if (principal.campus.toLowerCase() !== campusType.toLowerCase()) {
        return res.status(401).json({ msg: 'Invalid campus for this principal' });
      }
    } else {
      if (principal.campus.type !== campusType) {
        return res.status(401).json({ msg: 'Invalid campus for this principal' });
      }
    }

    // Store user info with proper campus type and model type
    req.user = {
      id: principal._id,
      role: 'principal',
      campus: campusType,
      modelType: isUserModel ? 'User' : 'Principal'
    };

    // Store principal info with proper campus format
    if (isUserModel) {
      // User model - campus is a string
      req.principal = {
        ...principal.toObject(),
        campus: {
          type: campusType,
          name: `${campusType} Campus`,
          location: 'Default Location'
        }
      };
    } else {
      // Principal model - campus is an object
      req.principal = principal;
    }

    console.log('Principal Auth:', {
      principalId: principal._id,
      campus: req.user.campus,
      principalCampus: req.principal.campus,
      modelType: req.user.modelType,
      isUserModel
    });

    next();
  } catch (error) {
    console.error('Principal Auth Error:', error);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Super Admin authentication
exports.authSuperAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ msg: 'Access denied. Super Admin only.' });
    }

    const superAdmin = await SuperAdmin.findById(decoded.id);
    if (!superAdmin || superAdmin.status !== 'active') {
      return res.status(401).json({ msg: 'Token is not valid' });
    }

    req.user = {
      id: superAdmin._id,
      role: 'superadmin'
    };

    next();
  } catch (error) {
    res.status(401).json({ msg: 'Authentication failed' });
  }
};

// HOD authentication
exports.authHOD = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'hod') {
      return res.status(403).json({ msg: 'Access denied. HOD only.' });
    }

    // Check which model to use based on token data
    let hod;
    if (decoded.model === 'User') {
      hod = await User.findOne({
        _id: decoded.id,
        role: 'hod',
        campus: decoded.campus,
        branchCode: decoded.branchCode
      });

      if (!hod || !hod.isActive) {
        return res.status(401).json({ msg: 'Token is not valid' });
      }
    } else {
      hod = await HOD.findOne({
        _id: decoded.id,
        'department.code': decoded.branchCode,
        'department.campusType': decoded.campus.charAt(0).toUpperCase() + decoded.campus.slice(1)
      });

      if (!hod || hod.status !== 'active') {
        return res.status(401).json({ msg: 'Token is not valid' });
      }
    }

    // Set user data in request
    req.user = {
      id: hod._id,
      role: 'hod',
      campus: decoded.campus,
      branchCode: decoded.branchCode,
      model: decoded.model
    };

    next();
  } catch (error) {
    console.error('HOD Auth Error:', error);
    res.status(401).json({ msg: 'Authentication failed' });
  }
};

// Employee authentication
exports.authEmployee = async (req, res, next) => {
  try {
    console.log('Auth Headers:', req.headers);
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Extracted Token:', token);
    
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded Token:', decoded);
    
    // Find employee by MongoDB _id from token
    const employee = await Employee.findById(decoded.id);
    console.log('Found Employee:', employee ? {
      id: employee._id,
      employeeId: employee.employeeId,
      role: employee.role,
      status: employee.status
    } : null);
    
    if (!employee || employee.status !== 'active') {
      return res.status(401).json({ msg: 'Token is not valid' });
    }

    // Store employee details in request
    req.user = {
      id: employee._id,
      employeeId: employee.employeeId,
      role: employee.role || 'faculty', // Default to faculty if role not set
      campus: employee.campus,
      department: employee.department
    };
    console.log('User Context:', req.user);

    next();
  } catch (error) {
    console.error('Employee Auth Error:', error);
    res.status(401).json({ msg: 'Authentication failed' });
  }
};

// Campus-specific authentication
exports.authCampus = (allowedCampuses) => {
  return async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!allowedCampuses.includes(decoded.campus)) {
        return res.status(403).json({ msg: 'Access denied. Invalid campus.' });
      }

      req.user = {
        id: decoded.id,
        role: decoded.role,
        campus: decoded.campus
      };

      next();
    } catch (error) {
      res.status(401).json({ msg: 'Authentication failed' });
    }
  };
}; 