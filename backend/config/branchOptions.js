const BRANCH_OPTIONS = {
  Engineering: ['CSE', 'ECE', 'MECH', 'AGRI', 'CIVIL', 'CSE_AI'],
  Diploma: ['DCSE', 'DECE', 'DAIML', 'DME', 'DAP', 'D_FISHERIES', 'D_ANIMAL_HUSBANDRY'],
  Pharmacy: ['B_PHARMACY', 'PHARM_D', 'PHARM_PB_D', 'PHARMACEUTICAL_ANALYSIS', 'PHARMACEUTICS', 'PHARMA_QUALITY_ASSURANCE'],
  Degree: ['AGRICULTURE', 'HORTICULTURE', 'FOOD_TECHNOLOGY', 'FISHERIES', 'FOOD_SCIENCE_NUTRITION']
};

// Helper function to validate if a branch code is valid for a campus type
const isValidBranch = (campusType, branchCode) => {
  if (!BRANCH_OPTIONS[campusType]) return false;
  return BRANCH_OPTIONS[campusType].includes(branchCode);
};

// Get available branches for a campus type
const getBranchesForCampus = (campusType) => {
  return BRANCH_OPTIONS[campusType] || [];
};

module.exports = {
  BRANCH_OPTIONS,
  isValidBranch,
  getBranchesForCampus
}; 