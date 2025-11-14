import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaTasks,
  FaPlus,
  FaCalendarAlt,
  FaFlag,
  FaUsers,
  FaTrash,
  FaEdit,
  FaUserTie,
  FaRegCalendarCheck,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import config from '../../config';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = config.API_BASE_URL;

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' }
];

const emptyTaskForm = (branchCode = '') => ({
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium',
  status: 'active',
  requireAcknowledgement: true, // Default to checked
  workType: '', // 'individual' or 'group'
  assigneeType: '', // 'employee' (for individual work)
  assignedTo: {
    includeAllEmployees: false,
    includeAllHods: false,
    employees: [],
    hods: [],
    departments: branchCode ? [branchCode.toLowerCase()] : []
  },
  recurrence: {
    frequency: 'none',
    interval: 1,
    daysOfWeek: [],
    endDate: ''
  },
  attachments: []
});

const HodTaskManagementSection = () => {
  const { user } = useAuth();
  const branchCode = (user?.branchCode || user?.department || '').toLowerCase();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm(branchCode));
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [viewTask, setViewTask] = useState(null);

  const token = useMemo(() => localStorage.getItem('token'), []);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }),
    [token]
  );

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/hod/tasks/manage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchEmployees = useCallback(async () => {
    setMetaLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/hod/department/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load employees');
    } finally {
      setMetaLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, [fetchTasks, fetchEmployees]);

  const resetForm = () => {
    setTaskForm(emptyTaskForm(branchCode));
    setEditingTaskId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const filteredEmployees = useMemo(() => {
    // Backend already filters employees by department for HOD
    // So we can use all employees returned from the API
    // The backend endpoint /hod/department/employees already filters by:
    // - For teaching HOD: department = branchCode
    // - For non-teaching HOD: assignedHodId = hod._id
      return employees;
  }, [employees]);

  const handleWorkTypeChange = (workType) => {
    setTaskForm((prev) => ({
      ...prev,
      workType,
      assigneeType: '', // Reset assignee type when work type changes
      assignedTo: {
        includeAllEmployees: false,
        includeAllHods: false,
        employees: [],
        hods: [],
        departments: branchCode ? [branchCode] : []
      }
    }));
  };

  const handleAssignedSelect = (field, values) => {
    setTaskForm((prev) => ({
      ...prev,
      assignedTo: {
        ...prev.assignedTo,
        [field]: values
      }
    }));
  };

  const preparePayload = (form) => {
    // Validate that work type is selected
    if (!form.workType) {
      throw new Error('Please select a work type (Individual or Group)');
    }
    
    if (form.workType === 'individual') {
      if (form.assignedTo.employees.length === 0) {
        throw new Error('Please select at least one employee');
      }
      if (form.assignedTo.employees.length > 1) {
        throw new Error('Individual work can only be assigned to one employee');
      }
    } else if (form.workType === 'group') {
      if (
        !form.assignedTo.includeAllEmployees &&
        form.assignedTo.employees.length === 0
      ) {
        throw new Error('Please select "Target all employees" or select specific employees');
      }
    }

    return {
    title: form.title,
    description: form.description,
    dueDate: form.dueDate || null,
    priority: form.priority,
    status: form.status,
    requireAcknowledgement: form.requireAcknowledgement,
    assignedTo: {
      includeAllEmployees: form.assignedTo.includeAllEmployees,
      includeAllHods: false,
      employees: form.assignedTo.employees,
      hods: [],
      departments: form.assignedTo.departments
    },
    recurrence: {
      frequency: form.recurrence.frequency,
      interval: Number(form.recurrence.interval) > 0 ? Number(form.recurrence.interval) : 1,
      daysOfWeek: form.recurrence.daysOfWeek,
      endDate: form.recurrence.endDate || null
    },
    attachments: (form.attachments || []).filter((item) => item && item.trim())
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = preparePayload(taskForm);
      const url = editingTaskId
        ? `${API_BASE_URL}/hod/tasks/manage/${editingTaskId}`
        : `${API_BASE_URL}/hod/tasks/manage`;
      const method = editingTaskId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.msg || 'Failed to save task');
      }

      toast.success(`Task ${editingTaskId ? 'updated' : 'created'} successfully`);
      closeModal();
      await fetchTasks();
    } catch (err) {
      toast.error(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (task) => {
    setEditingTaskId(task._id);
    const assignedTo = task.assignedTo || {};
    
    // Determine work type from existing assignment
    let workType = '';
    let assigneeType = '';
    
    if (assignedTo.includeAllEmployees || (assignedTo.departments && assignedTo.departments.length > 0)) {
      workType = 'group';
    } else if ((assignedTo.employees && assignedTo.employees.length > 0)) {
      workType = 'individual';
      assigneeType = 'employee';
    } else {
      workType = 'group'; // Default to group if unclear
    }
    
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      dueDate: task.dueDate ? task.dueDate.substring(0, 10) : '',
      priority: task.priority || 'medium',
      status: task.status || 'active',
      requireAcknowledgement: task.requireAcknowledgement !== undefined ? task.requireAcknowledgement : true,
      workType,
      assigneeType,
      assignedTo: {
        includeAllEmployees: assignedTo.includeAllEmployees || false,
        includeAllHods: false,
        employees: (assignedTo.employees || []).map((employee) =>
          typeof employee === 'string' ? employee : employee?._id
        ),
        hods: [],
        departments: assignedTo.departments || (branchCode ? [branchCode] : [])
      },
      recurrence: {
        frequency: task.recurrence?.frequency || 'none',
        interval: task.recurrence?.interval || 1,
        daysOfWeek: task.recurrence?.daysOfWeek || [],
        endDate: task.recurrence?.endDate ? task.recurrence.endDate.substring(0, 10) : ''
      },
      attachments: task.attachments || []
    });
    setShowModal(true);
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/hod/tasks/manage/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.msg || 'Failed to delete task');
      }

      toast.success('Task deleted successfully');
      await fetchTasks();
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    } finally {
      setSaving(false);
    }
  };

  const updateAttachmentField = (index, value) => {
    setTaskForm((prev) => {
      const attachments = [...(prev.attachments || [])];
      attachments[index] = value;
      return { ...prev, attachments };
    });
  };

  const addAttachmentField = () => {
    setTaskForm((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), '']
    }));
  };

  const removeAttachmentField = (index) => {
    setTaskForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, idx) => idx !== index)
    }));
  };

  const openViewTask = (task) => setViewTask(task);
  const closeViewTask = () => setViewTask(null);

  const renderAcknowledgementSummary = (summary) => {
    if (!summary) return 'Acknowledgement optional';
    return `Responses: ${summary.responses} • Completed: ${summary.completed} • Pending: ${summary.pending}`;
  };

  const renderAudienceDetails = (assignedTo = {}) => {
    if (!assignedTo) return 'No audience specified';
    
    const segments = [];
    
    // Check if all employees are included
    if (assignedTo.includeAllEmployees) {
      const deptNames = assignedTo.departments?.length 
        ? assignedTo.departments.map((dep) => dep.toUpperCase()).join(', ')
        : 'department';
      segments.push(`All employees in ${deptNames}`);
    }
    
    // Show specific employee names if available
    if (assignedTo.employees && assignedTo.employees.length > 0) {
      const employeeNames = assignedTo.employees.map((emp) => {
        // Handle both populated objects and IDs
        if (typeof emp === 'object' && emp !== null) {
          return emp.name || emp.employeeId || 'Unknown';
        }
        return 'Unknown';
      }).filter(Boolean);
      
      if (employeeNames.length > 0) {
        if (employeeNames.length <= 5) {
          segments.push(`Employees: ${employeeNames.join(', ')}`);
        } else {
          segments.push(`Employees: ${employeeNames.slice(0, 5).join(', ')} and ${employeeNames.length - 5} more`);
        }
      }
    }
    
    // Show departments if no specific employees but departments are set
    if (!assignedTo.includeAllEmployees && (!assignedTo.employees || assignedTo.employees.length === 0) && assignedTo.departments?.length) {
      segments.push(`Departments: ${assignedTo.departments.map((dep) => dep.toUpperCase()).join(', ')}`);
    }
    
    return segments.length > 0 ? segments.join(' • ') : 'No audience specified';
  };

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    const totalTasks = tasks.length;
    const activeTasks = tasks.filter(t => t.status === 'active').length;
    
    // Completed tasks: status is 'completed' OR all acknowledgements are completed
    const completedTasks = tasks.filter(t => {
      if (t.status === 'completed' || t.status === 'archived') return true;
      // If task requires acknowledgement and all are completed (no pending)
      if (t.requireAcknowledgement && t.acknowledgementSummary) {
        const pendingResponses = t.acknowledgementSummary.pending || 0;
        const completedResponses = t.acknowledgementSummary.completed || 0;
        const totalResponses = t.acknowledgementSummary.responses || 0;
        // Consider completed if there are responses and no pending (all completed)
        if (totalResponses > 0 && pendingResponses === 0 && completedResponses > 0) {
          return true;
        }
      }
      return false;
    }).length;
    
    const overdueTasks = tasks.filter(t => {
      // Don't count as overdue if task is completed or all acknowledgements are completed
      const isCompleted = t.status === 'completed' || t.status === 'archived' || 
        (t.requireAcknowledgement && t.acknowledgementSummary && 
         (t.acknowledgementSummary.pending || 0) === 0 && 
         (t.acknowledgementSummary.completed || 0) > 0 &&
         (t.acknowledgementSummary.responses || 0) > 0);
      if (!t.dueDate || isCompleted) return false;
      return new Date(t.dueDate) < new Date();
    }).length;
    
    const pendingAcknowledgements = tasks.reduce((sum, task) => {
      if (task.requireAcknowledgement && task.acknowledgementSummary) {
        return sum + (task.acknowledgementSummary.pending || 0);
      }
      return sum;
    }, 0);

    // Critical/High priority tasks: exclude completed tasks (by status or acknowledgements)
    const criticalTasks = tasks.filter(t => {
      if (t.priority !== 'critical') return false;
      const isCompleted = t.status === 'completed' || t.status === 'archived' ||
        (t.requireAcknowledgement && t.acknowledgementSummary && 
         (t.acknowledgementSummary.pending || 0) === 0 && 
         (t.acknowledgementSummary.completed || 0) > 0 &&
         (t.acknowledgementSummary.responses || 0) > 0);
      return !isCompleted;
    }).length;
    
    const highPriorityTasks = tasks.filter(t => {
      if (t.priority !== 'high') return false;
      const isCompleted = t.status === 'completed' || t.status === 'archived' ||
        (t.requireAcknowledgement && t.acknowledgementSummary && 
         (t.acknowledgementSummary.pending || 0) === 0 && 
         (t.acknowledgementSummary.completed || 0) > 0 &&
         (t.acknowledgementSummary.responses || 0) > 0);
      return !isCompleted;
    }).length;

    return {
      totalTasks,
      activeTasks,
      completedTasks,
      overdueTasks,
      pendingAcknowledgements,
      criticalTasks,
      highPriorityTasks
    };
  }, [tasks]);

  return (
    <div className="p-6 mt-4">
      <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-3">
        <FaTasks /> Branch Task Management
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Tasks */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Tasks</p>
              <p className="text-3xl font-bold">{kpiMetrics.totalTasks}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <FaTasks className="text-2xl" />
            </div>
          </div>
        </div>

        {/* Active Tasks */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Active Tasks</p>
              <p className="text-3xl font-bold">{kpiMetrics.activeTasks}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <FaRegCalendarCheck className="text-2xl" />
            </div>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Completed</p>
              <p className="text-3xl font-bold">{kpiMetrics.completedTasks}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <FaCheckCircle className="text-2xl" />
            </div>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium mb-1">Overdue</p>
              <p className="text-3xl font-bold">{kpiMetrics.overdueTasks}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <FaExclamationTriangle className="text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Pending Acknowledgements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Pending Acknowledgements</p>
              <p className="text-2xl font-bold text-primary">{kpiMetrics.pendingAcknowledgements}</p>
            </div>
            <div className="bg-primary/10 rounded-full p-3">
              <FaClock className="text-primary text-xl" />
            </div>
          </div>
        </div>

        {/* Critical Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Critical Priority</p>
              <p className="text-2xl font-bold text-red-600">{kpiMetrics.criticalTasks}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <FaFlag className="text-red-600 text-xl" />
            </div>
          </div>
        </div>

        {/* High Priority Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">{kpiMetrics.highPriorityTasks}</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <FaFlag className="text-orange-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <button
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors w-full sm:w-auto justify-center"
          onClick={openCreateModal}
        >
          <FaPlus /> {editingTaskId ? 'Update Task' : 'Create Task'}
        </button>
        {metaLoading && <div className="text-sm text-gray-500">Loading employees...</div>}
      </div>

      {loading && <div className="text-center py-6">Loading tasks...</div>}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Audience</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Acknowledgements</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500">No tasks created yet.</td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task._id} className="hover:bg-primary/5 cursor-pointer" onClick={() => openViewTask(task)}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-primary">{task.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                            task.priority === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : task.priority === 'high'
                                ? 'bg-orange-100 text-orange-700'
                                : task.priority === 'low'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          <FaFlag /> {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 capitalize">{task.status}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                        {task.assignedTo?.departments?.length
                          ? task.assignedTo.departments.map((dep) => dep.toUpperCase()).join(', ')
                          : 'Selected employees'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {renderAcknowledgementSummary(task.acknowledgementSummary)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end" onClick={(event) => event.stopPropagation()}>
                          <button
                            className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark flex items-center gap-1"
                            onClick={() => handleEdit(task)}
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 flex items-center gap-1"
                            onClick={() => handleDelete(task._id)}
                            disabled={saving}
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
              <div>
                <h3 className="text-xl font-bold text-primary">
                  {editingTaskId ? 'Update Task' : 'Create Task'}
                </h3>
                <p className="text-sm text-gray-600">Assign tasks to employees in your branch.</p>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 font-semibold text-lg">
                ✕
              </button>
            </div>

            <form className="flex-1 overflow-y-auto px-6 py-4 space-y-6" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={taskForm.status}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Acknowledgement</label>
                  <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <input
                      id="requireAcknowledgement"
                      type="checkbox"
                      checked={taskForm.requireAcknowledgement}
                      onChange={() =>
                        setTaskForm((prev) => ({
                          ...prev,
                          requireAcknowledgement: !prev.requireAcknowledgement
                        }))
                      }
                    />
                    <label htmlFor="requireAcknowledgement" className="cursor-pointer">
                      Require employees to acknowledge/complete this task
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-primary mb-3">Audience</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                  {/* Step 1: Work Type Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Work Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleWorkTypeChange('individual')}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          taskForm.workType === 'individual'
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-primary/50'
                        }`}
                      >
                        <FaUserTie className="mx-auto mb-1 text-xl" />
                        Individual Work
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWorkTypeChange('group')}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          taskForm.workType === 'group'
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-primary/50'
                        }`}
                      >
                        <FaUsers className="mx-auto mb-1 text-xl" />
                        Group Work
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Individual Work - Employee Selection */}
                  {taskForm.workType === 'individual' && (
                    <div className="bg-white rounded-lg p-4 border border-gray-300">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Select Employee <span className="text-red-500">*</span>
                      </label>
                      {metaLoading ? (
                        <div className="border border-gray-300 rounded-lg h-48 overflow-y-auto bg-white flex items-center justify-center">
                          <p className="text-sm text-gray-500">Loading employees...</p>
                        </div>
                      ) : (
                        <div className="border border-gray-300 rounded-lg h-48 overflow-y-auto bg-white">
                          {filteredEmployees.length === 0 ? (
                            <div className="p-3">
                              <p className="text-sm text-gray-500 mb-2">No employees available in your department.</p>
                              {employees.length === 0 && (
                                <p className="text-xs text-gray-400">Please ensure employees are assigned to your department.</p>
                              )}
                            </div>
                          ) : (
                            filteredEmployees.map((employee) => {
                              const selected = taskForm.assignedTo.employees.includes(employee._id);
                              return (
                                <label
                                  key={employee._id}
                                  className={`flex items-center justify-between gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-0 cursor-pointer ${
                                    selected ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <span className="flex-1">
                                    {employee.name} ({employee.employeeId})
                                    {(employee.department || employee.branchCode) && (
                                      <span className="text-xs text-gray-500 ml-2">
                                        - {(employee.department || employee.branchCode || '').toString().toUpperCase()}
                                      </span>
                                    )}
                                  </span>
                                  <input
                                    type="radio"
                                    name="individualEmployee"
                                    checked={selected}
                                    onChange={() => {
                                      handleAssignedSelect('employees', [employee._id]);
                                    }}
                                  />
                                </label>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Group Work Options */}
                  {taskForm.workType === 'group' && (
                    <div className="bg-white rounded-lg p-4 border border-gray-300 space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={taskForm.assignedTo.includeAllEmployees}
                      onChange={() =>
                        setTaskForm((prev) => ({
                          ...prev,
                          assignedTo: {
                            ...prev.assignedTo,
                                  includeAllEmployees: !prev.assignedTo.includeAllEmployees,
                                  employees: !prev.assignedTo.includeAllEmployees ? [] : prev.assignedTo.employees
                          }
                        }))
                      }
                    />
                          Target all employees in your department
                  </label>
              </div>

                      {/* Employee Selection - Only show if not targeting all */}
                      {!taskForm.assignedTo.includeAllEmployees && (
              <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Select Employees <span className="text-red-500">*</span>
                            <span className="text-xs text-gray-500 font-normal ml-2">
                              (Select specific employees from your department)
                            </span>
                          </label>
                          {metaLoading ? (
                            <div className="border border-gray-300 rounded-lg h-48 overflow-y-auto bg-white flex items-center justify-center">
                              <p className="text-sm text-gray-500">Loading employees...</p>
                            </div>
                          ) : (
                            <div className="border border-gray-300 rounded-lg h-48 overflow-y-auto bg-white">
                  {filteredEmployees.length === 0 ? (
                                <div className="p-3">
                                  <p className="text-sm text-gray-500 mb-2">No employees available in your department.</p>
                                  {employees.length === 0 && (
                                    <p className="text-xs text-gray-400">Please ensure employees are assigned to your department.</p>
                                  )}
                                </div>
                  ) : (
                    filteredEmployees.map((employee) => {
                      const selected = taskForm.assignedTo.employees.includes(employee._id);
                      return (
                        <label
                          key={employee._id}
                          className={`flex items-center justify-between gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-0 cursor-pointer ${
                            selected ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
                          }`}
                        >
                                      <span className="flex-1">
                            {employee.name} ({employee.employeeId})
                                        {(employee.department || employee.branchCode) && (
                                          <span className="text-xs text-gray-500 ml-2">
                                            - {(employee.department || employee.branchCode || '').toString().toUpperCase()}
                                          </span>
                                        )}
                          </span>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              event.stopPropagation();
                                          const next = selected
                                            ? taskForm.assignedTo.employees.filter((id) => id !== employee._id)
                                            : [...taskForm.assignedTo.employees, employee._id];
                                          handleAssignedSelect('employees', next);
                            }}
                          />
                        </label>
                      );
                    })
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold text-primary">Reference Links</h4>
                  <button type="button" className="text-sm text-primary hover:underline" onClick={addAttachmentField}>
                    + Add link
                  </button>
                </div>
                {(taskForm.attachments || []).length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-3">
                    Attach helpful links or documents that employees can reference while completing the task.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {taskForm.attachments.map((attachment, index) => (
                      <div key={`attachment-${index}`} className="flex flex-col md:flex-row md:items-center gap-3">
                        <input
                          type="url"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                          placeholder="https://example.com/resource"
                          value={attachment}
                          onChange={(e) => updateAttachmentField(index, e.target.value)}
                        />
                        <button type="button" className="text-sm text-red-500 hover:underline" onClick={() => removeAttachmentField(index)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingTaskId ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
              <div>
                <h3 className="text-xl font-bold text-primary">{viewTask.title}</h3>
                <p className="text-sm text-gray-600">Detailed information</p>
              </div>
              <button onClick={closeViewTask} className="text-gray-500 hover:text-gray-700 font-semibold text-lg">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <section>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
                <p className="text-gray-700 whitespace-pre-wrap text-sm">{viewTask.description}</p>
              </section>

              <section className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <span className="font-semibold block mb-1">Priority</span>
                  <span>{viewTask.priority}</span>
                </div>
                <div>
                  <span className="font-semibold block mb-1">Status</span>
                  <span className="capitalize">{viewTask.status}</span>
                </div>
                <div>
                  <span className="font-semibold block mb-1">Due Date</span>
                  <span>{viewTask.dueDate ? new Date(viewTask.dueDate).toLocaleString() : 'Not set'}</span>
                </div>
                <div>
                  <span className="font-semibold block mb-1">Created</span>
                  <span>{new Date(viewTask.createdAt).toLocaleString()}</span>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">Audience</h4>
                  {viewTask.requireAcknowledgement && viewTask.acknowledgementSummary && (
                    <p className="text-xs text-gray-500">
                      {renderAcknowledgementSummary(viewTask.acknowledgementSummary)}
                    </p>
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                  {viewTask.assignedTo?.includeAllEmployees && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <span className="font-semibold text-blue-700">All employees</span>
                      {viewTask.assignedTo.departments?.length > 0 && (
                        <span className="text-blue-600"> in {viewTask.assignedTo.departments.map((dep) => dep.toUpperCase()).join(', ')}</span>
                      )}
                    </div>
                  )}
                  {viewTask.assignedTo?.employees && viewTask.assignedTo.employees.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="font-semibold text-gray-700 mb-2">
                        {viewTask.assignedTo.employees.length} {viewTask.assignedTo.employees.length === 1 ? 'Employee' : 'Employees'}:
                      </div>
                      <div className="space-y-1">
                        {viewTask.assignedTo.employees.map((emp, idx) => {
                          const employeeName = typeof emp === 'object' && emp !== null 
                            ? (emp.name || emp.employeeId || 'Unknown')
                            : 'Unknown';
                          const employeeId = typeof emp === 'object' && emp !== null 
                            ? (emp.employeeId || '')
                            : '';
                          
                          // Find acknowledgement status for this employee
                          let acknowledgementStatus = null;
                          if (viewTask.acknowledgements && viewTask.acknowledgements.length > 0) {
                            const empId = typeof emp === 'object' && emp !== null ? emp._id : emp;
                            const ack = viewTask.acknowledgements.find(a => {
                              const assignee = a.assignee || a.assigneeDetails;
                              const assigneeId = assignee?._id || assignee;
                              return assigneeId && assigneeId.toString() === empId.toString();
                            });
                            if (ack) {
                              acknowledgementStatus = ack.status;
                            }
                          }
                          
                          return (
                            <div key={idx} className="flex items-center justify-between text-gray-700">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-primary rounded-full"></span>
                                <span>{employeeName}</span>
                                {employeeId && employeeId !== employeeName && (
                                  <span className="text-gray-500 text-xs">({employeeId})</span>
                                )}
                              </div>
                              {viewTask.requireAcknowledgement && (
                                <div className="flex items-center gap-2">
                                  {acknowledgementStatus === 'completed' ? (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                      <FaCheckCircle className="text-xs" />
                                      Completed
                                    </span>
                                  ) : acknowledgementStatus === 'acknowledged' ? (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                                      <FaRegCalendarCheck className="text-xs" />
                                      Acknowledged
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                                      Pending
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {!viewTask.assignedTo?.includeAllEmployees && 
                   (!viewTask.assignedTo?.employees || viewTask.assignedTo.employees.length === 0) && 
                   viewTask.assignedTo?.departments?.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <span className="font-semibold text-gray-700">Departments: </span>
                      <span className="text-gray-600">{viewTask.assignedTo.departments.map((dep) => dep.toUpperCase()).join(', ')}</span>
                    </div>
                  )}
                  {!viewTask.assignedTo?.includeAllEmployees && 
                   (!viewTask.assignedTo?.employees || viewTask.assignedTo.employees.length === 0) && 
                   (!viewTask.assignedTo?.departments || viewTask.assignedTo.departments.length === 0) && (
                    <div className="text-gray-500 italic">No audience specified</div>
                  )}
                </div>
              </section>

              {viewTask.attachments?.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Resources</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {viewTask.attachments.map((link, index) => (
                      <li key={`${viewTask._id}-attachment-${index}`}>
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                onClick={closeViewTask}
              >
                Close
              </button>
              <button
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                onClick={() => {
                  closeViewTask();
                  handleEdit(viewTask);
                }}
              >
                Edit Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodTaskManagementSection;
