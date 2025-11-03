import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import config from '../../config';
import Loading from '../../components/Loading';
import HodSidebar from './HodSidebar';
import DashboardSection from './DashboardSection';
import EmployeeManagementSection from './EmployeeManagementSection';
import LeaveRequestsSection from './LeaveRequestsSection';
import CCLWorkSection from './CCLWorkSection';
import ProfileSection from './ProfileSection';

const API_BASE_URL = config.API_BASE_URL;

const HodDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [hod, setHod] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [remarks, setRemarks] = useState("");
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
  const [cclWorkRequests, setCclWorkRequests] = useState([]);
  const [selectedCCLWork, setSelectedCCLWork] = useState(null);
  const [showCCLRemarksModal, setShowCCLRemarksModal] = useState(false);
  const [cclRemarks, setCclRemarks] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 10;

  // Password reset state
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: ''
  });

  const navigate = useNavigate();
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
    try {
      const response = await axios.get(
        `${API_BASE_URL}/hod/ccl-work-requests`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setCclWorkRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching CCL work requests:', error);
      toast.error('Failed to fetch CCL work requests');
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchCCLWorkRequests();
    }
  }, [fetchCCLWorkRequests, token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('campus');
    localStorage.removeItem('branchCode');
    navigate('/');
  };

  // Employee Management Functions
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(
        `${API_BASE_URL}/hod/employees/${selectedEmployee._id}`,
        editForm,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      toast.success('Employee updated successfully');
      setShowEditModal(false);
      setRefreshTrigger(!refreshTrigger);
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error(error.response?.data?.msg || 'Failed to update employee');
    }
  };

  const handlePasswordReset = (newPassword) => {
    setResetPasswordData({ newPassword });
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_BASE_URL}/hod/employees/${selectedEmployeeForReset._id}/reset-password`,
        resetPasswordData,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      toast.success('Password reset successfully');
      setShowPasswordResetModal(false);
      setResetPasswordData({ newPassword: '' });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.msg || 'Failed to reset password');
    }
  };

  const handleUpdateEmployeeStatus = async (employee) => {
    try {
      const newStatus = employee.status === 'active' ? 'inactive' : 'active';
      await axios.put(
        `${API_BASE_URL}/hod/employees/${employee._id}/status`,
        { status: newStatus },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      toast.success(`Employee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      setRefreshTrigger(!refreshTrigger);
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast.error(error.response?.data?.msg || 'Failed to update employee status');
    }
  };

  // Leave Management Functions
  const handleApproveLeave = async (leaveId, remarks = '') => {
    try {
      const leaveRequest = leaveRequests.find(leave => leave._id === leaveId);
      if (!leaveRequest) {
        toast.error('Leave request not found');
        return;
      }

      await axios.put(
        `${API_BASE_URL}/hod/leaves/${leaveRequest.employeeId}/${leaveId}`,
        { status: 'Approved', remarks: remarks || '' },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      toast.success('Leave request approved successfully');
      setRefreshTrigger(!refreshTrigger);
    } catch (error) {
      console.error('Error approving leave request:', error);
      toast.error(error.response?.data?.msg || 'Failed to approve leave request');
      throw error; // Re-throw to allow LeaveRequestsSection to handle it
    }
  };

  const handleRejectLeave = async (leaveId, remarks = '') => {
    try {
      const leaveRequest = leaveRequests.find(leave => leave._id === leaveId);
      if (!leaveRequest) {
        toast.error('Leave request not found');
        return;
      }

      await axios.put(
        `${API_BASE_URL}/hod/leaves/${leaveRequest.employeeId}/${leaveId}`,
        { status: 'Rejected', remarks: remarks || '' },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      toast.success('Leave request rejected successfully');
      setRefreshTrigger(!refreshTrigger);
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      toast.error(error.response?.data?.msg || 'Failed to reject leave request');
      throw error; // Re-throw to allow LeaveRequestsSection to handle it
    }
  };

  const handleRemarksSubmit = async (e) => {
    e.preventDefault();
    await handleRejectLeave(selectedLeave._id, remarks);
    setShowRemarksModal(false);
    setRemarks('');
    setSelectedLeave(null);
  };

  // CCL Work Management Functions
  const handleApproveCCL = async (cclId) => {
    try {
      // Backend expects a PUT to /hod/ccl-work-requests/:workId with a status in the body
      await axios.put(
        `${API_BASE_URL}/hod/ccl-work-requests/${cclId}`,
        { status: 'Forwarded to Principal' },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      toast.success('CCL work request forwarded to Principal successfully');
      fetchCCLWorkRequests();
    } catch (error) {
      console.error('Error approving CCL work request:', error);
      toast.error(error.response?.data?.msg || 'Failed to approve CCL work request');
    }
  };

  const handleRejectCCL = async (cclId, remarks) => {
    try {
      // Backend expects status 'Rejected' and optional remarks in the request body
      await axios.put(
        `${API_BASE_URL}/hod/ccl-work-requests/${cclId}`,
        { status: 'Rejected', remarks },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      toast.success('CCL work request rejected successfully');
      fetchCCLWorkRequests();
    } catch (error) {
      console.error('Error rejecting CCL work request:', error);
      toast.error(error.response?.data?.msg || 'Failed to reject CCL work request');
    }
  };

  const handleCCLRemarksSubmit = async (e) => {
    e.preventDefault();
    await handleRejectCCL(selectedCCLWork._id, cclRemarks);
    setShowCCLRemarksModal(false);
    setCclRemarks('');
    setSelectedCCLWork(null);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <DashboardSection
            hod={hod}
            employees={employees}
            leaveRequests={leaveRequests}
            cclWorkRequests={cclWorkRequests}
            onSectionChange={setActiveSection}
          />
        );

      case 'employees':
        return (
          <EmployeeManagementSection
            employees={employees}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            employeesPerPage={employeesPerPage}
            selectedEmployee={selectedEmployee}
            setSelectedEmployee={setSelectedEmployee}
            showEditModal={showEditModal}
            setShowEditModal={setShowEditModal}
            editForm={editForm}
            setEditForm={setEditForm}
            showPasswordResetModal={showPasswordResetModal}
            setShowPasswordResetModal={setShowPasswordResetModal}
            selectedEmployeeForReset={selectedEmployeeForReset}
            setSelectedEmployeeForReset={setSelectedEmployeeForReset}
            handleEditSubmit={handleEditSubmit}
            handlePasswordReset={handlePasswordReset}
            handlePasswordResetSubmit={handlePasswordResetSubmit}
            handleUpdateEmployeeStatus={handleUpdateEmployeeStatus}
          />
        );

      case 'leaves':
        return (
          <LeaveRequestsSection
            leaveRequests={leaveRequests}
            handleApproveLeave={handleApproveLeave}
            handleRejectLeave={handleRejectLeave}
            showRemarksModal={showRemarksModal}
            setShowRemarksModal={setShowRemarksModal}
            selectedLeave={selectedLeave}
            setSelectedLeave={setSelectedLeave}
            remarks={remarks}
            setRemarks={setRemarks}
            handleRemarksSubmit={handleRemarksSubmit}
          />
        );

      case 'ccl-work':
        return (
          <CCLWorkSection
            cclWorkRequests={cclWorkRequests}
            handleApproveCCL={handleApproveCCL}
            handleRejectCCL={handleRejectCCL}
            showCCLRemarksModal={showCCLRemarksModal}
            setShowCCLRemarksModal={setShowCCLRemarksModal}
            selectedCCLWork={selectedCCLWork}
            setSelectedCCLWork={setSelectedCCLWork}
            cclRemarks={cclRemarks}
            setCclRemarks={setCclRemarks}
            handleCCLRemarksSubmit={handleCCLRemarksSubmit}
          />
        );

      case 'profile':
        return <ProfileSection hod={hod} />;

      default:
        return (
          <DashboardSection
            hod={hod}
            employees={employees}
            leaveRequests={leaveRequests}
            cclWorkRequests={cclWorkRequests}
            onSectionChange={setActiveSection}
          />
        );
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background">
      <HodSidebar
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
    </div>
  );
};

export default HodDashboard;