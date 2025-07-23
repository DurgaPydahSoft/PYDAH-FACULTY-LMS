import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import HodPasswordResetModal from '../components/HodPasswordResetModal';
import RemarksModal from '../components/RemarksModal';
import PrincipalSidebar from '../components/PrincipalSidebar';
import config from '../config';
import Loading from '../components/Loading';
import { FaUserTie, FaUsers, FaClipboardList, FaArrowRight, FaBuilding } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LeaveDateEditModal from '../components/LeaveDateEditModal';
import { createAuthAxios } from '../utils/authAxios';
import { API_BASE_URL } from '../config';

// const API_BASE_URL = config.API_BASE_URL;

// Add a hook to detect if the screen is mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

const PrincipalDashboard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState({
    branches: true,
    hods: true,
    employees: true,
    leaves: true,
    cclWorkRequests: true
  });
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    branchCode: '',
    HODId: ''
  });
  const [hods, setHods] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]); // Store all employees for client-side filtering
  const [employeeFilters, setEmployeeFilters] = useState({
    search: '',
    department: '',
    status: ''
  });
  const [selectedHod, setSelectedHod] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    department: '',
    status: ''
  });
  const [forwardedLeaves, setForwardedLeaves] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showDateEditModal, setShowDateEditModal] = useState(false);
  const [selectedLeaveForEdit, setSelectedLeaveForEdit] = useState(null);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [cclWorkRequests, setCclWorkRequests] = useState([]);
  const [selectedCCLWork, setSelectedCCLWork] = useState(null);
  const [showCCLRemarksModal, setShowCCLRemarksModal] = useState(false);
  const [cclRemarks, setCclRemarks] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showLeaveDetailsModal, setShowLeaveDetailsModal] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', code: '' });
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
  const [showEditBranchModal, setShowEditBranchModal] = useState(false);
  const [editBranchData, setEditBranchData] = useState({ _id: '', name: '', code: '' });
  const [deleteBranchId, setDeleteBranchId] = useState(null);
  const [showDeleteBranchModal, setShowDeleteBranchModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editEmployeeForm, setEditEmployeeForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    department: '',
    status: 'active',
    specialPermission: false,
    specialLeaveMaxDays: 20
  });
  const [leaveFilters, setLeaveFilters] = useState({
    startDate: '',
    endDate: '',
    department: '',
    status: 'Forwarded by HOD'
  });
  const [cclFilters, setCclFilters] = useState({
    startDate: '',
    endDate: '',
    department: '',
    status: 'Forwarded to Principal'
  });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  // Add state for pagination in the PrincipalDashboard component
  const [leavePage, setLeavePage] = useState(1);
  const LEAVES_PER_PAGE = 15;
  const [isSubmittingRemarks, setIsSubmittingRemarks] = useState(false);
  const [cclStatusFilter, setCclStatusFilter] = useState('');
  const [filteredCCLWorkRequests, setFilteredCCLWorkRequests] = useState([]);
  // 1. Add state for modal and options
  const [showExportModal, setShowExportModal] = useState(false);
  const isInitialLoad = useRef(true);
  const [exportIncludeCCL, setExportIncludeCCL] = useState(true);
  const [exportIncludeSummary, setExportIncludeSummary] = useState(true);

  const { campus } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token) {
      console.error('No user data or token found');
      navigate('/');
      return;
    }

    // Validate campus from URL matches user's campus
    const urlCampus = campus.toLowerCase();
    const userCampus = user.campus.toLowerCase();
    
    console.log('Campus validation:', {
      urlCampus,
      userCampus,
      matches: urlCampus === userCampus
    });

    if (urlCampus !== userCampus) {
      console.error('Campus mismatch:', { urlCampus, userCampus });
      navigate('/');
      return;
    }

    // Set authorization header for all requests
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Fetch initial data
    const fetchData = async () => {
      console.log('Starting initial data fetch...');
      try {
        await Promise.all([
          fetchBranches(),
          fetchHods(),
          fetchEmployees(),
          fetchForwardedLeaves(),
          fetchCCLWorkRequests()
        ]);
        // Reset initial load flag after data is loaded
        isInitialLoad.current = false;
        console.log('Initial data fetch completed, isInitialLoad set to false');
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, [campus, navigate]); // Only depend on campus and navigate

  const fetchBranches = async () => {
    try {
      setLoading(prev => ({ ...prev, branches: true }));
      const response = await axiosInstance.get('/principal/branches');
      console.log('Branches response:', {
        data: response.data,
        hasBranches: !!response.data.branches,
        isArray: Array.isArray(response.data),
        length: response.data.branches?.length || (Array.isArray(response.data) ? response.data.length : 0),
        status: response.status,
        statusText: response.statusText
      });
      
      if (response.data.branches) {
        setBranches(response.data.branches);
        console.log('Updated branches from branches property:', response.data.branches.length);
      } else if (Array.isArray(response.data)) {
        setBranches(response.data);
        console.log('Updated branches from array:', response.data.length);
      } else {
        console.error('Unexpected branches response format:', response.data);
        setBranches([]);
      }
    } catch (error) {
      console.error('Error fetching branches:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      toast.error('Failed to fetch branches');
      setBranches([]);
    } finally {
      setLoading(prev => ({ ...prev, branches: false }));
    }
  };

  const fetchHods = async () => {
    try {
      setLoading(prev => ({ ...prev, hods: true }));
      const response = await axiosInstance.get('/principal/hods');
      console.log('HODs response:', response.data);
      if (Array.isArray(response.data)) {
        setHods(response.data);
      }
    } catch (error) {
      console.error('Error fetching HODs:', error.response?.data || error.message);
      toast.error('Failed to fetch HODs');
    } finally {
      setLoading(prev => ({ ...prev, hods: false }));
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(prev => ({ ...prev, employees: true }));
      
      // Always fetch all employees first
      const response = await axiosInstance.get('/principal/employees');
      console.log('All employees response:', {
        data: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        status: response.status
      });
      
      if (Array.isArray(response.data)) {
        setAllEmployees(response.data);
        applyEmployeeFilters(response.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  };

  const applyEmployeeFilters = (employeeData = allEmployees) => {
    console.log('applyEmployeeFilters called with:', {
      employeeDataLength: employeeData.length,
      filters: employeeFilters
    });
    
    // Apply client-side filtering
    let filteredEmployees = [...employeeData];
    
    // Debug: Log first employee to see field structure
    if (employeeData.length > 0) {
      console.log('First employee structure:', employeeData[0]);
    }
    
    // Apply search filter
    if (employeeFilters.search) {
      const searchTerm = employeeFilters.search.toLowerCase();
      filteredEmployees = filteredEmployees.filter(emp => 
        emp.name?.toLowerCase().includes(searchTerm) ||
        emp.email?.toLowerCase().includes(searchTerm) ||
        emp.employeeId?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply department filter
    if (employeeFilters.department) {
      console.log('Applying department filter for:', employeeFilters.department);
      const beforeFilter = filteredEmployees.length;
      filteredEmployees = filteredEmployees.filter(emp => {
        const empDept = emp.branchCode || emp.department;
        const matches = empDept === employeeFilters.department;
        console.log('Employee department comparison:', {
          employee: emp.name,
          empDept,
          filterDept: employeeFilters.department,
          matches
        });
        return matches;
      });
      console.log(`Department filter: ${beforeFilter} -> ${filteredEmployees.length} employees`);
    }
    
    // Apply status filter
    if (employeeFilters.status) {
      filteredEmployees = filteredEmployees.filter(emp => 
        emp.status === employeeFilters.status
      );
    }
    
    console.log('Filtered employees:', {
      total: employeeData.length,
      filtered: filteredEmployees.length,
      filters: employeeFilters
    });
    
    console.log('Setting employees state with:', filteredEmployees.length, 'employees');
    setEmployees(filteredEmployees);
  };

  const fetchForwardedLeaves = async (filters = {}) => {
    console.log('fetchForwardedLeaves called with filters:', filters);
    try {
      setLoading(prev => ({ ...prev, leaves: true }));
      
      // Build query parameters for filtering
      const queryParams = new URLSearchParams();
      if (filters.department) queryParams.append('department', filters.department);
      if (filters.leaveType) queryParams.append('leaveType', filters.leaveType);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      const url = `/principal/campus-leaves${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('Fetching leaves with URL:', url);
      
      const response = await axiosInstance.get(url);
      console.log('Leaves response:', response.data);
      
      // Debug: Check for modification data in the response
      if (Array.isArray(response.data)) {
        const modifiedLeaves = response.data.filter(leave => leave.originalStartDate && leave.originalEndDate);
        console.log('Modified leaves found:', modifiedLeaves.length);
        modifiedLeaves.forEach(leave => {
          console.log('Modified leave details:', {
            id: leave._id,
            originalStartDate: leave.originalStartDate,
            originalEndDate: leave.originalEndDate,
            startDate: leave.startDate,
            endDate: leave.endDate,
            status: leave.status
          });
        });
        
        setForwardedLeaves(response.data);
        console.log('Set forwardedLeaves with', response.data.length, 'items');
      }
    } catch (error) {
      console.error('Error fetching leaves:', error.response?.data || error.message);
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(prev => ({ ...prev, leaves: false }));
    }
  };

  const fetchCCLWorkRequests = async () => {
    try {
      setLoading(prev => ({ ...prev, cclWorkRequests: true }));
      const response = await axiosInstance.get('/principal/ccl-work-requests');
      console.log('CCL Work Requests response:', response.data);
      if (response.data.success && Array.isArray(response.data.data)) {
        setCclWorkRequests(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching CCL work requests:', error.response?.data || error.message);
      toast.error('Failed to fetch CCL work requests');
    } finally {
      setLoading(prev => ({ ...prev, cclWorkRequests: false }));
    }
  };

  const handleLeaveAction = async (action) => {
    if (!selectedLeave) return;

    try {
      console.log('Updating leave request:', {
        leaveId: selectedLeave._id,
        action,
        remarks,
        token: token ? 'Present' : 'Missing',
        campus
      });

      const response = await axiosInstance.put(
        `/principal/leave-request/${selectedLeave._id}`,
        {
          action: action.toLowerCase() === "approved" ? "approve" : "reject",
          remarks: remarks || `${action.toLowerCase()} by Principal`
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.status === 200) {
        toast.success(`Leave request ${action.toLowerCase()} successfully`);
        // Update the local state
        setForwardedLeaves(prev => 
          prev.map(leave => 
            leave._id === selectedLeave._id 
              ? { 
                  ...leave, 
                  status: action,
                  principalRemarks: remarks || `${action.toLowerCase()} by Principal`,
                  principalApprovalDate: new Date().toISOString()
                } 
              : leave
          )
        );
        setSelectedLeave(null);
        setRemarks('');
        // Refresh the leave requests
        fetchForwardedLeaves();
      }
    } catch (error) {
      console.error('Error updating leave request:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        leaveId: selectedLeave._id,
        action,
        campus
      });
      toast.error(error.response?.data?.msg || 'Failed to update leave request');
    }
  };

  const handleCreateHOD = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Get campus type with proper capitalization
    const campusType = campus.charAt(0).toUpperCase() + campus.slice(1);

    try {
      // Find the selected branch from branches array
      const selectedBranch = branches.find(branch => branch.code === formData.branchCode);
      if (!selectedBranch) {
        throw new Error('Invalid branch selected');
      }

      await axiosInstance.post(
        `/principal/hods`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          HODId: formData.HODId || formData.email.toLowerCase(), // Use email as fallback
          department: {
            name: selectedBranch.name,
            code: formData.branchCode,
            campusType: campusType
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success('HOD created successfully');
      setShowCreateModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        branchCode: '',
        HODId: ''
      });
      fetchHods(); // Refresh the HOD list
    } catch (error) {
      console.error('Create HOD Error:', error.response || error);
      const errorMsg = error.response?.data?.msg || 'Failed to create HOD';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (hod) => {
    setSelectedHod(hod);
    setEditForm({
      name: hod.name,
      email: hod.email,
      phoneNumber: hod.phoneNumber || '',
      department: hod.department?.code || hod.branchCode || '',
      status: hod.status || (hod.isActive ? 'active' : 'inactive')
    });
    setShowEditModal(true);
  };

  // Helper to check if edit form is dirty and valid
  const isEditFormDirty = selectedHod && (
    editForm.name !== selectedHod.name ||
    editForm.email !== selectedHod.email ||
    editForm.phoneNumber !== (selectedHod.phoneNumber || '') ||
    editForm.department !== (selectedHod.department?.code || selectedHod.branchCode || '') ||
    editForm.status !== (selectedHod.status || (selectedHod.isActive ? 'active' : 'inactive'))
  );
  const isEditFormDepartmentValid = branches.some(b => b.code === editForm.department);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!isEditFormDirty || !isEditFormDepartmentValid) return;
    try {
      // Build update payload
      const updatePayload = {
        name: editForm.name,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber,
        status: editForm.status
      };
      // Only include department if it has changed and is valid
      if (
        editForm.department !== (selectedHod.department?.code || selectedHod.branchCode || '') &&
        branches.some(b => b.code === editForm.department)
      ) {
        const branch = branches.find(b => b.code === editForm.department);
        updatePayload.department = {
          name: branch.name,
          code: branch.code,
          campusType: campus.charAt(0).toUpperCase() + campus.slice(1)
        };
      }
      const response = await axiosInstance.put(
        `/principal/hods/${selectedHod._id}?model=${selectedHod.model}`,
        updatePayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Update hods list
      setHods(hods.map(hod => 
        hod._id === selectedHod._id 
          ? { ...response.data.hod, model: selectedHod.model }
          : hod
      ));

      setShowEditModal(false);
      toast.success('HOD details updated successfully');
    } catch (error) {
      console.error('Error updating HOD:', error);
      toast.error(error.response?.data?.msg || 'Failed to update HOD');
    }
  };

  const handleResetPassword = (hod) => {
    setSelectedHod(hod);
    setShowPasswordResetModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('campus');
    setShouldRedirect(true);
  };

  const handleAction = (requestId, action) => {
    const leave = forwardedLeaves.find(l => l._id === requestId);
    if (leave) {
      setSelectedLeaveForEdit(leave);
      setShowDateEditModal(true);
    }
  };

  const handleApproveWithDates = async (requestData) => {
    try {
      const token = localStorage.getItem('token');
      const authAxios = createAuthAxios(token);
      const response = await authAxios.put(`${API_BASE_URL}/principal/leave-request/${selectedLeaveForEdit._id}`, requestData);
      
      if (response.status === 200) {
        // Update the local state
        setForwardedLeaves(prev => prev.filter(leave => leave._id !== selectedLeaveForEdit._id));
        
        // Show success message
        alert('Leave request approved successfully!');
        
        // Refresh the data
        fetchForwardedLeaves();
      }
    } catch (error) {
      console.error('Error approving leave request:', error);
      alert(error.response?.data?.msg || 'Error approving leave request');
    }
  };

  const handleRejectWithDates = async (requestData) => {
    try {
      const token = localStorage.getItem('token');
      const authAxios = createAuthAxios(token);
      const response = await authAxios.put(`${API_BASE_URL}/principal/leave-request/${selectedLeaveForEdit._id}`, requestData);
      
      if (response.status === 200) {
        // Update the local state
        setForwardedLeaves(prev => prev.filter(leave => leave._id !== selectedLeaveForEdit._id));
        
        // Show success message
        alert('Leave request rejected successfully!');
        
        // Refresh the data
        fetchForwardedLeaves();
      }
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      alert(error.response?.data?.msg || 'Error rejecting leave request');
    }
  };

  const handleRemarksSubmit = async (remarks) => {
    if (!selectedRequestId || !selectedAction) {
      console.error('Missing required data:', { selectedRequestId, selectedAction });
      return;
    }

    try {
      // Get fresh token from localStorage
      const freshToken = localStorage.getItem('token');
      if (!freshToken) {
        console.error('No token found in localStorage');
        toast.error('Authentication token missing. Please login again.');
        setShouldRedirect(true);
        return;
      }

      console.log('Submitting remarks:', {
        requestId: selectedRequestId,
        action: selectedAction,
        remarks,
        token: freshToken ? 'Present' : 'Missing',
        tokenLength: freshToken ? freshToken.length : 0,
        tokenStart: freshToken ? freshToken.substring(0, 20) + '...' : 'None',
        campus
      });

      const response = await axiosInstance.put(
        `/principal/leave-request/${selectedRequestId}`,
        {
          action: selectedAction,
          remarks: remarks || `${selectedAction === 'approve' ? 'Approved' : 'Rejected'} by Principal`
        }
      );

      if (response.data) {
        // Update the leave request in the state
        setForwardedLeaves(prev => 
          prev.map(leave => 
            leave._id === selectedRequestId 
              ? { 
                  ...leave, 
                  status: selectedAction === 'approve' ? 'Approved' : 'Rejected',
                  principalRemarks: remarks || `${selectedAction === 'approve' ? 'Approved' : 'Rejected'} by Principal`,
                  principalApprovalDate: new Date().toISOString()
                } 
              : leave
          )
        );

        setSelectedRequestId(null);
        setSelectedAction(null);
        setShowRemarksModal(false);
        setRefreshTrigger(prev => !prev);
        toast.success(response.data.msg || 'Leave request updated successfully');
      }
    } catch (error) {
      console.error('Error updating leave request:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        requestId: selectedRequestId,
        action: selectedAction,
        campus
      });
      
      if (error.response?.status === 403) {
        toast.error('You are not authorized to update this leave request. Please check your campus permissions.');
      } else if (error.response?.status === 401) {
        toast.error('Your session has expired. Please login again.');
        setShouldRedirect(true);
      } else {
        toast.error(error.response?.data?.msg || 'Failed to update leave request');
      }
    }
  };

  // Handle CCL work request action
  const handleCCLWorkAction = async (status) => {
    try {
      if (!selectedCCLWork) return;

      console.log('Updating CCL work request:', {
        requestId: selectedCCLWork._id,
        status,
        remarks: cclRemarks || `${status} by Principal`
      });

      const response = await axiosInstance.put(
        `/principal/ccl-work-requests/${selectedCCLWork._id}`,
        {
          status,
          remarks: cclRemarks || `${status} by Principal`
        }
      );

      console.log('CCL work request update response:', response.data);

      if (response.data.success) {
        // Update the CCL work request in the state
        setCclWorkRequests(prev =>
          prev.map(work =>
            work._id === selectedCCLWork._id
              ? response.data.data
              : work
          )
        );

        setSelectedCCLWork(null);
        setCclRemarks('');
        setShowCCLRemarksModal(false);
        toast.success(response.data.message || 'CCL work request updated successfully');
      } else {
        toast.error(response.data.message || 'Failed to update CCL work request');
      }
    } catch (error) {
      console.error('Error updating CCL work request:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(error.response?.data?.message || 'Failed to update CCL work request');
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post(
        `/principal/branches`,
        newBranch,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Branch created successfully');
      setNewBranch({ name: '', code: '' });
      fetchBranches(); // Refresh the branches list
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to create branch');
    }
  };

  const handleEditBranchClick = (branch) => {
    setEditBranchData({ _id: branch._id, name: branch.name, code: branch.code });
    setShowEditBranchModal(true);
  };

  const handleEditBranchSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.put(
        `/principal/branches/${editBranchData._id}`,
        { name: editBranchData.name, code: editBranchData.code },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Branch updated successfully');
      setShowEditBranchModal(false);
      setEditBranchData({ _id: '', name: '', code: '' });
      fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to update branch');
    }
  };

  const handleDeleteBranchClick = (branchId) => {
    setDeleteBranchId(branchId);
    setShowDeleteBranchModal(true);
  };

  const handleDeleteBranchConfirm = async () => {
    if (!deleteBranchId) return;
    try {
      await axiosInstance.delete(
        `/principal/branches/${deleteBranchId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Branch deleted successfully');
      setShowDeleteBranchModal(false);
      setDeleteBranchId(null);
      fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to delete branch');
    }
  };

  const handleEditEmployeeClick = (employeeOrId) => {
    // Accept either an employee object or an ID
    const id = typeof employeeOrId === 'string' ? employeeOrId : employeeOrId._id;
    const employee = employees.find(emp => emp._id === id);
    if (!employee) {
      toast.error('Employee not found in the latest list.');
      return;
    }
    setEditingEmployee(employee);
    setEditEmployeeForm({
      name: employee.name,
      email: employee.email,
      phoneNumber: employee.phoneNumber,
      department: employee.department,
      status: employee.status,
      specialPermission: Boolean(employee.specialPermission),
      specialLeaveMaxDays: employee.specialLeaveMaxDays !== undefined
        ? employee.specialLeaveMaxDays
        : (employee.specialMaxDays !== undefined
          ? employee.specialMaxDays
          : 20)
    });
  };

  const handleEditEmployeeSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      // Ensure specialPermission is a boolean and specialLeaveMaxDays is a number
      const payload = {
        ...editEmployeeForm,
        specialPermission: Boolean(editEmployeeForm.specialPermission),
        specialLeaveMaxDays: editEmployeeForm.specialPermission ? Number(editEmployeeForm.specialLeaveMaxDays) : undefined
      };

      console.log('Submitting employee update:', payload);

      const response = await fetch(`${API_BASE_URL}/principal/employees/${editingEmployee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Failed to update employee');
      }

      const updatedEmployee = await response.json();
      console.log('Employee update response:', updatedEmployee);

      toast.success('Employee updated successfully');
      await fetchEmployees(); // Refresh the employees list with the latest data
      setEditingEmployee(null);
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error(error.message || 'Failed to update employee');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        // Calculate active/inactive HODs from hods array
        const totalHODs = hods.length;
        const activeHODs = hods.filter(h => h.status === 'active' || h.isActive).length;
        const inactiveHODs = totalHODs - activeHODs;
        const totalEmployees = employees.length;
        return (
          <div className="p-6 mt-4">
            <h2 className="text-2xl font-bold text-primary mb-6">Dashboard Analytics</h2>
            <div className="space-y-6">
              {/* Analytics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Total HODs */}
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
                  <FaUserTie className="text-primary text-3xl mb-2" />
                  <h3 className="text-lg font-semibold text-primary mb-1">Total HODs</h3>
                  <p className="text-3xl font-bold">{totalHODs}</p>
                  <div className="flex gap-2 text-xs mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">Active: {activeHODs}</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800">Inactive: {inactiveHODs}</span>
                  </div>
                </div>
                {/* Total Employees */}
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
                  <FaUsers className="text-blue-600 text-3xl mb-2" />
                  <h3 className="text-lg font-semibold text-primary mb-1">Total Employees</h3>
                  <p className="text-3xl font-bold">{totalEmployees}</p>
                </div>
                {/* Pending Leave Requests */}
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
                  <FaClipboardList className="text-yellow-500 text-3xl mb-2" />
                  <h3 className="text-lg font-semibold text-primary mb-1">Pending Leaves</h3>
                  {loading.leaves ? (
                    <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
                  ) : error ? (
                    <p className="text-red-500">Error loading data</p>
                  ) : (
                    <>
                      <p className="text-3xl font-bold">{forwardedLeaves.filter(leave => leave.status === 'Forwarded by HOD').length}</p>
                      <span className="text-sm text-gray-500">Forwarded by HOD</span>
                    </>
                  )}
                </div>
                {/* Departments & Branches */}
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
                  <FaBuilding className="text-purple-600 text-3xl mb-2" />
                  <h3 className="text-lg font-semibold text-primary mb-1">Departments</h3>
                  {loading.branches ? (
                    <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
                  ) : error ? (
                    <p className="text-red-500">Error loading data</p>
                  ) : (
                    <>
                      <p className="text-3xl font-bold">{branches.length}</p>
                      <span className="text-sm text-gray-500">Total Branches</span>
                      {/* <div className="flex flex-wrap gap-1 mt-2 justify-center">
                        {branches.slice(0, 3).map(dep => (
                          <span key={dep.code || dep._id} className="inline-block bg-gray-100 text-gray-700 rounded-full px-2 py-1 text-xs font-medium">
                            {dep.code || dep.name}: HOD Assigned
                          </span>
                        ))}
                        {branches.length > 3 && (
                          <span className="inline-block bg-gray-200 text-gray-600 rounded-full px-2 py-1 text-xs font-medium">
                            +{branches.length - 3} more
                          </span>
                        )}
                      </div> */}
                    </>
                  )}
                </div>
              </div>

              

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Leave Requests */}
                <div className="bg-white rounded-xl shadow p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-primary text-lg">Recent Leave Requests</div>
                    <button className="text-xs text-blue-600 hover:underline" onClick={() => setActiveSection('leaves')}>View All</button>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {(forwardedLeaves.slice(0,5)).map(leave => (
                      <li key={leave._id} className="py-2 flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded transition" onClick={() => handleRecentLeaveClick(leave._id)}>
                        <span className="font-mono text-primary text-xs">{leave.leaveRequestId}</span>
                        <span className="flex-1 truncate">{leave.employee?.name || leave.employeeName}</span>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' : leave.status === 'Rejected' ? 'bg-red-100 text-red-800' : leave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{leave.status || 'N/A'}</span>
                        <FaArrowRight className="text-gray-400 ml-2" />
                      </li>
                    ))}
                    {forwardedLeaves.length === 0 && <li className="text-gray-400 text-sm py-4 text-center">No recent leave requests</li>}
                  </ul>
                </div>
                {/* Recent CCL Work Requests */}
                <div className="bg-white rounded-xl shadow p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-primary text-lg">Recent CCL Work Requests</div>
                    <button className="text-xs text-blue-600 hover:underline" onClick={() => setActiveSection('ccl-work')}>View All</button>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {(cclWorkRequests.slice(0,5)).map(work => (
                      <li key={work._id} className="py-2 flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded transition" onClick={() => handleRecentCCLClick(work._id)}>
                        <span className="font-mono text-primary text-xs">{work.employeeEmployeeId || work.employeeId || 'N/A'}</span>
                        <span className="flex-1 truncate">{work.employeeName || 'Unknown'}</span>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${work.status === 'Approved' ? 'bg-green-100 text-green-800' : work.status === 'Rejected' ? 'bg-red-100 text-red-800' : work.status === 'Forwarded to Principal' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{work.status || 'N/A'}</span>
                        <FaArrowRight className="text-gray-400 ml-2" />
                      </li>
                    ))}
                    {cclWorkRequests.length === 0 && <li className="text-gray-400 text-sm py-4 text-center">No recent CCL work requests</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'hods':
        return (
          <div className="p-4 md:p-6 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-primary">HOD Management</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full md:w-auto bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create HOD
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {/* Table for md+ screens */}
              <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {hods.map((hod) => (
                      <tr key={hod._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-semibold text-lg">
                                {hod.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{hod.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{hod.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="group relative">
                            <span className="text-sm text-gray-900">{hod.department?.code || hod.branchCode || 'Unknown'}</span>
                            <div className="hidden group-hover:block absolute z-10 bg-gray-900 text-white text-xs rounded py-1 px-2 left-0 -bottom-8 whitespace-nowrap">
                              {branches.find(b => b.code === (hod.department?.code || hod.branchCode))?.name || hod.department?.name || 'Unknown'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{hod.phoneNumber || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold
                            ${(hod.status === 'active' || hod.isActive)
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'}`}
                          >
                            {hod.status || (hod.isActive ? 'Active' : 'Inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEditClick(hod)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleResetPassword(hod)}
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

              {/* Card layout for small screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 md:hidden">
                {hods.map((hod) => (
                  <div key={hod._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold text-xl">
                            {hod.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{hod.name}</h3>
                          <p className="text-sm text-gray-500">{hod.email}</p>
                        </div>
                      </div>
                      
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" clipRule="evenodd" />
                        </svg>
                        
                        <span className="ml-1">{branches.find(b => b.code === (hod.department?.code || hod.branchCode))?.name || hod.department?.name || hod.department?.code || hod.branchCode || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        <span className="font-medium">Phone:</span>
                        <span className="ml-1">{hod.phoneNumber || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(hod)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleResetPassword(hod)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Reset Password
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'branches':
        return (
          <div className="p-6 mt-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary">Branch Management</h2>
              <button
                onClick={() => setShowCreateBranchModal(true)}
                className="bg-primary text-white px-4 py-2 rounded-neumorphic hover:shadow-innerSoft transition-all duration-300"
              >
                Create Branch
              </button>
            </div>
            <div className="bg-secondary rounded-neumorphic shadow-outerRaised p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Branch Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Branch Code</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">HOD</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {branches.map((branch) => (
                      <tr key={branch._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{branch.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{branch.code}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold
                            ${branch.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {branch.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {branch.hodId ? (
                            hods.find(hod => hod._id === branch.hodId)?.name || 'N/A'
                          ) : 'No HOD Assigned'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleEditBranchClick(branch)}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBranchClick(branch._id)}
                            className="bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600 transition-colors ml-2"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Edit Branch Modal */}
            {showEditBranchModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold text-primary mb-4">Edit Branch</h3>
                  <form onSubmit={handleEditBranchSubmit} className="space-y-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Branch Name</label>
                      <input
                        type="text"
                        value={editBranchData.name}
                        onChange={e => setEditBranchData({ ...editBranchData, name: e.target.value })}
                        className="w-full p-2 rounded-neumorphic shadow-innerSoft bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Branch Code</label>
                      <input
                        type="text"
                        value={editBranchData.code}
                        onChange={e => setEditBranchData({ ...editBranchData, code: e.target.value })}
                        className="w-full p-2 rounded-neumorphic shadow-innerSoft bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowEditBranchModal(false)} className="bg-gray-500 text-white px-3 py-2 rounded-neumorphic">Cancel</button>
                      <button type="submit" className="bg-primary text-white px-4 py-2 rounded-neumorphic hover:shadow-innerSoft transition-all duration-300">Save Changes</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {/* Delete Branch Modal */}
            {showDeleteBranchModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold text-primary mb-4">Delete Branch</h3>
                  <p>Are you sure you want to delete this branch? This action cannot be undone.</p>
                  <div className="flex justify-end gap-2 mt-6">
                    <button type="button" onClick={() => setShowDeleteBranchModal(false)} className="bg-gray-500 text-white px-3 py-2 rounded-neumorphic">Cancel</button>
                    <button type="button" onClick={handleDeleteBranchConfirm} className="bg-red-600 text-white px-4 py-2 rounded-neumorphic hover:shadow-innerSoft transition-all duration-300">Delete</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'employees':
        return (
          <div className="p-6 mt-4">
            <h2 className="text-2xl font-bold text-primary mb-6">Employee Management</h2>
            <div className="bg-secondary rounded-neumorphic shadow-outerRaised p-6">

              {/* Employee filters */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                  <input
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    value={employeeFilters.search}
                    onChange={(e) => {
                      console.log('Search filter changed to:', e.target.value);
                      setEmployeeFilters({ ...employeeFilters, search: e.target.value });
                    }}
                    className="p-2 rounded-neumorphic shadow-innerSoft bg-background"
                  />
                  <select
                    value={employeeFilters.department}
                    onChange={(e) => {
                      console.log('Department filter changed to:', e.target.value);
                      setEmployeeFilters({ ...employeeFilters, department: e.target.value });
                    }}
                    className="p-2 rounded-neumorphic shadow-innerSoft bg-background"
                  >
                    <option value="">All Departments</option>
                    {branches && branches.length > 0 ? (
                      branches.map((branch) => (
                        <option key={branch.code} value={branch.code}>{branch.name}</option>
                      ))
                    ) : (
                      <option value="" disabled>Loading departments...</option>
                    )}
                  </select>
                  <select
                    value={employeeFilters.status}
                    onChange={(e) => {
                      console.log('Status filter changed to:', e.target.value);
                      setEmployeeFilters({ ...employeeFilters, status: e.target.value });
                    }}
                    className="p-2 rounded-neumorphic shadow-innerSoft bg-background"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                {(employeeFilters.search || employeeFilters.department || employeeFilters.status) && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setEmployeeFilters({ search: '', department: '', status: '' })}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Employee list: Table only on md+ screens */}
              <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full bg-white rounded-lg overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Employee ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Designation</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {employees.map((employee) => (
                      <tr key={employee._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{employee.employeeId}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{employee.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{employee.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="group relative">
                            <span>{employee.branchCode || employee.department}</span>
                            <div className="hidden group-hover:block absolute z-10 bg-black text-white text-xs rounded py-1 px-2 left-0 -bottom-8">
                              {branches.find(b => b.code === (employee.branchCode || employee.department))?.name || employee.department}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{employee.phoneNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold
                            ${employee.status === 'active'
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'}`}
                          >
                            {employee.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleEditEmployeeClick(employee)}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-600 transition-colors"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Employee Cards Section: always visible, only show on mobile (block on mobile, hidden on md+) */}
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:hidden">
                {employees.map((employee) => (
                  <div
                    key={employee._id}
                    className="bg-white rounded-xl shadow p-4 flex flex-col items-center cursor-pointer hover:shadow-lg transition"
                    onClick={() => handleEditEmployeeClick(employee)}
                    title={`Edit ${employee.name}`}
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-primary mb-2 flex items-center justify-center">
                      {employee.profilePicture ? (
                        <img
                          src={employee.profilePicture}
                          alt={employee.name}
                          className="w-full h-full object-cover"
                          onError={e => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentNode.querySelector('svg').style.display = 'block'; }}
                          style={{ display: 'block' }}
                        />
                      ) : null}
                      <svg
                        className="w-12 h-12 text-gray-300 absolute"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ display: employee.profilePicture ? 'none' : 'block' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-800 truncate w-20">{employee.name}</div>
                      <div className="text-xs text-gray-500 truncate w-20">{employee.employeeId}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'leaves':
        // Apply client-side filtering for status and combine with backend-filtered data
        const filteredLeaves = forwardedLeaves.filter(leave => {
          // Apply status filter (client-side only)
          if (leaveFilters.status && leaveFilters.status !== 'All') {
            if (leave.status !== leaveFilters.status) {
              return false;
            }
          }
          return true;
        });

        // Calculate paginated leaves and CCLs
        const allLeaveRows = [
          ...filteredLeaves.map(leave => ({ ...leave, _isLeave: true })),
          ...cclWorkRequests.map(ccl => ({ ...ccl, _isLeave: false }))
        ];
        const totalLeavePages = Math.ceil(allLeaveRows.length / LEAVES_PER_PAGE) || 1;
        const paginatedLeaveRows = allLeaveRows.slice((leavePage - 1) * LEAVES_PER_PAGE, leavePage * LEAVES_PER_PAGE);
        return (
          <div className="p-6 mt-4 ">
            <h2 className="text-2xl font-bold text-primary mb-6">Leave Requests</h2>
            {/* Print Button for Approved Requests */}
            <div className="flex justify-end mb-4 gap-2">
              <button
                className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary-dark transition"
                onClick={handlePrintFilteredRequests}
              >
                Print Filtered Requests
              </button>
              <button
                className="bg-orange-600 text-white px-4 py-2 rounded shadow hover:bg-orange-700 transition"
                onClick={() => setShowExportModal(true)}
              >
                Export to PDF
              </button>
            </div>
            <div className="bg-secondary rounded-neumorphic shadow-outerRaised p-6">
              {/* Filter UI for leaves */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={leaveFilters.startDate}
                      onChange={e => setLeaveFilters({ ...leaveFilters, startDate: e.target.value })}
                      className="w-full p-2 rounded-neumorphic shadow-innerSoft bg-background border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={leaveFilters.endDate}
                      onChange={e => setLeaveFilters({ ...leaveFilters, endDate: e.target.value })}
                      className="w-full p-2 rounded-neumorphic shadow-innerSoft bg-background border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                      value={leaveFilters.department}
                      onChange={e => setLeaveFilters({ ...leaveFilters, department: e.target.value })}
                      className="w-full p-2 rounded-neumorphic shadow-innerSoft bg-background border border-gray-300"
                    >
                      <option value="">All Departments</option>
                      {branches.map(branch => (
                        <option key={branch.code} value={branch.code}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={leaveFilters.status}
                      onChange={e => setLeaveFilters({ ...leaveFilters, status: e.target.value })}
                      className="w-full p-2 rounded-neumorphic shadow-innerSoft bg-background border border-gray-300"
                    >
                      <option value="Forwarded by HOD">Forwarded by HOD</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="All">All Status</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={clearLeaveFilters}
                    className="bg-gray-500 text-white px-4 py-2 rounded shadow hover:bg-gray-600 transition"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
              {/* Responsive Table for md+ screens, Cards for small screens */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Request ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Emp ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Leave Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Dates</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* Leave Request List View */}
                    {paginatedLeaveRows.map((row) => {
                      if (row._isLeave) {
                        console.log('Leave request row:', {
                          id: row._id,
                          originalStartDate: row.originalStartDate,
                          originalEndDate: row.originalEndDate,
                          startDate: row.startDate,
                          endDate: row.endDate,
                          isModified: row.originalStartDate && row.originalEndDate
                        });
                        return (
                          <tr key={row._id} className={`${row.originalStartDate && row.originalEndDate ? 'bg-yellow-50' : ''} border-b hover:bg-gray-50`}>
                        <td className="px-4 py-3 font-mono text-primary">{row.leaveRequestId}</td>
                        <td className="px-4 py-3">{row.employee?.name || row.employeeName || 'Unknown'}</td>
                        <td className="px-4 py-3">{row.employee?.employeeId || row.employeeEmployeeId || 'N/A'}</td>
                        <td className="px-4 py-3">{row.type ? row.type.charAt(0).toUpperCase() + row.type.slice(1) : row.leaveType ? row.leaveType.charAt(0).toUpperCase() + row.leaveType.slice(1) : 'N/A'}</td>
                        <td className="px-4 py-3">
                              {row.isModifiedByPrincipal ? (
                                <div>
                                  <div className="line-through text-gray-500">
                                    {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
                                  </div>
                                  <div className="text-green-600 font-medium">
                                    {new Date(row.approvedStartDate).toLocaleDateString()} - {new Date(row.approvedEndDate).toLocaleDateString()}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                            ${row.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              row.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              row.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'}`}
                          >
                            {row.status || 'N/A'}
                          </span>
                                {row.originalStartDate && row.originalEndDate && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    Modified
                                  </span>
                                )}
                              </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="bg-primary text-white px-3 py-1 rounded-md text-xs hover:bg-primary-dark transition-colors"
                            onClick={() => {
                              setSelectedLeave(row);
                              setShowLeaveDetailsModal(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                        );
                      } else {
                        // CCL Work Request
                        return (
                      <tr key={row._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-primary">{row.cclRequestId || `CCL${new Date(row.date).getFullYear()}${row.employeeDepartment?.substring(0, 3).toUpperCase()}${row._id.toString().slice(-4)}`}</td>
                        <td className="px-4 py-3">{row.employeeName || 'Unknown'}</td>
                        <td className="px-4 py-3">{row.employeeEmployeeId || 'N/A'}</td>
                        <td className="px-4 py-3">CCL Work</td>
                        <td className="px-4 py-3">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                            ${row.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              row.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              row.status === 'Forwarded to Principal' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'}`}
                          >
                            {row.status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="bg-primary text-white px-3 py-1 rounded-md text-xs hover:bg-primary-dark transition-colors"
                            onClick={() => {
                              setSelectedCCLWork(row);
                              setShowCCLRemarksModal(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
                {/* Pagination Controls */}
                <div className="flex justify-center items-center gap-2 mt-4">
                  <button
                    className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
                    onClick={() => setLeavePage(p => Math.max(1, p - 1))}
                    disabled={leavePage === 1}
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalLeavePages }, (_, i) => (
                    <button
                      key={i + 1}
                      className={`px-3 py-1 rounded font-semibold ${leavePage === i + 1 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                      onClick={() => setLeavePage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
                    onClick={() => setLeavePage(p => Math.min(totalLeavePages, p + 1))}
                    disabled={leavePage === totalLeavePages}
                  >
                    Next
                  </button>
                </div>
                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-primary mb-2">Summary (Approved Requests)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg overflow-hidden border">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Employee Name</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">CCL Approved</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">OD Approved</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">CL Approved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Build summary from filtered, approved leave and CCL requests
                          const summaryMap = {};
                          // Only consider approved requests
                          allLeaveRows.filter(row => row.status === 'Approved').forEach(row => {
                            // Get employee name
                            const name = row.employeeName || row.employee?.name || 'Unknown';
                            if (!summaryMap[name]) {
                              summaryMap[name] = { CCL: 0, OD: 0, CL: 0 };
                            }
                            // Determine leave type and days
                            let type = row.leaveType || row.type;
                            let days = row.isModifiedByPrincipal ? row.approvedNumberOfDays : row.numberOfDays;
                            if (!type && row._isLeave === false) type = 'CCL'; // fallback for CCL work
                            if (type === 'CCL' || (row._isLeave === false)) summaryMap[name].CCL += Number(days) || 0;
                            else if (type === 'OD') summaryMap[name].OD += Number(days) || 0;
                            else if (type === 'CL') summaryMap[name].CL += Number(days) || 0;
                          });
                          // Sort by employee name
                          const sortedNames = Object.keys(summaryMap).sort();
                          return sortedNames.length === 0 ? (
                            <tr><td colSpan={4} className="text-center text-gray-400 py-4">No approved requests in current filters</td></tr>
                          ) : (
                            sortedNames.map(name => (
                              <tr key={name}>
                                <td className="px-4 py-2">{name}</td>
                                <td className="px-4 py-2">{summaryMap[name].CCL}</td>
                                <td className="px-4 py-2">{summaryMap[name].OD}</td>
                                <td className="px-4 py-2">{summaryMap[name].CL}</td>
                              </tr>
                            ))
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {/* Card layout for small screens */}
              <div className="md:hidden grid grid-cols-1 gap-4">
                {forwardedLeaves.map((leave) => (
                  <div
                    key={leave._id}
                    className="bg-white p-4 rounded-lg shadow-innerSoft border border-gray-100"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-primary text-sm">{leave.leaveRequestId}</span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                        ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          leave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'}`}
                      >
                        {leave.status || 'N/A'}
                      </span>
                    </div>
                    <div className="mb-1 text-sm"><span className="font-semibold">Name:</span> {leave.employee?.name || leave.employeeName || 'Unknown'}</div>
                    <div className="mb-1 text-sm"><span className="font-semibold">Emp ID:</span> {leave.employee?.employeeId || leave.employeeEmployeeId || 'N/A'}</div>
                    <div className="mb-1 text-sm"><span className="font-semibold">Leave Type:</span> {leave.type ? leave.type.charAt(0).toUpperCase() + leave.type.slice(1) : leave.leaveType ? leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1) : 'N/A'}</div>
                    <div className="mb-1 text-sm">
                      <span className="font-semibold">Dates:</span>
                      {leave.originalStartDate && leave.originalEndDate ? (
                        <div>
                          <div className="line-through text-gray-500">
                            {new Date(leave.originalStartDate).toLocaleDateString()} - {new Date(leave.originalEndDate).toLocaleDateString()}
                          </div>
                          <div className="text-green-600 font-medium">
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                          ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                            leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                            leave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'}`}
                        >
                          {leave.status || 'N/A'}
                        </span>
                        {leave.originalStartDate && leave.originalEndDate && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Modified
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="bg-primary text-white px-3 py-1 rounded-md text-xs hover:bg-primary-dark transition-colors"
                          onClick={() => {
                            setSelectedLeave(leave);
                            setShowLeaveDetailsModal(true);
                          }}
                        >
                          View
                        </button>
                        {(leave.status === 'Forwarded by HOD' || leave.status === 'Approved') && (
                          <button
                            className="bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600 transition-colors"
                            onClick={() => {
                              setSelectedRequestId(leave._id);
                              setSelectedAction('reject');
                              setShowRemarksModal(true);
                            }}
                            title={leave.status === 'Approved' ? 'Reject Approved Request' : 'Reject Request'}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave Details Modal */}
            {showLeaveDetailsModal && selectedLeave && (
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
                          <p className="text-gray-600">Request ID</p>
                          <p className="font-mono text-base text-primary">{selectedLeave.leaveRequestId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Leave Type</p>
                          <p className="font-medium text-sm sm:text-base">
                            {selectedLeave.type ? selectedLeave.type.charAt(0).toUpperCase() + selectedLeave.type.slice(1) : selectedLeave.leaveType ? selectedLeave.leaveType.charAt(0).toUpperCase() + selectedLeave.leaveType.slice(1) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          {/* Show original vs approved dates if modified (EmployeeDashboard logic) */}
                          {selectedLeave.isModifiedByPrincipal ? (
                            <div className="col-span-1 sm:col-span-2">
                              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                  <h5 className="font-semibold text-yellow-800">Leave Dates Modified by Principal</h5>
                                </div>
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-sm text-yellow-800">Original Request:</p>
                                    <p className="font-medium text-sm">{new Date(selectedLeave.startDate).toLocaleDateString()} to {new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                                    <p className="text-xs text-yellow-700">({selectedLeave.numberOfDays} days)</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-yellow-800">Approved Dates:</p>
                                    <p className="font-medium text-sm">{new Date(selectedLeave.approvedStartDate).toLocaleDateString()} to {new Date(selectedLeave.approvedEndDate).toLocaleDateString()}</p>
                                    <p className="text-xs text-yellow-700">({selectedLeave.approvedNumberOfDays} days)</p>
                                  </div>
                                  {selectedLeave.principalModificationReason && (
                                    <div>
                                      <p className="text-sm text-yellow-800">Modification Reason:</p>
                                      <p className="text-sm">{selectedLeave.principalModificationReason}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="col-span-1 sm:col-span-2">
                          <p className="text-sm text-gray-600">Duration</p>
                              <p className="font-medium text-sm sm:text-base">{new Date(selectedLeave.startDate).toLocaleDateString()} to {new Date(selectedLeave.endDate).toLocaleDateString()} ({selectedLeave.numberOfDays} days)</p>
                            </div>
                          )}
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
                        {/* Add Modification Details Section */}
                        {selectedLeave.originalStartDate && selectedLeave.originalEndDate && (
                          <div className="col-span-1 sm:col-span-2">
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                              <div className="flex items-center gap-2 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <h5 className="font-semibold text-yellow-800">Leave Dates Modified by Principal</h5>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-sm text-yellow-800">Original Request:</p>
                                  <p className="font-medium text-sm">{new Date(selectedLeave.originalStartDate).toLocaleDateString()} to {new Date(selectedLeave.originalEndDate).toLocaleDateString()}</p>
                                  <p className="text-xs text-yellow-700">({selectedLeave.originalNumberOfDays} days)</p>
                                </div>
                                <div>
                                  <p className="text-sm text-yellow-800">Approved Dates:</p>
                                  <p className="font-medium text-sm">{new Date(selectedLeave.startDate).toLocaleDateString()} to {new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                                  <p className="text-xs text-yellow-700">({selectedLeave.numberOfDays} days)</p>
                                </div>
                                {selectedLeave.modificationReason && (
                                  <div>
                                    <p className="text-sm text-yellow-800">Modification Reason:</p>
                                    <p className="text-sm">{selectedLeave.modificationReason}</p>
                                  </div>
                                )}
                              </div>
                            </div>
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
                    {(selectedLeave.status === 'Forwarded by HOD' || selectedLeave.status === 'Approved') && (
                      <div className="flex justify-end space-x-4 mt-6">
                        {selectedLeave.status === 'Forwarded by HOD' && (
                          <button
                            onClick={() => {
                              setShowLeaveDetailsModal(false);
                              setSelectedLeaveForEdit(selectedLeave);
                              setShowDateEditModal(true);
                            }}
                            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                          >
                            Review & Approve
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowLeaveDetailsModal(false);
                            setSelectedLeaveForEdit(selectedLeave);
                            setShowDateEditModal(true);
                          }}
                          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                        >
                          {selectedLeave.status === 'Approved' ? 'Reject Approved Request' : 'Review & Reject'}
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
          <div className="p-6">
            <h2 className="text-2xl font-bold text-primary mb-6">CCL Work Requests</h2>
            {/* CCL Status Filter */}
            <div className="mb-4 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={cclStatusFilter}
                onChange={(e) => setCclStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* CCL Work Requests List */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {filteredCCLWorkRequests.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No CCL work requests found.
                    </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredCCLWorkRequests.map((request) => (
                    <div key={request._id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.employee?.name || request.employeeName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {request.employee?.employeeId || request.employeeEmployeeId} • {request.employee?.department?.name || request.employeeDepartment}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Work Description:</strong> {request.workDescription}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Duration:</strong> {request.startDate} to {request.endDate} ({request.numberOfDays} days)
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Applied On:</strong> {new Date(request.appliedOn).toLocaleDateString()}
                          </p>
                  </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                            ${request.status === 'approved' ? 'bg-green-100 text-green-800' :
                              request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'}`}
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                          {request.status === 'pending' && (
                            <div className="flex space-x-2">
                      <button
                                onClick={() => handleCCLWorkAction(request._id, 'approved')}
                                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                                onClick={() => handleCCLWorkAction(request._id, 'rejected')}
                                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                        </div>
                      </div>
                </div>
              ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-primary mb-6">Dashboard</h2>
            <p>Select an option from the sidebar to get started.</p>
          </div>
        );
    }
  };

  const fetchDashboardStats = async () => {
    try {
      console.log('Fetching dashboard stats...');
      const response = await axiosInstance.get('/principal/dashboard', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('Dashboard stats response:', response.data);
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to fetch dashboard statistics');
    }
  };



  // Apply employee filters when filters change
  useEffect(() => {
    console.log('Employee filter change detected:', employeeFilters);
    const token = localStorage.getItem('token');
    if (token && allEmployees.length > 0) {
      console.log('Applying employee filters to', allEmployees.length, 'employees');
      applyEmployeeFilters();
    } else {
      console.log('Cannot apply employee filters:', { 
        hasToken: !!token, 
        allEmployeesLength: allEmployees.length 
      });
    }
  }, [employeeFilters.search, employeeFilters.department, employeeFilters.status, allEmployees.length]);

  // Apply leave filters when filters change
  useEffect(() => {
    console.log('Leave filter change detected:', leaveFilters);
    console.log('Current state:', {
      hasToken: !!localStorage.getItem('token'),
      isInitialLoad: isInitialLoad.current,
      leavesLength: forwardedLeaves.length,
      filterValues: leaveFilters
    });
    
    const token = localStorage.getItem('token');
    if (token && !isInitialLoad.current) {
      console.log('Fetching leaves with filters:', leaveFilters);
      fetchForwardedLeaves(leaveFilters);
    } else {
      console.log('Cannot fetch leaves:', { 
        hasToken: !!token, 
        leavesLength: forwardedLeaves.length,
        isInitialLoad: isInitialLoad.current
      });
    }
  }, [leaveFilters.startDate, leaveFilters.endDate, leaveFilters.department, leaveFilters.status]);

  const exportToPDF = (pdfIncludeCCL = true, pdfIncludeSummary = true) => {
    if (!forwardedLeaves.length && !cclWorkRequests.length) {
      alert('No requests to export for the current filters.');
      return;
    }
    const allLeaveRows = [
      ...forwardedLeaves.map(leave => ({ ...leave, _isLeave: true })),
      ...cclWorkRequests.map(ccl => ({ ...ccl, _isLeave: false }))
    ];

    // Filter leave requests by date range and status
    const filteredLeaves = forwardedLeaves.filter(leave => {
      // Filter by date range
      if (leaveFilters.startDate || leaveFilters.endDate) {
        const leaveStartDate = new Date(leave.startDate);
        const filterStart = leaveFilters.startDate ? new Date(leaveFilters.startDate) : null;
        const filterEnd = leaveFilters.endDate ? new Date(leaveFilters.endDate) : null;
        
        if (filterStart && filterEnd) {
          if (!(leaveStartDate >= filterStart && leaveStartDate <= filterEnd)) return false;
        } else if (filterStart) {
          if (!(leaveStartDate >= filterStart)) return false;
        } else if (filterEnd) {
          if (!(leaveStartDate <= filterEnd)) return false;
        }
      }

      // Filter by department
      if (leaveFilters.department && leave.employeeDepartment !== leaveFilters.department) {
        return false;
      }

      // Filter by status - only include approved requests
      if (leave.status !== 'Approved') {
        return false;
      }

      return true;
    });

    // Sort filteredLeaves by department, then by employee name
    const sortedLeaves = [...filteredLeaves].sort((a, b) => {
      const deptA = (a.employeeDepartment || a.employee?.department || '').toLowerCase();
      const deptB = (b.employeeDepartment || b.employee?.department || '').toLowerCase();
      if (deptA < deptB) return -1;
      if (deptA > deptB) return 1;
      // If departments are equal, sort by employee name
      const nameA = (a.employeeName || a.employee?.name || '').toLowerCase();
      const nameB = (b.employeeName || b.employee?.name || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

    // PDF export: use modified dates/days if isModifiedByPrincipal
    const leaveData = sortedLeaves.map((lr, idx) => [
      idx + 1,
      lr.employeeName || lr.employee?.name || '',
      lr.leaveRequestId || '',
      lr.employeeEmployeeId || lr.employee?.employeeId || '',
      lr.employeeDepartment || lr.employee?.department || '',
      lr.leaveType || lr.type || '',
      lr.isModifiedByPrincipal
        ? `${lr.approvedStartDate ? new Date(lr.approvedStartDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : ''} - ${lr.approvedEndDate ? new Date(lr.approvedEndDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}`
        : `${lr.startDate ? new Date(lr.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : ''} - ${lr.endDate ? new Date(lr.endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}`,
      lr.isModifiedByPrincipal ? lr.approvedNumberOfDays || '' : lr.numberOfDays || '',
      lr.reason || '',
      lr.status || '',
    ]);

    // Filter CCL requests by date range and status
    const filteredCCL = pdfIncludeCCL ? cclWorkRequests.filter(ccl => {
      // Filter by date range
      if (cclFilters.startDate || cclFilters.endDate) {
        const cclDate = new Date(ccl.date);
        const filterStart = cclFilters.startDate ? new Date(cclFilters.startDate) : null;
        const filterEnd = cclFilters.endDate ? new Date(cclFilters.endDate) : null;
        
        if (filterStart && filterEnd) {
          if (!(cclDate >= filterStart && cclDate <= filterEnd)) return false;
        } else if (filterStart) {
          if (!(cclDate >= filterStart)) return false;
        } else if (filterEnd) {
          if (!(cclDate <= filterEnd)) return false;
        }
      }

      // Filter by department
      if (cclFilters.department && ccl.employeeDepartment !== cclFilters.department) {
        return false;
      }

      // Filter by status - only include approved requests
      if (ccl.status !== 'Approved') {
        return false;
      }

      return true;
    }) : [];

    if (!filteredLeaves.length && !filteredCCL.length) {
      alert('No approved requests found in the selected date range.');
      return;
    }

    // Sort filteredCCL by department, then by employee name
    const sortedCCL = [...filteredCCL].sort((a, b) => {
      const deptA = (a.employeeDepartment || a.employee?.department || '').toLowerCase();
      const deptB = (b.employeeDepartment || b.employee?.department || '').toLowerCase();
      if (deptA < deptB) return -1;
      if (deptA > deptB) return 1;
      // If departments are equal, sort by employee name
      const nameA = (a.employeeName || a.employee?.name || '').toLowerCase();
      const nameB = (b.employeeName || b.employee?.name || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

    const cclData = sortedCCL.map((ccl, idx) => [
      idx + 1,
      ccl.employeeName || ccl.employee?.name || '',
      ccl.cclRequestId || `CCL${new Date(ccl.date).getFullYear()}${ccl.employeeDepartment?.substring(0, 3).toUpperCase()}${ccl._id.toString().slice(-4)}`,
      ccl.employeeEmployeeId || 'N/A',
      ccl.employeeDepartment || 'N/A',
      new Date(ccl.date).toLocaleDateString(),
      ccl.assignedTo || 'N/A',
      ccl.reason || '',
      ccl.status || 'N/A'
    ]);

    const leaveHeaders = [[
      'S. No', 'Name', 'Request ID','Employee ID', 'Dept',  'Leave Type', 'On Leave Period', 'No. of Days', 'Reason', 'Status'
    ]];

    const cclHeaders = [[
      'S. No','Name', 'Request ID',  'Employee ID', 'Dept', 'Date', 'Assigned To', 'Reason', 'Status'
    ]];

    const doc = new jsPDF('landscape');
    const collegeName = 'Pydah College of Engineering';
    const collegeAddress = 'An Autonomous Institution Kakinada | Andhra Pradesh | INDIA';
    const contactNumber = 'Contact: +91 99513 54444';
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();
    const title = `Leave Requests - ${month} - ${year}`;
    const logoUrl = window.location.origin + '/PYDAH_LOGO_PHOTO.jpg';

    // Helper to draw the PDF (with or without logo)
    const drawPDF = (logoImg) => {
      if (logoImg) doc.addImage(logoImg, 'PNG', 10, 5, 60, 30);
      doc.setFont('times', 'bold');
      doc.setTextColor('#333');
      doc.setFontSize(24);
      doc.text(collegeName, doc.internal.pageSize.width / 2, 15, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(collegeAddress, doc.internal.pageSize.width / 2, 22, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#D35400');
      doc.text(title, doc.internal.pageSize.width / 2, 40, { align: 'center' });

      // Draw Leave Requests table
      doc.setFontSize(14);
      doc.setTextColor('#333');
      doc.text('Leave Requests', 10, 50);
      autoTable(doc, {
        startY: 55,
        head: leaveHeaders,
        body: leaveData,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: {
          fillColor: [255, 213, 128],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        },
        theme: 'grid',
        margin: { left: 10, right: 10 },
        tableWidth: 'auto',
        columnStyles: {
          0: { cellWidth: 12 }, // S. No
          1: { cellWidth: 40 }, // Employee Name
          2: { cellWidth: 40 }, // Request ID
          3: { cellWidth: 28 }, // Employee ID
          4: { cellWidth: 22 }, // Department
          5: { cellWidth: 22 }, // Leave Type
          // No. of Days
          6: { cellWidth: 30 }, // On Leave Period
          7: { cellWidth: 22, }, // No of days
          8: { cellWidth: 40, overflow: 'linebreak' }, // Status
          9: { cellWidth: 22 }, // Status
        },
      });

      // If CCL requests are included, draw CCL table
      if (pdfIncludeCCL && filteredCCL.length > 0) {
        const leaveTableEndY = doc.lastAutoTable.finalY;
        doc.setFontSize(14);
        doc.setTextColor('#333');
        doc.text('CCL Work Requests', 10, leaveTableEndY + 20);
        autoTable(doc, {
          startY: leaveTableEndY + 25,
          head: cclHeaders,
          body: cclData,
          styles: { fontSize: 10, cellPadding: 3 },
          headStyles: {
            fillColor: [255, 213, 128],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
          },
          theme: 'grid',
          margin: { left: 10, right: 10 },
          tableWidth: 'auto',
          columnStyles: {
            0: { cellWidth: 12 }, // S. No
            1: { cellWidth: 40 }, // Employee Name
            2: { cellWidth: 40 }, // Request ID
            3: { cellWidth: 28 }, // Employee ID
            4: { cellWidth: 22 }, // Department
            5: { cellWidth: 22 }, // Date
            6: { cellWidth: 30 }, // Assigned To
            7: { cellWidth: 44, overflow: 'linebreak' }, // Reason
            8: { cellWidth: 22 }, // Status
          },
        });
      }

      // Add footer
      let pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.setTextColor('#333');
      doc.text(collegeName, 10, pageHeight - 10);
      doc.text(contactNumber, doc.internal.pageSize.width / 2, pageHeight - 10, { align: 'center' });
      let pageNumber = doc.internal.getNumberOfPages();
      doc.text(`Page ${pageNumber}`, doc.internal.pageSize.width - 20, pageHeight - 10);

      // Add signature
      let signatureY = doc.lastAutoTable.finalY + 30;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Principal Signature', doc.internal.pageSize.width - 60, signatureY);

      // Add timestamp
      let finalY = doc.lastAutoTable.finalY + 20;
      let timestamp = new Date().toLocaleString('en-US', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
      doc.setFontSize(10);
      doc.setTextColor('#333');
      doc.text(`Generated on: ${timestamp}`, 10, finalY);

      // Save the PDF
      const fileName = pdfIncludeCCL ? 
        `Leave_and_CCL_Requests_${month}_${year}.pdf` : 
        `Leave_Requests_${month}_${year}.pdf`;
      doc.save(fileName);

      // ... inside exportToPDF ...
      // After drawing the leave and CCL tables, add the summary table if requested
      if (pdfIncludeSummary) {
        // Build summary from filtered, approved leave and CCL requests
        const summaryMap = {};
        allLeaveRows.filter(row => row.status === 'Approved').forEach(row => {
          const name = row.employeeName || row.employee?.name || 'Unknown';
          if (!summaryMap[name]) {
            summaryMap[name] = { CCL: 0, OD: 0, CL: 0 };
          }
          let type = row.leaveType || row.type;
          let days = row.isModifiedByPrincipal ? row.approvedNumberOfDays : row.numberOfDays;
          if (!type && row._isLeave === false) type = 'CCL';
          if (type === 'CCL' || (row._isLeave === false)) summaryMap[name].CCL += Number(days) || 0;
          else if (type === 'OD') summaryMap[name].OD += Number(days) || 0;
          else if (type === 'CL') summaryMap[name].CL += Number(days) || 0;
        });
        const sortedNames = Object.keys(summaryMap).sort();
        const summaryData = sortedNames.map(name => [
          name,
          summaryMap[name].CCL,
          summaryMap[name].OD,
          summaryMap[name].CL
        ]);
        const summaryHeaders = [[
          'Employee Name', 'CCL Approved', 'OD Approved', 'CL Approved'
        ]];
        // Add the summary table after the last table
        let lastY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 60;
        doc.setFontSize(14);
        doc.setTextColor('#333');
        doc.text('Summary (Approved Requests)', 10, lastY);
        autoTable(doc, {
          startY: lastY + 5,
          head: summaryHeaders,
          body: summaryData,
          styles: { fontSize: 10, cellPadding: 3 },
          headStyles: {
            fillColor: [255, 213, 128],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
          },
          theme: 'grid',
          margin: { left: 10, right: 10 },
          tableWidth: 'auto',
        });
      }
    };

    // Try to load the logo, then draw the PDF
    const logoImg = new window.Image();
    logoImg.crossOrigin = 'Anonymous';
    logoImg.src = logoUrl;
    logoImg.onload = () => drawPDF(logoImg);
    logoImg.onerror = () => drawPDF(null);
  };

  // Add this function inside the PrincipalDashboard component
  const handlePrintFilteredRequests = () => {
    if (!forwardedLeaves.length && !cclWorkRequests.length) {
      alert('No requests to print for the current filters.');
      return;
    }
    const leaveRows = forwardedLeaves.map(lr => `
      <tr>
      <td>${lr.employeeName || lr.employee?.name || ''}</td>
        <td>${lr.leaveRequestId || ''}</td>
        
        <td>${lr.employeeEmployeeId || lr.employee?.employeeId || ''}</td>
        <td>${lr.employeeDepartment || lr.employee?.department || ''}</td>
        <td>${lr.leaveType || lr.type || ''}</td>
        <td>${lr.startDate ? new Date(lr.startDate).toLocaleDateString() : ''} - ${lr.endDate ? new Date(lr.endDate).toLocaleDateString() : ''}</td>
        <td>${lr.numberOfDays || ''}</td>
        <td>${lr.status}</td>
      </tr>
    `).join('');
    const cclRows = cclWorkRequests.map(ccl => `
      <tr>
      <td>${ccl.employeeName || 'Unknown'}</td>
        <td>${ccl.cclRequestId || `CCLW${new Date(ccl.date).getFullYear()}${ccl.employeeDepartment?.substring(0, 3).toUpperCase()}${ccl._id.toString().slice(-4)}`}</td>
        
        <td>${ccl.employeeEmployeeId || 'N/A'}</td>
        <td>${ccl.employeeDepartment || 'N/A'}</td>
        <td>CCL Work</td>
        <td>${new Date(ccl.date).toLocaleDateString()}</td>
        <td>${ccl.assignedTo || ''}</td>
        <td>${ccl.reason || ''}</td>
        <td>${ccl.status}</td>
      </tr>
    `).join('');
    const tableRows = leaveRows + cclRows;
    const printWindow = window.open('', '', 'width=900,height=700');
    printWindow.document.write(`
      <html>
        <head>
          <title>Filtered Leave Requests</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #333; padding: 8px; text-align: left; }
            th { background: #f3f3f3; }
          </style>
        </head>
        <body>
          <h2>Filtered Leave Requests</h2>
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Name</th>
                <th>Emp ID</th>
                <th>Department</th>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>No of Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Add this handler:
  const handleRecentLeaveClick = (leaveId) => {
    const leave = forwardedLeaves.find(l => l._id === leaveId);
    if (leave) {
      setSelectedLeave(leave);
      setShowLeaveDetailsModal(true);
    }
  };

  const handleRecentCCLClick = (cclId) => {
    const ccl = cclWorkRequests.find(w => w._id === cclId);
    if (ccl) {
      setSelectedCCLWork(ccl);
      setShowCCLRemarksModal(true);
    }
  };

  const clearLeaveFilters = () => {
    setLeaveFilters({
      startDate: '',
      endDate: '',
      department: '',
      status: 'Forwarded by HOD'
    });
  };

  if (shouldRedirect) {
    return null;
  }

  if (loading.branches || loading.hods || loading.employees || loading.leaves || loading.cclWorkRequests) {
    return <Loading />;
  }

  // ... before using filteredCCL in renderContent ...
  const filteredCCL = cclWorkRequests.filter(work => {
    if (cclFilters.status && cclFilters.status !== 'All') {
      return work.status === cclFilters.status;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <PrincipalSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <div className="lg:ml-64 min-h-screen">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg m-4">
            {error}
          </div>
        )}
        <div className="p-4 lg:p-6">
          {renderContent()}
        </div>
      </div>

      {/* Create HOD Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary">Create New HOD</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateHOD} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">HOD ID <span className="text-gray-400 text-xs">(optional)</span></label>
                  <input
                    type="text"
                    value={formData.HODId}
                    onChange={(e) => setFormData({...formData, HODId: e.target.value})}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Leave empty to use email as ID"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Branch</label>
                  <select
                    value={formData.branchCode}
                    onChange={(e) => setFormData({...formData, branchCode: e.target.value})}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    required
                  >
                    <option value="">Select a branch</option>
                    {(branches || []).map((branch) => (
                      <option key={branch._id || branch.code} value={branch.code}>
                        {isMobile ? branch.code : `${branch.name} (${branch.code})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-primary-dark transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit HOD Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 lg:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg lg:text-xl font-bold mb-4">Edit HOD Details</h3>
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
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    required
                  >
                    <option value="">Select a branch</option>
                    {branches.filter(b => b.isActive).map(branch => (
                      <option key={branch.code} value={branch.code}>
                        {isMobile
                          ? branch.code
                          : `${branch.name} (${branch.code})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    required
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
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`bg-primary text-white px-3 lg:px-4 py-2 rounded-md hover:bg-primary-dark ${(!isEditFormDirty || !isEditFormDepartmentValid) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!isEditFormDirty || !isEditFormDepartmentValid}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      <HodPasswordResetModal
        show={showPasswordResetModal}
        onClose={() => {
          setShowPasswordResetModal(false);
          setSelectedHod(null);
        }}
        hod={selectedHod}
        token={token}
        loading={loading}
        setLoading={setLoading}
      />

      {/* Remarks Modal */}
      <RemarksModal
        show={showRemarksModal}
        onClose={() => {
          setShowRemarksModal(false);
          setSelectedAction(null);
          setSelectedRequestId(null);
        }}
        onSubmit={handleRemarksSubmit}
        action={selectedAction}
      />

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
                onClick={() => handleCCLWorkAction('Approved')}
                className="px-3 lg:px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              >
                Approve
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

      {/* Create Branch Modal */}
      {showCreateBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-primary mb-4">Create New Branch</h3>
            <form onSubmit={e => { handleCreateBranch(e); setShowCreateBranchModal(false); }} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Branch Name</label>
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={e => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="w-full p-2 rounded-neumorphic shadow-innerSoft bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Branch Code</label>
                <input
                  type="text"
                  value={newBranch.code}
                  onChange={e => setNewBranch({ ...newBranch, code: e.target.value })}
                  className="w-full p-2 rounded-neumorphic shadow-innerSoft bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateBranchModal(false)} className="bg-gray-500 text-white px-3 py-2 rounded-neumorphic">Cancel</button>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-neumorphic hover:shadow-innerSoft transition-all duration-300">Create Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Employee</h2>
            <form onSubmit={handleEditEmployeeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editEmployeeForm.name}
                  onChange={(e) => setEditEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={editEmployeeForm.email}
                  onChange={(e) => setEditEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  value={editEmployeeForm.phoneNumber}
                  onChange={(e) => setEditEmployeeForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <select
                  value={editEmployeeForm.department}
                  onChange={(e) => setEditEmployeeForm(prev => ({ ...prev, department: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  required
                >
                  <option value="">Select Department</option>
                  {branches.map(branch => (
                    <option key={branch._id} value={branch.code}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={editEmployeeForm.status}
                  onChange={(e) => setEditEmployeeForm(prev => ({ ...prev, status: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  Update Employee
                </button>
                <button
                  type="button"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
                      try {
                        const token = localStorage.getItem('token');
                        const response = await fetch(`${API_BASE_URL}/principal/employees/${editingEmployee._id}`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        });
                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.msg || 'Failed to delete employee');
                        }
                        toast.success('Employee deleted successfully');
                        await fetchEmployees();
                        setEditingEmployee(null);
                      } catch (error) {
                        console.error('Error deleting employee:', error);
                        toast.error(error.message || 'Failed to delete employee');
                      }
                    }
                  }}
                >
                  Delete Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Date Edit Modal */}
      <LeaveDateEditModal
        isOpen={showDateEditModal}
        onClose={() => {
          setShowDateEditModal(false);
          setSelectedLeaveForEdit(null);
        }}
        leaveRequest={selectedLeaveForEdit}
        onApprove={handleApproveWithDates}
        onReject={handleRejectWithDates}
      />

      {/* Remarks Modal */}
      {showRemarksModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Remarks</h3>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter your remarks..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows="4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRemarksModal(false);
                  setRemarks('');
                  setSelectedAction(null);
                  setSelectedRequestId(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemarksSubmit}
                disabled={isSubmittingRemarks}
                className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isSubmittingRemarks ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Options Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-primary">Export to PDF Options</h3>
            <div className="mb-4 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportIncludeCCL}
                  onChange={e => setExportIncludeCCL(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-primary"
                />
                Include CCL Work Requests
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportIncludeSummary}
                  onChange={e => setExportIncludeSummary(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-primary"
                />
                Include Summary Table
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                onClick={() => {
                  setShowExportModal(false);
                  exportToPDF(exportIncludeCCL, exportIncludeSummary);
                }}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalDashboard; 