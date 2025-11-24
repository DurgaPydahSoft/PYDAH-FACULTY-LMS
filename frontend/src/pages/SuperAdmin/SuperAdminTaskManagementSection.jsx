import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    FaTasks,
    FaPlus,
    FaRegCalendarCheck,
    FaCalendarAlt,
    FaFlag,
    FaUsers,
    FaUserTie,
    FaCheckCircle,
    FaExclamationTriangle,
    FaClock,
    FaFilter,
    FaSearch,
    FaUniversity
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

const emptyTaskForm = () => ({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    status: 'active',
    requireAcknowledgement: true,
    workType: '', // 'individual' or 'group'
    assigneeType: '', // 'employee' or 'hod' (for individual work)
    branchSelectionType: '', // 'single' or 'multiple' (for group work)
    assignedTo: {
        includeAllEmployees: false,
        includeAllHods: false,
        employees: [],
        hods: [],
        departments: [],
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

const SuperAdminTaskManagementSection = () => {
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
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        search: '',
        dateFrom: '',
        dateTo: ''
    });

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
            const response = await fetch(`${API_BASE_URL}/super-admin/tasks`, {
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
            const [employeesRes, hodsRes, campusesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/super-admin/employees?status=active&limit=1000`, { headers: authHeaders }), // Fetch all active employees
                fetch(`${API_BASE_URL}/super-admin/hods`, { headers: authHeaders }),
                fetch(`${API_BASE_URL}/super-admin/campuses`, { headers: authHeaders })
            ]);

            const employeesData = employeesRes.ok ? await employeesRes.json() : {};
            const employees = employeesData.employees || []; // Handle pagination structure
            const hods = hodsRes.ok ? await hodsRes.json() : [];
            const campuses = campusesRes.ok ? await campusesRes.json() : [];

            // Extract all unique departments from employees and HODs
            const departments = new Set();
            employees.forEach(e => {
                if (e.department) departments.add(e.department);
                if (e.branchCode) departments.add(e.branchCode);
            });
            hods.forEach(h => {
                if (h.department?.code) departments.add(h.department.code);
                if (h.department?.name) departments.add(h.department.name);
            });

            setAssignmentOptions({
                employees: Array.isArray(employees) ? employees : [],
                hods: Array.isArray(hods) ? hods : [],
                departments: Array.from(departments),
                campuses: campuses.map(c => c.name)
            });
        } catch (err) {
            console.error(err);
            toast.error('Failed to load assignment metadata');
        } finally {
            setMetadataLoading(false);
        }
    }, [API_BASE_URL, authHeaders]);

    useEffect(() => {
        fetchTasks();
        fetchAssignmentMetadata();
    }, [fetchTasks, fetchAssignmentMetadata]);

    const resetForm = () => {
        setTaskForm(emptyTaskForm());
        setEditingTaskId(null);
    };

    const handleWorkTypeChange = (workType) => {
        setTaskForm((prev) => ({
            ...prev,
            workType,
            assigneeType: '',
            branchSelectionType: '',
            assignedTo: {
                includeAllEmployees: false,
                includeAllHods: false,
                employees: [],
                hods: [],
                departments: [],
                campuses: []
            }
        }));
    };

    const handleBranchSelectionTypeChange = (branchSelectionType) => {
        setTaskForm((prev) => ({
            ...prev,
            branchSelectionType,
            assignedTo: {
                ...prev.assignedTo,
                departments: [],
                employees: []
            }
        }));
    };

    const handleBranchSelection = (selectedDepartments) => {
        setTaskForm((prev) => {
            // Auto-select all employees from selected departments
            const employeesFromDepartments = assignmentOptions.employees
                .filter((employee) => {
                    const employeeDept = (employee.department || employee.branchCode || '').toString().toLowerCase();
                    if (!employeeDept) return false;
                    return selectedDepartments.some(dept => dept.toLowerCase() === employeeDept);
                })
                .map((employee) => employee._id);

            // Auto-select HODs from selected departments
            const hodsFromDepartments = assignmentOptions.hods
                .filter((hod) => {
                    const hodDept = (hod.department?.code || hod.department || hod.branchCode || '').toString().toLowerCase();
                    if (!hodDept) return false;
                    return selectedDepartments.some(dept => dept.toLowerCase() === hodDept);
                })
                .map((hod) => hod._id);

            return {
                ...prev,
                assignedTo: {
                    ...prev.assignedTo,
                    departments: selectedDepartments,
                    employees: employeesFromDepartments,
                    hods: hodsFromDepartments
                }
            };
        });
    };

    const handleCampusSelection = (selectedCampuses) => {
        setTaskForm((prev) => ({
            ...prev,
            assignedTo: {
                ...prev.assignedTo,
                campuses: selectedCampuses
            }
        }));
    };

    const handleAssigneeTypeChange = (assigneeType) => {
        setTaskForm((prev) => ({
            ...prev,
            assigneeType,
            assignedTo: {
                ...prev.assignedTo,
                employees: assigneeType === 'employee' ? prev.assignedTo.employees : [],
                hods: assigneeType === 'hod' ? prev.assignedTo.hods : []
            }
        }));
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

    const preparePayloadFromForm = (form) => {
        if (!form.workType) {
            throw new Error('Please select a work type (Individual or Group)');
        }

        if (form.workType === 'individual') {
            if (!form.assigneeType) {
                throw new Error('Please select assignee type (Employee or HOD)');
            }
            if (form.assigneeType === 'employee' && form.assignedTo.employees.length === 0) {
                throw new Error('Please select at least one employee');
            }
            if (form.assigneeType === 'hod' && form.assignedTo.hods.length === 0) {
                throw new Error('Please select at least one HOD');
            }
        } else if (form.workType === 'group') {
            if (!form.branchSelectionType) {
                throw new Error('Please select branch selection type (Single or Multiple)');
            }
            if (form.assignedTo.departments.length === 0 && form.assignedTo.campuses.length === 0) {
                // Allow campus-only selection for SuperAdmin
                // throw new Error('Please select at least one branch or campus');
            }
            if (
                !form.assignedTo.includeAllEmployees &&
                !form.assignedTo.includeAllHods &&
                form.assignedTo.employees.length === 0 &&
                form.assignedTo.hods.length === 0
            ) {
                throw new Error('Please select at least one target option (employees or HODs)');
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
                includeAllHods: form.assignedTo.includeAllHods,
                employees: form.assignedTo.employees,
                hods: form.assignedTo.hods,
                departments: form.assignedTo.departments,
                campuses: form.assignedTo.campuses
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

    const handleSubmitTask = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = preparePayloadFromForm(taskForm);
            const url = editingTaskId
                ? `${API_BASE_URL}/super-admin/tasks/${editingTaskId}`
                : `${API_BASE_URL}/super-admin/tasks`;
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
        const assignedTo = task.assignedTo || {};

        let workType = '';
        let assigneeType = '';
        let branchSelectionType = '';

        if (assignedTo.includeAllEmployees || assignedTo.includeAllHods || (assignedTo.departments && assignedTo.departments.length > 0) || (assignedTo.campuses && assignedTo.campuses.length > 0)) {
            workType = 'group';
            if (assignedTo.departments && assignedTo.departments.length > 1) {
                branchSelectionType = 'multiple';
            } else {
                branchSelectionType = 'single';
            }
        } else if ((assignedTo.employees && assignedTo.employees.length > 0) || (assignedTo.hods && assignedTo.hods.length > 0)) {
            workType = 'individual';
            if (assignedTo.employees && assignedTo.employees.length > 0) {
                assigneeType = 'employee';
            } else if (assignedTo.hods && assignedTo.hods.length > 0) {
                assigneeType = 'hod';
            }
        } else {
            workType = 'group';
            branchSelectionType = 'single';
        }

        setTaskForm({
            title: task.title || '',
            description: task.description || '',
            dueDate: task.dueDate ? task.dueDate.substring(0, 10) : '',
            priority: task.priority || 'medium',
            status: task.status || 'active',
            requireAcknowledgement: task.requireAcknowledgement || false,
            workType,
            assigneeType,
            branchSelectionType,
            assignedTo: {
                includeAllEmployees: assignedTo.includeAllEmployees || false,
                includeAllHods: assignedTo.includeAllHods || false,
                employees: (assignedTo.employees || []).map((employee) =>
                    typeof employee === 'string' ? employee : employee?._id
                ),
                hods: (assignedTo.hods || []).map((hod) =>
                    typeof hod === 'string' ? hod : hod?._id
                ),
                departments: assignedTo.departments || [],
                campuses: assignedTo.campuses || []
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
            const response = await fetch(`${API_BASE_URL}/super-admin/tasks/${taskId}`, {
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

    const kpiMetrics = useMemo(() => {
        const totalTasks = tasks.length;
        const activeTasks = tasks.filter(t => t.status === 'active').length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const overdueTasks = tasks.filter(t => {
            if (!t.dueDate || t.status === 'completed' || t.status === 'archived') return false;
            return new Date(t.dueDate) < new Date();
        }).length;

        return {
            totalTasks,
            activeTasks,
            completedTasks,
            overdueTasks
        };
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (filters.status !== 'all' && task.status !== filters.status) return false;
            if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const titleMatch = task.title?.toLowerCase().includes(searchLower);
                const descMatch = task.description?.toLowerCase().includes(searchLower);
                if (!titleMatch && !descMatch) return false;
            }
            if (filters.dateFrom && task.dueDate) {
                if (new Date(task.dueDate) < new Date(filters.dateFrom)) return false;
            }
            if (filters.dateTo && task.dueDate) {
                const toDate = new Date(filters.dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (new Date(task.dueDate) > toDate) return false;
            }
            return true;
        });
    }, [tasks, filters]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({
            status: 'all',
            priority: 'all',
            search: '',
            dateFrom: '',
            dateTo: ''
        });
    };

    return (
        <div className="p-6 mt-4">
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-3">
                <FaTasks /> Task Management (Super Admin)
            </h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-primary" />
                    <h3 className="text-lg font-semibold text-primary">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Search</label>
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by title or description..."
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="all">All Status</option>
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                            value={filters.priority}
                            onChange={(e) => handleFilterChange('priority', e.target.value)}
                        >
                            <option value="all">All Priorities</option>
                            {PRIORITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Tasks List</h3>
                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                >
                    <FaPlus /> Create New Task
                </button>
            </div>

            {/* Tasks Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 font-semibold text-gray-700">Title</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Priority</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Due Date</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Audience</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Given By</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">Loading tasks...</td>
                                </tr>
                            ) : filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No tasks found matching your filters.</td>
                                </tr>
                            ) : (
                                filteredTasks.map((task) => (
                                    <tr key={task._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{task.title}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                                    task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                        task.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${task.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    task.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                        task.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={renderAudienceSummary(task.assignedTo)}>
                                            {renderAudienceSummary(task.assignedTo)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="font-medium">{task.givenBy?.name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500 capitalize">{task.givenBy?.role || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => openViewTask(task)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => handleEditTask(task)}
                                                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteTask(task._id, e)}
                                                className="text-red-600 hover:text-red-800 font-medium text-sm"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
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

                                    {/* Step 2: Individual Work - Assignee Type */}
                                    {taskForm.workType === 'individual' && (
                                        <div className="bg-white rounded-lg p-4 border border-gray-300">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Assign to <span className="text-red-500">*</span>
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAssigneeTypeChange('employee')}
                                                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                        taskForm.assigneeType === 'employee'
                                                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                                                            : 'border-gray-300 bg-white text-gray-700 hover:border-primary/50'
                                                    }`}
                                                >
                                                    Employee
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAssigneeTypeChange('hod')}
                                                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                        taskForm.assigneeType === 'hod'
                                                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                                                            : 'border-gray-300 bg-white text-gray-700 hover:border-primary/50'
                                                    }`}
                                                >
                                                    HOD
                                                </button>
                                            </div>

                                            {/* Individual Employee Selection */}
                                            {taskForm.assigneeType === 'employee' && (
                                                <div className="mt-4">
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Select Employee <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="border border-gray-300 rounded-lg h-48 overflow-y-auto bg-white">
                                                        {assignmentOptions.employees.length === 0 ? (
                                                            <p className="text-sm text-gray-500 p-3">No employees available.</p>
                                                        ) : (
                                                            assignmentOptions.employees.map((employee) => {
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
                                                                            {employee.campus && (
                                                                                <span className="text-xs text-gray-500 ml-2">
                                                                                    - {employee.campus}
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
                                                </div>
                                            )}

                                            {/* Individual HOD Selection */}
                                            {taskForm.assigneeType === 'hod' && (
                                                <div className="mt-4">
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Select HOD <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="border border-gray-300 rounded-lg h-48 overflow-y-auto bg-white">
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
                                                                        <span className="flex-1">
                                                                            {hod.name}
                                                                            {hod.department?.code && (
                                                                                <span className="text-xs text-gray-500 ml-2">
                                                                                    - {hod.department.code.toUpperCase()}
                                                                                </span>
                                                                            )}
                                                                            {hod.campus && (
                                                                                <span className="text-xs text-gray-500 ml-2">
                                                                                    - {hod.campus}
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                        <input
                                                                            type="radio"
                                                                            name="individualHod"
                                                                            checked={selected}
                                                                            onChange={() => {
                                                                                handleAssignedSelect('hods', [hod._id]);
                                                                            }}
                                                                        />
                                                                    </label>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Step 2: Group Work Options */}
                                    {taskForm.workType === 'group' && (
                                        <div className="bg-white rounded-lg p-4 border border-gray-300 space-y-4">
                                            {/* Campus Selection */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Select Campuses (Optional - Leave empty for all)
                                                </label>
                                                <select
                                                    multiple
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-primary/40 focus:outline-none bg-white"
                                                    value={taskForm.assignedTo.campuses}
                                                    onChange={(e) => handleCampusSelection(Array.from(e.target.selectedOptions, option => option.value))}
                                                >
                                                    {assignmentOptions.campuses.map(campus => (
                                                        <option key={campus} value={campus}>{campus}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Branch Selection Type */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Branch Selection <span className="text-red-500">*</span>
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleBranchSelectionTypeChange('single')}
                                                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                            taskForm.branchSelectionType === 'single'
                                                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                                                : 'border-gray-300 bg-white text-gray-700 hover:border-primary/50'
                                                        }`}
                                                    >
                                                        Single Branch
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleBranchSelectionTypeChange('multiple')}
                                                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                            taskForm.branchSelectionType === 'multiple'
                                                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                                                : 'border-gray-300 bg-white text-gray-700 hover:border-primary/50'
                                                        }`}
                                                    >
                                                        Multiple Branches
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Branch Selection */}
                                            {taskForm.branchSelectionType && (
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Select {taskForm.branchSelectionType === 'single' ? 'Branch' : 'Branches'} <span className="text-red-500">*</span>
                                                    </label>
                                                    {taskForm.branchSelectionType === 'single' ? (
                                                        <select
                                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
                                                            value={taskForm.assignedTo.departments[0] || ''}
                                                            onChange={(e) => {
                                                                const selected = e.target.value ? [e.target.value] : [];
                                                                handleBranchSelection(selected);
                                                            }}
                                                        >
                                                            <option value="">Select a branch</option>
                                                            {assignmentOptions.departments.map((department) => (
                                                                <option key={department} value={department}>
                                                                    {department.toUpperCase()}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div>
                                                            <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto bg-white">
                                                                {assignmentOptions.departments.length === 0 ? (
                                                                    <p className="text-sm text-gray-500">No branches available.</p>
                                                                ) : (
                                                                    assignmentOptions.departments.map((department) => {
                                                                        const isSelected = taskForm.assignedTo.departments.includes(department);
                                                                        return (
                                                                            <label
                                                                                key={department}
                                                                                className={`flex items-center gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-0 cursor-pointer ${
                                                                                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
                                                                                }`}
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={() => {
                                                                                        const currentDepts = taskForm.assignedTo.departments;
                                                                                        const updatedDepts = isSelected
                                                                                            ? currentDepts.filter((d) => d !== department)
                                                                                            : [...currentDepts, department];
                                                                                        handleBranchSelection(updatedDepts);
                                                                                    }}
                                                                                />
                                                                                <span className="font-medium">{department.toUpperCase()}</span>
                                                                            </label>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-2">
                                                                Select branches. Employees from selected branches will be auto-selected.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* HOD Display for Single Branch */}
                                            {taskForm.branchSelectionType === 'single' && taskForm.assignedTo.departments.length > 0 && (
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        HOD for Selected Branch
                                                    </label>
                                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                                        {assignmentOptions.hods
                                                            .filter((hod) => {
                                                                const hodDept = (hod.department?.code || hod.department || hod.branchCode || '').toString().toLowerCase();
                                                                if (!hodDept) return false;
                                                                return taskForm.assignedTo.departments.some(dept => dept.toLowerCase() === hodDept);
                                                            })
                                                            .length === 0 ? (
                                                            <p className="text-sm text-gray-500">No HOD found for this branch.</p>
                                                        ) : (
                                                            assignmentOptions.hods
                                                                .filter((hod) => {
                                                                    const hodDept = (hod.department?.code || hod.department || hod.branchCode || '').toString().toLowerCase();
                                                                    if (!hodDept) return false;
                                                                    return taskForm.assignedTo.departments.some(dept => dept.toLowerCase() === hodDept);
                                                                })
                                                                .map((hod) => (
                                                                    <div key={hod._id} className="flex items-center gap-2 text-sm text-gray-700">
                                                                        <FaUserTie className="text-primary" />
                                                                        <span className="font-medium">{hod.name}</span>
                                                                        {hod.department?.code && (
                                                                            <span className="text-xs text-gray-500">
                                                                                ({hod.department.code.toUpperCase()})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Employee Selection - Auto-checked from selected branches */}
                                            {taskForm.assignedTo.departments.length > 0 && (
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Employees from Selected Branches
                                                        <span className="text-xs text-gray-500 font-normal ml-2">
                                                            (Auto-selected, you can uncheck if needed)
                                                        </span>
                                                    </label>
                                                    <div className="border border-gray-300 rounded-lg h-48 overflow-y-auto bg-white">
                                                        {assignmentOptions.employees.length === 0 ? (
                                                            <p className="text-sm text-gray-500 p-3">No employees available.</p>
                                                        ) : (
                                                            assignmentOptions.employees
                                                                .filter((employee) => {
                                                                    const employeeDept = (employee.department || employee.branchCode || '').toString().toLowerCase();
                                                                    if (!employeeDept) return false;
                                                                    return taskForm.assignedTo.departments.some(dept => dept.toLowerCase() === employeeDept);
                                                                })
                                                                .map((employee) => {
                                                                    const selected = taskForm.assignedTo.employees.includes(employee._id);
                                                                    const employeeDept = (employee.department || employee.branchCode || '');
                                                                    return (
                                                                        <label
                                                                            key={employee._id}
                                                                            className={`flex items-center justify-between gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-0 cursor-pointer ${
                                                                                selected ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
                                                                            }`}
                                                                        >
                                                                            <span className="flex-1">
                                                                                {employee.name} ({employee.employeeId})
                                                                                {employeeDept && (
                                                                                    <span className="text-xs text-gray-500 ml-2">
                                                                                        - {employeeDept.toString().toUpperCase()}
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
                                                </div>
                                            )}

                                            {/* Group HOD Selection - Show for multiple branches */}
                                            {taskForm.branchSelectionType === 'multiple' && taskForm.assignedTo.departments.length > 0 && (
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        HODs from Selected Branches
                                                        <span className="text-xs text-gray-500 font-normal ml-2">
                                                            (Auto-selected, you can uncheck if needed)
                                                        </span>
                                                    </label>
                                                    <div className="border border-gray-300 rounded-lg h-48 overflow-y-auto bg-white">
                                                        {assignmentOptions.hods.length === 0 ? (
                                                            <p className="text-sm text-gray-500 p-3">No HODs available.</p>
                                                        ) : (
                                                            assignmentOptions.hods
                                                                .filter((hod) => {
                                                                    const hodDept = (hod.department?.code || hod.department || hod.branchCode || '').toString().toLowerCase();
                                                                    if (!hodDept) return false;
                                                                    return taskForm.assignedTo.departments.some(dept => dept.toLowerCase() === hodDept);
                                                                })
                                                                .map((hod) => {
                                                                    const selected = taskForm.assignedTo.hods.includes(hod._id);
                                                                    return (
                                                                        <label
                                                                            key={hod._id}
                                                                            className={`flex items-center justify-between gap-2 px-3 py-2 text-sm border-b border-gray-100 last:border-0 cursor-pointer ${
                                                                                selected ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
                                                                            }`}
                                                                        >
                                                                            <span className="flex-1">
                                                                                {hod.name}
                                                                                {hod.department?.code && (
                                                                                    <span className="text-xs text-gray-500 ml-2">
                                                                                        - {hod.department.code.toUpperCase()}
                                                                                    </span>
                                                                                )}
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
                                            )}

                                            {/* Target All Options */}
                                            <div className="flex gap-6 pt-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={taskForm.assignedTo.includeAllEmployees}
                                                        onChange={() => handleAssignmentToggle('includeAllEmployees')}
                                                        className="rounded text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-gray-700">Target All Employees (in selected scope)</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={taskForm.assignedTo.includeAllHods}
                                                        onChange={() => handleAssignmentToggle('includeAllHods')}
                                                        className="rounded text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-gray-700">Target All HODs (in selected scope)</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
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

            {/* View Task Modal */}
            {viewTask && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                            <h3 className="text-xl font-bold text-gray-800">Task Details</h3>
                            <button onClick={closeViewTask} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Title</h4>
                                <p className="text-lg font-medium text-gray-900">{viewTask.title}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Description</h4>
                                <p className="text-gray-700 whitespace-pre-wrap">{viewTask.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Priority</h4>
                                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium
                    ${viewTask.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                            viewTask.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                viewTask.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                        {viewTask.priority}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Status</h4>
                                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium
                    ${viewTask.status === 'active' ? 'bg-green-100 text-green-800' :
                                            viewTask.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'}`}>
                                        {viewTask.status}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Audience</h4>
                                <p className="text-gray-700">{renderAudienceSummary(viewTask.assignedTo)}</p>
                            </div>
                            {viewTask.requireAcknowledgement && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Acknowledgement Status</h4>
                                    <p className="text-gray-700">{renderAcknowledgementSummary(viewTask.acknowledgementSummary)}</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={closeViewTask}
                                className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminTaskManagementSection;
