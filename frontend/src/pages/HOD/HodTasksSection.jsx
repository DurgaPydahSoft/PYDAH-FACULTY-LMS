import React, { useEffect, useState } from 'react';
import {
  FaTasks,
  FaFlag,
  FaCalendarAlt,
  FaLink,
  FaClipboardCheck
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import config from '../../config';
import Loading from '../../components/Loading';

const API_BASE_URL = config.API_BASE_URL;
const ACK_STATUS_OPTIONS = [
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'completed', label: 'Completed' }
];

const HodTasksSection = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ackForm, setAckForm] = useState({
    status: 'acknowledged',
    comment: '',
    proofUrl: ''
  });

  const priorityStyles = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'low':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const acknowledgementStyles = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'acknowledged':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/hod/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      const message = err.message || 'Failed to fetch tasks';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const openAcknowledgeModal = (task) => {
    const existingAck = task.viewerAcknowledgement || {};
    setAckForm({
      status: existingAck.status || 'acknowledged',
      comment: existingAck.comment || '',
      proofUrl: existingAck.proofUrl || ''
    });
    setSelectedTask(task);
  };

  const closeAcknowledgementModal = () => {
    setSelectedTask(null);
    setAckForm({
      status: 'acknowledged',
      comment: '',
      proofUrl: ''
    });
  };

  const handleAcknowledgementSubmit = async (event) => {
    event.preventDefault();
    if (!selectedTask) return;

    if (ackForm.status === 'completed' && !ackForm.comment.trim()) {
      toast.error('Please add a brief completion note when marking the task as completed.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/hod/tasks/${selectedTask._id}/acknowledgements`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
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
        throw new Error(data.msg || 'Failed to update acknowledgement');
      }

      const data = await response.json();
      toast.success('Task acknowledgement updated');
      setTasks((prev) =>
        prev.map((task) =>
          task._id === data.task._id ? data.task : task
        )
      );
      closeAcknowledgementModal();
    } catch (err) {
      toast.error(err.message || 'Failed to update acknowledgement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <FaTasks className="text-primary text-xl" />
        <h2 className="text-lg sm:text-xl font-semibold text-primary">Tasks from HR</h2>
      </div>
      {error ? (
        <div className="text-red-500 text-sm mb-2">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="text-gray-500 text-sm">No tasks assigned to you yet.</div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task._id} className="bg-gray-50 rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-primary">{task.title}</h3>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide ${priorityStyles(
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
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          task.viewerAcknowledgement ? (
                            task.viewerAcknowledgement.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : task.viewerAcknowledgement.status === 'acknowledged'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                          ) : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {task.viewerAcknowledgement ? (
                          task.viewerAcknowledgement.status === 'completed'
                            ? 'Completed'
                            : task.viewerAcknowledgement.status === 'acknowledged'
                              ? 'Acknowledged'
                              : 'Pending'
                        ) : (
                          'Pending'
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{task.description}</p>

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

                  {/* Checklist removed as per updated requirements */}
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <span className="text-xs text-gray-500">
                    Created: {new Date(task.createdAt).toLocaleString()}
                  </span>
                  {task.requireAcknowledgement && (
                    <button
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
                      onClick={() => openAcknowledgeModal(task)}
                    >
                      {task.viewerAcknowledgement ? 'Update Response' : 'Acknowledge Task'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

            <form className="flex-1 overflow-y-auto px-6 py-4 space-y-4" onSubmit={handleAcknowledgementSubmit}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={ackForm.status}
                  onChange={(e) => setAckForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  {ACK_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Comment (optional)</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  value={ackForm.comment}
                  onChange={(e) => setAckForm((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share any progress updates or notes"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Proof URL (optional)</label>
                <input
                  type="url"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={ackForm.proofUrl}
                  onChange={(e) => setAckForm((prev) => ({ ...prev, proofUrl: e.target.value }))}
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
                  {saving ? 'Saving...' : 'Submit Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodTasksSection;

