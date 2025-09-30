import React, { useState, useEffect } from 'react';
import { FaUsers, FaSearch, FaEdit, FaTrash, FaKey, FaToggleOn, FaToggleOff, FaEye, FaFilter, FaList, FaTh } from 'react-icons/fa';
import { MdEmail, MdPhone, MdLocationOn, MdBusiness, MdPerson } from 'react-icons/md';
import axios from 'axios';
import config from '../../config';
import { toast } from 'react-toastify';

const API_BASE_URL = config.API_BASE_URL;

const EmployeeManagementSection = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [groupByCampus, setGroupByCampus] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);
  
  // Filter options
  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  // Selected employee
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [resetPasswordData, setResetPasswordData] = useState({ newPassword: '' });

  useEffect(() => {
    fetchEmployees();
  }, [currentPage, searchTerm, selectedCampus, selectedDepartment, selectedStatus]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCampus !== 'all') params.append('campus', selectedCampus);
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await axios.get(
        `${API_BASE_URL}/super-admin/employees?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setEmployees(response.data.employees);
      setTotalPages(response.data.pagination.totalPages);
      setTotalEmployees(response.data.pagination.totalEmployees);
      setCampuses(response.data.filters.campuses);
      setDepartments(response.data.filters.departments);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError(error.response?.data?.msg || 'Failed to fetch employees');
      toast.error(error.response?.data?.msg || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'campus':
        setSelectedCampus(value);
        break;
      case 'department':
        setSelectedDepartment(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
    }
    setCurrentPage(1);
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setEditFormData({
      name: employee.name,
      email: employee.email,
      phoneNumber: employee.phoneNumber,
      department: employee.department,
      role: employee.role,
      roleDisplayName: employee.roleDisplayName,
      status: employee.status,
      specialPermission: employee.specialPermission || false,
      specialLeaveMaxDays: employee.specialLeaveMaxDays || 0,
      leaveBalance: employee.leaveBalance
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/super-admin/employees/${selectedEmployee._id}`,
        editFormData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast.success('Employee updated successfully');
      setShowEditModal(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error(error.response?.data?.msg || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_BASE_URL}/super-admin/employees/${selectedEmployee._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast.success('Employee deleted successfully');
      setShowDeleteModal(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error(error.response?.data?.msg || 'Failed to delete employee');
    }
  };

  const handleResetPassword = (employee) => {
    setSelectedEmployee(employee);
    setResetPasswordData({ newPassword: '' });
    setShowResetPasswordModal(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/super-admin/employees/${selectedEmployee._id}/reset-password`,
        resetPasswordData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast.success('Password reset successfully');
      setShowResetPasswordModal(false);
      setResetPasswordData({ newPassword: '' });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.msg || 'Failed to reset password');
    }
  };

  const handleUpdateStatus = async (employee) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = employee.status === 'active' ? 'inactive' : 'active';
      
      await axios.put(
        `${API_BASE_URL}/super-admin/employees/${employee._id}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast.success(`Employee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchEmployees();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.msg || 'Failed to update status');
    }
  };

  const handleViewEmployee = async (employee) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/super-admin/employees/${employee._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSelectedEmployee(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching employee details:', error);
      toast.error('Failed to fetch employee details');
    }
  };

  const groupEmployeesByCampus = () => {
    const grouped = {};
    employees.forEach(employee => {
      if (!grouped[employee.campus]) {
        grouped[employee.campus] = [];
      }
      grouped[employee.campus].push(employee);
    });
    return grouped;
  };

  const renderEmployeeCard = (employee) => (
    <div key={employee._id} className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-primary mb-1">{employee.name}</h3>
          <p className="text-gray-600 text-sm flex items-center gap-1">
            <MdEmail className="text-primary" /> {employee.email}
          </p>
          <p className="text-gray-600 text-sm flex items-center gap-1">
            <MdBusiness className="text-primary" /> {employee.employeeId}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {employee.status}
        </span>
      </div>
      
      <div className="space-y-2 mb-4">
        <p className="text-gray-600 text-sm flex items-center gap-2">
          <MdLocationOn className="text-primary" /> {employee.campus}
        </p>
        <p className="text-gray-600 text-sm flex items-center gap-2">
          <MdBusiness className="text-primary" /> {employee.department}
        </p>
        <p className="text-gray-600 text-sm flex items-center gap-2">
          <MdPerson className="text-primary" /> {employee.roleDisplayName || employee.role}
        </p>
        {employee.phoneNumber && (
          <p className="text-gray-600 text-sm flex items-center gap-2">
            <MdPhone className="text-primary" /> {employee.phoneNumber}
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <button
          onClick={() => handleViewEmployee(employee)}
          className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          title="View Details"
        >
          <FaEye />
        </button>
        <button
          onClick={() => handleEditEmployee(employee)}
          className="p-2 rounded-full bg-green-100 hover:bg-green-200 text-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
          title="Edit Employee"
        >
          <FaEdit />
        </button>
        <button
          onClick={() => handleResetPassword(employee)}
          className="p-2 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          title="Reset Password"
        >
          <FaKey />
        </button>
        <button
          onClick={() => handleUpdateStatus(employee)}
          className={`p-2 rounded-full focus:outline-none focus:ring-2 ${
            employee.status === 'active'
              ? 'bg-red-100 hover:bg-red-200 text-red-600 focus:ring-red-400'
              : 'bg-green-100 hover:bg-green-200 text-green-600 focus:ring-green-400'
          }`}
          title={employee.status === 'active' ? 'Deactivate' : 'Activate'}
        >
          {employee.status === 'active' ? <FaToggleOff /> : <FaToggleOn />}
        </button>
        <button
          onClick={() => handleDeleteEmployee(employee)}
          className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
          title="Delete Employee"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );

  const renderEmployeeTableRow = (employee) => (
    <tr key={employee._id} className="border-b hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
            <div className="text-sm text-gray-500">{employee.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{employee.employeeId}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{employee.campus}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{employee.department}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{employee.roleDisplayName || employee.role}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
          employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {employee.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewEmployee(employee)}
            className="text-blue-600 hover:text-blue-900"
            title="View Details"
          >
            <FaEye />
          </button>
          <button
            onClick={() => handleEditEmployee(employee)}
            className="text-green-600 hover:text-green-900"
            title="Edit Employee"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleResetPassword(employee)}
            className="text-yellow-600 hover:text-yellow-900"
            title="Reset Password"
          >
            <FaKey />
          </button>
          <button
            onClick={() => handleUpdateStatus(employee)}
            className={employee.status === 'active' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
            title={employee.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {employee.status === 'active' ? <FaToggleOff /> : <FaToggleOn />}
          </button>
          <button
            onClick={() => handleDeleteEmployee(employee)}
            className="text-red-600 hover:text-red-900"
            title="Delete Employee"
          >
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="p-6 mt-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading employees...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 mt-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary">Employee Management</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Total: {totalEmployees}</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md ${viewMode === 'cards' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}
            >
              <FaTh />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}
            >
              <FaList />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          
          <div>
            <select
              value={selectedCampus}
              onChange={(e) => handleFilterChange('campus', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">All Campuses</option>
              {campuses.map(campus => (
                <option key={campus} value={campus}>{campus}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={groupByCampus}
              onChange={(e) => setGroupByCampus(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">Group by Campus</span>
          </label>
        </div>
      </div>

      {/* Employee List */}
      {viewMode === 'cards' ? (
        <div>
          {groupByCampus ? (
            <div className="space-y-8">
              {Object.entries(groupEmployeesByCampus()).map(([campus, campusEmployees]) => (
                <div key={campus}>
                  <h3 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
                    <FaUsers /> {campus.toUpperCase()} ({campusEmployees.length} employees)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campusEmployees.map(renderEmployeeCard)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.map(renderEmployeeCard)}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campus
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map(renderEmployeeTableRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-6">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Edit Employee</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editFormData.phoneNumber || ''}
                    onChange={(e) => setEditFormData({...editFormData, phoneNumber: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({...editFormData, department: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Display Name</label>
                  <input
                    type="text"
                    value={editFormData.roleDisplayName || ''}
                    onChange={(e) => setEditFormData({...editFormData, roleDisplayName: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Balance</label>
                  <input
                    type="number"
                    value={editFormData.leaveBalance || ''}
                    onChange={(e) => setEditFormData({...editFormData, leaveBalance: parseInt(e.target.value) || 0})}
                    className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editFormData.specialPermission || false}
                    onChange={(e) => setEditFormData({...editFormData, specialPermission: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Special Permission</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Leave Max Days</label>
                  <input
                    type="number"
                    value={editFormData.specialLeaveMaxDays || ''}
                    onChange={(e) => setEditFormData({...editFormData, specialLeaveMaxDays: parseInt(e.target.value) || 0})}
                    className="w-32 p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-red-600">Delete Employee</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{selectedEmployee?.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Reset Password</h2>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <p className="text-gray-700 mb-4">
                Reset password for <strong>{selectedEmployee?.name}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData({...resetPasswordData, newPassword: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Employee Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-lg text-gray-900">{selectedEmployee.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedEmployee.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                  <p className="text-gray-900">{selectedEmployee.employeeId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <p className="text-gray-900">{selectedEmployee.phoneNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Campus</label>
                  <p className="text-gray-900">{selectedEmployee.campus}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <p className="text-gray-900">{selectedEmployee.department}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="text-gray-900">{selectedEmployee.roleDisplayName || selectedEmployee.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedEmployee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedEmployee.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Leave Balance</label>
                  <p className="text-gray-900">{selectedEmployee.leaveBalance || 0} days</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Special Permission</label>
                  <p className="text-gray-900">{selectedEmployee.specialPermission ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditEmployee(selectedEmployee);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
              >
                Edit Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagementSection;
