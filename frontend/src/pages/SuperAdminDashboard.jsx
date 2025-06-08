import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import { toast } from 'react-toastify';
import Loading from '../components/Loading';

const API_BASE_URL = config.API_BASE_URL;

const PREDEFINED_CAMPUSES = [
  { name: 'engineering', displayName: 'PYDAH Engineering College' },
  { name: 'degree', displayName: 'PYDAH Degree College' },
  { name: 'pharmacy', displayName: 'PYDAH College of Pharmacy' },
  { name: 'diploma', displayName: 'PYDAH Polytechnic College' }
];

// SVG icons
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.5 19.212l-4.5 1.5 1.5-4.5 12.362-12.362z" />
  </svg>
);
const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-3A2.25 2.25 0 0 0 8.25 5.25V9m7.5 0v10.5A2.25 2.25 0 0 1 13.5 21h-3a2.25 2.25 0 0 1-2.25-2.25V9m7.5 0H6.75" />
  </svg>
);

const SuperAdminDashboard = () => {
  const [campuses, setCampuses] = useState([]);
  const [hrs, setHrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateHRModal, setShowCreateHRModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    campusName: ''
  });
  const [hrFormData, setHrFormData] = useState({
    name: '',
    email: '',
    password: '',
    campusName: ''
  });
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({ principalId: null, newPassword: '' });
  const [showEditPrincipalModal, setShowEditPrincipalModal] = useState(false);
  const [editPrincipalData, setEditPrincipalData] = useState({ _id: '', name: '', email: '' });
  const [showEditHRModal, setShowEditHRModal] = useState(false);
  const [editHRData, setEditHRData] = useState({ _id: '', name: '', email: '' });
  const [showResetHRPasswordModal, setShowResetHRPasswordModal] = useState(false);
  const [resetHRPasswordData, setResetHRPasswordData] = useState({ hrId: null, newPassword: '' });
  
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
      
      // First create the campus if it doesn't exist
      const selectedCampus = PREDEFINED_CAMPUSES.find(c => c.name === formData.campusName);
      if (!selectedCampus) {
        throw new Error('Invalid campus selected');
      }

      let campusId;
      const existingCampus = campuses.find(c => c.name === formData.campusName);
      
      if (!existingCampus) {
        const campusResponse = await axios.post(
          `${API_BASE_URL}/super-admin/campuses`,
          {
            name: selectedCampus.name,
            displayName: selectedCampus.displayName
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        campusId = campusResponse.data.campus._id;
      } else {
        if (existingCampus.principalId) {
          throw new Error('This campus already has a principal assigned');
        }
        campusId = existingCampus._id;
      }

      // Then create the principal
      const principalResponse = await axios.post(
        `${API_BASE_URL}/super-admin/principals`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          campusId: campusId
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
      
      // First create the campus if it doesn't exist
      const selectedCampus = PREDEFINED_CAMPUSES.find(c => c.name === hrFormData.campusName);
      if (!selectedCampus) {
        throw new Error('Invalid campus selected');
      }

      let campusId;
      const existingCampus = campuses.find(c => c.name === hrFormData.campusName);
      
      if (!existingCampus) {
        const campusResponse = await axios.post(
          `${API_BASE_URL}/super-admin/campuses`,
          {
            name: selectedCampus.name,
            displayName: selectedCampus.displayName
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        campusId = campusResponse.data.campus._id;
      } else {
        campusId = existingCampus._id;
      }

      // Create HR
      await axios.post(
        `${API_BASE_URL}/super-admin/hrs`,
        {
          name: hrFormData.name,
          email: hrFormData.email,
          password: hrFormData.password,
          campusId: campusId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowCreateHRModal(false);
      setHrFormData({ name: '', email: '', password: '', campusName: '' });
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
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
    setEditHRData({ _id: hr._id, name: hr.name, email: hr.email });
    setShowEditHRModal(true);
  };

  const handleEditHRSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/super-admin/hrs/${editHRData._id}`,
        { name: editHRData.name, email: editHRData.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('HR details updated successfully');
      setShowEditHRModal(false);
      setEditHRData({ _id: '', name: '', email: '' });
      await fetchHRs();
    } catch (error) {
      setError(error.response?.data?.msg || 'Failed to update HR details');
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-2 sm:p-4 md:p-6">
        {/* Header Section */}
        <div className="bg-secondary rounded-neumorphic shadow-outerRaised p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-primary text-center sm:text-left">Super Admin Dashboard</h1>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-neumorphic hover:shadow-innerSoft transition-all duration-300 w-full sm:w-auto"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-2 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 sm:mb-6 text-xs sm:text-base">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-secondary rounded-neumorphic shadow-outerRaised p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary text-white px-4 sm:px-6 py-2 sm:py-3 rounded-neumorphic hover:shadow-innerSoft transition-all duration-300 w-full sm:w-auto"
            >
              Create Principal Account
            </button>
            <button
              onClick={() => setShowCreateHRModal(true)}
              className="bg-green-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-neumorphic hover:shadow-innerSoft transition-all duration-300 w-full sm:w-auto"
            >
              Create HR Account
            </button>
          </div>
        </div>

        {/* Two-column layout for main sections on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Campuses & Principals Section */}
          <div className="bg-secondary rounded-neumorphic shadow-outerRaised p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-0">
            <h2 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">Campuses & Principals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {PREDEFINED_CAMPUSES.map((predefinedCampus) => {
                const campus = campuses.find(c => c.name === predefinedCampus.name) || predefinedCampus;
                const principal = campus.principalId;
                
                return (
                  <div
                    key={campus.name}
                    className="bg-white p-4 sm:p-6 rounded-lg shadow-innerSoft border border-gray-100 flex flex-col justify-between"
                  >
                    <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4">
                      {predefinedCampus.displayName}
                    </h3>
                    
                    {principal ? (
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-gray-600 text-xs sm:text-sm">Principal:</span>
                          <span className="font-medium text-xs sm:text-sm">{principal.name}</span>
                        </div>
                        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-gray-600 text-xs sm:text-sm">Email:</span>
                          <span className="font-medium text-xs sm:text-sm break-all">{principal.email}</span>
                        </div>
                        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-gray-600 text-xs sm:text-sm">Last Login:</span>
                          <span className="font-medium text-xs sm:text-sm">
                            {principal.lastLogin
                              ? new Date(principal.lastLogin).toLocaleString()
                              : 'Never'}
                          </span>
                        </div>
                        {/* <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-gray-600 text-xs sm:text-sm">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold
                            ${principal.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {principal.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div> */}
                        <div className="flex flex-row gap-2 mt-3 sm:mt-4 justify-end">
                          <button
                            onClick={() => handleEditPrincipal(principal)}
                            className="p-2 rounded-full bg-green-100 hover:bg-blue-200 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400"
                            aria-label="Edit Principal"
                            title="Edit Principal"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => handleResetPassword(principal._id)}
                            className="flex-1 bg-primary text-white px-3 py-2 rounded-md text-xs sm:text-sm font-medium  transition-colors"
                            aria-label="Reset Password"
                            title="Reset Password"
                          >
                            Reset Password
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-600 italic text-xs sm:text-base">No principal assigned</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* HR Management Section */}
          <div className="bg-secondary rounded-neumorphic shadow-outerRaised p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-primary mb-3 sm:mb-4">HR Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {hrs.map((hr) => (
                <div
                  key={hr._id}
                  className="bg-white p-4 sm:p-6 rounded-lg shadow-innerSoft border border-gray-100 flex flex-col justify-between"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4">
                    {hr.name}
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                      <span className="text-gray-600 text-xs sm:text-sm">Email:</span>
                      <span className="font-medium text-xs sm:text-sm break-all">{hr.email}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                      <span className="text-gray-600 text-xs sm:text-sm">Campus:</span>
                      <span className="font-medium text-xs sm:text-sm">{hr.campus.name}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                      <span className="text-gray-600 text-xs sm:text-sm">Last Login:</span>
                      <span className="font-medium text-xs sm:text-sm">
                        {hr.lastLogin
                          ? new Date(hr.lastLogin).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                    {/* <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                      <span className="text-gray-600 text-xs sm:text-sm">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${hr.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {hr.status}
                      </span>
                    </div> */}
                    <div className="flex flex-row gap-2 mt-3 sm:mt-4 justify-end">
                      <button
                        onClick={() => handleEditHR(hr)}
                        className="p-2 rounded-full bg-green-100 hover:bg-blue-200 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400"
                        aria-label="Edit HR"
                        title="Edit HR"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleResetHRPassword(hr._id)}
                        className="flex-1 bg-green-500 text-white px-3 py-2 rounded-md text-xs sm:text-sm font-medium  transition-colors"
                        aria-label="Reset Password"
                        title="Reset Password"
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Principal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Create Principal Account</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreatePrincipal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                <select
                  value={formData.campusName}
                  onChange={(e) => setFormData({...formData, campusName: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select a campus</option>
                  {PREDEFINED_CAMPUSES.map((campus) => {
                    const existingCampus = campuses.find(c => c.name === campus.name);
                    if (!existingCampus || !existingCampus.principalId) {
                      return (
                        <option key={campus.name} value={campus.name}>
                          {campus.displayName}
                        </option>
                      );
                    }
                    return null;
                  })}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                  Create Principal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create HR Modal - Similar styling to Create Principal Modal */}
      {showCreateHRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Create HR Account</h2>
              <button
                onClick={() => setShowCreateHRModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateHR} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={hrFormData.name}
                  onChange={(e) => setHrFormData({...hrFormData, name: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={hrFormData.email}
                  onChange={(e) => setHrFormData({...hrFormData, email: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={hrFormData.password}
                  onChange={(e) => setHrFormData({...hrFormData, password: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                <select
                  value={hrFormData.campusName}
                  onChange={(e) => setHrFormData({...hrFormData, campusName: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select a campus</option>
                  {PREDEFINED_CAMPUSES.map((campus) => (
                    <option key={campus.name} value={campus.name}>
                      {campus.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateHRModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                  Create HR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Reset Principal Password</h2>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleResetPasswordSubmit(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
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

      {/* Edit Principal Modal */}
      {showEditPrincipalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Edit Principal Details</h2>
              <button
                onClick={() => setShowEditPrincipalModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditPrincipalSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editPrincipalData.name}
                  onChange={e => setEditPrincipalData({ ...editPrincipalData, name: e.target.value })}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editPrincipalData.email}
                  onChange={e => setEditPrincipalData({ ...editPrincipalData, email: e.target.value })}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditPrincipalModal(false)}
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

      {/* Edit HR Modal */}
      {showEditHRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Edit HR Details</h2>
              <button
                onClick={() => setShowEditHRModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditHRSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editHRData.name}
                  onChange={e => setEditHRData({ ...editHRData, name: e.target.value })}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editHRData.email}
                  onChange={e => setEditHRData({ ...editHRData, email: e.target.value })}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditHRModal(false)}
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

      {/* Reset HR Password Modal */}
      {showResetHRPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Reset HR Password</h2>
              <button
                onClick={() => setShowResetHRPasswordModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleResetHRPasswordSubmit(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={resetHRPasswordData.newPassword}
                  onChange={e => setResetHRPasswordData({ ...resetHRPasswordData, newPassword: e.target.value })}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowResetHRPasswordModal(false)}
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
    </div>
  );
};

export default SuperAdminDashboard; 