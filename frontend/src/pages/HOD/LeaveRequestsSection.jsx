import { useState, useMemo } from 'react';
import { FaCheck, FaTimes, FaEye } from 'react-icons/fa';
import { MdEmail, MdPhone, MdPerson } from 'react-icons/md';

const LeaveRequestsSection = ({
  leaveRequests,
  handleApproveLeave,
  handleRejectLeave,
}) => {
  // Ensure arrays are properly initialized
  const safeLeaveRequests = Array.isArray(leaveRequests) ? leaveRequests : [];

  const [showLeaveDetailsModal, setShowLeaveDetailsModal] = useState(false);
  const [selectedLeaveForDetails, setSelectedLeaveForDetails] = useState(null);

  // Modal state for approve/reject
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'

  const handleViewDetails = (leave) => {
    setSelectedLeaveForDetails(leave);
    setShowLeaveDetailsModal(true);
  };

  // Unified handler for both approve and reject
  const openRemarksModal = (leave, type) => {
    setSelectedLeave(leave);
    setActionType(type);
    setRemarks('');
    setShowRemarksModal(true);
  };

  const handleRemarksSubmit = (e) => {
    e.preventDefault();
    if (!selectedLeave) return;
    if (actionType === 'approve') {
      handleApproveLeave(selectedLeave._id, remarks);
    } else if (actionType === 'reject') {
      handleRejectLeave(selectedLeave._id, remarks);
    }
    setShowRemarksModal(false);
    setSelectedLeave(null);
    setRemarks('');
    setActionType('');
  };

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');

  // Filter and sort leave requests
  const filteredSortedLeaveRequests = useMemo(() => {
    let filtered = Array.isArray(leaveRequests) ? leaveRequests : [];
    // Filter by search
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(lr =>
        lr.employeeName?.toLowerCase().includes(s) ||
        lr.employeeEmployeeId?.toLowerCase().includes(s) ||
        lr.employeeEmail?.toLowerCase().includes(s)
      );
    }
    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter(lr => lr.status === statusFilter);
    }
    
    // Sort: Pending first, then by most recent (descending startDate)
    return filtered.sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return 1;
      // Sort by startDate descending (most recent first)
      return new Date(b.startDate) - new Date(a.startDate);
    });
  }, [leaveRequests, search, statusFilter, leaveTypeFilter]);

  return (
    <div className="p-4 sm:p-6 mt-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-primary">Leave Requests</h2>
      </div>

      {/* Department Leave Requests */}
      <div className="mb-8">
        {/* Filters at the top */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by name, ID, email"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="p-2 rounded bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="p-2 rounded bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-primary mb-4">Department Leave Requests</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSortedLeaveRequests.map((leave) => (
            <div key={leave._id} className="bg-white rounded-xl shadow p-4 sm:p-6">
              <div className="flex flex-col items-start mb-4">
                <h4 className="text-md sm:text-lg font-semibold text-primary">{leave.employeeName}</h4>
                <span className={`mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                  leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                  leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {leave.status}
                </span>
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-2">
                  <MdEmail className="text-primary" /> {leave.employeeEmail}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MdPerson className="text-primary" /> {leave.employeeEmployeeId}
                </p>
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Leave Type:</strong> {leave.leaveType}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Duration:</strong> {leave.startDate} to {leave.endDate}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Days:</strong> {leave.numberOfDays}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Reason:</strong> {leave.reason}
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => handleViewDetails(leave)}
                  className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  title="View Details"
                >
                  View
                </button>
                {leave.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => openRemarksModal(leave, 'approve')}
                      className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                      title="Approve/Forward"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => openRemarksModal(leave, 'reject')}
                      className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                      title="Reject"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave Details Modal */}
      {showLeaveDetailsModal && selectedLeaveForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Leave Request Details</h2>
              <button
                onClick={() => setShowLeaveDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee</label>
                  <p className="text-lg text-gray-900">{selectedLeaveForDetails.employeeName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedLeaveForDetails.employeeEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                  <p className="text-gray-900">{selectedLeaveForDetails.employeeEmployeeId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900">{selectedLeaveForDetails.employeePhoneNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Leave Type</label>
                  <p className="text-gray-900">{selectedLeaveForDetails.leaveType}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <p className="text-gray-900">{selectedLeaveForDetails.startDate}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <p className="text-gray-900">{selectedLeaveForDetails.endDate}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Number of Days</label>
                  <p className="text-gray-900">{selectedLeaveForDetails.numberOfDays}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedLeaveForDetails.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    selectedLeaveForDetails.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedLeaveForDetails.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <p className="text-gray-900 mt-1">{selectedLeaveForDetails.reason}</p>
            </div>
            {selectedLeaveForDetails.remarks && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <p className="text-gray-900 mt-1">{selectedLeaveForDetails.remarks}</p>
              </div>
            )}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowLeaveDetailsModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject with Remarks Modal */}
      {showRemarksModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm md:max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">
                {actionType === 'approve' ? 'Forward/Approve Leave Request' : 'Reject Leave Request'}
              </h2>
              <button
                onClick={() => setShowRemarksModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-700 mb-4">
              {actionType === 'approve'
                ? 'You may add remarks before forwarding/approving this leave request (optional).'
                : 'Please provide a reason for rejecting this leave request.'}
            </p>
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
                  onClick={() => setShowRemarksModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {actionType === 'approve' ? 'Forward/Approve Leave' : 'Reject Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequestsSection;