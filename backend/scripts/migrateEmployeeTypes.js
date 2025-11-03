/**
 * Migration script to set employeeType for existing employees
 * This script sets all existing employees to 'teaching' type
 * Run this once after deploying the teaching/non-teaching feature
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { Employee } = require('../models');

async function migrateEmployeeTypes() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty-lms', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to database');

    // Find all employees that don't have employeeType set or have invalid values
    const employeesWithoutType = await Employee.find({
      $or: [
        { employeeType: { $exists: false } },
        { employeeType: null },
        { employeeType: '' },
        { employeeType: { $nin: ['teaching', 'non-teaching'] } }
      ]
    });

    console.log(`Found ${employeesWithoutType.length} employees without valid employeeType`);

    if (employeesWithoutType.length === 0) {
      console.log('No employees need migration. All employees already have valid employeeType set.');
      await mongoose.disconnect();
      return;
    }

    // Log some sample employees before migration
    console.log('\nSample employees before migration:');
    employeesWithoutType.slice(0, 5).forEach(emp => {
      console.log(`- ${emp.name} (${emp.employeeId}): ${emp.department || 'No department'}`);
    });

    // Update all employees without employeeType to 'teaching'
    // Only update those that have a department or branchCode (indicating they are teaching staff)
    const updateResult = await Employee.updateMany(
      {
        $and: [
          {
            $or: [
              { employeeType: { $exists: false } },
              { employeeType: null },
              { employeeType: '' },
              { employeeType: { $nin: ['teaching', 'non-teaching'] } }
            ]
          },
          {
            // Only update employees that have department or branchCode (teaching employees)
            $or: [
              { department: { $exists: true, $ne: null, $ne: '' } },
              { branchCode: { $exists: true, $ne: null, $ne: '' } }
            ]
          }
        ]
      },
      {
        $set: { employeeType: 'teaching' }
      }
    );

    console.log(`\n✓ Successfully migrated ${updateResult.modifiedCount} employees to teaching type`);
    console.log(`  (Only employees with department or branchCode were updated)`);

    // Check for employees without department/branchCode (might be issues)
    const employeesWithoutDept = await Employee.find({
      $or: [
        { employeeType: { $exists: false } },
        { employeeType: null },
        { employeeType: '' }
      ],
      $and: [
        {
          $or: [
            { department: { $exists: false } },
            { department: null },
            { department: '' }
          ]
        },
        {
          $or: [
            { branchCode: { $exists: false } },
            { branchCode: null },
            { branchCode: '' }
          ]
        }
      ]
    });

    if (employeesWithoutDept.length > 0) {
      console.log(`\n⚠ Warning: ${employeesWithoutDept.length} employees found without department:`);
      employeesWithoutDept.slice(0, 5).forEach(emp => {
        console.log(`  - ${emp.name} (${emp.employeeId})`);
      });
      console.log(`  These employees might need manual review.`);
    }

    // Verify the migration
    const remainingWithoutType = await Employee.find({
      $or: [
        { employeeType: { $exists: false } },
        { employeeType: null },
        { employeeType: '' },
        { employeeType: { $nin: ['teaching', 'non-teaching'] } }
      ],
      $or: [
        { department: { $exists: true, $ne: null, $ne: '' } },
        { branchCode: { $exists: true, $ne: null, $ne: '' } }
      ]
    });

    if (remainingWithoutType.length === 0) {
      console.log('\n✓ Migration completed successfully. All employees with department/branchCode now have employeeType set.');
    } else {
      console.log(`\n⚠ Warning: ${remainingWithoutType.length} employees with department/branchCode still don't have employeeType`);
    }

    // Get final counts
    const teachingCount = await Employee.countDocuments({ employeeType: 'teaching' });
    const nonTeachingCount = await Employee.countDocuments({ employeeType: 'non-teaching' });
    const totalCount = await Employee.countDocuments({});

    console.log('\n--- Final Statistics ---');
    console.log(`Total employees: ${totalCount}`);
    console.log(`Teaching employees: ${teachingCount}`);
    console.log(`Non-teaching employees: ${nonTeachingCount}`);
    console.log(`Employees without type: ${totalCount - teachingCount - nonTeachingCount}`);

    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
    console.log('Migration script completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateEmployeeTypes()
    .then(() => {
      console.log('\nMigration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateEmployeeTypes };

