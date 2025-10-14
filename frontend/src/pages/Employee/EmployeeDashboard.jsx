import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import LeaveApplicationForm from "../../components/LeaveApplicationForm";
import CCLWorkRequestForm from '../../components/CCLWorkRequestForm';
import { createAuthAxios } from '../../utils/authAxios';
import config from '../../config';
import { FaUserCircle, FaRegCalendarCheck, FaHistory, FaCamera, FaTrash } from 'react-icons/fa';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Loading from '../../components/Loading';
import EmployeeTasksSection from "./EmployeeTasksSection";
import EmployeeSidebar from './EmployeeSidebar';
import EmployeeDashboardSection from './EmployeeDashboardSection';
import EmployeeCCLWorkHistorySection from './EmployeeCCLWorkHistorySection';
import EmployeeLeaveHistorySection from './EmployeeLeaveHistorySection';
import EmployeeProfileSection from './EmployeeProfileSection';

const API_BASE_URL = config.API_BASE_URL;

const EmployeeDashboard = () => {
  const [employee, setEmployee] = useState(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
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

  const handleDeleteLeave = async (leave) => {
    try {
      if (!leave || !leave._id) return;
      if (leave.status !== 'Pending') {
        toast.error('Only pending leave requests can be deleted');
        return;
      }

      const confirmed = window.confirm('Delete this leave request? This cannot be undone.');
      if (!confirmed) return;

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/employee/leave-request/${leave._id}` , {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Try to parse JSON; fallback to text to avoid HTML parse errors
      const contentType = response.headers.get('content-type') || '';
      let payload = null;
      if (contentType.includes('application/json')) {
        try {
          payload = await response.json();
        } catch (_) {
          payload = null;
        }
      } else {
        // Consume body to avoid stream lock; ignore content
        try { await response.text(); } catch (_) {}
      }
      if (!response.ok) {
        const message = (payload && (payload.msg || payload.message)) || 'Failed to delete leave request';
        throw new Error(message);
      }

      setLeaveHistory(prev => prev.filter(l => l._id !== leave._id));
      setSelectedLeave(prev => (prev && prev._id === leave._id ? null : prev));
      toast.success('Leave request deleted');
    } catch (error) {
      console.error('Delete leave error:', error);
      toast.error(error.message || 'Failed to delete leave request');
    }
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
    <div className="min-h-screen  bg-gradient-to-t from-green-50 via-blue-100 to-blue-300">
      <EmployeeSidebar activeSection={activeSection} onSectionChange={setActiveSection} employee={employee} />
      <div className="lg:pl-64 py-2 px-3 sm:py-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6  lg:space-y-8">
        {/* Header */}
        <div className="bg-gray-100 rounded-xl shadow-sm border hidden border-gray-100 p-4 sm:p-6">
          <div className="flex justify-center ">
            <DotLottieReact 
              src="https://lottie.host/e6ff0b4d-b519-4509-a423-1ff4a4c520d3/1g7wwRt38G.lottie" 
              loop 
              autoplay 
              style={{ width: '150px', height: '150px' }}
            />
          </div>
          
          {/* Profile Section */}
          <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-center  gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="relative rounded-full overflow-hidden hidden border-4 border-white shadow-lg w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 group mx-auto sm:mx-0">
              {previewImage || employee?.profilePicture ? (
                <img
                  src={previewImage || employee?.profilePicture || ''}
                  alt={employee?.name}
                    className="w-full h-full object-cover"
                  onError={e => { e.target.onerror = null; e.target.src = ''; }}
                />
              ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <FaUserCircle className="text-green-400 text-4xl sm:text-5xl lg:text-6xl" />
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
          {/* <button
            onClick={handleLogout}
              className="w-full sm:w-auto px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 justify-center text-sm sm:text-base font-medium shadow-sm"
          >
            <MdOutlineLogout className="text-lg" /> Logout
          </button> */}
        </div>
        </div>

        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <EmployeeDashboardSection
            employee={employee}
            onApplyLeave={() => setShowLeaveForm(true)}
            onSubmitCCL={() => setShowCCLForm(true)}
          />
        )}
        {activeSection === 'ccl' && (
          <>
            {/* CCL Work History only */}
            {/* We reuse existing CCL work history block below */}
          </>
        )}
        {/* CCL Work History */}
        {(activeSection === 'dashboard' || activeSection === 'ccl') && (
          <EmployeeCCLWorkHistorySection cclWorkHistory={cclWorkHistory} />
        )}

        {/* Leave History */}
        {(activeSection === 'dashboard' || activeSection === 'leaves') && (
          <EmployeeLeaveHistorySection
            leaveHistory={leaveHistory}
            onSelect={(leave) => setSelectedLeave(leave)}
            onDelete={handleDeleteLeave}
          />
        )}

        {activeSection === 'tasks' && (
          <EmployeeTasksSection />
        )}

        {activeSection === 'profile' && (
          <EmployeeProfileSection employee={employee} />
        )}

        {/* Leave Details Modal */}
        {selectedLeave && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-gray-100 rounded-xl shadow-xl p-4 sm:p-6 max-w-2xl w-full max-h-[95vh] overflow-y-auto relative">
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

                    {/* CL/LOP Split Display */}
    {selectedLeave.leaveType === 'CL' && (
      <>
        <div>
          <p className="text-sm text-gray-600">CL Days</p>
          <p className="font-medium break-words">{selectedLeave.clDays ?? 0}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">LOP Days</p>
          <p className="font-medium break-words">{selectedLeave.lopDays ?? 0}</p>
        </div>
      </>
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