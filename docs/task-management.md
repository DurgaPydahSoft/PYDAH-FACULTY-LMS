# Task Management Overview

This document describes the end-to-end flow, data structures, and role-based behaviours that power the Task Management module in the PYDAH Faculty LMS.

---

## 1. High-Level Flow

1. **Task Authoring**  
   - HR, HOD, and Principal roles can create tasks from their dashboards.  
   - Authors choose the audience (specific users or scoped groups), define task metadata, and optionally attach resource links.

2. **Audience Resolution**  
   - On submission, the backend normalises the assignment payload, validates it against the author’s campus/department scope, and persists the task.

3. **Task Distribution**  
   - Employees, HODs, and other assignees pull personalised task lists via their respective endpoints.  
   - Visibility is automatically filtered based on inclusion flags, departments, campus, and direct assignments.

4. **Acknowledgement & Completion**  
   - If acknowledgement is required, assignees can respond with a status (`acknowledged`/`completed`), optional comment, and proof URL.  
   - Responses are stored per assignee, and summarised for management views.

5. **Lifecycle Updates**  
   - Authors can edit, delete, or archive tasks.  
   - Status changes (e.g. `draft` → `active` → `completed`/`archived`) control visibility across dashboards.

---

## 2. Data Model (`backend/models/schemas/taskSchema.js`)

| Field | Type | Description |
| ----- | ---- | ----------- |
| `title` | `String` (required) | Short label for the task. |
| `description` | `String` (required) | Detailed instructions or context. |
| `dueDate` | `Date` | Optional deadline. |
| `priority` | `enum('low','medium','high','critical')` | Default `medium`; drives UI badges. |
| `status` | `enum('draft','active','completed','archived')` | Task lifecycle state. |
| `assignedTo` | `assignmentSchema` | Audience targeting (see below). |
| `requireAcknowledgement` | `Boolean` | Forces assignees to respond. |
| `recurrence` | `recurrenceSchema` | Simple recurrence metadata (`frequency`, `interval`, `daysOfWeek`, `endDate`). *(Future-ready placeholder – no automation yet.)* |
| `attachments` | `String[]` | Reference URLs (Drive, docs, etc.). |
| `createdBy` | `ObjectId` | Reference to author (HR/HOD/Principal collection as per `createdByRole`). |
| `createdByRole` | `enum('hr','hod','principal')` | Author role for scoping & UI attribution. |
| `acknowledgements` | `acknowledgementSchema[]` | Individual responses (assignee reference, status, comment, proof). |

### `assignmentSchema`
- `includeAllEmployees` / `includeAllHods`: broadcast flags.
- `employees`: explicit employee IDs.
- `hods`: explicit HOD IDs.
- `departments`: department codes to scope broadcast assignments.
- `campuses`: campus identifiers (HR scope only).

### `acknowledgementSchema`
- `assignee`: reference to `Employee` or `HOD` via `refPath`.
- `assigneeModel`: `'Employee'` or `'HOD'`.
- `status`: `'pending'`, `'acknowledged'`, or `'completed'`.
- `comment`: optional text feedback.
- `proofUrl`: optional resource link.
- `respondedAt`: timestamp of the latest update.

---

## 3. Backend Controllers (`backend/controllers/taskController.js`)

### Creation & Editing
- `createTask`  
  - Validates payload, normalises arrays/IDs, enforces campus/department boundaries, and writes a new `Task`.
  - Uses helper methods like `buildAssignmentsFromPayload`, `sanitizeAttachments`, and `enforceAssignmentsForRole`.

- `updateTask`  
  - Fetches existing task, reapplies validation, updates mutable fields, then saves.

- `deleteTask`  
  - Allows the original author or HR (for escalation) to remove a task.

### Retrieval
- `listTasks`  
  - HR/Principal management view; supports filtering by `status`, `priority`, inclusion of templates (currently disabled), and returns acknowledgement summaries.

- `listTasksForEmployee`  
  - Filters tasks the employee should see by department, campus, direct assignment, or `includeAllEmployees`.

- `listTasksForHod`  
  - Mirrors employee filtering but respects HOD-specific flags and branch scopes.

### Acknowledgements
- `updateTaskAcknowledgement`  
  - Verifies task visibility for the requester, ensures acknowledgement is required, then upserts the per-assignee response (`status`, `comment`, `proofUrl`) and updates timestamps.

---

## 4. Routes Summary

| Role | Path | Methods | Description |
| ---- | ---- | ------- | ----------- |
| HR (`backend/routes/hrRoutes.js`) | `/tasks` | `GET`, `POST`, `PUT/:id`, `DELETE/:id` | Full management capabilities plus list view. |
| Employee (`backend/routes/employeeRoutes.js`) | `/tasks` | `GET` | Personal task list. |
|  | `/tasks/:taskId/acknowledgements` | `PUT` | Submit acknowledgement. |
| HOD (`backend/routes/hodRoutes.js`) | `/tasks` | `GET` | Tasks targeted to the HOD or their branch. |
|  | `/tasks/:taskId/acknowledgements` | `PUT` | Submit acknowledgement as HOD. |
| Principal (`backend/routes/principalRoutes.js`) | `/tasks` | `GET`, `POST`, `PUT/:id`, `DELETE/:id` | Principal-level task management (campus-wide scope). |

> Authentication middleware ensures JWT validation and role enforcement before controller execution.

---

## 5. Frontend Experience

### HR Dashboard (`frontend/src/pages/HR/HRTaskManagementSection.jsx`)
- **Table View:** Tabular list with sorting-friendly layout, showing title, priority, due date, status, audience summary, and acknowledgement stats.
- **Row Detail Modal:** Clicking a row opens a modal with full metadata and attachments.
- **Task Form Modal:** Create/edit modal with fields for description, due date, priority, status, acknowledgement requirement, attachments, recurrence, and audience selectors.
- **Audience Selector:**
  - Multi-select for employees and HODs.
  - Department filter dynamically updates employee list.
  - “Target all employees” respects the selected departments.
  - Campus selection removed (implicitly scoped by HR campus from auth context).

### HOD Dashboard (`frontend/src/pages/HOD/HodTaskManagementSection.jsx`)
- Similar to HR flow but:
  - Audience options restricted to branch employees.
  - Automatically enforces campus/department scope to the HOD’s branch.
  - Provides acknowledgement interface for tasks assigned to the HOD.

### Principal Dashboard (`frontend/src/pages/Principal/PrincipalTaskManagementSection.jsx`)
- Mirrors HR functionality but scoped to campus-wide leadership tasks.
- Allows targeting multiple departments and HODs simultaneously.

### Employee Task View (`frontend/src/pages/Employee/EmployeeTasksSection.jsx`)
- Card layout displaying task metadata, priority badge, due date, and resource links.
- “Acknowledge/Complete” modal for tasks requiring responses.
- Submits `status`, `comment`, and optional `proofUrl`.
- Displays personal acknowledgement status on each card.

---

## 6. Role-Based Phases

| Phase | HR | HOD | Principal | Employee |
| ----- | -- | --- | ---------- | -------- |
| Drafting | ✅ | ✅ (branch scope) | ✅ | ❌ |
| Targeting | Individuals, departments, HODs, all employees (campus-scoped) | Branch employees | Campus departments, HODs, employees | ❌ |
| Publishing | ✅ | ✅ | ✅ | ❌ |
| Reviewing Responses | ✅ (ack summary) | ✅ (for tasks they authored) | ✅ | ❌ |
| Acknowledging | ❌ | ✅ (as assignee) | ✅ (if explicitly assigned) | ✅ |

---

## 7. Key Business Rules

- **Campus Integrity:** Authors cannot assign tasks outside their campus. The backend enforces this at creation/update time.
- **Department Filters:** When “Target all employees” is checked, tasks only reach employees in the selected departments (or full campus if no departments provided).
- **No Templates:** The former “Save as reusable template” feature has been removed; tasks are one-off unless duplicated manually.
- **Recurring Metadata:** The recurrence block is stored but not yet used for automated scheduling—reserved for future enhancements.
- **Acknowledgement Optionality:** Tasks can be purely informational (no acknowledgement) or require tracked responses. Completed status is optional unless mandated manually by task authors.

---

## 8. Extensibility Notes

- **Recurrence Automation:** Implement cron/worker triggers based on the `recurrence` block to auto-generate subsequent tasks.
- **Attachments Storage:** Currently accepts URLs. Consider integrating direct uploads (S3, etc.) with signed URLs.
- **Template Reintroduction:** Could be re-enabled by toggling `isTemplate`/`templateName` fields and adding UI support.
- **Analytics:** Aggregations on acknowledgements, overdue tasks, and completion trends can be layered on the existing schema.

---

## 9. Testing Checklist

- Create/edit/delete tasks for each author role, ensuring campus/department constraints are enforced.
- Verify audience filters: individual employees, multi-department selection, include-all semantics.
- Confirm employees/HODs only see tasks they should.
- Submit acknowledgements (acknowledged/completed) with and without proof URLs.
- Remove recital features (e.g. no checklist, no templates) operate as intended.
- Ensure UI widgets update after CRUD operations (toasts, modals, tables).

---

*Last updated: 13 Nov 2025*




------------------------DONE--------------------------


# Task Management Module Enhancement Plan

Based on the comparison between your current implementation and the requirements, here are the detailed enhancements needed:

## 1. Enhanced Task Definition & Lifecycle

### Current Gap Analysis
- **Missing Fields**: Estimated Time, Actual Time, Unique Task ID
- **Limited Status Workflow**: Current statuses (`draft`,`active`,`completed`,`archived`) don't support progress tracking
- **No Task Relationships**: Missing project grouping, sub-tasks, dependencies

### Required Updates

#### **Enhanced Task Schema**
```javascript
// Add these fields to taskSchema
taskId: {
  type: String,
  required: true,
  unique: true, // Format: TASK-2025-00123
  default: function() {
    // Generate sequential ID: TASK-YYYY-XXXXX
    return `TASK-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
},
estimatedTime: {
  type: Number, // in minutes
  min: 0
},
actualTime: {
  type: Number, // in minutes
  min: 0,
  default: 0
},
project: {
  type: String, // Optional project grouping
  trim: true
},
parentTask: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Task' // For sub-tasks
},
dependencies: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Task' // Tasks that must complete before this one
}],
statusHistory: [{
  status: String,
  changedBy: mongoose.Schema.Types.ObjectId,
  changedAt: Date,
  comment: String
}]
```

#### **Enhanced Status Workflow**
```javascript
// Replace current status enum with:
status: {
  type: String,
  enum: ['todo', 'in_progress', 'blocked', 'review', 'completed'],
  default: 'todo'
},
// Keep existing status for lifecycle, add workflowStatus for progress tracking
```

## 2. Advanced User Roles & Permissions

### Current Gap Analysis
- **Limited Role Definitions**: Missing Viewer/Stakeholder role
- **Basic Permissions**: No granular control over task modifications

### Required Updates

#### **Enhanced Role Matrix**
| Permission | Admin/Manager | HR/HOD/Principal | Assignee | Viewer |
|------------|---------------|------------------|----------|---------|
| Create any task | ✅ | ✅ (scoped) | ❌ | ❌ |
| Edit any task | ✅ | ✅ (scoped) | ❌ | ❌ |
| Delete any task | ✅ | ✅ (scoped) | ❌ | ❌ |
| Re-assign tasks | ✅ | ✅ (scoped) | ❌ | ❌ |
| Change own task status | ✅ | ✅ | ✅ | ❌ |
| Edit own task due date | ❌ | ❌ | ❌ | ❌ |
| View all tasks | ✅ | ✅ (scoped) | ❌ | ✅ |
| View assigned tasks | ✅ | ✅ | ✅ | ❌ |
| Add comments | ✅ | ✅ | ✅ | ❌ |
| Time tracking | ✅ | ✅ | ✅ | ❌ |

#### **New Viewer Role Implementation**
- Create new `Viewer` role in authentication system
- Add viewer-specific routes with read-only access
- Implement campus/department scoping for viewers

## 3. Comprehensive Dashboard & Reporting

### Current Gap Analysis
- **Basic List Views**: Missing aggregated metrics and visualizations
- **No Workload Analytics**: Cannot identify overloaded staff
- **Limited Filtering**: Basic status/priority filters only

### Required Updates

#### **Dashboard Metrics Schema**
```javascript
// New collection for dashboard analytics
const dashboardMetricsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  campus: { type: String, required: true },
  totalTasks: Number,
  completedTasks: Number,
  overdueTasks: Number,
  averageCompletionTime: Number,
  priorityBreakdown: {
    critical: Number,
    high: Number,
    medium: Number,
    low: Number
  },
  statusBreakdown: {
    todo: Number,
    in_progress: Number,
    blocked: Number,
    review: Number,
    completed: Number
  }
}, { timestamps: true });
```

#### **Enhanced Dashboard Endpoints**
- `GET /api/dashboard/overview` - High-level metrics
- `GET /api/dashboard/staff-workload` - Capacity per staff member
- `GET /api/dashboard/overdue-tasks` - Tasks past due date
- `GET /api/dashboard/upcoming-deadlines` - Tasks due in next 1-3 days

#### **Frontend Dashboard Components**
- **Management Dashboard**:
  - Team progress charts (pie/bar charts)
  - Overdue tasks counter with drill-down
  - Staff capacity heatmap
  - Priority-based task lists
  
- **Staff Dashboard**:
  - Personal workload summary
  - "Due Soon" task carousel
  - Priority-based task queue
  - Time tracking interface

## 4. Advanced Notification System

### Current Gap Analysis
- **No Automated Notifications**: Missing SMS/email alerts
- **Limited Event Triggers**: Only basic acknowledgement tracking

### Required Updates

#### **Notification Events Matrix**
| Event | Trigger | Actions |
|-------|---------|---------|
| Task Assignment | Task created/assigned | SMS + Email to assignee |
| Status Change | Task status updated | Email to author + optional SMS |
| Due Date Approaching | 24hrs before due date | Email reminder |
| Task Overdue | Due date passed | Daily SMS/Email to assignee + manager |
| Priority Escalation | Priority auto-changed | Email to manager + assignee |
| Comment Added | New comment on task | Email to task participants |

#### **Notification Schema**
```javascript
const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['assignment', 'reminder', 'overdue', 'escalation', 'comment'],
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  recipients: [{
    user: mongoose.Schema.Types.ObjectId,
    userModel: String, // 'Employee', 'HOD', etc.
    channel: {
      type: String,
      enum: ['email', 'sms', 'both'],
      default: 'both'
    },
    sent: {
      type: Boolean,
      default: false
    },
    delivered: {
      type: Boolean,
      default: false
    }
  }],
  message: String,
  scheduledFor: Date,
  sentAt: Date
}, { timestamps: true });
```

## 5. Advanced Task Scheduling & Recurrence

### Current Gap Analysis
- **Placeholder Implementation**: Recurrence schema exists but no automation
- **No Time Tracking**: Missing estimated/actual time fields
- **Basic SLA Support**: No priority escalation or compliance tracking

### Required Updates

#### **Enhanced Recurrence Engine**
```javascript
// Enhanced recurrenceSchema
recurrence: {
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'annually'],
    required: true
  },
  interval: {
    type: Number,
    default: 1,
    min: 1
  },
  daysOfWeek: [{
    type: Number, // 0-6 for Sunday-Saturday
    min: 0,
    max: 6
  }],
  dayOfMonth: Number,
  endCondition: {
    type: String,
    enum: ['never', 'after_occurrences', 'end_date'],
    default: 'never'
  },
  endAfterOccurrences: Number,
  endDate: Date,
  lastGenerated: Date,
  nextGeneration: Date
}
```

#### **SLA & Escalation System**
```javascript
// New SLA schema
const slaSchema = new mongoose.Schema({
  taskType: String,
  priority: String,
  maxCompletionTime: Number, // in hours
  autoEscalateAfter: Number, // in hours
  notifyManagerAfter: Number // in hours
});

// Priority escalation logic
const escalationRules = {
  medium: { escalateAfter: 48, newPriority: 'high' }, // hours
  high: { escalateAfter: 24, newPriority: 'critical' },
  // Add notification rules for approaching deadlines
  notifyBeforeDue: [4, 24] // hours before due date
};
```

## 6. Advanced Search & Audit System

### Current Gap Analysis
- **Basic Filtering**: Limited search capabilities
- **No Audit Trail**: Missing change history tracking

### Required Updates

#### **Enhanced Search Endpoints**
```javascript
// Advanced search with multiple criteria
GET /api/tasks/search?q=keyword&status=in_progress&priority=high&assignee=123&dueDate=2025-11-20&project=ProjectX
```

#### **Comprehensive Audit Trail**
```javascript
// Enhanced acknowledgementSchema with full history
acknowledgements: [{
  assignee: mongoose.Schema.Types.ObjectId,
  assigneeModel: String,
  status: String,
  comment: String,
  proofUrl: String,
  timeSpent: Number, // in minutes
  history: [{
    status: String,
    comment: String,
    proofUrl: String,
    timeSpent: Number,
    changedAt: Date
  }],
  respondedAt: Date
}]
```

## 7. Technical Architecture Enhancements

### Current Gap Analysis
- **Missing Unique IDs**: No sequential task identifiers
- **Basic Data Integrity**: No soft deletion
- **Performance**: Unclear indexing strategy

### Required Updates

#### **Database Optimizations**
```javascript
// Add these indexes for performance
TaskSchema.index({ taskId: 1 }); // Unique task ID
TaskSchema.index({ 'assignedTo.employees': 1, status: 1 });
TaskSchema.index({ 'assignedTo.hods': 1, status: 1 });
TaskSchema.index({ dueDate: 1, status: 1 });
TaskSchema.index({ campus: 1, department: 1, status: 1 });
TaskSchema.index({ createdBy: 1, createdAt: -1 });

// Implement soft deletion
TaskSchema.add({
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: mongoose.Schema.Types.ObjectId
});
```

#### **API Endpoint Expansion**
```javascript
// New endpoints needed
POST   /api/tasks/:id/start-timer    // Start time tracking
POST   /api/tasks/:id/stop-timer     // Stop time tracking
PUT    /api/tasks/:id/reassign       // Reassign task
GET    /api/tasks/:id/history        // Get audit trail
POST   /api/tasks/:id/comments       // Add comment
GET    /api/tasks/:id/comments       // Get comments
PUT    /api/tasks/:id/priority       // Change priority
GET    /api/dashboard/metrics        // Dashboard data
POST   /api/notifications/test       // Test notification
```

## 8. Implementation Priority Plan

### Phase 1: Core Enhancements (Week 1-2)
1. Add missing fields (estimatedTime, actualTime, taskId)
2. Implement enhanced status workflow
3. Add soft deletion functionality
4. Create unique task ID generation

### Phase 2: Dashboard & Reporting (Week 3-4)
1. Build comprehensive dashboard endpoints
2. Create management dashboard with charts
3. Implement staff workload analytics
4. Add advanced search capabilities

### Phase 3: Notifications (Week 5-6)
1. Implement notification schema and service
2. Integrate SMS/email providers
3. Create notification triggers for key events
4. Build notification preferences interface

### Phase 4: Advanced Features (Week 7-8)
1. Implement recurrence engine with cron jobs
2. Build SLA and escalation system
3. Add time tracking functionality
4. Create audit trail system

### Phase 5: Polish & Optimization (Week 9-10)
1. Performance optimization and indexing
2. Comprehensive testing
3. User training materials
4. Deployment and monitoring

## 9. Testing Strategy Enhancement

### New Test Scenarios Needed
- **Notification Testing**: Verify SMS/email delivery for all events
- **SLA Compliance**: Test automatic priority escalation
- **Recurrence Validation**: Verify task generation on schedules
- **Time Tracking**: Validate timer start/stop functionality
- **Audit Trail**: Confirm all changes are logged properly
- **Performance**: Load testing for dashboard with large datasets

This enhancement plan will transform your current task management system from a basic assignment tool into a comprehensive enterprise task management solution that meets all the specified requirements.