const { Designation, HR } = require('../models');
const asyncHandler = require('express-async-handler');

// Get all designations (filtered by HR's campus)
exports.getDesignations = asyncHandler(async (req, res) => {
  try {
    const { campusType, employeeType, isActive } = req.query;
    
    // Get HR's campus if not provided
    let hrCampusTypes = [];
    if (!campusType) {
      const hr = await HR.findById(req.user.id);
      if (hr && hr.campus) {
        // Get campus type from HR
        const campusTypeFromHR = hr.campus.type || 
          (hr.campus.name ? hr.campus.name.charAt(0).toUpperCase() + hr.campus.name.slice(1) : null);
        if (campusTypeFromHR) {
          hrCampusTypes = [campusTypeFromHR.toLowerCase()];
        }
      }
    } else {
      hrCampusTypes = Array.isArray(campusType) ? campusType : [campusType.toLowerCase()];
    }

    // Build query
    const query = {};
    
    if (hrCampusTypes.length > 0) {
      query.campusTypes = { $in: hrCampusTypes };
    }
    
    if (employeeType) {
      query.$or = [
        { employeeType: employeeType },
        { employeeType: 'both' }
      ];
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    }

    const designations = await Designation.find(query)
      .sort({ displayName: 1 })
      .lean();

    res.json({
      success: true,
      count: designations.length,
      data: designations
    });
  } catch (error) {
    console.error('Get Designations Error:', error);
    res.status(500).json({ 
      success: false,
      msg: error.message || 'Server error' 
    });
  }
});

// Get designations by campus type
exports.getDesignationsByCampus = asyncHandler(async (req, res) => {
  try {
    const { campusType } = req.params;
    const { employeeType, isActive } = req.query;

    if (!campusType) {
      return res.status(400).json({ 
        success: false,
        msg: 'Campus type is required' 
      });
    }

    const query = {
      campusTypes: { $in: [campusType.toLowerCase()] }
    };

    if (employeeType) {
      query.$or = [
        { employeeType: employeeType },
        { employeeType: 'both' }
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    }

    const designations = await Designation.find(query)
      .sort({ displayName: 1 })
      .lean();

    res.json({
      success: true,
      count: designations.length,
      data: designations
    });
  } catch (error) {
    console.error('Get Designations By Campus Error:', error);
    res.status(500).json({ 
      success: false,
      msg: error.message || 'Server error' 
    });
  }
});

// Get single designation
exports.getDesignation = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const designation = await Designation.findById(id);
    
    if (!designation) {
      return res.status(404).json({ 
        success: false,
        msg: 'Designation not found' 
      });
    }

    res.json({
      success: true,
      data: designation
    });
  } catch (error) {
    console.error('Get Designation Error:', error);
    res.status(500).json({ 
      success: false,
      msg: error.message || 'Server error' 
    });
  }
});

// Create new designation
exports.createDesignation = asyncHandler(async (req, res) => {
  try {
    const { name, code, displayName, campusTypes, employeeType, description } = req.body;

    // Validate required fields
    if (!name || !code || !displayName || !campusTypes || !Array.isArray(campusTypes) || campusTypes.length === 0) {
      return res.status(400).json({ 
        success: false,
        msg: 'Please provide name, code, displayName, and at least one campus type' 
      });
    }

    // Validate campus types
    const validCampusTypes = ['engineering', 'degree', 'pharmacy', 'diploma'];
    const invalidCampusTypes = campusTypes.filter(ct => !validCampusTypes.includes(ct.toLowerCase()));
    if (invalidCampusTypes.length > 0) {
      return res.status(400).json({ 
        success: false,
        msg: `Invalid campus types: ${invalidCampusTypes.join(', ')}. Valid types: ${validCampusTypes.join(', ')}` 
      });
    }

    // Check if code already exists
    const existingCode = await Designation.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      return res.status(400).json({ 
        success: false,
        msg: 'Designation code already exists' 
      });
    }

    // Check if name already exists
    const existingName = await Designation.findOne({ name: name.trim() });
    if (existingName) {
      return res.status(400).json({ 
        success: false,
        msg: 'Designation name already exists' 
      });
    }

    // Create designation
    const designation = new Designation({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      displayName: displayName.trim(),
      campusTypes: campusTypes.map(ct => ct.toLowerCase()),
      employeeType: employeeType || 'both',
      description: description ? description.trim() : '',
      createdBy: req.user.id,
      createdByModel: 'HR',
      isActive: true
    });

    await designation.save();

    res.status(201).json({
      success: true,
      msg: 'Designation created successfully',
      data: designation
    });
  } catch (error) {
    console.error('Create Designation Error:', error);
    res.status(500).json({ 
      success: false,
      msg: error.message || 'Server error' 
    });
  }
});

// Update designation
exports.updateDesignation = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, displayName, campusTypes, employeeType, description, isActive } = req.body;

    const designation = await Designation.findById(id);
    
    if (!designation) {
      return res.status(404).json({ 
        success: false,
        msg: 'Designation not found' 
      });
    }

    // Update fields
    if (name !== undefined) designation.name = name.trim();
    if (code !== undefined) {
      // Check if new code conflicts with existing
      const existingCode = await Designation.findOne({ 
        code: code.toUpperCase(),
        _id: { $ne: id }
      });
      if (existingCode) {
        return res.status(400).json({ 
          success: false,
          msg: 'Designation code already exists' 
        });
      }
      designation.code = code.trim().toUpperCase();
    }
    if (displayName !== undefined) designation.displayName = displayName.trim();
    if (campusTypes !== undefined) {
      if (!Array.isArray(campusTypes) || campusTypes.length === 0) {
        return res.status(400).json({ 
          success: false,
          msg: 'Campus types must be a non-empty array' 
        });
      }
      const validCampusTypes = ['engineering', 'degree', 'pharmacy', 'diploma'];
      const invalidCampusTypes = campusTypes.filter(ct => !validCampusTypes.includes(ct.toLowerCase()));
      if (invalidCampusTypes.length > 0) {
        return res.status(400).json({ 
          success: false,
          msg: `Invalid campus types: ${invalidCampusTypes.join(', ')}` 
        });
      }
      designation.campusTypes = campusTypes.map(ct => ct.toLowerCase());
    }
    if (employeeType !== undefined) {
      if (!['teaching', 'non-teaching', 'both'].includes(employeeType)) {
        return res.status(400).json({ 
          success: false,
          msg: 'Employee type must be teaching, non-teaching, or both' 
        });
      }
      designation.employeeType = employeeType;
    }
    if (description !== undefined) designation.description = description.trim();
    if (isActive !== undefined) designation.isActive = isActive === true || isActive === 'true';

    await designation.save();

    res.json({
      success: true,
      msg: 'Designation updated successfully',
      data: designation
    });
  } catch (error) {
    console.error('Update Designation Error:', error);
    res.status(500).json({ 
      success: false,
      msg: error.message || 'Server error' 
    });
  }
});

// Delete designation (soft delete by setting isActive to false)
exports.deleteDesignation = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const designation = await Designation.findById(id);
    
    if (!designation) {
      return res.status(404).json({ 
        success: false,
        msg: 'Designation not found' 
      });
    }

    // Soft delete - set isActive to false
    designation.isActive = false;
    await designation.save();

    res.json({
      success: true,
      msg: 'Designation deactivated successfully'
    });
  } catch (error) {
    console.error('Delete Designation Error:', error);
    res.status(500).json({ 
      success: false,
      msg: error.message || 'Server error' 
    });
  }
});

// Hard delete designation (use with caution)
exports.hardDeleteDesignation = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const designation = await Designation.findById(id);
    
    if (!designation) {
      return res.status(404).json({ 
        success: false,
        msg: 'Designation not found' 
      });
    }

    // Check if designation is being used by any employees
    const { Employee } = require('../models');
    const employeesUsingDesignation = await Employee.countDocuments({
      $or: [
        { role: designation.code },
        { designation: designation.name }
      ]
    });

    if (employeesUsingDesignation > 0) {
      return res.status(400).json({ 
        success: false,
        msg: `Cannot delete designation. It is being used by ${employeesUsingDesignation} employee(s). Please deactivate it instead.` 
      });
    }

    await Designation.findByIdAndDelete(id);

    res.json({
      success: true,
      msg: 'Designation deleted successfully'
    });
  } catch (error) {
    console.error('Hard Delete Designation Error:', error);
    res.status(500).json({ 
      success: false,
      msg: error.message || 'Server error' 
    });
  }
});

