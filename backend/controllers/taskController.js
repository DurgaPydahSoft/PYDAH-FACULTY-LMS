const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const { Task, Employee, HOD, HR, Principal } = require('../models');

const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical'];
const TASK_STATUSES = ['draft', 'active', 'completed', 'archived'];
const ACK_STATUSES = ['pending', 'acknowledged', 'completed'];
const RECURRENCE_FREQUENCIES = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

const sanitizeStringArray = (values = []) => {
  const seen = new Set();
  const output = [];
  values.forEach((value) => {
    if (!value || typeof value !== 'string') return;
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    output.push(normalized);
  });
  return output;
};

const normalizeObjectIds = (values = [], fieldName = 'id') => {
  const seen = new Set();
  return values.reduce((acc, value) => {
    if (!value) {
      return acc;
    }
    let objectId;
    if (value instanceof mongoose.Types.ObjectId) {
      objectId = value;
    } else if (mongoose.Types.ObjectId.isValid(value)) {
      objectId = new mongoose.Types.ObjectId(value);
    } else {
      throw new Error(`Invalid ${fieldName} provided.`);
    }

    const key = objectId.toString();
    if (!seen.has(key)) {
      seen.add(key);
      acc.push(objectId);
    }
    return acc;
  }, []);
};

const sanitizeAttachments = (attachments = []) => {
  const seen = new Set();
  const result = [];
  attachments.forEach((attachment) => {
    if (!attachment || typeof attachment !== 'string') return;
    const trimmed = attachment.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  });
  return result;
};

const sanitizeRecurrence = (recurrence = {}) => {
  const frequency = RECURRENCE_FREQUENCIES.includes(recurrence.frequency)
    ? recurrence.frequency
    : 'none';

  const sanitized = {
    frequency,
    interval: Number.isInteger(recurrence.interval) && recurrence.interval > 0
      ? recurrence.interval
      : 1
  };

  if (Array.isArray(recurrence.daysOfWeek) && recurrence.daysOfWeek.length) {
    sanitized.daysOfWeek = recurrence.daysOfWeek
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  }

  if (recurrence.endDate) {
    const endDate = new Date(recurrence.endDate);
    if (!Number.isNaN(endDate.getTime())) {
      sanitized.endDate = endDate;
    }
  }

  return sanitized;
};

const buildAssignmentsFromPayload = async (payload = {}, options = {}) => {
  const assignments = {
    includeAllEmployees: !!payload.includeAllEmployees,
    includeAllHods: !!payload.includeAllHods,
    employees: [],
    hods: [],
    departments: sanitizeStringArray(payload.departments),
    campuses: sanitizeStringArray(payload.campuses)
  };

  try {
    assignments.employees = normalizeObjectIds(payload.employees, 'employeeId');
    assignments.hods = normalizeObjectIds(payload.hods, 'hodId');
  } catch (error) {
    throw new Error(error.message);
  }

  let employeeDocs = [];
  let hodDocs = [];

  if (assignments.employees.length) {
    employeeDocs = await Employee.find({
      _id: { $in: assignments.employees }
    }).select('_id department branchCode campus assignedHodId');

    if (employeeDocs.length !== assignments.employees.length) {
      throw new Error('One or more selected employees do not exist.');
    }

    if (typeof options.employeeFilter === 'function') {
      employeeDocs.forEach((doc) => {
        if (!options.employeeFilter(doc)) {
          throw new Error('One or more employees are outside your allowed scope.');
        }
      });
    }

    assignments.employees = employeeDocs.map((doc) => doc._id);
  }

  if (assignments.hods.length) {
    hodDocs = await HOD.find({
      _id: { $in: assignments.hods }
    }).select('_id department campus hodType createdBy createdByModel');

    if (hodDocs.length !== assignments.hods.length) {
      throw new Error('One or more selected HODs do not exist.');
    }

    if (typeof options.hodFilter === 'function') {
      hodDocs.forEach((doc) => {
        if (!options.hodFilter(doc)) {
          throw new Error('One or more HODs are outside your allowed scope.');
        }
      });
    }

    assignments.hods = hodDocs.map((doc) => doc._id);
  }

  return { assignments, employeeDocs, hodDocs };
};

const enforceAssignmentsForRole = (assignments, role, req, employeeDocs = [], hodDocs = []) => {
  const normalizedRole = (role || '').toLowerCase();
  // Handle campus as string or object with name property
  const campus = typeof req.user.campus === 'string'
    ? req.user.campus.toLowerCase()
    : (req.user.campus?.name ? req.user.campus.name.toLowerCase() : '');
  const branchCode = (req.user.branchCode || req.user.department || '').toLowerCase();

  switch (normalizedRole) {
    case 'hr':
      // HR can target any combination.
      break;
    case 'hod': {
      if (!branchCode) {
        // Non-teaching HODs must explicitly choose employees; disallow global toggle.
        if (assignments.includeAllEmployees) {
          throw new Error('Cannot target all employees without an assigned department.');
        }
      } else {
        assignments.departments = Array.from(new Set([branchCode, ...(assignments.departments || [])]));
      }

      assignments.campuses = Array.from(new Set([campus, ...(assignments.campuses || [])]));

      employeeDocs.forEach((doc) => {
        const employeeCampus = (doc.campus ? doc.campus.toString() : '').toLowerCase();
        const employeeDepartment = (doc.department || doc.branchCode
          ? (doc.department || doc.branchCode).toString().toLowerCase()
          : '');
        const assignedHodId = doc.assignedHodId ? doc.assignedHodId.toString() : null;

        if (employeeCampus && employeeCampus !== campus) {
          throw new Error('Employees must belong to your campus.');
        }

        if (branchCode) {
          if (employeeDepartment !== branchCode) {
            throw new Error('Employees must belong to your department.');
          }
        } else if (!assignedHodId || assignedHodId !== req.user.id.toString()) {
          throw new Error('Employees must be assigned to you.');
        }
      });

      break;
    }
    case 'principal': {
      assignments.campuses = Array.from(new Set([campus, ...(assignments.campuses || [])]));

      employeeDocs.forEach((doc) => {
        const employeeCampus = (doc.campus ? doc.campus.toString() : '').toLowerCase();
        const employeeDepartment = (doc.department || doc.branchCode
          ? (doc.department || doc.branchCode).toString().toLowerCase()
          : '');

        if (employeeCampus && employeeCampus !== campus) {
          throw new Error('Employees must belong to your campus.');
        }

        if (assignments.departments.length > 0 && !assignments.departments.includes(employeeDepartment)) {
          throw new Error('Employees must belong to selected departments.');
        }
      });

      hodDocs.forEach((doc) => {
        const hodCampus = (doc.campus ? doc.campus.toString() : '').toLowerCase();
        const hodDepartment = (doc.department?.code
          ? doc.department.code.toString().toLowerCase()
          : (doc.department ? doc.department.toString().toLowerCase() : ''));

        if (hodCampus && hodCampus !== campus) {
          throw new Error('HODs must belong to your campus.');
        }

        if (assignments.departments.length > 0 && hodDepartment && !assignments.departments.includes(hodDepartment)) {
          throw new Error('HODs must belong to selected departments.');
        }
      });

      break;
    }
    default:
      throw new Error('Not authorized to manage tasks.');
  }
};

const canEmployeeAccessTask = (task, employeeContext) => {
  if (!task || task.isTemplate || task.status === 'archived') {
    return false;
  }

  const assignments = task.assignedTo || {};
  if (assignments.includeAllEmployees) {
    const hasScopedFilters =
      (assignments.departments && assignments.departments.length > 0) ||
      (assignments.campuses && assignments.campuses.length > 0);

    if (!hasScopedFilters) {
      return true;
    }

    const matchesDepartment =
      assignments.departments?.includes((employeeContext.department || '').toLowerCase());
    const matchesCampus =
      assignments.campuses?.includes((employeeContext.campus || '').toLowerCase());

    if (matchesDepartment || matchesCampus) {
      return true;
    }
  }

  if (assignments.employees?.some((id) => id.toString() === employeeContext.id.toString())) {
    return true;
  }

  if (employeeContext.department && assignments.departments?.includes(employeeContext.department.toLowerCase())) {
    return true;
  }

  if (employeeContext.campus && assignments.campuses?.includes(employeeContext.campus.toLowerCase())) {
    return true;
  }

  return false;
};

const canHodAccessTask = (task, hodContext) => {
  if (!task || task.isTemplate || task.status === 'archived') {
    return false;
  }

  const assignments = task.assignedTo || {};
  if (assignments.includeAllHods) {
    const hasScopedFilters =
      (assignments.departments && assignments.departments.length > 0) ||
      (assignments.campuses && assignments.campuses.length > 0);

    if (!hasScopedFilters) {
      return true;
    }

    const matchesDepartment =
      assignments.departments?.includes((hodContext.branchCode || '').toLowerCase());
    const matchesCampus =
      assignments.campuses?.includes((hodContext.campus || '').toLowerCase());

    if (matchesDepartment || matchesCampus) {
      return true;
    }
  }

  if (assignments.hods?.some((id) => id.toString() === hodContext.id.toString())) {
    return true;
  }

  if (hodContext.branchCode && assignments.departments?.includes(hodContext.branchCode.toLowerCase())) {
    return true;
  }

  if (hodContext.campus && assignments.campuses?.includes(hodContext.campus.toLowerCase())) {
    return true;
  }

  return false;
};

const formatTaskForRecipient = (task, assigneeModel, assigneeId) => {
  const plainTask = task.toObject ? task.toObject() : task;
  const acknowledgements = plainTask.acknowledgements || [];

  const viewerAcknowledgement = acknowledgements.find((ack) => {
    if (!ack || !ack.assignee) return false;
    return (
      ack.assignee.toString() === assigneeId.toString() &&
      ack.assigneeModel === assigneeModel
    );
  });

  if (plainTask.acknowledgements) {
    delete plainTask.acknowledgements;
  }

  return {
    ...plainTask,
    acknowledgementStatus: plainTask.requireAcknowledgement
      ? (viewerAcknowledgement ? viewerAcknowledgement.status : 'pending')
      : null,
    viewerAcknowledgement: viewerAcknowledgement
      ? {
          status: viewerAcknowledgement.status,
          comment: viewerAcknowledgement.comment || '',
          proofUrl: viewerAcknowledgement.proofUrl || '',
          respondedAt: viewerAcknowledgement.respondedAt || viewerAcknowledgement.updatedAt || viewerAcknowledgement.createdAt
        }
      : null
  };
};

const buildAcknowledgementSummary = (task) => {
  const acknowledgements = task.acknowledgements || [];
  if (!task.requireAcknowledgement) {
    return null;
  }

  return {
    responses: acknowledgements.length,
    acknowledged: acknowledgements.filter((ack) => ack.status !== 'pending').length,
    completed: acknowledgements.filter((ack) => ack.status === 'completed').length,
    pending: acknowledgements.filter((ack) => ack.status === 'pending').length
  };
};

const formatTaskForManagement = (task) => {
  const plainTask = task.toObject ? task.toObject() : task;
  return {
    ...plainTask,
    acknowledgementSummary: buildAcknowledgementSummary(plainTask)
  };
};

const populateTaskAudience = (query) => {
  return query
    .populate('assignedTo.employees', 'name employeeId department campus')
    .populate('assignedTo.hods', 'name email department.code department.name campus');
};

// Create a new task (HR / HOD / Principal)
exports.createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    dueDate,
    priority,
    status,
    assignedTo,
    requireAcknowledgement,
    recurrence,
    attachments
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({ msg: 'Title and description are required.' });
  }

  const requesterRole = (req.user.role || '').toLowerCase();
  if (!['hr', 'hod', 'principal'].includes(requesterRole)) {
    return res.status(403).json({ msg: 'You are not authorized to create tasks.' });
  }

  // Fetch user details for givenBy field
  let userDoc;
  try {
    if (requesterRole === 'hr') {
      userDoc = await HR.findById(req.user.id).select('name email').lean();
    } else if (requesterRole === 'hod') {
      userDoc = await HOD.findById(req.user.id).select('name email').lean();
    } else if (requesterRole === 'principal') {
      // Try Principal model first, then User model
      userDoc = await Principal.findById(req.user.id).select('name email').lean();
      if (!userDoc) {
        const { User } = require('../models');
        userDoc = await User.findById(req.user.id).select('name email').lean();
      }
    }
  } catch (err) {
    console.error('Error fetching user details for givenBy:', err);
  }

  const task = new Task({
    title: title.trim(),
    description: description.trim(),
    createdBy: req.user.id,
    createdByRole: requesterRole,
    givenBy: userDoc ? {
      name: userDoc.name || '',
      email: userDoc.email || '',
      role: requesterRole
    } : {
      name: '',
      email: '',
      role: requesterRole
    }
  });

  if (dueDate) {
    const parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ msg: 'Invalid due date provided.' });
    }
    task.dueDate = parsedDueDate;
  }

  if (priority) {
    if (!PRIORITY_LEVELS.includes(priority)) {
      return res.status(400).json({ msg: 'Invalid priority value provided.' });
    }
    task.priority = priority;
  }

  if (status) {
    if (!TASK_STATUSES.includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value provided.' });
    }
    task.status = status;
  }

  if (typeof requireAcknowledgement === 'boolean') {
    task.requireAcknowledgement = requireAcknowledgement;
  }

  if (!assignedTo) {
    return res.status(400).json({ msg: 'Please specify at least one audience for this task.' });
  }

  try {
    const { assignments, employeeDocs, hodDocs } = await buildAssignmentsFromPayload(assignedTo);
    enforceAssignmentsForRole(assignments, requesterRole, req, employeeDocs, hodDocs);
    if (
      !assignments.includeAllEmployees &&
      !assignments.includeAllHods &&
      assignments.employees.length === 0 &&
      assignments.hods.length === 0
    ) {
      throw new Error('Select at least one employee or HOD, or enable the "target all" option.');
    }
    task.assignedTo = assignments;
  } catch (error) {
    return res.status(400).json({ msg: error.message });
  }

  if (recurrence) {
    task.recurrence = sanitizeRecurrence(recurrence);
  }

  if (Array.isArray(attachments)) {
    task.attachments = sanitizeAttachments(attachments);
  }

  await task.save();

  const createdTask = await populateTaskAudience(
    Task.findById(task._id)
  );

  res.status(201).json({
    msg: 'Task created successfully.',
    task: formatTaskForManagement(createdTask)
  });
});

// HR: List all tasks
exports.listTasks = asyncHandler(async (req, res) => {
  const { status, priority, includeTemplates } = req.query;

  const filter = {};

  if (includeTemplates !== 'true') {
    filter.isTemplate = { $ne: true };
  }

  if (status) {
    const statusList = Array.isArray(status) ? status : status.split(',');
    filter.status = { $in: statusList.filter((item) => TASK_STATUSES.includes(item)) };
  }

  if (priority) {
    const priorityList = Array.isArray(priority) ? priority : priority.split(',');
    filter.priority = { $in: priorityList.filter((item) => PRIORITY_LEVELS.includes(item)) };
  }

  const tasks = await populateTaskAudience(
    Task.find(filter).sort({ createdAt: -1 })
  ).lean();

  res.json(tasks.map(formatTaskForManagement));
});

// List tasks created by current HOD/Principal
exports.listTasksByCreator = asyncHandler(async (req, res) => {
  const role = (req.user.role || '').toLowerCase();

  if (!['hod', 'principal', 'hr'].includes(role)) {
    return res.status(403).json({ msg: 'You are not authorized to view managed tasks.' });
  }

  const filter = {
    createdBy: req.user.id,
    createdByRole: role,
    isTemplate: false
  };

  const tasks = await populateTaskAudience(
    Task.find(filter).sort({ createdAt: -1 })
  ).lean();

  res.json(tasks.map(formatTaskForManagement));
});

