import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import PasswordResetModal from "../../components/PasswordResetModal";
import RemarksModal from "../../components/RemarksModal";
import { toast } from 'react-toastify';
import { createAuthAxios } from '../../utils/authAxios';
import config from '../../config';
import HodSidebar from '../../components/HodSidebar';
import Loading from '../../components/Loading';

const API_BASE_URL = config.API_BASE_URL;

const HodDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [hod, setHod] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [hodLeaveRequests, setHodLeaveRequests] = useState([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    role: '',
    roleDisplayName: '',
    status: ''
  });
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [selectedEmployeeForReset, setSelectedEmployeeForReset] = useState(null);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [cclWorkRequests, setCclWorkRequests] = useState([]);
  const [selectedCCLWork, setSelectedCCLWork] = useState(null);
  const [showCCLRemarksModal, setShowCCLRemarksModal] = useState(false);
  const [cclRemarks, setCclRemarks] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 10;

  const navigate = useNavigate();
  const campus = localStorage.getItem('campus');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${API_BASE_URL}/hod/dashboard`,
          {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('Dashboard data:', response.data);
        
        if (!response.data || !response.data.hod) {
          throw new Error('Invalid dashboard data received');
        }

        setDashboardData(response.data);
        setHod(response.data.hod);
        setLeaveRequests(response.data.departmentLeaves);
        setHodLeaveRequests(response.data.hod.hodLeaveRequests || []);
        setEmployees(response.data.employees || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        const errorMessage = error.response?.data?.msg || error.message || 'Failed to fetch dashboard data';
        setError(errorMessage);
        toast.error(errorMessage);
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          handleLogout();
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [refreshTrigger, token, navigate]);

  const fetchCCLWorkRequests = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      console.log('Fetching CCL work requests...');
      const authAxios = createAuthAxios(token);
      const response = await authAxios.get('/hod/ccl-work-requests');
      console.log('CCL work requests response:', response.data);
      
      if (response.data && response.data.success && response.data.data) {
        setCclWorkRequests(response.data.data);
      } else {
        console.log('No CCL work requests found or invalid response format');
        setCclWorkRequests([]);
      }
    } catch (error) {
      console.error('Error fetching CCL work requests:', error);
      toast.error('Failed to fetch CCL work requests');
      setCclWorkRequests([]);
    }
  }, []);

  useEffect(() => {
    fetchCCLWorkRequests();
  }, [fetchCCLWorkRequests]);

  const handleCCLWorkApproval = async (workId, status) => {
      try {
      console.log('Updating CCL work request:', { workId, status });
      
      const remarks = status === 'Forwarded to Principal' 
        ? 'Forwarded to Principal for approval'
        : 'Rejected by HOD';

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const response = await axios.put(
        `${API_BASE_URL}/hod/ccl-work-requests/${workId}`,
        { status, remarks },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('CCL work request update response:', response.data);

      if (response.data.success) {
        setCclWorkRequests(prevRequests => 
          prevRequests.map(request => 
            request._id === workId 
              ? { 
                  ...request, 
                  status, 
                  hodRemarks: remarks,
                  hodApprovalDate: new Date().toISOString()
                }
              : request
          )
        );
        toast.success(response.data.message);
      }
      } catch (error) {
      console.error('Error updating CCL work request:', error);
      toast.error(error.response?.data?.message || 'Failed to update CCL work request');
        }
  };

  const handleAction = async (status) => {
    try {
      setLoading(true);
      if (!selectedLeave) return;
  
      // Map the frontend status to backend status
      const backendStatus = status === "Forwarded" ? "Approved" : "Rejected";
  
      const response = await axios.put(
        `${API_BASE_URL}/hod/leaves/${selectedLeave.employeeId}/${selectedLeave._id}`,
        {
          status: backendStatus,
          remarks: remarks || (status === "Forwarded" ? "Forwarded to Principal" : "Rejected by HOD")
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      if (response.data) {
        // Update the leave request in the state
        setLeaveRequests((prev) =>
          prev.map((leave) =>
            leave._id === selectedLeave._id 
              ? { 
                  ...leave, 
                  status: status === "Forwarded" ? "Forwarded by HOD" : "Rejected",
                  hodStatus: backendStatus,
                  hodRemarks: remarks || (status === "Forwarded" ? "Forwarded to Principal" : "Rejected by HOD"),
                  hodApprovalDate: new Date().toISOString()
                } 
              : leave
          )
        );
  
        setSelectedLeave(null);
        setRemarks("");
        setShowRemarksModal(false);
        setRefreshTrigger(prev => !prev);
        toast.success(response.data.msg || 'Leave request updated successfully');
      }
    } catch (error) {
      console.error('Error updating leave request:', error);
      const errorMsg = error.response?.data?.msg || 'Failed to update leave request';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRemarksSubmit = (remarks) => {
    setRemarks(remarks);
    handleAction(selectedAction === 'forward' ? "Forwarded" : "Rejected");
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('campus');
    localStorage.removeItem('branchCode');
    navigate('/');
  };

  const getValidRoles = (campus) => {
    const validRoles = {
      engineering: [
        { value: 'associate_professor', label: 'Associate Professor' },
        { value: 'assistant_professor', label: 'Assistant Professor' },
        { value: 'lab_incharge', label: 'Lab Incharge' },
        { value: 'lab_assistant', label: 'Lab Assistant' },
        { value: 'technician', label: 'Technician' },
        { value: 'librarian', label: 'Librarian' },
        { value: 'pet', label: 'PET' },
        { value: 'other', label: 'Other' }
      ],
      diploma: [
        { value: 'senior_lecturer', label: 'Senior Lecturer' },
        { value: 'lecturer', label: 'Lecturer' },
        { value: 'lab_incharge', label: 'Lab Incharge' },
        { value: 'lab_assistant', label: 'Lab Assistant' },
        { value: 'technician', label: 'Technician' },
        { value: 'other', label: 'Other' }
      ],
      pharmacy: [
        { value: 'associate_professor', label: 'Associate Professor' },
        { value: 'assistant_professor', label: 'Assistant Professor' },
        { value: 'lab_incharge', label: 'Lab Incharge' },
        { value: 'lab_assistant', label: 'Lab Assistant' },
        { value: 'technician', label: 'Technician' },
        { value: 'other', label: 'Other' }
      ],
      degree: [
        { value: 'associate_professor', label: 'Associate Professor' },
        { value: 'assistant_professor', label: 'Assistant Professor' },
        { value: 'lab_incharge', label: 'Lab Incharge' },
        { value: 'lab_assistant', label: 'Lab Assistant' },
        { value: 'technician', label: 'Technician' },
        { value: 'other', label: 'Other' }
      ]
    };
    return validRoles[campus] || [];
  };

  const handleEditClick = (employee) => {
    setSelectedEmployee(employee);
    setEditForm({
      name: employee.name,
      email: employee.email,
      phoneNumber: employee.phoneNumber,
      role: employee.role,
      roleDisplayName: employee.roleDisplayName,
      status: employee.status
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate email format
      const emailRegex = /^[^\s@]{5,}@[^\s@]{2,}\.[^\s@]{2,}$/;
      if (!emailRegex.test(editForm.email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      // Validate phone number
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(editForm.phoneNumber)) {
        toast.error('Please enter a valid 10-digit phone number');
        return;
      }

      setLoading(true);
      const response = await axios.put(
        `${API_BASE_URL}/hod/employees/${selectedEmployee.employeeId}`,
        editForm,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update employees list with the returned data
      setEmployees(prevEmployees => 
        prevEmployees.map(emp => 
          emp.employeeId === selectedEmployee.employeeId 
            ? response.data.employee 
            : emp
        )
      );

      setShowEditModal(false);
      toast.success(response.data.msg || 'Employee details updated successfully');
    } catch (error) {
      console.error('Error updating employee:', error);
      const errorMsg = error.response?.data?.msg || 'Failed to update employee details';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (employeeId) => {
    setSelectedEmployeeForReset(employeeId);
    setShowPasswordResetModal(true);
  };

  const handleCCLWorkAction = async (status) => {
    try {
      if (!selectedCCLWork) return;

      const response = await axios.put(
        `${API_BASE_URL}/hod/ccl-work-requests/${selectedCCLWork._id}`,
        {
          status,
          remarks: cclRemarks || `${status} by HOD`
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data) {
        // Update the CCL work request in the state
        setCclWorkRequests(prev =>
          prev.map(work =>
            work._id === selectedCCLWork._id
              ? {
                  ...work,
                  status,
                  hodRemarks: cclRemarks || `${status} by HOD`,
                  hodApprovalDate: new Date().toISOString()
                }
              : work
          )
        );

        setSelectedCCLWork(null);
        setCclRemarks('');
        setShowCCLRemarksModal(false);
        toast.success(response.data.msg || 'CCL work request updated successfully');
      }
    } catch (error) {
      console.error('Error updating CCL work request:', error);
      toast.error(error.response?.data?.msg || 'Failed to update CCL work request');
    }
  };

  const handleSidebarLogout = () => {
    handleLogout();
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
  return (
          <div className="p-4 sm:p-6 mt-2">
            <h2 className="text-2xl font-bold text-primary mt-4 mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Employees */}
              <div className="bg-secondary p-6 rounded-neumorphic shadow-outerRaised flex flex-col items-center">
                <h3 className="text-lg font-semibold text-primary mb-2">Total Employees</h3>
                <p className="text-3xl font-bold">{employees.length}</p>
          </div>
              {/* Pending Department Leaves */}
              <div className="bg-secondary p-6 rounded-neumorphic shadow-outerRaised flex flex-col items-center">
                <h3 className="text-lg font-semibold text-primary mb-2">Pending Dept. Leaves</h3>
                <p className="text-3xl font-bold">{leaveRequests.filter(l => l.status === 'Pending').length}</p>
        </div>
              {/* HOD's Own Leave Requests */}
              <div className="bg-secondary p-6 rounded-neumorphic shadow-outerRaised flex flex-col items-center">
                <h3 className="text-lg font-semibold text-primary mb-2">Your Leave Requests</h3>
                <p className="text-3xl font-bold">{hodLeaveRequests.length}</p>
                <span className="text-sm text-gray-600 mt-1">Pending: {hodLeaveRequests.filter(l => l.status === 'Pending').length}</span>
          </div>
              {/* CCL Work Requests */}
              <div className="bg-secondary p-6 rounded-neumorphic shadow-outerRaised flex flex-col items-center">
                <h3 className="text-lg font-semibold text-primary mb-2">CCL Work Requests</h3>
                <p className="text-3xl font-bold">{cclWorkRequests.length}</p>
                <span className="text-sm text-gray-600 mt-1">Pending: {cclWorkRequests.filter(w => w.status === 'Pending').length}</span>
            </div>
            </div>
            {/* Optionally, add a welcome or info section */}
            <div className="bg-white/80 rounded-lg shadow-innerSoft p-6 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-primary mb-2">Welcome, {hod?.name || 'HOD'}!</h3>
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
        );
      case 'employees':
        // Filter employees based on search query
        const filteredEmployees = employees.filter(emp => {
          const q = searchQuery.toLowerCase();
          return (
            emp.name?.toLowerCase().includes(q) ||
            emp.email?.toLowerCase().includes(q) ||
            emp.employeeId?.toLowerCase().includes(q) ||
            emp.roleDisplayName?.toLowerCase().includes(q)
          );
        });
        // Pagination logic
        const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);
        const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * employeesPerPage, currentPage * employeesPerPage);
        return (
          <div className="p-4 sm:p-6 mt-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
              <div className="flex items-center gap-2">
                <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C17 14.17 12.33 13 10 13zm8 0c-.29 0-.62.02-.97.05C17.16 14.13 19 15.1 19 16.5V19h5v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
                <h2 className="text-2xl font-bold text-primary">Department Employees</h2>
              </div>
              {/* Search input with SVG */}
              <div className="relative w-full sm:max-w-xs md:w-1/3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, email, ID, or role..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary pl-10"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {/* Desktop/tablet table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedEmployees.map((employee) => (
                      <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {employee.profilePhoto ? (
                                <img
                                  src={`${API_BASE_URL}/uploads/${employee.profilePhoto}`}
                                  alt={employee.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-primary font-semibold text-lg">
                                    {employee.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                              <div className="text-sm text-gray-500">{employee.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.employeeId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.roleDisplayName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.phoneNumber || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold
                            ${employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {employee.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEditClick(employee)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleResetPassword(employee.employeeId)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card layout */}
              <div className="md:hidden space-y-3 p-2">
                {paginatedEmployees.map((employee) => (
                  <div key={employee._id} className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col gap-2">
                    {/* Top row: Avatar, Name, Status */}
                    <div className="flex items-center gap-3 mb-1">
                      {employee.profilePhoto ? (
                        <img
                          src={`${API_BASE_URL}/uploads/${employee.profilePhoto}`}
                          alt={employee.name}
                          className="h-12 w-12 rounded-full object-cover border border-primary/10"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/10">
                          <span className="text-primary font-semibold text-lg">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-base truncate">{employee.name}</span>
                          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold align-middle ${employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{employee.status}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">{employee.email}</div>
                      </div>
                    </div>
                    {/* Info fields */}
                    <div className="flex flex-col gap-0.5 text-xs text-gray-700 pl-1">
                      <div className="flex items-center gap-1">
                        {/* Use a standard badge icon for ID */}
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h.01M7 13h.01M11 13h2"/></svg>
                        <span className="font-medium">ID:</span>
                        <span>{employee.employeeId}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        <span className="font-medium">Role:</span>
                        <span>{employee.roleDisplayName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
                        <span className="font-medium">Phone:</span>
                        <span>{employee.phoneNumber || 'N/A'}</span>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEditClick(employee)}
                        className="flex-1 flex items-center justify-center px-2 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleResetPassword(employee.employeeId)}
                        className="flex-1 flex items-center justify-center px-2 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Reset Password
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-6 gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  Previous
                </button>
                <span className="mx-2 text-sm font-medium text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        );
      case 'leaves':
        return (
          <div className="p-4 sm:p-6 mt-8">
            <h2 className="text-2xl font-bold text-primary mb-6">Leave Requests</h2>
            <div className="bg-secondary rounded-neumorphic shadow-outerRaised p-4 sm:p-6">
              {/* Card grid for leave requests */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaveRequests.map((leave) => (
                  <div
                    key={leave._id}
                    className="bg-white p-4 rounded-neumorphic shadow-innerSoft cursor-pointer hover:shadow-outerRaised transition-all duration-300"
                    onClick={() => {
                      setSelectedLeave(leave);
                    }}
                  >
                    <div className="flex justify-between items-start">
                  <div>
                        <h3 className="text-lg font-semibold text-primary">
                          {leave.employee?.name || leave.employeeName || 'Unknown Employee'}
                    </h3>
                    <p className="font-mono  text-primary text-sm">Leave ID : {leave.leaveRequestId}</p>
                        <p className="text-gray-600 text-sm">Employee ID: {leave.employee?.employeeId || leave.employeeEmployeeId || 'N/A'}</p>
                        
                        <p className="text-gray-600 text-sm">
                          Type: {leave.type ? leave.type.charAt(0).toUpperCase() + leave.type.slice(1) : leave.leaveType ? leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1) : 'N/A'}
                        </p>
                        
                      </div>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1
                        ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          leave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'}`}
                      >
                        {leave.status || 'N/A'}
                      </span>
                    </div>
                    <div className="mt-2 text-gray-700 text-sm line-clamp-2">
                      <span className="font-medium">Reason:</span> {leave.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave Details Modal */}
            {selectedLeave && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl p-3 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-primary">Leave Request Details</h3>
                    <button
                      onClick={() => setSelectedLeave(null)}
                      className="text-gray-500 hover:text-gray-700 p-1"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    
                    {/* Employee Information */}
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Employee Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="font-medium text-sm sm:text-base">{selectedLeave.employee?.name || selectedLeave.employeeName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Employee ID</p>
                          <p className="font-medium text-sm sm:text-base">{selectedLeave.employee?.employeeId || selectedLeave.employeeEmployeeId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium text-sm sm:text-base break-words">{selectedLeave.employee?.email || selectedLeave.employeeEmail}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Department</p>
                          <p className="font-medium text-sm sm:text-base">{selectedLeave.employee?.department?.name || selectedLeave.employeeDepartment}</p>
                        </div>
                      </div>
                    </div>
                    {/* Leave Details */}
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Leave Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                          <p className="text-sm text-gray-600">Request ID</p>
                          <p className="font-mono text-base text-primary">{selectedLeave.leaveRequestId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Leave Type</p>
                          <p className="font-medium text-sm sm:text-base">
                            {selectedLeave.type ? selectedLeave.type.charAt(0).toUpperCase() + selectedLeave.type.slice(1) : selectedLeave.leaveType ? selectedLeave.leaveType.charAt(0).toUpperCase() + selectedLeave.leaveType.slice(1) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Duration</p>
                          <p className="font-medium text-sm sm:text-base">
                            {new Date(selectedLeave.startDate).toLocaleDateString()} to {new Date(selectedLeave.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Applied On</p>
                          <p className="font-medium text-sm sm:text-base">
                            {selectedLeave.appliedOn ? new Date(selectedLeave.appliedOn).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                            ${selectedLeave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              selectedLeave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              selectedLeave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'}`}
                          >
                            {selectedLeave.status || 'N/A'}
                          </span>
                        </div>
                        {selectedLeave.isHalfDay && (
                          <div className="col-span-1 sm:col-span-2">
                            <p className="text-sm text-gray-600">Half Day Leave</p>
                          </div>
                        )}
                        <div className="col-span-1 sm:col-span-2">
                          <p className="text-sm text-gray-600">Reason</p>
                          <p className="font-medium text-sm sm:text-base">{selectedLeave.reason || 'No reason provided'}</p>
                        </div>
                      </div>
                    </div>
                    {/* Remarks */}
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Remarks</h4>
                      <div className="space-y-2">
                        {selectedLeave.hodRemarks && (
                          <div>
                            <p className="text-sm text-gray-600">HOD Remarks</p>
                            <p className="font-medium text-sm sm:text-base">{selectedLeave.hodRemarks}</p>
                          </div>
                        )}
                        {selectedLeave.principalRemarks && (
                          <div>
                            <p className="text-sm text-gray-600">Principal Remarks</p>
                            <p className="font-medium text-sm sm:text-base">{selectedLeave.principalRemarks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Alternate Schedule */}
                    {selectedLeave.alternateSchedule && selectedLeave.alternateSchedule.length > 0 && (
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">Alternate Schedule</h4>
                        <div className="space-y-3 sm:space-y-4">
                          {selectedLeave.alternateSchedule.map((schedule, index) => (
                            <div key={index} className="bg-white p-2 sm:p-3 rounded-md">
                              <p className="font-medium text-sm sm:text-base mb-2">
                                Date: {schedule.date ? new Date(schedule.date).toLocaleDateString() : 'N/A'}
                              </p>
                              {schedule.periods && schedule.periods.length > 0 ? (
                                <div className="space-y-2">
                                  {schedule.periods.map((period, pIndex) => (
                                    <div key={pIndex} className="bg-gray-50 p-2 rounded">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                          <span className="text-sm text-gray-600">Period:</span>{' '}
                                          <span className="font-medium text-sm sm:text-base">{period.periodNumber || 'N/A'}</span>
                                        </div>
                                        <div>
                                          <span className="text-sm text-gray-600">Class:</span>{' '}
                                          <span className="font-medium text-sm sm:text-base">{period.assignedClass || 'N/A'}</span>
                                        </div>
                                        <div className="col-span-1 sm:col-span-2">
                                          <span className="text-sm text-gray-600">Substitute Faculty:</span>{' '}
                                          <span className="font-medium text-sm sm:text-base">
                                            {typeof period.substituteFaculty === 'object' && period.substituteFaculty?.name
                                              ? period.substituteFaculty.name
                                              : period.substituteFacultyName
                                                ? period.substituteFacultyName
                                                : (typeof period.substituteFaculty === 'string' && period.substituteFaculty)
                                                  ? period.substituteFaculty
                                                  : 'N/A'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500 italic text-sm sm:text-base">No periods assigned for this day</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Action Buttons */}
                    {selectedLeave.status === 'Pending' && (
                      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-6">
                        <button
                          onClick={() => {
                            setSelectedAction('forward');
                            setShowRemarksModal(true);
                          }}
                          className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                        >
                          Forward
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAction('reject');
                            setShowRemarksModal(true);
                          }}
                          className="w-full sm:w-auto bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'ccl-work':
        return (
          <div className="p-4 sm:p-6 mt-8">
            <h2 className="text-2xl font-bold text-primary mb-6">CCL Work Requests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cclWorkRequests.map((work) => (
              <div
                  key={work._id} 
                  className="bg-secondary p-6 rounded-neumorphic shadow-outerRaised hover:shadow-innerSoft transition-all duration-300"
              >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                  <h3 className="text-lg font-semibold text-primary">
                        {work.employee?.name || work.employeeName || 'Unknown Employee'}
                  </h3>
                      <p className="text-sm text-gray-600">ID: {work.employee?.employeeId || work.employeeEmployeeId || 'N/A'}</p>
                </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold
                      ${work.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        work.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        work.status === 'Forwarded to Principal' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'}`}
                    >
                      {work.status || 'Pending'}
                  </span>
                </div>
                  
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium">Date:</span> {work.date ? new Date(work.date).toLocaleDateString() : 'N/A'}
                    </p>
                    {work.assignedTo && (
                      <p className="text-gray-700">
                        <span className="font-medium">Assigned To:</span> {work.assignedTo}
                      </p>
                    )}
                    <p className="text-gray-700">
                      <span className="font-medium">Reason:</span> {work.reason || 'N/A'}
                    </p>
                    {work.hodRemarks && (
                      <p className="text-gray-700">
                        <span className="font-medium">Your Remarks:</span> {work.hodRemarks}
                      </p>
                    )}
        </div>

                  {work.status === 'Pending' && (
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedCCLWork(work);
                          setCclRemarks('');
                          setShowCCLRemarksModal(true);
                        }}
                        className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
        );
      case 'profile':
        return (
          <div className="p-4 sm:p-6 mt-4">
            <h2 className="text-2xl font-bold text-primary mb-6">Your Profile</h2>
            <div className="bg-secondary rounded-neumorphic shadow-outerRaised p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center md:items-start">
                  <h3 className="text-xl font-semibold text-primary mb-2">Welcome, {hod?.name || 'HOD'}!</h3>
                  <p className="text-gray-700">Department: <span className="font-medium">{hod?.department?.name || hod?.branchCode || 'N/A'}</span></p>
                  <p className="text-gray-700">Email: <span className="font-medium">{hod?.email}</span></p>
      </div>
                <div className="flex justify-center md:justify-end">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="40" cy="40" r="38" stroke="#3B82F6" strokeWidth="4" fill="#E0E7FF" />
                    <path d="M40 20V40L55 47" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <HodSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleSidebarLogout}
      />
      <div className="flex-1 min-h-screen lg:ml-64">
        <div className="p-4 lg:p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
        </div>
      )}
          {renderContent()}
            </div>
      </div>
      {/* Edit Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 lg:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg lg:text-xl font-bold mb-4">Edit Employee Details</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="mt-1 block w-full p-2 lg:p-3 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="mt-1 block w-full p-2 lg:p-3 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                    type="text"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})}
                    className="mt-1 block w-full p-2 lg:p-3 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => {
                    const selectedRole = e.target.value;
                    const roleLabel = getValidRoles(campus).find(r => r.value === selectedRole)?.label || '';
                    setEditForm({
                      ...editForm,
                      role: selectedRole,
                      roleDisplayName: roleLabel
                    });
                  }}
                  className="mt-1 block w-full p-2 lg:p-3 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                >
                  <option value="">Select Role</option>
                  {getValidRoles(campus).map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    className="mt-1 block w-full p-2 lg:p-3 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-200 text-gray-700 px-3 lg:px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-3 lg:px-4 py-2 rounded-md hover:bg-primary-dark"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Password Reset Modal */}
      {showPasswordResetModal && selectedEmployee && (
      <PasswordResetModal
        show={showPasswordResetModal}
          onClose={() => setShowPasswordResetModal(false)}
          employeeId={selectedEmployee.employeeId}
        token={token}
        loading={loading}
        setLoading={setLoading}
      />
      )}

      {/* CCL Work Request Remarks Modal */}
      {showCCLRemarksModal && selectedCCLWork && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Review CCL Work Request
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                value={cclRemarks}
                onChange={(e) => setCclRemarks(e.target.value)}
                rows="3"
                className="w-full p-2 lg:p-3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your remarks..."
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setSelectedCCLWork(null);
                  setCclRemarks('');
                  setShowCCLRemarksModal(false);
                }}
                className="px-3 lg:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCCLWorkAction('Forwarded to Principal')}
                className="px-3 lg:px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Forward
              </button>
              <button
                onClick={() => handleCCLWorkAction('Rejected')}
                className="px-3 lg:px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Leave Forward/Reject Remarks Modal */}
      {showRemarksModal && (
        <RemarksModal
          show={showRemarksModal}
          onClose={() => setShowRemarksModal(false)}
          onSubmit={handleRemarksSubmit}
          action={selectedAction}
        />
      )}
    </div>
  );
};

export default HodDashboard;
