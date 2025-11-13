import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaTasks,
  FaPlus,
  FaCalendarAlt,
  FaFlag,
  FaUsers,
  FaUserTie,
  FaTrash,
  FaEdit
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import config from '../../config';

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

const emptyTaskForm = () => ({
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
    departments: []
  },
  recurrence: {
    frequency: 'none',
    interval: 1,
    daysOfWeek: [],
    endDate: ''
  },
  attachments: []
});

const PrincipalTaskManagementSection = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm());
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [hods, setHods] = useState([]);
  const [branches, setBranches] = useState([]);
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
      const response = await fetch(`${API_BASE_URL}/principal/tasks/manage`, {
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

  const fetchMetadata = useCallback(async () => {
    setMetaLoading(true);
    try {
      const [employeesRes, hodsRes, branchesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/principal/employees?status=active`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/principal/hods`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/principal/branches`, { headers: authHeaders })
      ]);

      if (!employeesRes.ok) throw new Error('Failed to load employees');
      if (!hodsRes.ok) throw new Error('Failed to load HODs');
      if (!branchesRes.ok) throw new Error('Failed to load branches');

      const employeesData = await employeesRes.json();
      const hodsData = await hodsRes.json();
      const branchesData = await branchesRes.json();

      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setHods(Array.isArray(hodsData) ? hodsData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load metadata');
    } finally {
      setMetaLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchTasks();
    fetchMetadata();
  }, [fetchTasks, fetchMetadata]);

  const resetForm = () => {
    setTaskForm(emptyTaskForm());
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
    const selectedDepartments = taskForm.assignedTo.departments;
    if (!selectedDepartments.length) {
      return employees;
    }
    return employees.filter((employee) => {
      const department = (employee.department || employee.branchCode || '').toLowerCase();
      return selectedDepartments.includes(department);
    });
  }, [employees, taskForm.assignedTo.departments]);

  const filteredHods = useMemo(() => {
    const selectedDepartments = taskForm.assignedTo.departments;
    if (!selectedDepartments.length) {
      return hods;
    }
    return hods.filter((hod) => {
      const department = (hod.department?.code || hod.branchCode || '').toLowerCase();
      return selectedDepartments.includes(department);
    });
  }, [hods, taskForm.assignedTo.departments]);

  const preparePayload = (form) => ({
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = preparePayload(taskForm);
      const url = editingTaskId
        ? `${API_BASE_URL}/principal/tasks/${editingTaskId}`
        : `${API_BASE_URL}/principal/tasks`;
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
        departments: task.assignedTo?.departments || []
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
      const response = await fetch(`${API_BASE_URL}/principal/tasks/${taskId}`, {
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

  return (
    <div className="p-6 mt-4">
      <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-3">
        <FaTasks /> Campus Task Management
      </h2>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <button
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors w-full sm:w-auto justify-center"
          onClick={openCreateModal}
        >
          <FaPlus /> {editingTaskId ? 'Update Task' : 'Create Task'}
        </button>
        {metaLoading && <div className="text-sm text-gray-500">Loading employees and HODs...</div>}
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
                          : 'Selected individuals'}
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
                <p className="text-sm text-gray-600">Assign tasks to employees or HODs across your campus.</p>
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
                      id="principal-require-ack"
                      type="checkbox"
                      checked={taskForm.requireAcknowledgement}
                      onChange={() =>
                        setTaskForm((prev) => ({
                          ...prev,
                          requireAcknowledgement: !prev.requireAcknowledgement
                        }))
                      }
                    />
                    <label htmlFor="principal-require-ack" className="cursor-pointer">
                      Require acknowledgement/completion
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={taskForm.assignedTo.includeAllEmployees}
                      onChange={() =>
                        setTaskForm((prev) => ({
                          ...prev,
                          assignedTo: {
                            ...prev.assignedTo,
                            includeAllEmployees: !prev.assignedTo.includeAllEmployees
                          }
                        }))
                      }
                    />
                    Target all employees in selected departments
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={taskForm.assignedTo.includeAllHods}
                      onChange={() =>
                        setTaskForm((prev) => ({
                          ...prev,
                          assignedTo: {
                            ...prev.assignedTo,
                            includeAllHods: !prev.assignedTo.includeAllHods
                          }
                        }))
                      }
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
                        const selected = Array.from(event.target.selectedOptions).map((option) => option.value.toLowerCase());
                        setTaskForm((prev) => ({
                          ...prev,
                          assignedTo: {
                            ...prev.assignedTo,
                            departments: selected
                          }
                        }));
                      }}
                    >
                      {branches.map((branch) => (
                        <option key={branch.code} value={(branch.code || branch.name || '').toLowerCase()}>
                          {branch.displayName || branch.name || branch.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Select Employees</label>
                    <div className="border border-gray-300 rounded-lg h-36 overflow-y-auto">
                      {filteredEmployees.length === 0 ? (
                        <p className="text-sm text-gray-500 p-3">No employees available for the selected departments.</p>
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
                              <span className="flex-1 truncate">
                                {employee.name} ({employee.employeeId})
                              </span>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  setTaskForm((prev) => ({
                                    ...prev,
                                    assignedTo: {
                                      ...prev.assignedTo,
                                      employees: selected
                                        ? prev.assignedTo.employees.filter((id) => id !== employee._id)
                                        : [...prev.assignedTo.employees, employee._id]
                                    }
                                  }));
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
                      {filteredHods.length === 0 ? (
                        <p className="text-sm text-gray-500 p-3">No HODs available.</p>
                      ) : (
                        filteredHods.map((hod) => {
                          const id = hod._id || hod.id;
                          const selected = taskForm.assignedTo.hods.includes(id);
                          return (
                            <label
                              key={id}
                              className={`flex items-center justify-between gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-0 cursor-pointer ${
                                selected ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
                              }`}
                            >
                              <span className="flex-1 truncate">
                                {hod.name} {(hod.department?.code || hod.branchCode) ? `(${hod.department?.code || hod.branchCode})` : ''}
                              </span>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  setTaskForm((prev) => ({
                                    ...prev,
                                    assignedTo: {
                                      ...prev.assignedTo,
                                      hods: selected
                                        ? prev.assignedTo.hods.filter((hodId) => hodId !== id)
                                        : [...prev.assignedTo.hods, id]
                                    }
                                  }));
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold text-primary">Reference Links</h4>
                  <button type="button" className="text-sm text-primary hover:underline" onClick={addAttachmentField}>
                    + Add link
                  </button>
                </div>
                {(taskForm.attachments || []).length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-3">
                    Attach helpful links or documents that employees/HODs can reference while completing the task.
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
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Audience</h4>
                <p className="text-sm text-gray-600">
                  {viewTask.assignedTo?.departments?.length
                    ? viewTask.assignedTo.departments.map((dep) => dep.toUpperCase()).join(', ')
                    : 'Selected individuals'}
                </p>
                {viewTask.assignedTo?.includeAllEmployees && (
                  <p className="text-xs text-gray-500 mt-1">Includes all employees in selected departments.</p>
                )}
                {viewTask.assignedTo?.includeAllHods && (
                  <p className="text-xs text-gray-500">Includes all HODs in the campus.</p>
                )}
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
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors" onClick={closeViewTask}>
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

export default PrincipalTaskManagementSection;
