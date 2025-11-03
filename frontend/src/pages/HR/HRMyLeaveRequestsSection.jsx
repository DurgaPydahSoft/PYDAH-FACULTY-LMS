import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import config from '../../config';
import { useAuth } from '../../context/AuthContext';
import LeaveApplicationForm from '../../components/LeaveApplicationForm';

const API_BASE_URL = config.API_BASE_URL;

const HRMyLeaveRequestsSection = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(12);
  const [loading, setLoading] = useState(true);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/hr/my-leaves`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data.success) {
        setLeaveRequests(response.data.leaveRequests || []);
        setLeaveBalance(response.data.leaveBalance || 12);
      }
    } catch (error) {
      console.error('Error fetching HR leave requests:', error);
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSubmit = async (formData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/hr/my-leaves`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        toast.success(response.data.msg || 'Leave request submitted successfully');
        setShowLeaveForm(false);
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast.error(error.response?.data?.msg || 'Failed to submit leave request');
      throw error;
    }
  };

  const handleApproveReject = async (leaveRequestId, status, remarks) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/hr/my-leaves/${leaveRequestId}`,
        { status, remarks },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast.success(response.data.msg || `Leave request ${status.toLowerCase()} successfully`);
        setShowRemarksModal(false);
        setSelectedRequest(null);
        setRemarks('');
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error('Error updating leave request:', error);
      toast.error(error.response?.data?.msg || 'Failed to update leave request');
    }
  };

  const openRemarksModal = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setRemarks('');
    setShowRemarksModal(true);
  };

  const handleRemarksSubmit = (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    handleApproveReject(selectedRequest._id, actionType === 'approve' ? 'Approved' : 'Rejected', remarks);
  };

  const { user } = useAuth();

  // Create HR employee object for LeaveApplicationForm
  const hrEmployee = user ? {
    _id: user.id || user._id,
    name: user.name || 'HR',
    email: user.email || '',
    employeeType: 'non-teaching',
    campus: user.campus?.name || user.campus || '',
    department: 'HR'
  } : {
    _id: 'hr-id',
    name: 'HR',
    email: 'hr@example.com',
    employeeType: 'non-teaching',
    campus: 'engineering',
    department: 'HR'
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 mt-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary">My Leave Requests</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your leave applications</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <p className="text-xs text-blue-600 font-medium">Leave Balance</p>
            <p className="text-lg font-bold text-blue-800">{leaveBalance} days</p>
          </div>
          <button
            onClick={() => setShowLeaveForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Apply for Leave
          </button>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {leaveRequests.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-gray-500">No leave requests found</p>
            <button
              onClick={() => setShowLeaveForm(true)}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition"
            >
              Apply for Leave
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {request.leaveRequestId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {request.leaveType === 'CL' ? 'Casual Leave' :
                       request.leaveType === 'CCL' ? 'Compensatory Leave' :
                       request.leaveType === 'OD' ? 'On Duty' :
                       request.leaveType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {request.startDate ? new Date(request.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {request.endDate ? new Date(request.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {request.numberOfDays} {request.numberOfDays === 1 ? 'day' : 'days'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        request.status === 'Forwarded to SuperAdmin' ? 'bg-purple-100 text-purple-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.status === 'Rejected' && request.rejectionBy === 'HR' ? 'Rejected by HR' :
                         request.status === 'Rejected' && request.rejectionBy === 'SuperAdmin' ? 'Rejected by SuperAdmin' :
                         request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailsModal(true);
                        }}
                        className="text-primary hover:text-primary-dark"
                      >
                        View
                      </button>
                      {['Pending', 'Forwarded to SuperAdmin'].includes(request.status) && (
                        <>
                          <button
                            onClick={() => openRemarksModal(request, 'approve')}
                            className="text-green-600 hover:text-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRemarksModal(request, 'reject')}
                            className="text-red-600 hover:text-red-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leave Application Form Modal */}
      {showLeaveForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-primary">Apply for Leave</h3>
                <button
                  onClick={() => setShowLeaveForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <LeaveApplicationForm
                employee={hrEmployee}
                onSubmit={handleLeaveSubmit}
                onClose={() => setShowLeaveForm(false)}
                isHR={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Leave Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-primary">Leave Request Details</h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Request ID</label>
                  <p className="text-sm text-gray-900">{selectedRequest.leaveRequestId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                  <p className="text-sm text-gray-900">
                    {selectedRequest.leaveType === 'CL' ? 'Casual Leave (CL)' :
                     selectedRequest.leaveType === 'CCL' ? 'Compensatory Casual Leave (CCL)' :
                     selectedRequest.leaveType === 'OD' ? 'On Duty (OD)' :
                     selectedRequest.leaveType}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <p className="text-sm text-gray-900">
                    {selectedRequest.startDate ? new Date(selectedRequest.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <p className="text-sm text-gray-900">
                    {selectedRequest.endDate ? new Date(selectedRequest.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Days</label>
                  <p className="text-sm text-gray-900">{selectedRequest.numberOfDays} {selectedRequest.numberOfDays === 1 ? 'day' : 'days'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedRequest.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    selectedRequest.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    selectedRequest.status === 'Forwarded to SuperAdmin' ? 'bg-purple-100 text-purple-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedRequest.status === 'Rejected' && selectedRequest.rejectionBy === 'HR' ? 'Rejected by HR' :
                     selectedRequest.status === 'Rejected' && selectedRequest.rejectionBy === 'SuperAdmin' ? 'Rejected by SuperAdmin' :
                     selectedRequest.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <p className="text-sm text-gray-900">{selectedRequest.reason || 'No reason provided'}</p>
                </div>
                {selectedRequest.remarks && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <p className="text-sm text-gray-900">{selectedRequest.remarks}</p>
                  </div>
                )}
                {selectedRequest.superAdminRemarks && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SuperAdmin Remarks</label>
                    <p className="text-sm text-gray-900">{selectedRequest.superAdminRemarks}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject Remarks Modal */}
      {showRemarksModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm md:max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">
                {actionType === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h2>
              <button
                onClick={() => {
                  setShowRemarksModal(false);
                  setSelectedRequest(null);
                  setRemarks('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRemarksSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  rows="3"
                  placeholder={actionType === 'approve' ? 'Optional remarks...' : 'Required remarks...'}
                  required={actionType === 'reject'}
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowRemarksModal(false);
                    setSelectedRequest(null);
                    setRemarks('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionType === 'approve' ? 'Approve Leave' : 'Reject Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRMyLeaveRequestsSection;

