import React, { useEffect, useState } from "react";
import { FaTasks } from "react-icons/fa";
import config from "../../config";
import Loading from "../../components/Loading";

const API_BASE_URL = config.API_BASE_URL;

const EmployeeTasksSection = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/employee/tasks`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        if (!response.ok) throw new Error("Failed to fetch tasks");
        const data = await response.json();
        setTasks(data);
      } catch (err) {
        setError(err.message || "Failed to fetch tasks");
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <FaTasks className="text-primary text-xl" />
        <h2 className="text-lg sm:text-xl font-semibold text-primary">Employee Tasks</h2>
      </div>
      {error ? (
        <div className="text-red-500 text-sm mb-2">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="text-gray-500 text-sm">No tasks assigned by HR yet.</div>
      ) : (
        <ul className="space-y-4">
          {tasks.map(task => (
            <li key={task._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-primary text-base mb-1">{task.title}</h3>
              <p className="text-gray-700 text-sm mb-2">{task.description}</p>
              <span className="text-xs text-gray-500">Created: {new Date(task.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EmployeeTasksSection;