// Employee: List targeted tasks
exports.listTasksForEmployee = asyncHandler(async (req, res) => {
  // Normalize campus (handle string or object)
  const normalizedCampus = typeof req.user.campus === 'string'
    ? req.user.campus
    : (req.user.campus?.name || req.user.campus || '');
  
  const userContext = {
    id: req.user.id,
    campus: normalizedCampus,
    department: req.user.department
  };

  const orFilters = [
    { 'assignedTo.includeAllEmployees': true },
    { 'assignedTo.employees': req.user.id }
  ];

  if (req.user.department) {
    orFilters.push({ 'assignedTo.departments': req.user.department.toLowerCase() });
  }

  if (normalizedCampus) {
    orFilters.push({ 'assignedTo.campuses': normalizedCampus.toLowerCase() });
  }

  const tasks = await Task.find({
    isTemplate: false,
    status: { $ne: 'archived' },
    $or: orFilters
  })
    .sort({ priority: -1, dueDate: 1, createdAt: -1 })
    .lean();

  const visibleTasks = tasks
    .filter((task) => canEmployeeAccessTask(task, userContext))
    .map((task) => formatTaskForRecipient(task, 'Employee', req.user.id));

  res.json(visibleTasks);
});

// HOD: List targeted tasks
exports.listTasksForHod = asyncHandler(async (req, res) => {
  // Normalize campus (handle string or object)
  const normalizedCampus = typeof req.user.campus === 'string'
    ? req.user.campus
    : (req.user.campus?.name || req.user.campus || '');
  
  const userContext = {
    id: req.user.id,
    campus: normalizedCampus,
    branchCode: req.user.branchCode
  };

  const orFilters = [
    { 'assignedTo.includeAllHods': true },
    { 'assignedTo.hods': req.user.id }
  ];

  if (req.user.branchCode) {
    orFilters.push({ 'assignedTo.departments': req.user.branchCode.toLowerCase() });
  }

  if (normalizedCampus) {
    orFilters.push({ 'assignedTo.campuses': normalizedCampus.toLowerCase() });
  }

  const tasks = await Task.find({
    isTemplate: false,
    status: { $ne: 'archived' },
    $or: orFilters
  })
    .sort({ priority: -1, dueDate: 1, createdAt: -1 })
    .lean();

  const visibleTasks = tasks
    .filter((task) => canHodAccessTask(task, userContext))
    .map((task) => formatTaskForRecipient(task, 'HOD', req.user.id));

  res.json(visibleTasks);
});

// Update a task (HR / HOD / Principal)
exports.updateTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    dueDate,
    priority,
    status,
    assignedTo,
    requireAcknowledgement,
    recurrence,
    attachments
  } = req.body;

  const { id } = req.params;
  const task = await Task.findById(id);

  if (!task) {
    return res.status(404).json({ msg: 'Task not found.' });
  }

  const requesterRole = (req.user.role || '').toLowerCase();
  if (!['hr', 'hod', 'principal'].includes(requesterRole)) {
    return res.status(403).json({ msg: 'You are not authorized to update tasks.' });
  }

  if (requesterRole !== 'hr') {
    if (task.createdByRole !== requesterRole || task.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ msg: 'You can only update the tasks you created.' });
    }
  }

  if (title !== undefined) {
    if (!title || !title.trim()) {
      return res.status(400).json({ msg: 'Title cannot be empty.' });
    }
    task.title = title.trim();
  }

  if (description !== undefined) {
    if (!description || !description.trim()) {
      return res.status(400).json({ msg: 'Description cannot be empty.' });
    }
    task.description = description.trim();
  }

  if (dueDate !== undefined) {
    if (!dueDate) {
      task.dueDate = undefined;
    } else {
      const parsedDueDate = new Date(dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ msg: 'Invalid due date provided.' });
      }
      task.dueDate = parsedDueDate;
    }
  }

  if (priority !== undefined) {
    if (!PRIORITY_LEVELS.includes(priority)) {
      return res.status(400).json({ msg: 'Invalid priority value provided.' });
    }
    task.priority = priority;
  }

  if (status !== undefined) {
    if (!TASK_STATUSES.includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value provided.' });
    }
    task.status = status;
  }

  if (typeof requireAcknowledgement === 'boolean') {
    task.requireAcknowledgement = requireAcknowledgement;
  }

  if (assignedTo) {
    try {
      const { assignments, employeeDocs, hodDocs } = await buildAssignmentsFromPayload(assignedTo);
      enforceAssignmentsForRole(assignments, requesterRole, req, employeeDocs, hodDocs);
      if (
        !assignments.includeAllEmployees &&
        !assignments.includeAllHods &&
        assignments.employees.length === 0 &&
        assignments.hods.length === 0
      ) {
        throw new Error('Select at least one employee or HOD, or enable the "target all" option.');
      }
      task.assignedTo = assignments;
    } catch (error) {
      return res.status(400).json({ msg: error.message });
    }
  }

  if (recurrence) {
    task.recurrence = sanitizeRecurrence(recurrence);
  }

  if (Array.isArray(attachments)) {
    task.attachments = sanitizeAttachments(attachments);
  }

  await task.save();

  const updatedTask = await populateTaskAudience(
    Task.findById(task._id)
  );

  res.json({
    msg: 'Task updated successfully.',
    task: formatTaskForManagement(updatedTask)
  });
});

// Delete a task (HR / HOD / Principal)
exports.deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ msg: 'Task not found.' });
  }

  const requesterRole = (req.user.role || '').toLowerCase();
  if (!['hr', 'hod', 'principal'].includes(requesterRole)) {
    return res.status(403).json({ msg: 'You are not authorized to delete tasks.' });
  }

  if (requesterRole !== 'hr') {
    if (task.createdByRole !== requesterRole || task.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ msg: 'You can only delete the tasks you created.' });
    }
  }

  await task.deleteOne();
  res.json({ msg: 'Task deleted successfully.' });
});

// Employee/HOD: Update acknowledgement
exports.updateTaskAcknowledgement = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const role = (req.user.role || '').toLowerCase();
  const assigneeModel = role === 'hod' ? 'HOD' : 'Employee';

  const task = await Task.findById(taskId);
  if (!task || task.isTemplate) {
    return res.status(404).json({ msg: 'Task not found.' });
  }

  const visibilityFilters = assigneeModel === 'Employee'
    ? [
        { 'assignedTo.includeAllEmployees': true },
        { 'assignedTo.employees': req.user.id }
      ]
    : [
        { 'assignedTo.includeAllHods': true },
        { 'assignedTo.hods': req.user.id }
      ];

  const normalizedDepartment = (req.user.department || req.user.branchCode || '').toString().toLowerCase();
  // Normalize campus (handle string or object)
  const normalizedCampus = typeof req.user.campus === 'string'
    ? req.user.campus.toLowerCase()
    : (req.user.campus?.name ? req.user.campus.name.toLowerCase() : '');

  if (normalizedDepartment) {
    visibilityFilters.push({ 'assignedTo.departments': normalizedDepartment });
  }
  if (normalizedCampus) {
    visibilityFilters.push({ 'assignedTo.campuses': normalizedCampus });
  }

  const visibilityMatch = await Task.exists({
    _id: taskId,
    isTemplate: false,
    status: { $ne: 'archived' },
    $or: visibilityFilters
  });

  if (!visibilityMatch) {
    return res.status(403).json({ msg: 'You are not authorized to update this task.' });
  }

  if (!task.requireAcknowledgement) {
    return res.status(400).json({ msg: 'This task does not require acknowledgement.' });
  }

  const {
    status = 'acknowledged',
    comment,
    proofUrl
  } = req.body;

  if (!ACK_STATUSES.includes(status)) {
    return res.status(400).json({ msg: 'Invalid acknowledgement status provided.' });
  }

  const existingAcknowledgement = task.acknowledgements.find((ack) => {
    if (!ack || !ack.assignee) return false;
    return (
      ack.assignee.toString() === req.user.id.toString() &&
      ack.assigneeModel === assigneeModel
    );
  });

  if (existingAcknowledgement) {
    existingAcknowledgement.status = status;
    existingAcknowledgement.comment = comment ?? existingAcknowledgement.comment;
    existingAcknowledgement.proofUrl = proofUrl ?? existingAcknowledgement.proofUrl;
    existingAcknowledgement.respondedAt = new Date();
  } else {
    task.acknowledgements.push({
      assignee: req.user.id,
      assigneeModel,
      status,
      comment,
      proofUrl,
      respondedAt: new Date()
    });
  }

  await task.save();

  const responseTask = formatTaskForRecipient(task, assigneeModel, req.user.id);

  res.json({
    msg: 'Task acknowledgement updated successfully.',
    task: responseTask
  });
});
