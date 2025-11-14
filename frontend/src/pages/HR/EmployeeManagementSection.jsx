import React, { useEffect, useState } from 'react';
import { FaUserTie, FaUsers, FaRegCalendarCheck, FaCamera, FaTrash, FaUserCircle, FaEdit, FaKey } from 'react-icons/fa';
import PasswordResetModal from '../../components/PasswordResetModal';

const EmployeeManagementSection = ({
  employees,
  loading,
  error,
  search,
  setSearch,
  department,
  setDepartment,
  status,
  setStatus,
  employeeType,
  setEmployeeType,
  branches,
  onEditEmployee,
  onResetPassword,
  onUploadProfilePicture,
  onDeleteProfilePicture,
  uploadingProfile,
  previewImage,
  setPreviewImage,
  selectedEmployeeForPicture,
  setSelectedEmployeeForPicture,
  showDeleteModal,
  setShowDeleteModal,
  fileInputRef
}) => {
  const [localSearch, setLocalSearch] = useState(search || '');

  useEffect(() => {
    setLocalSearch(search || '');
  }, [search]);

  useEffect(() => {
    if (typeof setSearch !== 'function') {
      return undefined;
    }

    const handler = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [localSearch, search, setSearch]);

  const handleSearchChange = (event) => {
    setLocalSearch(event.target.value);
  };

  return (
    <div className="p-6 mt-4">
      <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-3">
        <FaRegCalendarCheck /> Employee Management
      </h2>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
            placeholder="Search by name, email, or ID"
            value={localSearch}
            onChange={handleSearchChange}
          />
          <select
            className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
            value={department}
            onChange={e => setDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {branches.map(branch => (
              <option key={branch.code} value={branch.code}>{branch.name} ({branch.code})</option>
            ))}
          </select>
          <select
            className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
            value={employeeType}
            onChange={e => setEmployeeType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="teaching">Teaching</option>
            <option value="non-teaching">Non-Teaching</option>
          </select>
          <select
            className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Employee Table (desktop/tablet) */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map(employee => (
              <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-10 w-10 flex-shrink-0">
                    {employee.profilePicture ? (
                      <img
                        src={employee.profilePicture}
                        alt={employee.name}
                        className="h-10 w-10 rounded-full object-cover border-2 border-white shadow"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-gray-200">
                        <span className="text-primary font-semibold">
                          {employee.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                  <div className="text-sm text-gray-500">{employee.employeeId}</div>
                  <div className="text-sm text-gray-500">{employee.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {employee.employeeType === 'non-teaching' ? 'Non-Teaching' : (employee.department || 'N/A')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{employee.leaveBalance || 12}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{employee.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-4">
                    <button
                      className="text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
                      onClick={() => onEditEmployee(employee)}
                      title="Edit Employee"
                    >
                      <FaEdit className="text-sm" />
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"
                      onClick={() => onResetPassword(employee)}
                      title="Reset Password"
                    >
                      <FaKey className="text-sm" />
                      Reset
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Employee Cards (mobile) */}
      <div className="md:hidden space-y-4">
        {employees.length > 0 ? employees.map(employee => (
          <div key={employee._id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 flex-shrink-0">
                  {employee.profilePicture ? (
                    <img
                      src={employee.profilePicture}
                      alt={employee.name}
                      className="h-12 w-12 rounded-full object-cover border-2 border-white shadow"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-gray-200">
                      <span className="text-primary font-semibold text-lg">
                        {employee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-base">{employee.name}</div>
                  <div className="text-xs text-gray-500">ID: {employee.employeeId}</div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{employee.status}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="text-gray-800 font-medium truncate">{employee.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Department:</span>
                <span className="text-gray-800 font-medium">
                  {employee.employeeType === 'non-teaching' ? 'Non-Teaching' : (employee.department || 'N/A')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Employee Type:</span>
                <span className="text-gray-800 font-medium">
                  {employee.employeeType === 'non-teaching' ? 'Non-Teaching' : 'Teaching'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Leave Balance:</span>
                <span className="text-gray-800 font-medium">{employee.leaveBalance || 12}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <button
                className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-dark transition-colors text-sm font-medium flex items-center justify-center gap-2"
                onClick={() => onEditEmployee(employee)}
              >
                <FaEdit className="text-sm" />
                Edit Details
              </button>
              <button
                className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                onClick={() => onResetPassword(employee)}
              >
                <FaKey className="text-sm" />
                Reset Password
              </button>
            </div>
          </div>
        )) : (
          <div className="text-center py-10">
            <p className="text-gray-500">No employees found.</p>
          </div>
        )}
      </div>

      {/* Delete Profile Picture Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 text-center">
            <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <FaTrash className="text-red-500 text-2xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Profile Picture?</h3>
            <p className="text-gray-600 mb-6 text-sm">Are you sure you want to delete the profile picture for <span className="font-medium">{selectedEmployeeForPicture?.name}</span>? This action cannot be undone.</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                disabled={uploadingProfile}
              >
                Cancel
              </button>
              <button
                onClick={() => onDeleteProfilePicture(selectedEmployeeForPicture._id)}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                disabled={uploadingProfile}
              >
                {uploadingProfile ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagementSection;
