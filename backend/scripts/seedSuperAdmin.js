const mongoose = require('mongoose');
const { SuperAdmin } = require('../models');
require('dotenv').config();

const seedSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB successfully');

    // Check if super admin exists
    const existingSuperAdmin = await SuperAdmin.findOne({ email: 'superadmin@pydah.edu.in' });
    
    if (!existingSuperAdmin) {
      const superAdmin = new SuperAdmin({
        name: 'Super Admin',
        email: 'superadmin@pydah.edu.in',
        password: 'superadmin123',
        status: 'active'
      });

      await superAdmin.save();
      console.log('Super Admin account created successfully');
    } else {
      console.log('Super Admin account already exists');
    }

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding super admin:', error);
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed after error');
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError);
    }
    process.exit(1);
  }
};

// Add proper error handling for unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

seedSuperAdmin(); 