import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import LeaveApplicationForm from "../../components/LeaveApplicationForm";
import CCLWorkRequestForm from '../../components/CCLWorkRequestForm';
import { createAuthAxios } from '../../utils/authAxios';
import config from '../../config';
import { FaUserCircle, FaRegCalendarCheck, FaHistory, FaCamera, FaTrash } from 'react-icons/fa';
import { MdOutlineLogout, MdOutlineWorkHistory } from 'react-icons/md';
import Loading from '../../components/Loading';
import EmployeeTasksSection from "./EmployeeTasksSection";

const API_BASE_URL = config.API_BASE_URL;

const EmployeeDashboard = () => {
  const [employee, setEmployee] = useState(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showCCLForm, setShowCCLForm] = useState(false);
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState('');
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [cclHistory, setCclHistory] = useState([]);
  const [cclWork, setCclWork] = useState([]);
  const [cclWorkHistory, setCclWorkHistory] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  const fetchEmployee = useCallback(async () => {
    const token = localStorage.getItem('token');
    const employeeId = localStorage.getItem('employeeId');

    if (!token || !employeeId) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      const authAxios = createAuthAxios(token);
      const response = await authAxios.get(`/employee/${employeeId}`);

      if (response.data) {
        setEmployee(response.data);
        // Sort leave requests by date, most recent first
        const sortedLeaves = (response.data.leaveRequests || []).sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setLeaveHistory(sortedLeaves);
        setError('');
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
      const errorMsg = error.response?.data?.message || 'Failed to fetch employee details';
      setError(errorMsg);
      toast.error(errorMsg);
      
      if (error.response?.status === 401) {
        localStorage.clear();
        navigate('/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchCCLHistory = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const authAxios = createAuthAxios(token);
      const response = await authAxios.get('/employee/ccl-history');
      if (response.data.success) {
        setCclHistory(response.data.data.cclHistory || []);
        setCclWork(response.data.data.cclWork || []);
      }
    } catch (error) {
      console.error('Error fetching CCL history:', error);
      toast.error('Failed to fetch CCL history');
    }
  }, []);

  const fetchCclWorkHistory = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const authAxios = createAuthAxios(token);
      const response = await authAxios.get('/employee/ccl-work-history');
      console.log('CCL Work History Response:', response.data); // Debug log
      
      if (response.data.success) {
        const workHistory = response.data.data || [];
        console.log('Setting CCL Work History:', workHistory); // Debug log
        setCclWorkHistory(workHistory);
      }
    } catch (error) {
      console.error('Error fetching CCL work history:', error);
      toast.error('Failed to fetch CCL work history');
    }
  }, []);

  useEffect(() => {
    fetchEmployee();
    fetchCCLHistory();
    fetchCclWorkHistory();
  }, [fetchEmployee, fetchCCLHistory, fetchCclWorkHistory]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const handleLeaveSubmit = (newLeaveRequest) => {
    setLeaveHistory(prev => [newLeaveRequest, ...prev]);
    setShowLeaveForm(false);
  };

  const handleCCLSubmit = async (newCCLWork) => {
    try {
      // Close the form
      setShowCCLForm(false);
      
      // Show success message
      toast.success('CCL work request submitted successfully');
      
      // Refresh both CCL history and work history
      await Promise.all([
        fetchCCLHistory(),
        fetchCclWorkHistory()
      ]);
    } catch (error) {
      console.error('Error handling CCL submission:', error);
      toast.error('Failed to refresh CCL history');
    }
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG and JPG are allowed.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);

    setUploadingProfile(true);
    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/employee/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setEmployee(prev => ({ ...prev, profilePicture: data.profilePicture }));
        toast.success('Profile picture updated successfully');
        setPreviewImage(null);
      } else {
        throw new Error(data.message || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    setUploadingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/employee/delete-profile-picture`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setEmployee(prev => ({ ...prev, profilePicture: null }));
        toast.success('Profile picture deleted successfully');
      } else {
        throw new Error(data.message || 'Failed to delete profile picture');
      }
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      toast.error(error.message || 'Failed to delete profile picture');
    } finally {
      setUploadingProfile(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen py-2 px-3 sm:py-4 sm:px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          {/* Profile Section */}
          <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="relative rounded-full overflow-hidden border-4 border-white shadow-lg w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 group mx-auto sm:mx-0">
              {previewImage || employee?.profilePicture ? (
                <img
                  src={previewImage || employee?.profilePicture || ''}
                  alt={employee?.name}
                    className="w-full h-full object-cover"
                  onError={e => { e.target.onerror = null; e.target.src = ''; }}
                />
              ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <FaUserCircle className="text-gray-400 text-4xl sm:text-5xl lg:text-6xl" />
                </div>
              )}
              {/* Overlay for actions */}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 sm:p-2 bg-white rounded-full shadow hover:bg-gray-100"
                  aria-label="Change profile picture"
                  disabled={uploadingProfile}
                >
                    <FaCamera className="text-gray-700 text-sm sm:text-lg lg:text-xl" />
                </button>
                {employee?.profilePicture && !previewImage && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                      className="ml-1.5 sm:ml-2 p-1.5 sm:p-2 bg-red-500 rounded-full shadow hover:bg-red-600"
                    aria-label="Remove profile picture"
                    disabled={uploadingProfile}
                  >
                      <FaTrash className="text-white text-sm sm:text-lg lg:text-xl" />
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePictureUpload}
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
                disabled={uploadingProfile}
              />
              {uploadingProfile && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-full z-20">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary mb-1 break-words leading-tight">Welcome, {employee?.name}</h1>
              <p className="text-gray-600 text-xs sm:text-sm">
                  <span className="font-medium">{employee?.employeeId}</span> • {employee?.department}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
              className="w-full sm:w-auto px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 justify-center text-sm sm:text-base font-medium shadow-sm"
          >
            <MdOutlineLogout className="text-lg" /> Logout
          </button>
        </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-primary/10 rounded-full p-2.5 sm:p-3 flex items-center justify-center">
                <FaRegCalendarCheck className="text-primary text-2xl sm:text-3xl" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm sm:text-base font-semibold text-primary mb-1">Leave Balance</h2>
                <div className="text-xl sm:text-2xl font-bold text-gray-800">{employee?.leaveBalance || 0} days</div>
            </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-green-500/10 rounded-full p-2.5 sm:p-3 flex items-center justify-center">
                <MdOutlineWorkHistory className="text-green-600 text-2xl sm:text-3xl" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm sm:text-base font-semibold text-green-600 mb-1">CCL Balance</h2>
                <div className="text-xl sm:text-2xl font-bold text-gray-800">{employee?.cclBalance || 0} days</div>
            </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => setShowLeaveForm(true)}
            className="w-full px-4 py-3.5 bg-primary text-white rounded-xl shadow-sm hover:bg-primary-dark transition-colors text-base sm:text-lg font-semibold flex items-center justify-center gap-3"
          >
            <FaRegCalendarCheck className="text-xl" /> Apply for Leave
          </button>
          <button
            onClick={() => setShowCCLForm(true)}
            className="w-full px-4 py-3.5 bg-green-500 text-white rounded-xl shadow-sm hover:bg-green-600 transition-colors text-base sm:text-lg font-semibold flex items-center justify-center gap-3"
          >
            <MdOutlineWorkHistory className="text-xl" /> Submit CCL Work
          </button>
        </div>

        {/* Employee Tasks Section */}
        <EmployeeTasksSection />
        {/* CCL Work History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <MdOutlineWorkHistory className="text-primary text-xl" />
            <h2 className="text-lg sm:text-xl font-semibold text-primary">CCL Work History</h2>
          </div>
          {/* Desktop Table */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Assigned By</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">HOD Remarks</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Principal Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cclWorkHistory && cclWorkHistory.length > 0 ? (
                  cclWorkHistory.map((work) => (
                    <tr key={work._id}>
                      <td className="px-6 py-4 whitespace-nowrap">{work.date ? new Date(work.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{work.assignedTo || '-'}</td>
                      <td className="px-6 py-4">{work.reason || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${work.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                            work.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>{work.status || 'Pending'}</span>
                      </td>
                      <td className="px-6 py-4">{work.hodRemarks || '-'}</td>
                      <td className="px-6 py-4">{work.principalRemarks || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No CCL work history found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {cclWorkHistory && cclWorkHistory.length > 0 ? (
              cclWorkHistory.map((work) => (
                <div key={work._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary text-sm mb-1">{work.assignedTo || 'Unassigned'}</h3>
                      <p className="text-xs text-gray-500 mb-2">
                        {work.date ? new Date(work.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No date'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ml-2 flex-shrink-0
                      ${work.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                        work.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>{work.status || 'Pending'}</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Reason</p>
                      <p className="text-sm text-gray-800">{work.reason || 'No reason provided'}</p>
                    </div>
                    {work.hodRemarks && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">HOD Remarks</p>
                        <p className="text-sm text-gray-800">{work.hodRemarks}</p>
                      </div>
                    )}
                    {work.principalRemarks && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Principal Remarks</p>
                        <p className="text-sm text-gray-800">{work.principalRemarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MdOutlineWorkHistory className="text-gray-300 text-4xl mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No CCL work history found</p>
              </div>
            )}
          </div>
        </div>

        {/* Leave History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <FaHistory className="text-primary text-xl" />
            <h2 className="text-lg sm:text-xl font-semibold text-primary">Leave History</h2>
          </div>
          {/* Desktop Table */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Leave Type</th>
                  <th className="px-4 py-2 text-left">Start Date</th>
                  <th className="px-4 py-2 text-left">End Date</th>
                  <th className="px-4 py-2 text-left">Days</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Applied On</th>
                </tr>
              </thead>
              <tbody>
                {leaveHistory.map((leave) => (
                  <tr
                    key={leave._id}
                    className="border-t cursor-pointer hover:bg-blue-50 transition"
                    onClick={() => setSelectedLeave(leave)}
                  >
                    <td className="px-4 py-2">{leave.leaveType}</td>
                    <td className="px-4 py-2">
                      {leave.isModifiedByPrincipal ? (
                        <div>
                          <div className="text-xs text-gray-500 line-through">{new Date(leave.startDate).toLocaleDateString()}</div>
                          <div className="font-medium">{new Date(leave.approvedStartDate).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        new Date(leave.startDate).toLocaleDateString()
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {leave.isModifiedByPrincipal ? (
                        <div>
                          <div className="text-xs text-gray-500 line-through">{new Date(leave.endDate).toLocaleDateString()}</div>
                          <div className="font-medium">{new Date(leave.approvedEndDate).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        new Date(leave.endDate).toLocaleDateString()
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {leave.isModifiedByPrincipal ? (
                        <div>
                          <div className="text-xs text-gray-500 line-through">{leave.numberOfDays}</div>
                          <div className="font-medium">{leave.approvedNumberOfDays}</div>
                        </div>
                      ) : (
                        leave.numberOfDays
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                        ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          leave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'}`}>
                        {leave.status}
                        {leave.isModifiedByPrincipal && leave.status === 'Approved' && (
                          <span className="ml-1 text-yellow-600">✏️</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2">{new Date(leave.appliedOn).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {leaveHistory.length > 0 ? (
              leaveHistory.map((leave) => (
                <div key={leave._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setSelectedLeave(leave)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary text-sm mb-1">{leave.leaveType}</h3>
                      <p className="text-xs text-gray-500 mb-2">
                        Applied: {new Date(leave.appliedOn).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ml-2 flex-shrink-0
                      ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        leave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'}`}>
                      {leave.status}
                      {leave.isModifiedByPrincipal && leave.status === 'Approved' && (
                        <span className="ml-1 text-yellow-600">✏️</span>
                      )}
                    </span>
                  </div>
                  <div className="space-y-2">
                  {leave.isModifiedByPrincipal ? (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Duration</p>
                        <div className="text-sm">
                          <div className="text-gray-500 line-through text-xs">
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()} ({leave.numberOfDays} days)
                          </div>
                          <div className="font-medium text-gray-800">
                            {new Date(leave.approvedStartDate).toLocaleDateString()} - {new Date(leave.approvedEndDate).toLocaleDateString()} ({leave.approvedNumberOfDays} days)
                          </div>
                        </div>
                    </div>
                  ) : (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Duration</p>
                        <p className="text-sm text-gray-800">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()} ({leave.numberOfDays} days)
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Reason</p>
                      <p className="text-sm text-gray-800 line-clamp-2">{leave.reason || 'No reason provided'}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FaHistory className="text-gray-300 text-4xl mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No leave history available</p>
              </div>
            )}
          </div>
        </div>

        {/* Leave Details Modal */}
        {selectedLeave && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 max-w-2xl w-full max-h-[95vh] overflow-y-auto relative">
              <button
                onClick={() => setSelectedLeave(null)}
                className="absolute top-3 right-3 text-gray-400 bg-gray-100 rounded-full p-1.5 hover:bg-gray-200 hover:text-gray-600 transition-colors z-10"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-primary">Leave Request Details</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-100 mb-2 flex flex-col items-start">
                  <p className="text-sm text-gray-600 font-semibold mb-1">Request ID</p>
                  <p className="font-mono text-base text-primary break-all">{selectedLeave.leaveRequestId}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Employee Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium break-words">{employee?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Employee ID</p>
                      <p className="font-medium break-words">{employee?.employeeId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium break-words">{employee?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Department</p>
                      <p className="font-medium break-words">{employee?.department}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Leave Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Leave Type</p>
                      <p className="font-medium break-words">{selectedLeave.leaveType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Applied On</p>
                      <p className="font-medium break-words">{selectedLeave.appliedOn ? new Date(selectedLeave.appliedOn).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                        ${selectedLeave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          selectedLeave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
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
                    
                    {selectedLeave.isModifiedByPrincipal ? (
                      <div className="col-span-1 sm:col-span-2">
                        <div className="bg-yellow-50 p-3 rounded-md border-l-4 border-yellow-400">
                          <h5 className="font-semibold text-yellow-800 mb-2">⚠️ Leave Dates Modified by Principal</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-sm text-gray-600 font-medium">Original Request:</p>
                              <p className="text-sm">{new Date(selectedLeave.startDate).toLocaleDateString()} to {new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                              <p className="text-sm text-gray-500">({selectedLeave.numberOfDays} days)</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 font-medium">Approved Dates:</p>
                              <p className="text-sm font-medium">{new Date(selectedLeave.approvedStartDate).toLocaleDateString()} to {new Date(selectedLeave.approvedEndDate).toLocaleDateString()}</p>
                              <p className="text-sm text-gray-500">({selectedLeave.approvedNumberOfDays} days)</p>
                            </div>
                          </div>
                          {selectedLeave.principalModificationReason && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600 font-medium">Modification Reason:</p>
                              <p className="text-sm">{selectedLeave.principalModificationReason}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-medium break-words">{new Date(selectedLeave.startDate).toLocaleDateString()} to {new Date(selectedLeave.endDate).toLocaleDateString()} ({selectedLeave.numberOfDays} days)</p>
                      </div>
                    )}
                    
                    <div className="col-span-1 sm:col-span-2">
                      <p className="text-sm text-gray-600">Reason</p>
                      <p className="font-medium break-words">{selectedLeave.reason || 'No reason provided'}</p>
                    </div>
                  </div>
                </div>
                {(selectedLeave.hodRemarks || selectedLeave.principalRemarks) && (
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Remarks</h4>
                    <div className="space-y-2">
                      {selectedLeave.hodRemarks && (
                        <div>
                          <p className="text-sm text-gray-600">HOD Remarks</p>
                          <p className="font-medium break-words">{selectedLeave.hodRemarks}</p>
                        </div>
                      )}
                      {selectedLeave.principalRemarks && (
                        <div>
                          <p className="text-sm text-gray-600">Principal Remarks</p>
                          <p className="font-medium break-words">{selectedLeave.principalRemarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedLeave.alternateSchedule && selectedLeave.alternateSchedule.length > 0 && (
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Alternate Schedule</h4>
                    <div className="space-y-4">
                      {selectedLeave.alternateSchedule.map((schedule, index) => (
                        <div key={index} className="bg-white p-2 sm:p-3 rounded-md">
                          <p className="font-medium mb-2">
                            Date: {schedule.date ? new Date(schedule.date).toLocaleDateString() : 'N/A'}
                          </p>
                          {schedule.periods && schedule.periods.length > 0 ? (
                            <div className="space-y-2">
                              {schedule.periods.map((period, pIndex) => (
                                <div key={pIndex} className="bg-gray-50 p-2 rounded">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-sm text-gray-600">Period:</span>{' '}
                                      <span className="font-medium">{period.periodNumber || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-sm text-gray-600">Class:</span>{' '}
                                      <span className="font-medium">{period.assignedClass || 'N/A'}</span>
                                    </div>
                                    <div className="col-span-1 sm:col-span-2">
                                      <span className="text-sm text-gray-600">Substitute Faculty:</span>{' '}
                                      <span className="font-medium text-sm sm:text-base break-words">
                                        {period.substituteFaculty ? (
                                          typeof period.substituteFaculty === 'object' ? 
                                            period.substituteFaculty.name || 'N/A' :
                                            period.substituteFaculty
                                        ) : 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">No periods assigned for this day</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leave Application Form Modal */}
      {showLeaveForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            <LeaveApplicationForm
              onSubmit={handleLeaveSubmit}
              onClose={() => setShowLeaveForm(false)}
              employee={employee}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* CCL Request Form Modal */}
      {showCCLForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            <CCLWorkRequestForm
              onSubmit={handleCCLSubmit}
              onClose={() => setShowCCLForm(false)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 text-center">
            <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <FaTrash className="text-red-500 text-2xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Profile Picture?</h3>
            <p className="text-gray-600 mb-6 text-sm">Are you sure you want to delete your profile picture? This action cannot be undone.</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                disabled={uploadingProfile}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProfilePicture}
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

export default EmployeeDashboard;