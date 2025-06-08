const mongoose = require('mongoose');
const { Campus } = require('../models');
require('dotenv').config();

const BRANCH_CODES = {
  Engineering: ['CSE', 'ECE', 'MECH', 'AGRI', 'CIVIL', 'CSE_AI','HBS'],
  Diploma: ['DCSE', 'DECE', 'DAIML', 'DME', 'DAP', 'D_FISHERIES', 'D_ANIMAL_HUSBANDRY'],
  Pharmacy: ['B_PHARMACY', 'PHARM_D', 'PHARM_PB_D', 'PHARMACEUTICAL_ANALYSIS', 'PHARMACEUTICS', 'PHARMA_QUALITY_ASSURANCE'],
  Degree: ['AGRICULTURE', 'HORTICULTURE', 'FOOD_TECHNOLOGY', 'FISHERIES', 'FOOD_SCIENCE_NUTRITION']
};

const BRANCH_NAMES = {
  CSE: 'Computer Science and Engineering',
  ECE: 'Electronics and Communication Engineering',
  MECH: 'Mechanical Engineering',
  AGRI: 'Agricultural Engineering',
  CIVIL: 'Civil Engineering',
  HBS: 'Humanities and Basic Sciences',
  CSE_AI: 'Computer Science and Engineering (AI)',
  DCSE: 'Diploma in Computer Science Engineering',
  DECE: 'Diploma in Electronics and Communication Engineering',
  DAIML: 'Diploma in AI and Machine Learning',
  DME: 'Diploma in Mechanical Engineering',
  DAP: 'Diploma in Agricultural Production',
  D_FISHERIES: 'Diploma in Fisheries',
  D_ANIMAL_HUSBANDRY: 'Diploma in Animal Husbandry',
  B_PHARMACY: 'Bachelor of Pharmacy',
  PHARM_D: 'Doctor of Pharmacy',
  PHARM_PB_D: 'Post Baccalaureate Doctor of Pharmacy',
  PHARMACEUTICAL_ANALYSIS: 'Pharmaceutical Analysis',
  PHARMACEUTICS: 'Pharmaceutics',
  PHARMA_QUALITY_ASSURANCE: 'Pharmaceutical Quality Assurance',
  AGRICULTURE: 'Agriculture',
  HORTICULTURE: 'Horticulture',
  FOOD_TECHNOLOGY: 'Food Technology',
  FISHERIES: 'Fisheries',
  FOOD_SCIENCE_NUTRITION: 'Food Science and Nutrition'
};

const seedBranches = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');

    const campuses = await Campus.find();
    for (const campus of campuses) {
      const campusType = campus.type; // 'Engineering', 'Degree', etc.
      const branchCodes = BRANCH_CODES[campusType];
      if (!branchCodes) {
        console.log(`No branch codes defined for campus type: ${campusType}`);
        continue;
      }
      let added = 0;
      for (const code of branchCodes) {
        if (!campus.branches.some(b => b.code === code)) {
          campus.branches.push({
            name: BRANCH_NAMES[code] || code,
            code,
            isActive: true
          });
          added++;
        }
      }
      if (added > 0) {
        await campus.save();
        console.log(`Added ${added} branches to campus: ${campus.displayName || campus.name}`);
      } else {
        console.log(`All branches already exist for campus: ${campus.displayName || campus.name}`);
      }
    }
    console.log('Branch seeding completed');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding branches:', error);
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed after error');
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError);
    }
    process.exit(1);
  }
};

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

seedBranches(); 