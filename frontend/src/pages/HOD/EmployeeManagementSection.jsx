import React, { useState } from 'react';
import { FaUsers, FaSearch, FaEdit, FaKey, FaToggleOn, FaToggleOff, FaEye } from 'react-icons/fa';
import { MdEmail, MdPhone, MdPerson } from 'react-icons/md';

const EmployeeManagementSection = ({
  employees,
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  employeesPerPage,
  selectedEmployee,
  setSelectedEmployee,
  showEditModal,
  setShowEditModal,
  editForm,
  setEditForm,
  showPasswordResetModal,
  setShowPasswordResetModal,
  selectedEmployeeForReset,
  setSelectedEmployeeForReset,
  handleEditSubmit,
  handlePasswordReset,
  handlePasswordResetSubmit,
  handleUpdateEmployeeStatus,
  resetPasswordData,
  isResettingPassword
}) => {
  // Ensure employees is an array
  const safeEmployees = Array.isArray(employees) ? employees : [];
  
  // Filter employees based on search query
  const filteredEmployees = safeEmployees.filter(emp => {
    const q = searchQuery.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      emp.employeeId?.toLowerCase().includes(q) ||
      emp.role?.toLowerCase().includes(q)
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);
  const startIndex = (currentPage - 1) * employeesPerPage;
  const endIndex = startIndex + employeesPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  return (
    <div className="p-6 mt-10">
      <h2 className="text-2xl font-bold text-primary mb-6">Employee Management</h2>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Employee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {currentEmployees.map((employee) => (
          <div key={employee._id} className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-primary mb-1">{employee.name}</h3>
                <p className="text-gray-600 text-sm flex items-center gap-1">
                  <MdEmail className="text-primary" /> {employee.email}
                </p>
                <p className="text-gray-600 text-sm flex items-center gap-1">
                  <MdPerson className="text-primary" /> {employee.employeeId}
                </p>
                {employee.phoneNumber && (
                  <p className="text-gray-600 text-sm flex items-center gap-1">
                    <MdPhone className="text-primary" /> {employee.phoneNumber}
                  </p>
                )}
              </div>
              
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-gray-600 text-sm">
                <strong>Role:</strong> {employee.roleDisplayName || employee.role}
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setSelectedEmployee(employee);
                  setEditForm({
                    name: employee.name,
                    email: employee.email,
                    phoneNumber: employee.phoneNumber || '',
                    role: employee.role,
                    roleDisplayName: employee.roleDisplayName || '',
                    status: employee.status
                  });
                  setShowEditModal(true);
                }}
                className="p-2 rounded-full bg-green-100 hover:bg-green-200 text-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
                title="Edit Employee"
              >
                <FaEdit />
              </button>
              <button
                onClick={() => {
                  setSelectedEmployeeForReset(employee);
                  setShowPasswordResetModal(true);
                }}
                className="p-2 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                title="Reset Password"
              >
                <FaKey />
              </button>
              
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 lg:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg lg:text-xl font-bold mb-4">Edit Employee Details</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Display Name</label>
                  <input
                    type="text"
                    value={editForm.roleDisplayName}
                    onChange={(e) => setEditForm({...editForm, roleDisplayName: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && selectedEmployeeForReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 lg:p-6 max-w-md w-full">
            <h3 className="text-lg lg:text-xl font-bold mb-4">Reset Password</h3>
            <p className="text-gray-700 mb-4">
              Reset password for <strong>{selectedEmployeeForReset.name}</strong>
            </p>
            <form onSubmit={handlePasswordResetSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={resetPasswordData?.newPassword || ''}
                  onChange={(e) => handlePasswordReset(e.target.value)}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordResetModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagementSection;
