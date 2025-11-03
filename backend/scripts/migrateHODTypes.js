/**
 * Migration script to set hodType for existing HODs
 * This script sets all existing HODs to 'teaching' type
 * Run this once after deploying the teaching/non-teaching feature
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { HOD } = require('../models');

async function migrateHODTypes() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty-lms', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to database');

    // Find all HODs that don't have hodType set
    const hodsWithoutType = await HOD.find({
      $or: [
        { hodType: { $exists: false } },
        { hodType: null },
        { hodType: '' }
      ]
    });

    console.log(`Found ${hodsWithoutType.length} HODs without hodType`);

    if (hodsWithoutType.length === 0) {
      console.log('No HODs need migration. All HODs already have hodType set.');
      await mongoose.disconnect();
      return;
    }

    // Update all HODs without hodType to 'teaching'
    const updateResult = await HOD.updateMany(
      {
        $or: [
          { hodType: { $exists: false } },
          { hodType: null },
          { hodType: '' }
        ]
      },
      {
        $set: { hodType: 'teaching' }
      }
    );

    console.log(`Successfully migrated ${updateResult.modifiedCount} HODs to teaching type`);

    // Verify the migration
    const remainingWithoutType = await HOD.find({
      $or: [
        { hodType: { $exists: false } },
        { hodType: null },
        { hodType: '' }
      ]
    });

    if (remainingWithoutType.length === 0) {
      console.log('✓ Migration completed successfully. All HODs now have hodType set.');
    } else {
      console.log(`⚠ Warning: ${remainingWithoutType.length} HODs still don't have hodType`);
    }

    await mongoose.disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Migration error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateHODTypes()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateHODTypes };

