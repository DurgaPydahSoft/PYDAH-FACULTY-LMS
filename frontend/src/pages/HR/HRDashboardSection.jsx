import React from 'react';
import { FaUsers, FaUserCheck, FaUserTimes, FaUserPlus, FaFileExcel } from 'react-icons/fa';

const HRDashboardSection = ({ hr, stats, onNavigateToSection }) => {
  return (
    <div className="p-6 mt-4">
      <h2 className="text-2xl font-bold text-primary mb-6">HR Dashboard Overview</h2>
      
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Employees */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <FaUsers className="text-primary text-3xl mb-2" />
          <h3 className="text-lg font-semibold text-primary mb-1">Total Employees</h3>
          <p className="text-3xl font-bold">{stats.totalEmployees}</p>
        </div>

        {/* Active Employees */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <FaUserCheck className="text-green-600 text-3xl mb-2" />
          <h3 className="text-lg font-semibold text-primary mb-1">Active Employees</h3>
          <p className="text-3xl font-bold">{stats.activeEmployees}</p>
        </div>

        {/* Inactive Employees */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <FaUserTimes className="text-red-600 text-3xl mb-2" />
          <h3 className="text-lg font-semibold text-primary mb-1">Inactive Employees</h3>
          <p className="text-3xl font-bold">{stats.inactiveEmployees}</p>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <FaUserPlus className="text-blue-600 text-3xl mb-2" />
          <h3 className="text-lg font-semibold text-primary mb-1">Quick Actions</h3>
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => onNavigateToSection('operations')}
              className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors text-sm"
            >
              Register Employee
            </button>
            <button
              onClick={() => onNavigateToSection('operations')}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <FaFileExcel className="text-sm" />
              Bulk Upload
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity or Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h4 className="text-lg font-semibold text-primary mb-4">Employee Status Distribution</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${stats.totalEmployees > 0 ? (stats.activeEmployees / stats.totalEmployees) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats.activeEmployees}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Inactive</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${stats.totalEmployees > 0 ? (stats.inactiveEmployees / stats.totalEmployees) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats.inactiveEmployees}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h4 className="text-lg font-semibold text-primary mb-4">Quick Actions</h4>
          <div className="space-y-3">
            <button
              onClick={() => onNavigateToSection('employees')}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-3"
            >
              <FaUsers className="text-primary" />
              <span>Manage All Employees</span>
            </button>
            <button
              onClick={() => onNavigateToSection('operations')}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-3"
            >
              <FaUserPlus className="text-primary" />
              <span>Register New Employee</span>
            </button>
            <button
              onClick={() => onNavigateToSection('operations')}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-3"
            >
              <FaFileExcel className="text-primary" />
              <span>Bulk Employee Upload</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboardSection;
