import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaTasks,
  FaPlus,
  FaRegCalendarCheck,
  FaCalendarAlt,
  FaFlag,
  FaUsers,
  FaUserTie
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

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' }
];

const emptyTaskForm = (branchDepartments = []) => ({
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium',
  status: 'active',
  requireAcknowledgement: false,
  assignedTo: {
    includeAllEmployees: true,
    includeAllHods: false,
    employees: [],
    hods: [],
    departments: branchDepartments,
    campuses: []
  },
  recurrence: {
    frequency: 'none',
    interval: 1,
    daysOfWeek: [],
    endDate: ''
  },
  attachments: []
});

const HRTaskManagementSection = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm());
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [assignmentOptions, setAssignmentOptions] = useState({
    employees: [],
    hods: [],
    departments: [],
    campuses: []
  });
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
      const response = await fetch(`${API_BASE_URL}/hr/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
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

  const fetchAssignmentMetadata = useCallback(async () => {
    setMetadataLoading(true);
    try {
      const [employeesRes, hodsRes, branchesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/hr/employees?status=active`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/hr/hods`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/hr/branches`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const employees = employeesRes.ok ? await employeesRes.json() : [];
      const hods = hodsRes.ok ? await hodsRes.json() : [];
      const branchesPayload = branchesRes.ok ? await branchesRes.json() : { data: [] };

      const departments = Array.isArray(branchesPayload.data)
        ? branchesPayload.data.map((branch) => branch.code).filter(Boolean)
        : [];

      const campuses = Array.isArray(branchesPayload.data)
        ? Array.from(
            new Set(
              branchesPayload.data
                .map((branch) => branch.campusType)
                .filter(Boolean)
                .map((campus) => campus.toLowerCase())
            )
          )
        : [];

      setAssignmentOptions({
        employees: Array.isArray(employees) ? employees : [],
        hods: Array.isArray(hods) ? hods : [],
        departments,
        campuses: campuses.length
          ? campuses
          : user?.campus?.name
            ? [user.campus.name.toLowerCase()]
            : []
      });
    } catch (err) {
      toast.error('Failed to load assignment metadata');
    } finally {
      setMetadataLoading(false);
    }
  }, [API_BASE_URL, authHeaders, token, user]);

  useEffect(() => {
    fetchTasks();
    fetchAssignmentMetadata();
  }, [fetchTasks, fetchAssignmentMetadata]);

  const resetForm = () => {
    setTaskForm(emptyTaskForm());
    setEditingTaskId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  const handleAssignmentToggle = (field) => {
    setTaskForm((prev) => ({
      ...prev,
      assignedTo: {
        ...prev.assignedTo,
        [field]: !prev.assignedTo[field]
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

  const updateAttachmentField = (index, value) => {
    setTaskForm((prev) => {
      const existing = prev.attachments || [];
      const updated = [...existing];
      updated[index] = value;
      return { ...prev, attachments: updated };
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
      attachments: (prev.attachments || []).filter((_, fieldIndex) => fieldIndex !== index)
    }));
  };

  const updateRecurrenceField = (field, value) => {
    setTaskForm((prev) => ({
      ...prev,
      recurrence: {
        ...prev.recurrence,
        [field]: value
      }
    }));
  };

  const toggleRecurrenceDay = (day) => {
    setTaskForm((prev) => {
      const currentDays = prev.recurrence.daysOfWeek || [];
      const exists = currentDays.includes(day);
      return {
        ...prev,
        recurrence: {
          ...prev.recurrence,
          daysOfWeek: exists
            ? currentDays.filter((item) => item !== day)
            : [...currentDays, day]
        }
      };
    });
  };

  const preparePayloadFromForm = (form) => ({
    title: form.title,
    description: form.description,
    dueDate: form.dueDate || null,
    priority: form.priority,
    status: form.status,
    requireAcknowledgement: form.requireAcknowledgement,
    assignedTo: {
      includeAllEmployees: form.assignedTo.includeAllEmployees,
      includeAllHods: form.assignedTo.includeAllHods,
      employees: form.assignedTo.employees,
      hods: form.assignedTo.hods,
      departments: form.assignedTo.departments
    },
    recurrence: {
      frequency: form.recurrence.frequency,
      interval: Number(form.recurrence.interval) > 0 ? Number(form.recurrence.interval) : 1,
      daysOfWeek: form.recurrence.daysOfWeek,
      endDate: form.recurrence.endDate || null
    },
    attachments: (form.attachments || []).filter((item) => item && item.trim())
  });

  const handleSubmitTask = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = preparePayloadFromForm(taskForm);
      const url = editingTaskId
        ? `${API_BASE_URL}/hr/tasks/${editingTaskId}`
        : `${API_BASE_URL}/hr/tasks`;
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
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditTask = (task) => {
    setEditingTaskId(task._id);
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      dueDate: task.dueDate ? task.dueDate.substring(0, 10) : '',
      priority: task.priority || 'medium',
      status: task.status || 'active',
      requireAcknowledgement: task.requireAcknowledgement || false,
      assignedTo: {
        includeAllEmployees: task.assignedTo?.includeAllEmployees || false,
        includeAllHods: task.assignedTo?.includeAllHods || false,
        employees: (task.assignedTo?.employees || []).map((employee) =>
          typeof employee === 'string' ? employee : employee?._id
        ),
        hods: (task.assignedTo?.hods || []).map((hod) =>
          typeof hod === 'string' ? hod : hod?._id
        ),
        departments: task.assignedTo?.departments || assignmentOptions.departments
      },
      recurrence: {
        frequency: task.recurrence?.frequency || 'none',
        interval: task.recurrence?.interval || 1,
        daysOfWeek: task.recurrence?.daysOfWeek || [],
        endDate: task.recurrence?.endDate ? task.recurrence.endDate.substring(0, 10) : ''
      },
      attachments: task.attachments || []
    });
    setShowCreateModal(true);
  };

  const handleDeleteTask = async (taskId, event) => {
    if (event) {
      event.stopPropagation();
    }
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/hr/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.msg || 'Failed to delete task');
      }

      toast.success('Task deleted successfully');
      await fetchTasks();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderAudienceSummary = (assignedTo = {}) => {
    const segments = [];
    if (assignedTo.includeAllEmployees) segments.push('All employees');
    if (assignedTo.includeAllHods) segments.push('All HODs');

    if (assignedTo.departments?.length) {
      segments.push(`Departments: ${assignedTo.departments.map((dep) => dep.toUpperCase()).join(', ')}`);
    }
    if (assignedTo.campuses?.length) {
      segments.push(`Campuses: ${assignedTo.campuses.map((camp) => camp.toUpperCase()).join(', ')}`);
    }
    if (assignedTo.employees?.length) {
      segments.push(`Individuals: ${assignedTo.employees.length}`);
    }
    if (assignedTo.hods?.length) {
      segments.push(`HODs: ${assignedTo.hods.length}`);
    }

    return segments.length ? segments.join(' • ') : 'No audience specified';
  };

  const renderAcknowledgementSummary = (summary) => {
    if (!summary) return 'Acknowledgement optional';
    return `Responses: ${summary.responses} • Completed: ${summary.completed} • Pending: ${summary.pending}`;
  };

  const openViewTask = (task) => {
    setViewTask(task);
  };

  const closeViewTask = () => {
    setViewTask(null);
  };

  return (
    <div className="p-6 mt-4">
      <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-3">
        <FaTasks /> Task Management
      </h2>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <button
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors w-full sm:w-auto justify-center"
          onClick={openCreateModal}
        >
          <FaPlus /> {editingTaskId ? 'Update Task' : 'Create Task'}
        </button>
        {metadataLoading && (
          <div className="text-sm text-gray-500">Loading assignment metadata...</div>
        )}
      </div>
      
      {loading && <div className="text-center py-6">Loading tasks...</div>}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <FaRegCalendarCheck /> All Tasks
        </h3>
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-500">No tasks found.</div>
          ) : (
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
                  {tasks.map((task) => (
                    <tr
                      key={task._id}
                      className="hover:bg-primary/5 cursor-pointer"
                      onClick={() => openViewTask(task)}
                    >
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
                        {renderAudienceSummary(task.assignedTo)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {renderAcknowledgementSummary(task.acknowledgementSummary)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                  <button
                            className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditTask(task);
                            }}
                  >
                    Edit
                  </button>
                  <button
                            className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600"
                            onClick={(event) => handleDeleteTask(task._id, event)}
                            disabled={saving}
                  >
                    Delete
                  </button>
                </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
          )}
        </div>
        </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
                <div>
                <h3 className="text-xl font-bold text-primary">
                  {editingTaskId ? 'Update Task' : 'Create Task'}
                </h3>
                <p className="text-sm text-gray-600">
                  Configure the task details, audience, acknowledgements, and optional recurrence.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 font-semibold text-lg"
              >
                ✕
              </button>
            </div>

            <form className="flex-1 overflow-y-auto px-6 py-4 space-y-6" onSubmit={handleSubmitTask}>
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-28 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
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
                      Require recipients to acknowledge/complete this task
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-primary mb-3">Audience</h4>
                <div className="grid md:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={taskForm.assignedTo.includeAllEmployees}
                        onChange={() => handleAssignmentToggle('includeAllEmployees')}
                      />
                      Target all employees
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={taskForm.assignedTo.includeAllHods}
                        onChange={() => handleAssignmentToggle('includeAllHods')}
                      />
                      Target all HODs
                    </label>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Departments</label>
                      <select
                        multiple
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 focus:outline-none focus:ring-2 focus:ring-primary/40"
                        value={taskForm.assignedTo.departments}
                        onChange={(event) => {
                          const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                          handleAssignedSelect('departments', selected);
                        }}
                      >
                        {assignmentOptions.departments.map((department) => (
                          <option key={department} value={department}>
                            {department.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Select Employees</label>
                      <div className="border border-gray-300 rounded-lg h-40 overflow-y-auto">
                        {assignmentOptions.employees.length === 0 ? (
                          <p className="text-sm text-gray-500 p-3">No employees available.</p>
                        ) : (
                          assignmentOptions.employees
                            .filter((employee) => {
                              if (taskForm.assignedTo.departments.length === 0) return true;
                              return employee.department && taskForm.assignedTo.departments.includes(employee.department);
                            })
                            .map((employee) => {
                              const selected = taskForm.assignedTo.employees.includes(employee._id);
                              return (
                                <label
                                  key={employee._id}
                                  className={`flex items-center justify-between gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-0 cursor-pointer ${
                                    selected ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <span className="flex-1 truncate">
                                    {employee.name} ({employee.employeeId})
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
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Select HODs</label>
                      <div className="border border-gray-300 rounded-lg h-32 overflow-y-auto">
                        {assignmentOptions.hods.length === 0 ? (
                          <p className="text-sm text-gray-500 p-3">No HODs available.</p>
                        ) : (
                          assignmentOptions.hods.map((hod) => {
                            const selected = taskForm.assignedTo.hods.includes(hod._id);
                            return (
                              <label
                                key={hod._id}
                                className={`flex items-center justify-between gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-0 cursor-pointer ${
                                  selected ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
                                }`}
                              >
                                <span className="flex-1 truncate">
                                  {hod.name} {hod.department?.code ? `(${hod.department.code})` : ''}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={(event) => {
                                    event.stopPropagation();
                                    const next = selected
                                      ? taskForm.assignedTo.hods.filter((id) => id !== hod._id)
                                      : [...taskForm.assignedTo.hods, hod._id];
                                    handleAssignedSelect('hods', next);
                                  }}
                                />
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold text-primary">Reference Links / Attachments</h4>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={addAttachmentField}
                  >
                    + Add link
                  </button>
                </div>
                {(taskForm.attachments || []).length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-3">
                    Attach resource links (Google Drive, documents, etc.) that employees/HODs can reference while completing the task.
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
                        <button
                          type="button"
                          className="text-sm text-red-500 hover:underline"
                          onClick={() => removeAttachmentField(index)}
                        >
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
              <button
                onClick={closeViewTask}
                className="text-gray-500 hover:text-gray-700 font-semibold text-lg"
              >
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
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Audience</h4>
                <p className="text-sm text-gray-600">{renderAudienceSummary(viewTask.assignedTo)}</p>
              </section>

              {viewTask.requireAcknowledgement && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Acknowledgements</h4>
                  <p className="text-sm text-gray-600">{renderAcknowledgementSummary(viewTask.acknowledgementSummary)}</p>
                </section>
              )}

              {viewTask.attachments?.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Resources</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {viewTask.attachments.map((link, index) => (
                      <li key={`${viewTask._id}-attachment-${index}`}>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {viewTask.recurrence?.frequency && viewTask.recurrence.frequency !== 'none' && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Recurrence</h4>
                  <p className="text-sm text-gray-600">
                    {`Every ${viewTask.recurrence.interval || 1} ${viewTask.recurrence.frequency}`}
                    {viewTask.recurrence.frequency === 'weekly' && viewTask.recurrence.daysOfWeek?.length
                      ? ` on ${viewTask.recurrence.daysOfWeek
                          .map((day) => WEEKDAY_OPTIONS.find((option) => option.value === day)?.label || day)
                          .join(', ')}`
                      : ''}
                    {viewTask.recurrence.endDate ? ` until ${new Date(viewTask.recurrence.endDate).toLocaleDateString()}` : ''}
                  </p>
                </section>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                onClick={() => {
                  closeViewTask();
                  handleEditTask(viewTask);
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

export default HRTaskManagementSection;

