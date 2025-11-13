  // Handle Approve/Reject for CCL Work Requests
  const handleCCLWorkAction = async (requestId, action) => {
    try {
      const token = localStorage.getItem('token');
      const authAxios = createAuthAxios(token);
      // Use the correct state variable for CCL work requests
      const selectedWork = cclWorkRequests.find(work => work._id === requestId);
      if (!selectedWork) {
        toast.error('CCL work request not found');
        return;
      }
      // Ensure this work request is forwarded to principal before allowing action
      if (selectedWork.status !== 'Forwarded to Principal') {
        console.warn('Attempt to update CCL work request with invalid status:', selectedWork);
        toast.error('This CCL work request is not forwarded to Principal and cannot be updated');
        return;
      }
      // Prepare request body
      const requestBody = {
        status: action,
        principalRemarks: cclRemarks || `${action} by Principal`
      };
      // Send API request to update status
      const response = await authAxios.put(`${API_BASE_URL}/principal/ccl-work-requests/${requestId}`, requestBody);
      if (response.status === 200 || response.data.success) {
        toast.success(`CCL work request ${action.toLowerCase()} successfully!`);
        // Refresh CCL work requests
        fetchCCLWorkRequests();
        setShowCCLRemarksModal(false);
        setSelectedCCLWork(null);
        setCclRemarks('');
      } else {
        toast.error(response.data?.msg || 'Failed to update CCL work request');
      }
    } catch (error) {
      console.error('Error updating CCL work request:', error);
      toast.error(error.response?.data?.msg || 'Error updating CCL work request');
    }
  };
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import RemarksModal from '../../components/RemarksModal';
import PrincipalSidebar from './PrincipalSidebar';
import Loading from '../../components/Loading';
import { FaUserTie, FaUsers, FaClipboardList, FaArrowRight, FaBuilding } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LeaveDateEditModal from '../../components/LeaveDateEditModal';
import { createAuthAxios } from '../../utils/authAxios';
import { API_BASE_URL } from '../../config';
import HodManagement from './HodManagement';
import BranchManagement from './BranchManagement';
import EmployeeManagement from './EmployeeManagement';
import LeavesManagement from './LeavesManagement';
import PrincipalTaskManagementSection from './PrincipalTaskManagementSection';


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
  // const { user } = useAuth();
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
  const [hods, setHods] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]); // Store all employees for client-side filtering
  const [employeeFilters, setEmployeeFilters] = useState({
    search: '',
    department: '',
    status: ''
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


  const [dashboardStats, setDashboardStats] = useState(null);

  const [isSubmittingRemarks, setIsSubmittingRemarks] = useState(false);
  const [cclStatusFilter, setCclStatusFilter] = useState('');
  const [CCLWorkRequests, setFilteredCCLWorkRequests] = useState([]);

  const isInitialLoad = useRef(true);

  // Handle Approve/Reject for CCL Work Requests
  const handleCCLWorkAction = async (requestId, action) => {
    try {
      const token = localStorage.getItem('token');
      const authAxios = createAuthAxios(token);
      // Use the correct state variable for CCL work requests
      const selectedWork = cclWorkRequests.find(work => work._id === requestId);
      if (!selectedWork) {
        toast.error('CCL work request not found');
        return;
      }
      // Prepare request body
      const requestBody = {
        status: action,
        remarks: cclRemarks || `${action} by Principal`
      };
      // Send API request to update status
      const response = await authAxios.put(`${API_BASE_URL}/principal/ccl-work-requests/${requestId}`, requestBody);
      if (response.status === 200 || response.data.success) {
        toast.success(`CCL work request ${action.toLowerCase()} successfully!`);
        // Refresh CCL work requests
        fetchCCLWorkRequests();
        setShowCCLRemarksModal(false);
        setSelectedCCLWork(null);
        setCclRemarks('');
      } else {
        toast.error(response.data?.msg || 'Failed to update CCL work request');
      }
    } catch (error) {
      console.error('Error updating CCL work request:', error);
      toast.error(error.response?.data?.msg || 'Error updating CCL work request');
    }
  };

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
                    {(forwardedLeaves.slice(0, 5)).map(leave => (
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
                    {(cclWorkRequests.slice(0, 5)).map(work => (
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
          <HodManagement
            branches={branches}
            hods={hods}
            onHodUpdate={fetchHods}
            campus={campus}
            token={token}
          />
        );

      case 'branches':
        return (
          <BranchManagement
            branches={branches}
            hods={hods}
            onBranchUpdate={fetchBranches}
            token={token}
            loading={loading.branches}
          />
        );

      case 'employees':
        return (
          <EmployeeManagement
            branches={branches}
            employees={employees}
            allEmployees={allEmployees}
            onEmployeeUpdate={fetchEmployees}
            token={token}
            loading={loading.employees}
          />
        );

      case 'leaves':
        return (
          <LeavesManagement
            branches={branches}
            forwardedLeaves={forwardedLeaves}
            cclWorkRequests={cclWorkRequests}
            onLeavesUpdate={fetchForwardedLeaves}
            onCCLUpdate={fetchCCLWorkRequests}
            token={token}
            loading={loading.leaves}
          />
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
                <option value="Pending">Pending</option>
                <option value="Forwarded to Principal">Forwarded to Principal</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* CCL Work Requests List */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {cclWorkRequests.filter(work => !cclStatusFilter || work.status === cclStatusFilter).length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No CCL work requests found.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {cclWorkRequests.filter(work => !cclStatusFilter || work.status === cclStatusFilter).map((request) => (
                    <div key={request._id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.employeeName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            <strong>Employee ID:</strong> {request.employeeEmployeeId} • <strong>Department:</strong> {request.employeeDepartment}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Reason:</strong> {request.reason}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Assigned By:</strong> {request.assignedTo}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Date:</strong> {request.date ? new Date(request.date).toLocaleDateString() : 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>CCL Request ID:</strong> {request.cclRequestId}
                          </p>
                          {request.hodRemarks && (
                            <p className="text-sm text-gray-600">
                              <strong>HOD Remarks:</strong> {request.hodRemarks}
                            </p>
                          )}
                          {request.principalRemarks && (
                            <p className="text-sm text-gray-600">
                              <strong>Principal Remarks:</strong> {request.principalRemarks}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                            ${request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              request.status === 'Forwarded to Principal' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'}`}
                          >
                            {request.status}
                          </span>
                          {(request.status === 'Pending' || request.status === 'Forwarded to Principal') && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleCCLWorkAction(request._id, 'Approved')}
                                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleCCLWorkAction(request._id, 'Rejected')}
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

      case 'task-management':
        return <PrincipalTaskManagementSection />;

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
    </div>
  );
};

export default PrincipalDashboard;
