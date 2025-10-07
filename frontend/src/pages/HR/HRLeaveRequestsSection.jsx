

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const HRLeaveRequestsSection = ({ branches }) => {
  branches = branches || [];
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchLeaveRequests();
    // eslint-disable-next-line
  }, [search, status, department, leaveType, page, limit]);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {
        search,
        status,
        department,
        leaveType,
        page,
        limit,
      };
      const response = await axios.get(`${API_BASE_URL}/hr/leave-requests`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaveRequests(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
    setLoading(false);
  };

  const handleSearchChange = (e) => setSearch(e.target.value);
  const handleStatusChange = (e) => setStatus(e.target.value);
  const handleDepartmentChange = (e) => setDepartment(e.target.value);
  const handleLeaveTypeChange = (e) => setLeaveType(e.target.value);
  const handlePageChange = (newPage) => setPage(newPage);

  return (
    <div className="p-6 mt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-primary">Leave Requests</h2>
      </div>
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search by name, ID, email"
          value={search}
          onChange={handleSearchChange}
          className="p-2 rounded bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
        />
        <select value={status} onChange={handleStatusChange} className="p-2 rounded bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50">
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Forwarded by HOD">Forwarded by HOD</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <select
          value={department}
          onChange={handleDepartmentChange}
          className="p-2 rounded bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
        >
          <option value="">All Departments</option>
          {branches.map(branch => (
            <option key={branch.code} value={branch.code}>{branch.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Leave Type"
          value={leaveType}
          onChange={handleLeaveTypeChange}
          className="p-2 rounded bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
        />
      </div>
      {/* Table for md+ screens */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied On</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveRequests.map((lr) => (
                <tr key={lr._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.employeeName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.employeeEmployeeId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.employeeEmail}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.employeeDepartment}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.leaveType}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold
                      ${lr.status === 'Approved'
                        ? 'bg-green-100 text-green-800'
                        : lr.status === 'Rejected'
                        ? 'bg-red-100 text-red-800'
                        : lr.status === 'Forwarded by HOD'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'}`}
                    >
                      {lr.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(lr.startDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(lr.endDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.appliedOn ? new Date(lr.appliedOn).toLocaleDateString() : ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Card layout for small screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 md:hidden">
        {leaveRequests.map((lr) => (
          <div key={lr._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{lr.employeeName}</h3>
                <p className="text-sm text-gray-500">{lr.employeeEmail}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold
                ${lr.status === 'Approved'
                  ? 'bg-green-100 text-green-800'
                  : lr.status === 'Rejected'
                  ? 'bg-red-100 text-red-800'
                  : lr.status === 'Forwarded by HOD'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-yellow-100 text-yellow-800'}`}
              >
                {lr.status}
              </span>
            </div>
            <div className="space-y-2 mb-2">
              <div className="text-sm text-gray-600"><strong>Employee ID:</strong> {lr.employeeEmployeeId}</div>
              <div className="text-sm text-gray-600"><strong>Department:</strong> {lr.employeeDepartment}</div>
              <div className="text-sm text-gray-600"><strong>Leave Type:</strong> {lr.leaveType}</div>
              <div className="text-sm text-gray-600"><strong>Start:</strong> {new Date(lr.startDate).toLocaleDateString()}</div>
              <div className="text-sm text-gray-600"><strong>End:</strong> {new Date(lr.endDate).toLocaleDateString()}</div>
              <div className="text-sm text-gray-600"><strong>Applied On:</strong> {lr.appliedOn ? new Date(lr.appliedOn).toLocaleDateString() : ''}</div>
              <div className="text-sm text-gray-600"><strong>Reason:</strong> {lr.reason}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <button
          disabled={page <= 1}
          onClick={() => handlePageChange(page - 1)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {page} of {Math.ceil(total / limit)}
        </span>
        <button
          disabled={page >= Math.ceil(total / limit)}
          onClick={() => handlePageChange(page + 1)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default HRLeaveRequestsSection;