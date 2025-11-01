import React from 'react';
import { FaUsers, FaClipboardList, FaTasks, FaArrowRight } from 'react-icons/fa';

const DashboardSection = ({ hod, employees, leaveRequests, cclWorkRequests, onSectionChange }) => {
  // Ensure arrays are properly initialized
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeLeaveRequests = Array.isArray(leaveRequests) ? leaveRequests : [];
  const safeCclWorkRequests = Array.isArray(cclWorkRequests) ? cclWorkRequests : [];

  const pendingLeaves = safeLeaveRequests.filter(l => l.status === 'Pending').length;
  const pendingCCL = safeCclWorkRequests.filter(w => w.status === 'Pending').length;

  return (
    <div className="mt-16 lg:mt-0 p-4 sm:p-6">
      <h2 className="text-2xl font-bold text-primary mb-6">Dashboard Overview</h2>
      
      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-8">
        <button
          onClick={() => onSectionChange('employees')}
          className="bg-blue-500 text-white rounded-xl p-4 flex items-center justify-between hover:bg-blue-600 active:scale-[0.98] transition-all duration-200 shadow-md"
        >
          <div className="flex items-center flex-col gap-1">
            <FaUsers className="text-xl" />
            <span className="font-semibold">Employees</span>
          </div>
          
        </button>

        <button
          onClick={() => onSectionChange('leaves')}
          className="bg-green-500 text-white rounded-xl p-4 flex items-center justify-between hover:bg-green-600 active:scale-[0.98] transition-all duration-200 shadow-md"
        >
          <div className="flex items-center flex-col gap-1">
            <FaClipboardList className="text-xl" />
            <span className="font-semibold">Leave Req's</span>
          </div>
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {/* Total Employees */}
        <div className="bg-gradient-to-b from-primary to-gray-800 rounded-xl shadow p-4 sm:p-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 w-full mb-2">
            <FaUsers className="text-gray-100 text-2xl sm:text-3xl" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-100">Total Employees</h3>
          </div>
          <p className="text-2xl text-gray-100 sm:text-3xl font-bold">{safeEmployees.length}</p>
        </div>

        {/* Pending Department Leaves */}
        <div className="bg-gradient-to-b from-primary to-gray-800 rounded-xl shadow p-4 sm:p-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 w-full mb-2">
            <FaClipboardList className="text-gray-100 text-2xl sm:text-3xl" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-100">Pending Dept. Leaves</h3>
          </div>
          <p className="text-gray-100 text-2xl sm:text-3xl font-bold">{pendingLeaves}</p>
          {pendingLeaves > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs mt-1">
              Action Required
            </span>
          )}
        </div>

        {/* CCL Work Requests */}
        <div className="bg-gradient-to-b from-primary to-gray-800 rounded-xl shadow p-4 sm:p-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 w-full mb-2">
            <FaTasks className="text-gray-100 text-2xl sm:text-3xl" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-100">CCL Work Requests</h3>
          </div>
          <p className="text-gray-100 text-2xl sm:text-3xl font-bold">{safeCclWorkRequests.length}</p>
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 text-xs mt-2">
            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
              Pending: {pendingCCL}
            </span>
          </div>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-primary mb-3">Welcome, {hod?.name || 'HOD'}!</h3>
            <div className="space-y-2">
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-medium">Campus:</span> {hod?.campus?.name || 'N/A'}
              </p>
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-medium">Department:</span> {hod?.department?.name || hod?.branchCode || 'N/A'}
              </p>
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-medium">Email:</span> {hod?.email}
              </p>
            </div>
          </div>
          {/* Decorative SVG */}
          <div className="hidden sm:block">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="38" stroke="#3B82F6" strokeWidth="4" fill="#E0E7FF" />
              <path d="M40 20V40L55 47" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSection;