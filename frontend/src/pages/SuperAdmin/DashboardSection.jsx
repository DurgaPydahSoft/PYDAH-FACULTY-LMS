import React, { useState, useEffect } from 'react';
import { FaUniversity, FaUserTie, FaUsers, FaBuilding, FaUserFriends } from 'react-icons/fa';
import axios from 'axios';
import config from '../../config';

const API_BASE_URL = config.API_BASE_URL;

const DashboardSection = ({ campuses, hrs }) => {
  const [employeeStats, setEmployeeStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeStats();
  }, []);

  const fetchEmployeeStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/super-admin/employees?limit=1`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const totalEmployees = response.data.pagination.totalEmployees;
      
      // Get active employees count
      const activeResponse = await axios.get(
        `${API_BASE_URL}/super-admin/employees?status=active&limit=1`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const activeEmployees = activeResponse.data.pagination.totalEmployees;
      const inactiveEmployees = totalEmployees - activeEmployees;
      
      setEmployeeStats({
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees
      });
    } catch (error) {
      console.error('Error fetching employee stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics
  const totalCampuses = campuses.length;
  const activeCampuses = campuses.filter(campus => campus.isActive !== false).length;
  const inactiveCampuses = totalCampuses - activeCampuses;
  
  const totalPrincipals = campuses.filter(campus => campus.principalId).length;
  const totalHRs = hrs.length;
  const activeHRs = hrs.filter(hr => hr.status === 'active').length;
  const inactiveHRs = totalHRs - activeHRs;

  return (
    <div className="p-6 mt-4">
      <h2 className="text-2xl font-bold text-primary mb-6">Dashboard Analytics</h2>
      <div className="space-y-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Total Campuses */}
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
            <FaUniversity className="text-primary text-3xl mb-2" />
            <h3 className="text-lg font-semibold text-primary mb-1">Total Campuses</h3>
            <p className="text-3xl font-bold">{totalCampuses}</p>
            <div className="flex gap-2 text-xs mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">Active: {activeCampuses}</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800">Inactive: {inactiveCampuses}</span>
            </div>
          </div>

          {/* Total Principals */}
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
            <FaUserTie className="text-blue-600 text-3xl mb-2" />
            <h3 className="text-lg font-semibold text-primary mb-1">Total Principals</h3>
            <p className="text-3xl font-bold">{totalPrincipals}</p>
            <div className="flex gap-2 text-xs mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                Assigned: {totalPrincipals}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                Unassigned: {totalCampuses - totalPrincipals}
              </span>
            </div>
          </div>

          {/* Total HRs */}
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
            <FaUsers className="text-green-600 text-3xl mb-2" />
            <h3 className="text-lg font-semibold text-primary mb-1">Total HRs</h3>
            <p className="text-3xl font-bold">{totalHRs}</p>
            <div className="flex gap-2 text-xs mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">Active: {activeHRs}</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800">Inactive: {inactiveHRs}</span>
            </div>
          </div>

          {/* Total Employees */}
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
            <FaUserFriends className="text-purple-600 text-3xl mb-2" />
            <h3 className="text-lg font-semibold text-primary mb-1">Total Employees</h3>
            {loading ? (
              <p className="text-3xl font-bold text-gray-400">...</p>
            ) : (
              <>
                <p className="text-3xl font-bold">{employeeStats.total}</p>
                <div className="flex gap-2 text-xs mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">Active: {employeeStats.active}</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800">Inactive: {employeeStats.inactive}</span>
                </div>
              </>
            )}
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
            <FaBuilding className="text-orange-600 text-3xl mb-2" />
            <h3 className="text-lg font-semibold text-primary mb-1">System Status</h3>
            <p className="text-3xl font-bold text-green-600">Online</p>
            <div className="flex gap-2 text-xs mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                All Systems Operational
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campus Overview */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
              <FaUniversity className="text-primary" /> Campus Overview
            </h3>
            <div className="space-y-3">
              {campuses.slice(0, 5).map((campus) => (
                <div key={campus._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{campus.displayName}</h4>
                    <p className="text-sm text-gray-600">{campus.name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      campus.principalId 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {campus.principalId ? 'Principal Assigned' : 'No Principal'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {campus.isActive !== false ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HR Overview */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
              <FaUsers className="text-primary" /> HR Overview
            </h3>
            <div className="space-y-3">
              {hrs.slice(0, 5).map((hr) => (
                <div key={hr._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{hr.name}</h4>
                    <p className="text-sm text-gray-600">{hr.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      hr.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {hr.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {hr.campus?.name || 'No Campus'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSection;
