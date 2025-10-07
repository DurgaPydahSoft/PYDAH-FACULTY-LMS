import React from 'react';
import { FaUsers, FaClipboardList, FaTasks } from 'react-icons/fa';

const DashboardSection = ({ hod, employees, leaveRequests, cclWorkRequests }) => {
  // Ensure arrays are properly initialized
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeLeaveRequests = Array.isArray(leaveRequests) ? leaveRequests : [];
  const safeCclWorkRequests = Array.isArray(cclWorkRequests) ? cclWorkRequests : [];
  return (
    <div className="p-6 mt-4">
      <h2 className="text-2xl font-bold text-primary mb-6">Dashboard Overview</h2>
      
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Employees */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <FaUsers className="text-primary text-3xl mb-2" />
          <h3 className="text-lg font-semibold text-primary mb-1">Total Employees</h3>
          <p className="text-3xl font-bold">{safeEmployees.length}</p>
        </div>

        {/* Pending Department Leaves */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <FaClipboardList className="text-blue-600 text-3xl mb-2" />
          <h3 className="text-lg font-semibold text-primary mb-1">Pending Dept. Leaves</h3>
          <p className="text-3xl font-bold">{safeLeaveRequests.filter(l => l.status === 'Pending').length}</p>
        </div>

        {/* CCL Work Requests */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <FaTasks className="text-purple-600 text-3xl mb-2" />
          <h3 className="text-lg font-semibold text-primary mb-1">CCL Work Requests</h3>
          <p className="text-3xl font-bold">{safeCclWorkRequests.length}</p>
          <div className="flex gap-2 text-xs mt-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
              Pending: {safeCclWorkRequests.filter(w => w.status === 'Pending').length}
            </span>
          </div>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-primary mb-2">Welcome, {hod?.name || 'HOD'}!</h3>
            <p className="text-gray-700">Campus: <span className="font-medium">{hod?.campus?.name || 'N/A'}</span></p>
            <p className="text-gray-700">Department: <span className="font-medium">{hod?.department?.name || hod?.branchCode || 'N/A'}</span></p>
            <p className="text-gray-700">Email: <span className="font-medium">{hod?.email}</span></p>
          </div>
          {/* Decorative SVG */}
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" stroke="#3B82F6" strokeWidth="4" fill="#E0E7FF" />
            <path d="M40 20V40L55 47" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DashboardSection;
