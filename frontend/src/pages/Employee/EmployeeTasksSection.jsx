import React, { useEffect, useState, useMemo } from "react";
import {
  FaTasks,
  FaFlag,
  FaCalendarAlt,
  FaLink,
  FaRegCalendarCheck,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaFilter,
  FaSearch
} from "react-icons/fa";
import { toast } from "react-toastify";
import config from "../../config";
import Loading from "../../components/Loading";

const API_BASE_URL = config.API_BASE_URL;
const ACK_STATUS_OPTIONS = [
  { value: "acknowledged", label: "Acknowledged" },
  { value: "completed", label: "Completed" }
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" }
];

const ACKNOWLEDGEMENT_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "completed", label: "Completed" }
];

const EmployeeTasksSection = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    priority: "all",
    acknowledgementStatus: "all",
    search: "",
    dateFrom: "",
    dateTo: ""
  });
  const [ackForm, setAckForm] = useState({
    status: "acknowledged",
    comment: "",
    proofUrl: ""
  });

  const fetchTasks = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/employee/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) throw new Error("Failed to fetch tasks");
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      const message = err.message || "Failed to fetch tasks";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    const totalTasks = tasks.length;
    const pendingAcknowledgements = tasks.filter(
      (task) =>
        task.requireAcknowledgement &&
        (!task.acknowledgementStatus || task.acknowledgementStatus === "pending")
    ).length;
    const completedAcknowledgements = tasks.filter(
      (task) =>
        task.requireAcknowledgement && task.acknowledgementStatus === "completed"
    ).length;
    const acknowledgedTasks = tasks.filter(
      (task) =>
        task.requireAcknowledgement && task.acknowledgementStatus === "acknowledged"
    ).length;
    const overdueTasks = tasks.filter((task) => {
      if (!task.dueDate || task.acknowledgementStatus === "completed") return false;
      return new Date(task.dueDate) < new Date();
    }).length;
    const criticalTasks = tasks.filter(
      (task) => task.priority === "critical" && task.acknowledgementStatus !== "completed"
    ).length;
    const highPriorityTasks = tasks.filter(
      (task) => task.priority === "high" && task.acknowledgementStatus !== "completed"
    ).length;

    return {
      totalTasks,
      pendingAcknowledgements,
      completedAcknowledgements,
      acknowledgedTasks,
      overdueTasks,
      criticalTasks,
      highPriorityTasks
    };
  }, [tasks]);

  // Filter tasks based on filter criteria
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Priority filter
      if (filters.priority !== "all" && task.priority !== filters.priority) {
        return false;
      }

      // Acknowledgement status filter
      if (filters.acknowledgementStatus !== "all") {
        const taskAckStatus = task.acknowledgementStatus || "pending";
        if (taskAckStatus !== filters.acknowledgementStatus) {
          return false;
        }
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(searchLower);
        const matchesDescription = task.description?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDescription) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateFrom && task.dueDate) {
        const taskDate = new Date(task.dueDate);
        const fromDate = new Date(filters.dateFrom);
        if (taskDate < fromDate) {
          return false;
        }
      }

      if (filters.dateTo && task.dueDate) {
        const taskDate = new Date(task.dueDate);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire end date
        if (taskDate > toDate) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      priority: "all",
      acknowledgementStatus: "all",
      search: "",
      dateFrom: "",
      dateTo: ""
    });
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "low":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  const getAcknowledgementStyles = (status) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-700";
      case "acknowledged":
        return "bg-blue-100 text-blue-700";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const openAcknowledgementModal = (task) => {
    const existingAck = task.viewerAcknowledgement || {};
    setAckForm({
      status: existingAck.status || "acknowledged",
      comment: existingAck.comment || "",
      proofUrl: existingAck.proofUrl || ""
    });
    setSelectedTask(task);
  };

  const closeAcknowledgementModal = () => {
    setSelectedTask(null);
    setAckForm({
      status: "acknowledged",
      comment: "",
      proofUrl: ""
    });
  };

  const handleAcknowledgementSubmit = async (event) => {
    event.preventDefault();
    if (!selectedTask) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/employee/tasks/${selectedTask._id}/acknowledgements`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            status: ackForm.status,
            comment: ackForm.comment,
            proofUrl: ackForm.proofUrl
          })
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.msg || "Failed to update acknowledgement");
      }

      const data = await response.json();
      toast.success("Task acknowledgement updated");
      setTasks((prev) =>
        prev.map((task) =>
          task._id === data.task._id ? data.task : task
        )
      );
      closeAcknowledgementModal();
    } catch (err) {
      toast.error(err.message || "Failed to update acknowledgement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="bg-white main-content rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mt-6">
      <div className="flex items-center gap-2 mb-6">
        <FaTasks className="text-primary text-xl" />
        <h2 className="text-lg sm:text-xl font-semibold text-primary">My Tasks</h2>
      </div>

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
              <FaRegCalendarCheck className="text-2xl" />
            </div>
          </div>
        </div>

        {/* Pending Acknowledgements */}
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium mb-1">Pending</p>
              <p className="text-3xl font-bold">{kpiMetrics.pendingAcknowledgements}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <FaClock className="text-2xl" />
            </div>
          </div>
        </div>

        {/* Completed Acknowledgements */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Completed</p>
              <p className="text-3xl font-bold">{kpiMetrics.completedAcknowledgements}</p>
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
        {/* Acknowledged Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Acknowledged</p>
              <p className="text-2xl font-bold text-blue-600">{kpiMetrics.acknowledgedTasks}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <FaCheckCircle className="text-blue-600 text-xl" />
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

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FaFilter className="text-primary" />
          <h3 className="text-lg font-semibold text-primary">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Search</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or description..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={filters.priority}
              onChange={(e) => handleFilterChange("priority", e.target.value)}
            >
              <option value="all">All Priorities</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Acknowledgement Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={filters.acknowledgementStatus}
              onChange={(e) => handleFilterChange("acknowledgementStatus", e.target.value)}
            >
              {ACKNOWLEDGEMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
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

        {/* Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {error ? (
        <div className="text-red-500 text-sm mb-2">{error}</div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <FaTasks className="text-gray-400 text-4xl mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {tasks.length === 0
              ? "No tasks assigned yet."
              : "No tasks match your current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task._id}
              className="bg-gray-50 rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-primary">{task.title}</h3>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide ${getPriorityStyles(
                        task.priority
                      )}`}
                    >
                      <FaFlag className="inline mr-1" />
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        <FaCalendarAlt className="inline mr-1" />
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {task.requireAcknowledgement && (
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${getAcknowledgementStyles(
                          task.acknowledgementStatus || "pending"
                        )}`}
                      >
                        Status: {task.acknowledgementStatus || "pending"}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">
                    {task.description}
                  </p>

                  {(task.attachments || []).length > 0 && (
                    <div className="text-sm text-gray-600 mb-3 space-y-1">
                      <p className="font-semibold text-gray-700 flex items-center gap-2">
                        <FaLink /> Resources
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {task.attachments.map((link, index) => (
                          <li key={`${task._id}-attachment-${index}`}>
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
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[200px]">
                  {task.givenBy && task.givenBy.name && (
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold text-gray-700">Given by: </span>
                      <span>{task.givenBy.name}</span>
                      {task.givenBy.role && (
                        <span className="text-gray-500 ml-1">
                          ({task.givenBy.role.toUpperCase()})
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-xs text-gray-500">
                    Created: {new Date(task.createdAt).toLocaleString()}
                  </span>
                  {task.requireAcknowledgement && (
                    <button
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
                      onClick={() => openAcknowledgementModal(task)}
                    >
                      {task.viewerAcknowledgement
                        ? "Update Response"
                        : "Acknowledge Task"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acknowledgement Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5">
              <div>
                <h3 className="text-xl font-bold text-primary">Respond to Task</h3>
                <p className="text-sm text-gray-600">{selectedTask.title}</p>
              </div>
              <button
                onClick={closeAcknowledgementModal}
                className="text-gray-500 hover:text-gray-700 font-semibold text-lg"
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <form
              className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
              onSubmit={handleAcknowledgementSubmit}
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={ackForm.status}
                  onChange={(e) =>
                    setAckForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  {ACK_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Comment (optional)
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  value={ackForm.comment}
                  onChange={(e) =>
                    setAckForm((prev) => ({ ...prev, comment: e.target.value }))
                  }
                  placeholder="Share any remarks or updates..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Proof URL (optional)
                </label>
                <input
                  type="url"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={ackForm.proofUrl}
                  onChange={(e) =>
                    setAckForm((prev) => ({ ...prev, proofUrl: e.target.value }))
                  }
                  placeholder="https://example.com/proof"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeAcknowledgementModal}
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
                  {saving ? "Saving..." : "Submit Response"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTasksSection;
