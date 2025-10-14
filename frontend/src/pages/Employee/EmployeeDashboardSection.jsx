import React from 'react';
import { FaRegCalendarCheck, FaUserCircle, FaEdit } from 'react-icons/fa';
import { MdOutlineWorkHistory } from 'react-icons/md';
import EmployeeTasksSection from './EmployeeTasksSection';

// Helper for progress bar
const ProgressBar = ({ value, max, color }) => (
  <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
    <div
      className={`h-2 rounded-full`}
      style={{
        width: `${Math.min((value / max) * 100, 100)}%`,
        background: color,
        transition: 'width 0.3s'
      }}
    />
  </div>
);

const EmployeeDashboardSection = ({ employee, onApplyLeave, onSubmitCCL }) => {
  // Example max values for progress bars
  const leaveMax = 30;
  const cclMax = 10;

  return (
    <>
      {/* Profile Header Card */}
      <div className="flex items-center justify-between  rounded-2xl  p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-4 ml-8">
          <div className="relative">
            {employee?.profilePicture ? (
              <img
                src={employee.profilePicture}
                alt={employee?.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white shadow"
              />
            ) : (
              <FaUserCircle className="w-16 h-16 sm:w-20 sm:h-20 text-teal-400 bg-white rounded-full border-4 border-white shadow" />
            )}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{employee?.name}</h1>
            <p className="text-white text-sm">
              <span className="font-medium">{employee?.employeeId}</span> • {employee?.department}
            </p>
          </div>
        </div>
        <button
          className="p-2 rounded-full hover:bg-gray-100 transition"
          aria-label="Edit Profile"
        >
          {/* <FaEdit className="text-gray-500 text-lg" /> */}
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={onApplyLeave}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl shadow hover:bg-green-600 active:scale-[0.98] transition font-semibold text-base"
          aria-label="Apply for leave"
        >
          <FaRegCalendarCheck className="text-lg" /> Leave
        </button>
        <button
          onClick={onSubmitCCL}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-xl shadow hover:bg-blue-600 active:scale-[0.98] transition font-semibold text-base"
          aria-label="Submit CCL work"
        >
          <MdOutlineWorkHistory className="text-lg" /> CCL Work
        </button>
      </div>

      {/* Leave Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-teal-50 rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="bg-teal-200 rounded-full p-2 flex items-center justify-center">
              <FaRegCalendarCheck className="text-teal-700 text-2xl" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-teal-700 mb-1">Leave Balance</h2>
              <div className="text-xl font-bold text-gray-800">{employee?.leaveBalance || 0} days</div>
            </div>
          </div>
          {/*  */}
        </div>
        <div className="bg-blue-50 rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="bg-blue-200 rounded-full p-2 flex items-center justify-center">
              <MdOutlineWorkHistory className="text-blue-700 text-2xl" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-blue-700 mb-1">CCL Balance</h2>
              <div className="text-xl font-bold text-gray-800">{employee?.cclBalance || 0} days</div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Tasks preview */}
      <div className="mt-3 sm:mt-4">
        <EmployeeTasksSection />
      </div>
    </>
  );
};

export default EmployeeDashboardSection;