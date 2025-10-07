import React, { useState, useRef } from 'react';
import { FaUserTie, FaUsers, FaFileExcel, FaDownload, FaUpload, FaTimes } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const EmployeeOperationsSection = ({
  // Single Employee Registration Props
  showRegisterModal,
  setShowRegisterModal,
  newEmployee,
  setNewEmployee,
  handleRegisterEmployee,
  loading,
  branches,
  getCampusRoles,
  user,
  
  // Bulk Operations Props
  showBulkModal,
  setShowBulkModal,
  bulkFile,
  setBulkFile,
  bulkData,
  setBulkData,
  bulkResults,
  setBulkResults,
  bulkLoading,
  setBulkLoading,
  bulkEditableData,
  setBulkEditableData,
  bulkBranches,
  setBulkBranches,
  bulkRoles,
  setBulkRoles,
  bulkErrors,
  setBulkErrors,
  headerMapping,
  setHeaderMapping,
  handleBulkFileChange,
  handleBulkFieldChange,
  deleteBulkRow,
  isBulkValid,
  handleBulkRegister,
  fetchBranchesForCampus,
  fetchRolesForCampus,
  validateBulkRow,
  mapExcelHeaders,
  isRowValid
}) => {
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'bulk'

  return (
    <div className="p-6 mt-4">
      <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-3">
        <FaUserTie /> Employee Operations
      </h2>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'single'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FaUserTie />
            Single Registration
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'bulk'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FaFileExcel />
            Bulk Operations
          </button>
        </div>
      </div>

      {/* Single Employee Registration Tab */}
      {activeTab === 'single' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-3">
              <FaUserTie /> Register New Employee
            </h3>
            <button
              className="bg-primary text-white px-4 py-2.5 rounded-lg shadow-sm hover:bg-primary-dark transition flex items-center justify-center gap-2 font-medium mt-4 md:mt-0"
              onClick={() => setShowRegisterModal(true)}
            >
              <FaUserTie /> Register New Employee
            </button>
          </div>
          
          <div className="text-gray-600 text-sm">
            <p>Register a single employee with all required details. The employee will receive login credentials via email if an email address is provided.</p>
          </div>
        </div>
      )}

      {/* Bulk Operations Tab */}
      {activeTab === 'bulk' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-3">
              <FaFileExcel /> Bulk Employee Registration
            </h3>
            <button
              className="bg-green-600 text-white px-4 py-2.5 rounded-lg shadow-sm hover:bg-green-700 transition flex items-center justify-center gap-2 font-medium mt-4 md:mt-0"
              onClick={() => setShowBulkModal(true)}
            >
              <FaFileExcel /> Bulk Upload
            </button>
          </div>
          
          <div className="text-gray-600 text-sm mb-4">
            <p>Upload an Excel file to register multiple employees at once. Download the sample template to see the required format.</p>
          </div>

          <div className="flex gap-4">
            <a
              href="/bulk_employee_registration.xlsx"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-medium text-sm"
            >
              <FaDownload className="text-sm" />
              Download Sample Template
            </a>
          </div>
        </div>
      )}

      {/* Single Employee Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg relative max-h-[95vh] overflow-y-auto">
            <button
              className="absolute top-3 right-3 text-gray-400 bg-gray-100 rounded-full p-1.5 hover:bg-gray-200"
              onClick={() => setShowRegisterModal(false)}
            >
              <FaTimes className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-primary mb-4 text-center">Register New Employee</h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleRegisterEmployee();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                  placeholder="First Name"
                  value={newEmployee.firstName}
                  onChange={e => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                  required
                />
                <input
                  type="text"
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                  placeholder="Last Name"
                  value={newEmployee.lastName}
                  onChange={e => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                  required
                />
              </div>
              <input
                type="text"
                className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                placeholder="Employee ID"
                value={newEmployee.employeeId}
                onChange={e => setNewEmployee({ ...newEmployee, employeeId: e.target.value })}
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="email"
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                  placeholder="Email (optional)"
                  value={newEmployee.email}
                  onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                />
                <input
                  type="tel"
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                  placeholder="Phone Number"
                  value={newEmployee.phoneNumber}
                  onChange={e => setNewEmployee({ ...newEmployee, phoneNumber: e.target.value })}
                  required
                  pattern="[0-9]{10}"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                  value={newEmployee.campus}
                  onChange={e => setNewEmployee({ ...newEmployee, campus: e.target.value })}
                  required
                  disabled
                >
                  <option value="">Select Campus</option>
                  <option value={user?.campus?.name}>{user?.campus?.name}</option>
                </select>
                <select
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                  value={newEmployee.department}
                  onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })}
                  required
                >
                  <option value="">Select Department</option>
                  {branches.map(branch => (
                    <option key={branch.code} value={branch.code}>{branch.name} ({branch.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                  placeholder="Leave Balance by Experience"
                  value={newEmployee.leaveBalanceByExperience}
                  onChange={e => setNewEmployee({ ...newEmployee, leaveBalanceByExperience: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-4">
                <select
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                  value={newEmployee.role}
                  onChange={e => {
                    const selectedRole = e.target.value;
                    setNewEmployee(prev => ({
                      ...prev,
                      role: selectedRole,
                      customRole: selectedRole === 'other' ? prev.customRole : ''
                    }));
                  }}
                >
                  <option value="">Select Role (Optional)</option>
                  {getCampusRoles(user?.campus?.name).map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                {newEmployee.role === 'other' && (
                  <input
                    type="text"
                    className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                    placeholder="Enter Custom Role"
                    value={newEmployee.customRole}
                    onChange={e => setNewEmployee({ ...newEmployee, customRole: e.target.value })}
                    required
                  />
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="password"
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                  placeholder="Password"
                  value={newEmployee.password}
                  onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  required
                  minLength={6}
                />
                <input
                  type="password"
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                  placeholder="Confirm Password"
                  value={newEmployee.confirmPassword}
                  onChange={e => setNewEmployee({ ...newEmployee, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition font-medium"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition font-medium"
                  disabled={loading}
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Register Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-7xl max-h-[95vh] overflow-y-auto relative">
            <button
              className="absolute top-3 right-3 text-gray-400 bg-gray-100 rounded-full p-1.5 hover:bg-gray-200 z-10"
              onClick={() => {
                setShowBulkModal(false);
                setBulkFile(null);
                setBulkEditableData([]);
                setBulkResults([]);
              }}
            >
              <FaTimes className="h-5 w-5" />
            </button>
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-primary mb-2 text-center">Bulk Register Employees</h3>
              <p className="text-sm text-gray-600 text-center">Upload an Excel file to register multiple employees at once</p>
            </div>
            
            {/* File Upload Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <a
                    href="/bulk_employee_registration.xlsx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-medium text-sm"
                  >
                    <FaDownload className="h-4 w-4" />
                    Download Sample Template
                  </a>
                  <div className="text-sm text-gray-600">
                    {bulkFile ? `Selected: ${bulkFile.name}` : 'No file selected'}
                  </div>
                </div>
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={handleBulkFileChange} 
                  className="text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                />
              </div>
            </div>

            {/* Data Preview Section */}
            {bulkEditableData.length > 0 && (
              <>
                {/* Header Mapping Display */}
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-3">Header Mapping Status</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    {Object.entries(headerMapping).map(([field, status]) => (
                      <div key={field} className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="font-medium text-gray-700">{field}:</span>
                        <span className={`font-medium ${status.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-700">
                    <strong>Note:</strong> The system automatically maps your Excel headers to the required fields. 
                    If any required field shows "Not found", please check your column headers or edit the data below.
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium">Valid Records</span>
                        <span className="text-sm text-gray-600">({bulkEditableData.filter((_, idx) => isRowValid(bulkErrors[idx])).length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span className="text-sm font-medium">Invalid Records</span>
                        <span className="text-sm text-gray-600">({bulkEditableData.filter((_, idx) => !isRowValid(bulkErrors[idx])).length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                        <span className="text-sm font-medium">Total Records</span>
                        <span className="text-sm text-gray-600">({bulkEditableData.length})</span>
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Campus:</span> {user?.campus?.name}
                    </div>
                  </div>
                </div>

                {/* Data Table */}
                <div className="mb-6 overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">Row</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">Status</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">Name *</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">Email</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">Employee ID *</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">Phone *</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">Branch *</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">Role</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">Custom Role</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">Leave Balance</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700">Designation</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-700"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bulkEditableData.map((row, idx) => {
                        const rowErrors = bulkErrors[idx];
                        const isValid = isRowValid(rowErrors);
                        
                        return (
                          <tr key={idx} className={`${isValid ? 'bg-green-50/30' : 'bg-red-50/30'} hover:bg-gray-50/50 transition-colors`}>
                            <td className="px-3 py-2 font-medium text-gray-700">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <div className={`flex items-center gap-2 ${isValid ? 'text-green-500' : 'text-red-500'}`}>
                                <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                {!isValid && (
                                  <span className="text-xs font-medium">
                                    {Object.values(rowErrors)[0]}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.name || ''}
                                onChange={(e) => handleBulkFieldChange(idx, 'name', e.target.value)}
                                className={`w-full p-1.5 rounded border text-sm ${rowErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'} focus:outline-none focus:ring-1 focus:ring-primary/50`}
                                placeholder="Full Name"
                              />
                              {rowErrors.name && <div className="text-red-500 text-xs mt-1">{rowErrors.name}</div>}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="email"
                                value={row.email || ''}
                                onChange={(e) => handleBulkFieldChange(idx, 'email', e.target.value)}
                                className={`w-full p-1.5 rounded border text-sm ${rowErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'} focus:outline-none focus:ring-1 focus:ring-primary/50`}
                                placeholder="email@example.com (optional)"
                              />
                              {rowErrors.email && <div className="text-red-500 text-xs mt-1">{rowErrors.email}</div>}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.employeeId || ''}
                                onChange={(e) => handleBulkFieldChange(idx, 'employeeId', e.target.value)}
                                className={`w-full p-1.5 rounded border text-sm ${rowErrors.employeeId ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'} focus:outline-none focus:ring-1 focus:ring-primary/50`}
                                placeholder="EMP001"
                              />
                              {rowErrors.employeeId && <div className="text-red-500 text-xs mt-1">{rowErrors.employeeId}</div>}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.phoneNumber || ''}
                                onChange={(e) => handleBulkFieldChange(idx, 'phoneNumber', e.target.value)}
                                className={`w-full p-1.5 rounded border text-sm ${rowErrors.phoneNumber ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'} focus:outline-none focus:ring-1 focus:ring-primary/50`}
                                placeholder="1234567890"
                              />
                              {rowErrors.phoneNumber && <div className="text-red-500 text-xs mt-1">{rowErrors.phoneNumber}</div>}
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={row.branchCode || ''}
                                onChange={(e) => handleBulkFieldChange(idx, 'branchCode', e.target.value)}
                                className={`w-full p-1.5 rounded border text-sm ${rowErrors.branchCode ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'} focus:outline-none focus:ring-1 focus:ring-primary/50`}
                              >
                                <option value="">Select Branch</option>
                                {row.branches?.map(branch => (<option key={branch.code} value={branch.code}>{branch.code}</option>))}
                              </select>
                              {rowErrors.branchCode && <div className="text-red-500 text-xs mt-1">{rowErrors.branchCode}</div>}
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={row.role || ''}
                                onChange={(e) => handleBulkFieldChange(idx, 'role', e.target.value)}
                                className={`w-full p-1.5 rounded border text-sm ${rowErrors.role ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'} focus:outline-none focus:ring-1 focus:ring-primary/50`}
                              >
                                <option value="">Select Role</option>
                                {row.roles?.map(role => (
                                  <option key={role.value} value={role.value}>
                                    {role.label}
                                  </option>
                                ))}
                              </select>
                              {rowErrors.role && <div className="text-red-500 text-xs mt-1">{rowErrors.role}</div>}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.customRole || ''}
                                onChange={(e) => handleBulkFieldChange(idx, 'customRole', e.target.value)}
                                className={`w-full p-1.5 rounded border text-sm ${rowErrors.customRole ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'} focus:outline-none focus:ring-1 focus:ring-primary/50`}
                                placeholder="Custom role if 'other'"
                                disabled={row.role !== 'other'}
                              />
                              {rowErrors.customRole && <div className="text-red-500 text-xs mt-1">{rowErrors.customRole}</div>}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={row.leaveBalanceByExperience || ''}
                                onChange={(e) => handleBulkFieldChange(idx, 'leaveBalanceByExperience', e.target.value)}
                                className={`w-full p-1.5 rounded border text-sm ${rowErrors.leaveBalanceByExperience ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'} focus:outline-none focus:ring-1 focus:ring-primary/50`}
                                placeholder="12"
                                min="0"
                                max="30"
                              />
                              {rowErrors.leaveBalanceByExperience && <div className="text-red-500 text-xs mt-1">{rowErrors.leaveBalanceByExperience}</div>}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.designation || ''}
                                onChange={(e) => handleBulkFieldChange(idx, 'designation', e.target.value)}
                                className="w-full p-1.5 rounded border text-sm border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-primary/50"
                                placeholder="Optional designation"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => deleteBulkRow(idx)}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Delete this row"
                              >
                                <FaTimes className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">*</span> Required fields
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition font-medium"
                      onClick={() => {
                        setShowBulkModal(false);
                        setBulkFile(null);
                        setBulkEditableData([]);
                        setBulkResults([]);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleBulkRegister}
                      disabled={bulkLoading || !isBulkValid}
                    >
                      {bulkLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Registering...
                        </div>
                      ) : (
                        `Register ${bulkEditableData.filter((_, idx) => isRowValid(bulkErrors[idx])).length} Valid Records`
                      )}
                    </button>
                  </div>
                </div>

                {/* Results Section */}
                {bulkResults.length > 0 && (
                  <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Registration Results</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Row</th>
                            <th className="px-3 py-2 text-left">Employee ID</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Message</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {bulkResults.map((result, idx) => (
                            <tr key={idx} className={result.success ? 'bg-green-50' : 'bg-red-50'}>
                              <td className="px-3 py-2 font-medium">{result.row}</td>
                              <td className="px-3 py-2">{result.employeeId}</td>
                              <td className="px-3 py-2">{result.email}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {result.success ? 'Success' : 'Failed'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm">{result.error || 'Registered successfully'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeOperationsSection;
