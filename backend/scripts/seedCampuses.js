const mongoose = require('mongoose');
const { Campus } = require('../models');
require('dotenv').config();

const campuses = [
  {
    name: 'engineering',
    displayName: 'PYDAH Engineering College',
    type: 'Engineering',
    location: 'Visakhapatnam'
  },
  {
    name: 'degree',
    displayName: 'PYDAH Degree College',
    type: 'Degree',
    location: 'Visakhapatnam'
  },
  {
    name: 'pharmacy',
    displayName: 'PYDAH College of Pharmacy',
    type: 'Pharmacy',
    location: 'Visakhapatnam'
  },
  {
    name: 'diploma',
    displayName: 'PYDAH Polytechnic College',
    type: 'Diploma',
    location: 'Visakhapatnam'
  }
];

const seedCampuses = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB successfully');

    // Check existing campuses
    const existingCampuses = await Campus.find();
    console.log(`Found ${existingCampuses.length} existing campuses`);

    // Create campuses that don't exist
    for (const campus of campuses) {
      const exists = existingCampuses.some(c => c.name === campus.name);
      if (!exists) {
        const newCampus = new Campus({
          name: campus.name,
          displayName: campus.displayName,
          type: campus.type,
          location: campus.location,
          isActive: true
        });
        await newCampus.save();
        console.log(`Created campus: ${campus.displayName}`);
      } else {
        console.log(`Campus ${campus.displayName} already exists`);
      }
    }

    console.log('Campus seeding completed');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding campuses:', error);
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

seedCampuses(); 