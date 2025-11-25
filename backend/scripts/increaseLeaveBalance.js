const mongoose = require('mongoose');
const { Employee } = require('../models');
require('dotenv').config();

const increaseLeaveBalance = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB successfully');

    // Fetch all employees
    const employees = await Employee.find({});
    console.log(`Found ${employees.length} employees`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const employee of employees) {
      try {
        // Increase leave balance by 3, but cap at 12
        const oldBalance = employee.leaveBalance;
        // Ensure leaveBalance is a number, default to 0 if undefined/null
        const currentBalance = typeof employee.leaveBalance === 'number' ? employee.leaveBalance : 0;
        const newBalance = currentBalance + 3;
        employee.leaveBalance = newBalance > 12 ? 12 : newBalance;
        
        await employee.save();
        console.log(`Updated ${employee.name} (${employee.employeeId}): ${oldBalance} -> ${employee.leaveBalance}`);
        updatedCount++;
      } catch (err) {
        console.error(`Failed to update ${employee.name} (${employee.employeeId}):`, err.message);
        errorCount++;
      }
    }

    console.log('-----------------------------------');
    console.log(`Process completed.`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Failed: ${errorCount}`);

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error executing script:', error);
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError);
    }
    process.exit(1);
  }
};

increaseLeaveBalance();
