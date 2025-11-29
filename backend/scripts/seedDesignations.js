require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Designation } = require('../models');

// Hardcoded roles mapped to designations (from original getCampusRoles function)
const initialDesignations = [
  // Engineering Campus
  { name: 'associate_professor', code: 'ASSOC_PROF', displayName: 'Associate Professor', campusTypes: ['engineering', 'pharmacy', 'degree'], employeeType: 'teaching' },
  { name: 'assistant_professor', code: 'ASST_PROF', displayName: 'Assistant Professor', campusTypes: ['engineering', 'pharmacy', 'degree'], employeeType: 'teaching' },
  { name: 'lab_incharge', code: 'LAB_INCHARGE', displayName: 'Lab Incharge', campusTypes: ['engineering', 'diploma', 'pharmacy', 'degree'], employeeType: 'teaching' },
  { name: 'lab_assistant', code: 'LAB_ASST', displayName: 'Lab Assistant', campusTypes: ['engineering', 'diploma', 'pharmacy', 'degree'], employeeType: 'teaching' },
  { name: 'technician', code: 'TECHNICIAN', displayName: 'Technician', campusTypes: ['engineering', 'diploma', 'pharmacy', 'degree'], employeeType: 'both' },
  { name: 'librarian', code: 'LIBRARIAN', displayName: 'Librarian', campusTypes: ['engineering', 'pharmacy', 'degree'], employeeType: 'both' },
  { name: 'pet', code: 'PET', displayName: 'PET', campusTypes: ['engineering'], employeeType: 'both' },
  
  // Diploma Campus
  { name: 'senior_lecturer', code: 'SENIOR_LECT', displayName: 'Senior Lecturer', campusTypes: ['diploma'], employeeType: 'teaching' },
  { name: 'lecturer', code: 'LECTURER', displayName: 'Lecturer', campusTypes: ['diploma'], employeeType: 'teaching' },
  
  // Common
  { name: 'faculty', code: 'FACULTY', displayName: 'Faculty', campusTypes: ['engineering', 'degree', 'pharmacy', 'diploma'], employeeType: 'teaching' },
  { name: 'other', code: 'OTHER', displayName: 'Other', campusTypes: ['engineering', 'degree', 'pharmacy', 'diploma'], employeeType: 'both' }
];

const seedDesignations = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Get a super admin or HR user ID for createdBy (or use a default)
    // For now, we'll use a placeholder ObjectId
    const defaultCreatedBy = new mongoose.Types.ObjectId('000000000000000000000000');

    let created = 0;
    let skipped = 0;

    for (const desData of initialDesignations) {
      try {
        // Check if designation with same code already exists
        const existing = await Designation.findOne({ code: desData.code });
        
        if (existing) {
          console.log(`⏭️  Skipping ${desData.code} - already exists`);
          skipped++;
          continue;
        }

        // Create designation
        const designation = new Designation({
          ...desData,
          createdBy: defaultCreatedBy,
          createdByModel: 'SuperAdmin',
          isActive: true,
          description: `Default designation for ${desData.displayName}`
        });

        await designation.save();
        console.log(`✅ Created designation: ${desData.code} - ${desData.displayName}`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating ${desData.code}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${initialDesignations.length}`);
    console.log('\n✅ Designation seeding completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedDesignations();
}

module.exports = seedDesignations;

