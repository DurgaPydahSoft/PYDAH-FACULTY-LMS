import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import LeaveApplicationForm from "../components/LeaveApplicationForm";
import CCLWorkRequestForm from '../components/CCLWorkRequestForm';
import { createAuthAxios } from '../utils/authAxios';
import config from '../config';
import { FaUserCircle, FaRegCalendarCheck, FaHistory, FaCamera, FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { MdOutlineLogout, MdOutlineWorkHistory } from 'react-icons/md';
import Loading from '../components/Loading';

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
  
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const [expandedCclId, setExpandedCclId] = useState(null);
  const [expandedLeaveId, setExpandedLeaveId] = useState(null);

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
        // Sort leave requests by start date, most recent first
        const sortedLeaves = (response.data.leaveRequests || []).sort((a, b) => 
          new Date(b.startDate) - new Date(a.startDate)
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
        // Sort CCL work history by date, most recent first
        const sortedWorkHistory = workHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log('Setting CCL Work History:', sortedWorkHistory); // Debug log
        setCclWorkHistory(sortedWorkHistory);
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
    <div className="min-h-screen bg-gradient-to-br from-black-50 to-yellow-100">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-300 to-blue-300 rounded-lg shadow-md mb-6 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-grow min-w-0">
            {/* Profile Image */}
            <div className="relative group w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
              <div className="rounded-full overflow-hidden w-full h-full border-2 border-gray-200 shadow-sm">
                {previewImage || employee?.profilePicture ? (
                  <img
                    src={previewImage || employee?.profilePicture}
                    alt={employee?.name}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.onerror = null; e.target.src = ''; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <FaUserCircle className="text-gray-400 text-3xl" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-gray-200 transition"
                  aria-label="Change profile picture"
                  disabled={uploadingProfile}
                >
                  <FaCamera className="text-gray-700 text-lg" />
                </button>
                {employee?.profilePicture && !previewImage && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="ml-2 p-2 bg-red-500 rounded-full shadow-md hover:bg-red-600 transition"
                    aria-label="Remove profile picture"
                    disabled={uploadingProfile}
                  >
                    <FaTrash className="text-white text-lg" />
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
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-full z-20">
                  <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-md sm:text-lg font-bold text-black"> Welcome, {employee?.name}</h1>
              <p className="text-sm text-gray-600 truncate">{employee?.employeeId} • {employee?.department}</p>
            </div>
          </div>
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-red-500 text-white rounded-full sm:rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center font-semibold flex-shrink-0"
          >
            <MdOutlineLogout className="text-lg sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {/* Leave Balance Card */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 flex items-center justify-between transform hover:scale-105 transition-transform duration-300">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-700">Leave Balance</h2>
              <div className="text-3xl sm:text-4xl font-bold text-gray-800">{employee?.leaveBalance || 0}</div>
            </div>
            <FaRegCalendarCheck className="text-4xl sm:text-5xl text-blue-500 opacity-50" />
          </div>
          {/* CCL Balance Card */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 flex items-center justify-between transform hover:scale-105 transition-transform duration-300">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-700">CCL Balance</h2>
              <div className="text-3xl sm:text-4xl font-bold text-gray-800">{employee?.cclBalance || 0}</div>
            </div>
            <MdOutlineWorkHistory className="text-4xl sm:text-5xl text-green-500 opacity-50" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setShowLeaveForm(true)}
            className="w-full sm:w-auto flex-1 py-3 px-6 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-all duration-300 font-semibold flex items-center justify-center gap-2 transform hover:-translate-y-1"
          >
            <FaRegCalendarCheck className="text-lg" />
            <span>Apply Leave</span>
          </button>
          <button
            onClick={() => setShowCCLForm(true)}
            className="w-full sm:w-auto flex-1 py-3 px-6 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition-all duration-300 font-semibold flex items-center justify-center gap-2 transform hover:-translate-y-1"
          >
            <MdOutlineWorkHistory className="text-2xl" />
            <span>Submit CCL</span>
          </button>
        </div>

        {/* CCL Work History */}
        <div className="bg-white rounded-lg shadow-md p-2 sm:p-4 mb-6">
          <h2 className="text-md sm:text-lg font-bold text-gray-800 mb-4">CCL Work History</h2>
          
          {/* Table for medium screens and up */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned By</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cclWorkHistory && cclWorkHistory.length > 0 ? (
                  cclWorkHistory.map((work) => (
                    <tr key={work._id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-700">{work.date ? new Date(work.date).toLocaleDateString() : '-'}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-700">{work.assignedTo || '-'}</td>
                      <td className="px-2 py-2 text-sm text-gray-700 truncate max-w-xs">{work.reason || '-'}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${work.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                            work.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>{work.status || 'Pending'}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-10 text-center text-gray-500">No CCL work history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Cards for small screens */}
          <div className="sm:hidden space-y-3">
            {cclWorkHistory && cclWorkHistory.length > 0 ? (
              cclWorkHistory.map((work) => (
                <div key={work._id} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{work.date ? new Date(work.date).toLocaleDateString() : '-'}</p>
                      <p className="text-sm text-gray-600">Assigned By: {work.assignedTo || '-'}</p>
                    </div>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${work.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                        work.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>{work.status || 'Pending'}</span>
                  </div>
                  <p className="text-sm text-gray-700"><span className="font-semibold">Reason:</span> {work.reason || '-'}</p>
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-gray-500">No CCL work history found.</div>
            )}
          </div>
        </div>

        {/* Leave History */}
        <div className="bg-white rounded-lg shadow-md p-2 sm:p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <FaHistory className="mr-2" /> Leave History
          </h2>
          {leaveHistory.length > 0 ? (
            <div className="space-y-4">
              {leaveHistory.map((leave) => (
                <div key={leave._id} className="border rounded-lg overflow-hidden">
                  <div
                    className="bg-gray-50 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedLeaveId(expandedLeaveId === leave._id ? null : leave._id)}
                  >
                    <div className="min-w-0 flex-grow">
                      <p className="font-semibold text-gray-800 truncate">{leave.leaveType}</p>
                      <p className="text-sm text-gray-600 truncate">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          leave.status === 'Approved'
                            ? 'bg-green-100 text-green-800'
                            : leave.status === 'Rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {leave.status}
                      </span>
                      <button>
                        {expandedLeaveId === leave._id ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    </div>
                  </div>

                  {expandedLeaveId === leave._id && (
                    <div className="p-4 bg-white border-t">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold text-gray-700">Duration</p>
                          <p>{leave.numberOfDays} day(s)</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700">Reason</p>
                          <p className="break-words">{leave.reason}</p>
                        </div>
                        {leave.hodRemarks && (
                          <div>
                            <p className="font-semibold text-gray-700">HOD Remarks</p>
                            <p className="break-words">{leave.hodRemarks}</p>
                          </div>
                        )}
                        {leave.principalRemarks && (
                          <div>
                            <p className="font-semibold text-gray-700">Principal Remarks</p>
                            <p className="break-words">{leave.principalRemarks}</p>
                          </div>
                        )}
                      </div>

                      {leave.alternateSchedule && leave.alternateSchedule.length > 0 && (
                        <div className="mt-4">
                          <p className="font-semibold text-gray-700 mb-2">Alternate Schedule</p>
                          {leave.alternateSchedule.map((daySchedule, dayIndex) => (
                            <div key={dayIndex} className="mb-2">
                              <p className="font-semibold text-sm">{new Date(daySchedule.date).toLocaleDateString()}</p>
                              
                              {/* Table for medium screens and up */}
                              <div className="hidden sm:block overflow-x-auto">
                                <table className="min-w-full text-sm divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase">Period</th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase">Assigned Class</th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-600 uppercase">Substitute Faculty</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {daySchedule.periods.map((period, periodIndex) => (
                                      <tr key={periodIndex}>
                                        <td className="px-3 py-2 whitespace-nowrap">{period.periodNumber}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{period.assignedClass}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{period.substituteFaculty ? period.substituteFaculty.name : 'N/A'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Cards for small screens */}
                              <div className="sm:hidden space-y-2 mt-1">
                                {daySchedule.periods.map((period, periodIndex) => (
                                  <div key={periodIndex} className="border rounded-lg p-3 text-sm bg-gray-50">
                                    <p><span className="font-semibold">Period:</span> {period.periodNumber}</p>
                                    <p><span className="font-semibold">Class:</span> {period.assignedClass}</p>
                                    <p><span className="font-semibold">Faculty:</span> {period.substituteFaculty ? period.substituteFaculty.name : 'N/A'}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <FaHistory className="mx-auto text-4xl mb-2" />
              <p>No leave history found.</p>
            </div>
          )}
        </div>

        {/* Leave/CCL Modals */}
        {(showLeaveForm || showCCLForm) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full max-h-full overflow-y-auto">
              {showLeaveForm && (
                <LeaveApplicationForm
                  onSubmit={handleLeaveSubmit}
                  onClose={() => setShowLeaveForm(false)}
                  employee={employee}
                />
              )}
              {showCCLForm && (
                <CCLWorkRequestForm
                  onSubmit={handleCCLSubmit}
                  onClose={() => setShowCCLForm(false)}
                />
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FaTrash className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete Profile Picture</h3>
              <p className="mt-2 text-sm text-gray-500">Are you sure? This action is irreversible.</p>
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  disabled={uploadingProfile}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProfilePicture}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={uploadingProfile}
                >
                  {uploadingProfile ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
