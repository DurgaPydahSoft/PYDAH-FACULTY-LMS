const { User, Campus, SuperAdmin, Principal, HR } = require('../models');
const jwt = require('jsonwebtoken');
const { validateEmail, validatePassword } = require('../utils/validators');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Super Admin login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    if (!superAdmin) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    if (superAdmin.status !== 'active') {
      return res.status(401).json({ msg: 'Account is inactive' });
    }

    const isMatch = await superAdmin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // Update lastLogin
    superAdmin.lastLogin = Date.now();
    await superAdmin.save();

    const token = jwt.sign(
      { id: superAdmin._id, role: 'superadmin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: 'superadmin',
        lastLogin: superAdmin.lastLogin
      }
    });
  } catch (error) {
    console.error('Super Admin Login Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Create Campus
exports.createCampus = async (req, res) => {
  try {
    const { name, displayName, type } = req.body;

    // Validate required input
    if (!name || !displayName) {
      return res.status(400).json({ msg: 'Please provide name and display name' });
    }

    // Check if campus already exists
    const existingCampus = await Campus.findOne({ name });
    if (existingCampus) {
      return res.status(400).json({ msg: 'Campus already exists' });
    }

    // Create a temporary principal for initial campus creation
    const tempPrincipal = new Principal({
      name: 'Temporary Principal',
      email: `temp.${name}@pydah.edu.in`,
      password: 'temporary123',
      campus: {
        type: type || 'Engineering', // Provide a default type for the principal
        name: name,
        location: 'Visakhapatnam'
      },
      status: 'inactive'
    });

    await tempPrincipal.save();

    // Create new campus with required fields
    const campus = new Campus({
      name,
      displayName,
      type: type || undefined, // Only include type if provided
      principalId: tempPrincipal._id,
      principalModel: 'Principal',
      isActive: true,
      branches: [] // Initialize empty branches array
    });

    await campus.save();

    res.status(201).json({
      msg: 'Campus created successfully',
      campus: {
        id: campus._id,
        name: campus.name,
        displayName: campus.displayName,
        type: campus.type,
        isActive: campus.isActive,
        principalId: campus.principalId
      }
    });
  } catch (error) {
    console.error('Create Campus Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Get All Campuses
exports.getAllCampuses = async (req, res) => {
  try {
    const campuses = await Campus.find()
      .populate({
        path: 'principalId',
        select: 'name email lastLogin status',
        model: Principal // Use the actual Principal model instead of dynamic reference
      })
      .sort({ createdAt: -1 });

    // Format response to include principal status
    const formattedCampuses = campuses.map(campus => {
      const campusObj = campus.toObject();
      if (campusObj.principalId) {
        campusObj.principalId.isActive = campusObj.principalId.status === 'active';
      }
      return campusObj;
    });

    res.json(formattedCampuses);
  } catch (error) {
    console.error('Get Campuses Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Get Active Campuses
exports.getActiveCampuses = async (req, res) => {
  try {
    const campuses = await Campus.find({ isActive: true })
      .select('name displayName type location')
      .sort({ name: 1 });

    // If displayName is not set, use name as displayName
    const formattedCampuses = campuses.map(campus => ({
      ...campus.toObject(),
      displayName: campus.displayName || campus.name.charAt(0).toUpperCase() + campus.name.slice(1)
    }));

    res.json(formattedCampuses);
  } catch (error) {
    console.error('Get Active Campuses Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Create Principal and Assign to Campus
exports.createPrincipal = async (req, res) => {
  try {
    const { name, email, password, campusId } = req.body;

    // Validate input
    if (!name || !email || !password || !campusId) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Check if campus exists
    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(400).json({ msg: 'Campus not found' });
    }

    // Check if email is already in use
    const existingPrincipal = await Principal.findOne({ email: email.toLowerCase() });
    if (existingPrincipal) {
      return res.status(400).json({ msg: 'Email already in use' });
    }

    // Create principal in Principal model
    const principal = new Principal({
      name,
      email: email.toLowerCase(),
      password,
      campus: {
        type: campus.type,
        name: campus.name,
        location: campus.location
      },
      status: 'active'
    });

    await principal.save();

    // Delete the temporary principal if it exists
    if (campus.principalId) {
      await Principal.findByIdAndDelete(campus.principalId);
    }

    // Update campus with new principal ID
    campus.principalId = principal._id;
    campus.principalModel = 'Principal';
    await campus.save();

    res.status(201).json({
      msg: 'Principal created and assigned successfully',
      principal: {
        id: principal._id,
        name: principal.name,
        email: principal.email,
        campus: principal.campus
      }
    });
  } catch (error) {
    console.error('Create Principal Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Update Campus Status
exports.updateCampusStatus = async (req, res) => {
  try {
    const { campusId, isActive } = req.body;

    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(404).json({ msg: 'Campus not found' });
    }

    campus.isActive = isActive;

    // If deactivating campus, also deactivate principal
    if (!isActive && campus.principalId) {
      await User.findByIdAndUpdate(campus.principalId, { isActive: false });
    }

    await campus.save();

    res.json({ 
      msg: 'Campus status updated successfully',
      campus: await Campus.findById(campusId).populate('principalId', 'name email lastLogin')
    });
  } catch (error) {
    console.error('Update Campus Status Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Reset Principal Password
exports.resetPrincipalPassword = async (req, res) => {
  try {
    const { principalId, newPassword } = req.body;

    const principal = await Principal.findById(principalId);

    if (!principal) {
      return res.status(404).json({ msg: 'Principal not found' });
    }

    principal.password = newPassword;
    await principal.save();

    res.json({ msg: 'Principal password reset successfully' });
  } catch (error) {
    console.error('Reset Principal Password Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get all principals
exports.getAllPrincipals = async (req, res) => {
  try {
    const principals = await Principal.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(principals);
  } catch (error) {
    console.error('Get All Principals Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get single principal
exports.getPrincipal = async (req, res) => {
  try {
    const principal = await Principal.findById(req.params.id)
      .select('-password');

    if (!principal) {
      return res.status(404).json({ msg: 'Principal not found' });
    }

    res.json(principal);
  } catch (error) {
    console.error('Get Principal Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update principal
exports.updatePrincipal = async (req, res) => {
  try {
    const { name, email } = req.body;
    const principalId = req.params.id;

    const principal = await Principal.findById(principalId);
    if (!principal) {
      return res.status(404).json({ msg: 'Principal not found' });
    }

    // Validate email if provided
    if (email && email !== principal.email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ msg: 'Please provide a valid email address' });
      }
      const existingPrincipal = await Principal.findOne({ email: email.toLowerCase() });
      if (existingPrincipal) {
        return res.status(400).json({ msg: 'Email already in use' });
      }
      principal.email = email.toLowerCase();
    }

    if (name) principal.name = name;

    await principal.save();

    res.json({
      msg: 'Principal updated successfully',
      principal: {
        id: principal._id,
        name: principal.name,
        email: principal.email,
        campus: principal.campus,
        status: principal.status
      }
    });
  } catch (error) {
    console.error('Update Principal Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Delete principal
exports.deletePrincipal = async (req, res) => {
  try {
    const principal = await Principal.findById(req.params.id);
    if (!principal) {
      return res.status(404).json({ msg: 'Principal not found' });
    }

    await principal.remove();
    res.json({ msg: 'Principal removed' });
  } catch (error) {
    console.error('Delete Principal Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get dashboard data
exports.getDashboard = async (req, res) => {
  try {
    const totalPrincipals = await Principal.countDocuments();
    const activePrincipals = await Principal.countDocuments({ status: 'active' });
    const inactivePrincipals = await Principal.countDocuments({ status: 'inactive' });

    const campusTypeDistribution = await Principal.aggregate([
      {
        $group: {
          _id: '$campus.type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalPrincipals,
      activePrincipals,
      inactivePrincipals,
      campusTypeDistribution
    });
  } catch (error) {
    console.error('Get Dashboard Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Create HR
exports.createHR = async (req, res) => {
  try {
    const { name, email, password, campusId } = req.body;

    // Validate input
    if (!name || !email || !password || !campusId) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Check if campus exists
    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(400).json({ msg: 'Campus not found' });
    }

    // Check if email is already in use
    const existingHR = await HR.findOne({ email: email.toLowerCase() });
    if (existingHR) {
      return res.status(400).json({ msg: 'Email already in use' });
    }

    // Create HR
    const hr = new HR({
      name,
      email: email.toLowerCase(),
      password,
      campus: {
        type: campus.type,
        name: campus.name,
        location: campus.location
      },
      status: 'active'
    });

    await hr.save();

    res.status(201).json({
      msg: 'HR created successfully',
      hr: {
        id: hr._id,
        name: hr.name,
        email: hr.email,
        campus: hr.campus,
        status: hr.status
      }
    });
  } catch (error) {
    console.error('Create HR Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Get All HRs
exports.getAllHRs = async (req, res) => {
  try {
    const hrs = await HR.find()
      .select('-password') // Exclude password from response
      .sort({ createdAt: -1 });

    res.json(hrs);
  } catch (error) {
    console.error('Get HRs Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Update HR Status
exports.updateHRStatus = async (req, res) => {
  try {
    const { hrId, status } = req.body;

    if (!hrId || !status) {
      return res.status(400).json({ msg: 'Please provide HR ID and status' });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const hr = await HR.findById(hrId);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }

    hr.status = status;
    await hr.save();

    res.json({
      msg: 'HR status updated successfully',
      hr: {
        id: hr._id,
        name: hr.name,
        email: hr.email,
        status: hr.status
      }
    });
  } catch (error) {
    console.error('Update HR Status Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Reset HR Password
exports.resetHRPassword = async (req, res) => {
  try {
    const { hrId, newPassword } = req.body;

    if (!hrId || !newPassword) {
      return res.status(400).json({ msg: 'Please provide HR ID and new password' });
    }

    // Validate password
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        msg: 'Password must be at least 6 characters long'
      });
    }

    const hr = await HR.findById(hrId);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }

    // Assign new password directly; pre-save hook will hash it
    hr.password = newPassword;
    hr.lastLogin = null; // Force re-login
    await hr.save();

    res.json({ msg: 'HR password reset successfully' });
  } catch (error) {
    console.error('Reset HR Password Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
};

// Update HR
exports.updateHR = async (req, res) => {
  try {
    const { name, email } = req.body;
    const hrId = req.params.id;

    const hr = await HR.findById(hrId);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }

    // Validate email if provided
    if (email && email !== hr.email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ msg: 'Please provide a valid email address' });
      }
      const existingHR = await HR.findOne({ email: email.toLowerCase() });
      if (existingHR) {
        return res.status(400).json({ msg: 'Email already in use' });
      }
      hr.email = email.toLowerCase();
    }

    if (name) hr.name = name;

    await hr.save();

    res.json({
      msg: 'HR updated successfully',
      hr: {
        id: hr._id,
        name: hr.name,
        email: hr.email,
        campus: hr.campus,
        status: hr.status
      }
    });
  } catch (error) {
    console.error('Update HR Error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
}; 