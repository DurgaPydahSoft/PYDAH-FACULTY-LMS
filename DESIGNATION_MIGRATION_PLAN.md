# Designation Management System - Migration Plan

## Current State Analysis

### Hardcoded Locations:

1. **Employee Schema** (`backend/models/schemas/employeeSchema.js`)
   - Lines 47-63: `role` field has hardcoded enum values
   - Lines 500-522: `validateRoleForCampus()` has hardcoded role lists per campus

2. **HR Controller** (`backend/controllers/hrController.js`)
   - Lines 83-113: `getCampusRoles()` function has hardcoded role mappings

3. **Frontend Components**
   - `HRDashboard.js`: Has hardcoded role lists in `getCampusRoles()` function
   - Various registration forms use hardcoded role dropdowns

### Field Differences:

- **`role`**: Currently enum with hardcoded values (e.g., 'associate_professor')
- **`roleDisplayName`**: Display label (e.g., 'Associate Professor')
- **`designation`**: Free-form string field (optional, separate from role)

## Solution: Dynamic Designation System

### Step 1: Create Designation Model ✅
- Created `backend/models/schemas/designationSchema.js`
- Fields:
  - `name`: Internal name
  - `code`: Unique code (e.g., 'ASSOC_PROF')
  - `displayName`: Display label
  - `campusTypes`: Array of campuses this designation applies to
  - `employeeType`: 'teaching', 'non-teaching', or 'both'
  - `isActive`: Enable/disable designation
  - `description`: Optional description

### Step 2: Update Employee Schema
**Change needed:**
- Remove hardcoded enum from `role` field
- Make `role` reference Designation model OR use designation code
- Keep `roleDisplayName` for backward compatibility (can be auto-populated from Designation)

### Step 3: Create Designation Controller
**New endpoints needed:**
- `GET /api/hr/designations` - Get all designations (filtered by campus)
- `POST /api/hr/designations` - Create new designation
- `PUT /api/hr/designations/:id` - Update designation
- `DELETE /api/hr/designations/:id` - Delete designation (soft delete)
- `GET /api/hr/designations/campus/:campusType` - Get designations for specific campus

### Step 4: Update HR Controller
- Replace `getCampusRoles()` to fetch from Designation model
- Update `registerEmployee()` to use designation code
- Update `validateRoleForCampus()` to check against Designation model

### Step 5: Update Frontend
- Create Designation Management page in HR section
- Update employee registration forms to fetch designations from API
- Replace hardcoded role dropdowns with dynamic API calls

## Migration Strategy

### Option A: Gradual Migration (Recommended)
1. Keep existing `role` enum for backward compatibility
2. Add new `designationId` field that references Designation model
3. Migrate existing data: Map current roles to Designations
4. Update forms to use Designations
5. Eventually deprecate `role` enum

### Option B: Direct Replacement
1. Remove `role` enum completely
2. Use `designation` field with Designation reference
3. Migrate all existing roles to Designation records
4. Update all code at once

## Implementation Checklist

- [x] Create Designation Schema
- [ ] Register Designation model in models/index.js
- [ ] Create Designation Controller
- [ ] Create Designation Routes
- [ ] Update Employee Schema (remove enum or add designationId)
- [ ] Update HR Controller functions
- [ ] Create Designation Management UI (HR Dashboard)
- [ ] Update Employee Registration Forms
- [ ] Create migration script for existing data
- [ ] Update validation functions
- [ ] Test all employee registration flows

## Next Steps

1. Decide on migration approach (Option A or B)
2. Create designation controller and routes
3. Build HR UI for managing designations
4. Update employee registration to use dynamic designations
5. Create seed script to populate initial designations from current hardcoded values

