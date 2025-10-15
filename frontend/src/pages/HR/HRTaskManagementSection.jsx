import React, { useEffect, useState } from 'react';
import { FaTasks, FaPlus, FaRegCalendarCheck } from 'react-icons/fa';
import config from '../../config';

const API_BASE_URL = config.API_BASE_URL;

const HRTaskManagementSection = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (editingTask) {
      setEditTitle(editingTask.title);
      setEditDescription(editingTask.description);
    }
  }, [editingTask]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/hr/tasks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/hr/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newTask),
      });
      if (!response.ok) throw new Error('Failed to create task');
      setNewTask({ title: '', description: '' });
      setShowCreateModal(false);
      fetchTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/hr/tasks/${editingTask._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ title: editTitle, description: editDescription }),
      });
      if (!response.ok) throw new Error('Failed to update task');
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/hr/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete task');
      fetchTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 mt-4">
      <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-3">
        <FaTasks /> Task Management
      </h2>
      
      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <FaRegCalendarCheck className="text-blue-600 text-lg mt-0.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-800 mb-1">Task Visibility</h3>
            <p className="text-sm text-blue-700">
              Tasks created here will be automatically displayed to all employees in their Employee Dashboard under the "Tasks" section. 
              Employees can view these tasks but cannot edit or delete them.
            </p>
          </div>
        </div>
      </div>
      
      <button
        className="bg-primary text-white px-4 py-2 rounded-lg mb-4 flex items-center gap-2 hover:bg-primary-dark"
        onClick={() => setShowCreateModal(true)}
      >
        <FaPlus /> Create New Task
      </button>
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <form
            className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
            onSubmit={handleCreateTask}
          >
            <h3 className="text-xl font-semibold mb-4">Create Task</h3>
            <input
              type="text"
              className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 mb-4"
              placeholder="Task Title"
              value={newTask.title}
              onChange={e => setNewTask({ ...newTask, title: e.target.value })}
              required
            />
            <textarea
              className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 mb-4"
              placeholder="Task Description"
              value={newTask.description}
              onChange={e => setNewTask({ ...newTask, description: e.target.value })}
              required
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="bg-gray-200 px-4 py-2 rounded-lg"
                onClick={() => setShowCreateModal(false)}
              >Cancel</button>
              <button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                disabled={loading}
              >Create</button>
            </div>
          </form>
        </div>
      )}
      {loading && <div className="text-center py-6">Loading...</div>}
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <FaRegCalendarCheck /> All Tasks
        </h3>
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-500">No tasks found.</div>
          ) : (
            tasks.map((task) => (
              <div key={task._id} className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-gray-100">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-primary mb-1">{task.title}</h3>
                  <p className="text-gray-700 mb-2">{task.description}</p>
                  <p className="text-xs text-gray-500">Created: {new Date(task.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition-colors text-sm font-medium"
                    onClick={() => handleEditTask(task)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium"
                    onClick={() => handleDeleteTask(task._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Task Modal */}
        {editingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4 text-primary">Edit Task</h2>
              <form onSubmit={handleUpdateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-primary"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-primary"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
                    onClick={() => setEditingTask(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark font-medium"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRTaskManagementSection;