import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';
import { toast } from 'react-toastify';
import Loading from '../../components/Loading';
import SuperAdminSidebar from './SuperAdminSidebar';
import DashboardSection from './DashboardSection';
import CampusManagementSection from './CampusManagementSection';
import PrincipalManagementSection from './PrincipalManagementSection';
import EmployeeManagementSection from './EmployeeManagementSection';
import HRManagementSection from './HRManagementSection';
import SystemSettingsSection from './SystemSettingsSection';
import SuperAdminTaskManagementSection from './SuperAdminTaskManagementSection';

const API_BASE_URL = config.API_BASE_URL;

const SuperAdminDashboard = () => {
  const [campuses, setCampuses] = useState([]);
  const [hrs, setHrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');

  // Principal management states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    campusName: ''
  });
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({ principalId: null, newPassword: '' });
  const [showEditPrincipalModal, setShowEditPrincipalModal] = useState(false);
  const [editPrincipalData, setEditPrincipalData] = useState({ _id: '', name: '', email: '' });

  // HR management states
  const [showCreateHRModal, setShowCreateHRModal] = useState(false);
  const [hrFormData, setHrFormData] = useState({
    name: '',
    email: '',
    password: '',
    campusName: '',
    leaveBalance: 12,
    leaveBalanceByExperience: 0
  });
  const [showEditHRModal, setShowEditHRModal] = useState(false);
  const [editHRData, setEditHRData] = useState({ _id: '', name: '', email: '', leaveBalance: 12, leaveBalanceByExperience: 0 });
  const [showResetHRPasswordModal, setShowResetHRPasswordModal] = useState(false);
  const [resetHRPasswordData, setResetHRPasswordData] = useState({ hrId: null, newPassword: '' });

  // Campus management states
  const [showCreateCampusModal, setShowCreateCampusModal] = useState(false);
  const [campusFormData, setCampusFormData] = useState({
    name: '',
    displayName: '',
    type: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchCampuses();
    fetchHRs();
  }, []);

  const fetchHRs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/super-admin/hrs`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setHrs(response.data);
    } catch (error) {
      console.error('Error fetching HRs:', error);
      setError(error.response?.data?.msg || 'Failed to fetch HRs');
    }
  };

  const fetchCampuses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        navigate('/');
        return;
      }

      console.log('Fetching campuses...');
      const response = await axios.get(
        `${API_BASE_URL}/super-admin/campuses`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log('Campuses response:', response.data);
      setCampuses(response.data);
    } catch (error) {
      console.error('Error fetching campuses:', error);
      setError(error.response?.data?.msg || 'Failed to fetch campuses');
      if (error.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrincipal = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      // Check if campus exists
      const selectedCampus = campuses.find(c => c.name === formData.campusName);
      if (!selectedCampus) {
        throw new Error('Invalid campus selected');
      }

      if (selectedCampus.principalId) {
        throw new Error('This campus already has a principal assigned');
      }

      // Create the principal
      const principalResponse = await axios.post(
        `${API_BASE_URL}/super-admin/principals`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          campusId: selectedCampus._id
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowCreateModal(false);
      setFormData({ name: '', email: '', password: '', campusName: '' });
      await fetchCampuses(); // Refresh the campus list

    } catch (error) {
      console.error('Error creating principal:', error);
      setError(error.response?.data?.msg || error.message || 'Failed to create principal');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHR = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      // Check if campus exists
      const selectedCampus = campuses.find(c => c.name === hrFormData.campusName);
      if (!selectedCampus) {
        throw new Error('Invalid campus selected');
      }

      // Create HR
      await axios.post(
        `${API_BASE_URL}/super-admin/hrs`,
        {
          name: hrFormData.name,
          email: hrFormData.email,
          password: hrFormData.password,
          campusId: selectedCampus._id,
          leaveBalance: parseInt(hrFormData.leaveBalance) || 12,
          leaveBalanceByExperience: parseInt(hrFormData.leaveBalanceByExperience) || 0
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowCreateHRModal(false);
      setHrFormData({ name: '', email: '', password: '', campusName: '', leaveBalance: 12, leaveBalanceByExperience: 0 });
      await fetchHRs();

    } catch (error) {
      console.error('Error creating HR:', error);
      setError(error.response?.data?.msg || error.message || 'Failed to create HR');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCampusStatus = async (campusId, isActive) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/super-admin/campus-status`,
        { campusId, isActive },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchCampuses();
    } catch (error) {
      setError(error.response?.data?.msg || 'Failed to update campus status');
    }
  };

  const handleUpdateHRStatus = async (hrId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/super-admin/hrs/status`,
        { hrId, status },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchHRs();
    } catch (error) {
      setError(error.response?.data?.msg || 'Failed to update HR status');
    }
  };

  const handleResetPassword = (principalId) => {
    setResetPasswordData({ principalId, newPassword: '' });
    setShowResetPasswordModal(true);
  };

  const handleResetPasswordSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/super-admin/reset-principal-password`,
        { principalId: resetPasswordData.principalId, newPassword: resetPasswordData.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Password reset successful');
      setShowResetPasswordModal(false);
    } catch (error) {
      setError(error.response?.data?.msg || 'Failed to reset password');
    }
  };

  const handleResetHRPassword = (hrId) => {
    setResetHRPasswordData({ hrId, newPassword: '' });
    setShowResetHRPasswordModal(true);
  };

  const handleResetHRPasswordSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/super-admin/hrs/reset-password`,
        { hrId: resetHRPasswordData.hrId, newPassword: resetHRPasswordData.newPassword },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Password reset successful');
      setShowResetHRPasswordModal(false);
    } catch (error) {
      setError(error.response?.data?.msg || 'Failed to reset password');
    }
  };

  const handleEditPrincipal = (principal) => {
    setEditPrincipalData({ _id: principal._id, name: principal.name, email: principal.email });
    setShowEditPrincipalModal(true);
  };

  const handleEditPrincipalSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/super-admin/principals/${editPrincipalData._id}`,
        { name: editPrincipalData.name, email: editPrincipalData.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Principal details updated successfully');
      setShowEditPrincipalModal(false);
      setEditPrincipalData({ _id: '', name: '', email: '' });
      await fetchCampuses();
    } catch (error) {
      setError(error.response?.data?.msg || 'Failed to update principal details');
    }
  };

  const handleEditHR = (hr) => {
    setEditHRData({
      _id: hr._id,
      name: hr.name,
      email: hr.email,
      leaveBalance: hr.leaveBalance || 12,
      leaveBalanceByExperience: hr.leaveBalanceByExperience || 0
    });
    setShowEditHRModal(true);
  };

  const handleEditHRSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/super-admin/hrs/${editHRData._id}`,
        {
          name: editHRData.name,
          email: editHRData.email,
          leaveBalance: parseInt(editHRData.leaveBalance) || 12,
          leaveBalanceByExperience: parseInt(editHRData.leaveBalanceByExperience) || 0
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('HR details updated successfully');
      setShowEditHRModal(false);
      setEditHRData({ _id: '', name: '', email: '', leaveBalance: 12, leaveBalanceByExperience: 0 });
      await fetchHRs();
    } catch (error) {
      setError(error.response?.data?.msg || 'Failed to update HR details');
    }
  };

  const handleCreateCampus = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/super-admin/campuses`,
        campusFormData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowCreateCampusModal(false);
      setCampusFormData({ name: '', displayName: '', type: '' });
      await fetchCampuses();
      toast.success('Campus created successfully');
    } catch (error) {
      console.error('Error creating campus:', error);
      setError(error.response?.data?.msg || error.message || 'Failed to create campus');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection campuses={campuses} hrs={hrs} />;

      case 'campuses':
        return (
          <CampusManagementSection
            campuses={campuses}
            showCreateCampusModal={showCreateCampusModal}
            setShowCreateCampusModal={setShowCreateCampusModal}
            campusFormData={campusFormData}
            setCampusFormData={setCampusFormData}
            handleCreateCampus={handleCreateCampus}
            handleUpdateCampusStatus={handleUpdateCampusStatus}
          />
        );

      case 'principals':
        return (
          <PrincipalManagementSection
            campuses={campuses}
            showCreateModal={showCreateModal}
            setShowCreateModal={setShowCreateModal}
            formData={formData}
            setFormData={setFormData}
            handleCreatePrincipal={handleCreatePrincipal}
            handleEditPrincipal={handleEditPrincipal}
            handleEditPrincipalSubmit={handleEditPrincipalSubmit}
            showEditPrincipalModal={showEditPrincipalModal}
            setShowEditPrincipalModal={setShowEditPrincipalModal}
            editPrincipalData={editPrincipalData}
            setEditPrincipalData={setEditPrincipalData}
            handleResetPassword={handleResetPassword}
            handleResetPasswordSubmit={handleResetPasswordSubmit}
            showResetPasswordModal={showResetPasswordModal}
            setShowResetPasswordModal={setShowResetPasswordModal}
            resetPasswordData={resetPasswordData}
            setResetPasswordData={setResetPasswordData}
          />
        );

      case 'employees':
        return <EmployeeManagementSection />;

      case 'hr-management':
        return (
          <HRManagementSection
            hrs={hrs}
            campuses={campuses}
            showCreateHRModal={showCreateHRModal}
            setShowCreateHRModal={setShowCreateHRModal}
            hrFormData={hrFormData}
            setHrFormData={setHrFormData}
            handleCreateHR={handleCreateHR}
            handleEditHR={handleEditHR}
            handleEditHRSubmit={handleEditHRSubmit}
            showEditHRModal={showEditHRModal}
            setShowEditHRModal={setShowEditHRModal}
            editHRData={editHRData}
            setEditHRData={setEditHRData}
            handleResetHRPassword={handleResetHRPassword}
            handleResetHRPasswordSubmit={handleResetHRPasswordSubmit}
            showResetHRPasswordModal={showResetHRPasswordModal}
            setShowResetHRPasswordModal={setShowResetHRPasswordModal}
            resetHRPasswordData={resetHRPasswordData}
            setResetHRPasswordData={setResetHRPasswordData}
            handleUpdateHRStatus={handleUpdateHRStatus}
          />
        );


      case 'task-management':
        return <SuperAdminTaskManagementSection />;

      case 'system-settings':
        return <SystemSettingsSection />;

      default:
        return <DashboardSection campuses={campuses} hrs={hrs} />;
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SuperAdminSidebar
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

export default SuperAdminDashboard; 