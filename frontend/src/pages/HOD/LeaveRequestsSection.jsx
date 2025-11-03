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
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state

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
    setIsSubmitting(false); // Reset loading state
  };

  const handleRemarksSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeave || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      if (actionType === 'approve') {
        await handleApproveLeave(selectedLeave._id, remarks);
      } else if (actionType === 'reject') {
        await handleRejectLeave(selectedLeave._id, remarks);
      }
      // Close modal only on success
      setShowRemarksModal(false);
      setSelectedLeave(null);
      setRemarks('');
      setActionType('');
    } catch (error) {
      // Error is handled by parent component, but keep modal open if there's an error
      console.error('Error submitting leave request action:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

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
    // Filter by leave type
    if (leaveTypeFilter) {
      filtered = filtered.filter(lr => lr.leaveType === leaveTypeFilter);
    }
    // Filter by date range
    if (startDateFilter || endDateFilter) {
      filtered = filtered.filter(lr => {
        if (!lr.startDate) return false;
        const leaveStartDate = new Date(lr.startDate);
        const leaveEndDate = new Date(lr.endDate || lr.startDate);
        leaveStartDate.setHours(0, 0, 0, 0);
        leaveEndDate.setHours(23, 59, 59, 999);
        
        if (startDateFilter && endDateFilter) {
          const filterStartDate = new Date(startDateFilter);
          const filterEndDate = new Date(endDateFilter);
          filterStartDate.setHours(0, 0, 0, 0);
          filterEndDate.setHours(23, 59, 59, 999);
          // Check if leave period overlaps with filter range
          return (leaveStartDate <= filterEndDate && leaveEndDate >= filterStartDate);
        } else if (startDateFilter) {
          const filterStartDate = new Date(startDateFilter);
          filterStartDate.setHours(0, 0, 0, 0);
          return leaveStartDate >= filterStartDate;
        } else if (endDateFilter) {
          const filterEndDate = new Date(endDateFilter);
          filterEndDate.setHours(23, 59, 59, 999);
          return leaveEndDate <= filterEndDate;
        }
        return true;
      });
    }
    
    // Sort: Pending first, then by most recent (descending startDate)
    return filtered.sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return 1;
      // Sort by startDate descending (most recent first)
      return new Date(b.startDate) - new Date(a.startDate);
    });
  }, [leaveRequests, search, statusFilter, leaveTypeFilter, startDateFilter, endDateFilter]);

  return (
    <div className="p-4 sm:p-6 mt-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-primary">Leave Requests</h2>
      </div>

      {/* Department Leave Requests */}
      <div className="mb-8">
        {/* Filters at the top */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-4">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by name, ID, email"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Forwarded by HOD">Forwarded by HOD</option>
              <option value="Forwarded to HR">Forwarded to HR</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              value={leaveTypeFilter}
              onChange={e => setLeaveTypeFilter(e.target.value)}
              className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            >
              <option value="">All Leave Types</option>
              <option value="CL">Casual Leave (CL)</option>
              <option value="CCL">Compensatory Leave (CCL)</option>
              <option value="OD">On Duty (OD)</option>
            </select>
          </div>
          {/* Date Range Filter */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Date Range Filter</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={e => setStartDateFilter(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={e => setEndDateFilter(e.target.value)}
                  min={startDateFilter || undefined}
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                />
              </div>
              {(startDateFilter || endDateFilter) && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setStartDateFilter('');
                      setEndDateFilter('');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition font-medium text-sm"
                  >
                    Clear Dates
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-primary mb-4">Department Leave Requests</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredSortedLeaveRequests.map((leave) => (
            <div key={leave._id} className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden group">
              {/* Header Section with Status */}
              <div className="bg-gradient-to-b from-primary to-gray-800 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/70 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg sm:text-xl">
                          {leave.employeeName?.charAt(0)?.toUpperCase() || 'E'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base sm:text-lg font-bold text-gray-300 truncate">{leave.employeeName}</h4>
                        <p className="text-xs sm:text-sm text-gray-300 truncate">{leave.employeeEmployeeId}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap ${
                    leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    leave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                    leave.status === 'Forwarded to HR' ? 'bg-purple-100 text-purple-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {leave.status === 'Rejected'
                      ? (leave.rejectionBy === 'HOD' ? 'Rejected by HOD' : leave.rejectionBy === 'Principal' ? 'Rejected by Principal' : leave.rejectionBy === 'HR' ? 'Rejected by HR' : 'Rejected')
                      : leave.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div className="flex items-center text-gray-300">
                    <MdEmail className="text-gray-50 mr-1.5 flex-shrink-0" />
                    <span className="truncate max-w-[150px] sm:max-w-none">{leave.employeeEmail}</span>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="px-4 sm:px-5 py-4 sm:py-5">
                <div className="space-y-3 sm:space-y-4 mb-4">
                  {/* Leave Type Badge */}
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">
                        {leave.leaveType === 'CL' ? 'Casual Leave' :
                         leave.leaveType === 'CCL' ? 'Compensatory Leave' :
                         leave.leaveType === 'OD' ? 'On Duty' :
                         leave.leaveType}
                      </span>
                    </div>
                    <div className="px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                      <span className="text-xs sm:text-sm font-semibold text-primary">
                        {leave.numberOfDays} {leave.numberOfDays === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">Duration</p>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 ml-6">
                      {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Reason Section */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">Reason</p>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed line-clamp-2 ml-6">
                      {leave.reason || 'No reason provided'}
                    </p>
                  </div>

                  {/* Additional Info */}
                  {((leave.leaveType === 'CCL' && Array.isArray(leave.cclWorkedDates) && leave.cclWorkedDates.length > 0) || (leave.leaveType === 'OD')) && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      {leave.leaveType === 'CCL' && Array.isArray(leave.cclWorkedDates) && leave.cclWorkedDates.length > 0 && (
                        <p className="text-xs sm:text-sm text-gray-700">
                          <strong className="text-gray-800">CCL Worked Days:</strong> {leave.cclWorkedDates.join(', ')}
                        </p>
                      )}
                      {leave.leaveType === 'OD' && (
                        <p className="text-xs sm:text-sm text-gray-700">
                          <strong className="text-gray-800">OD Duration:</strong> {leave.odTimeType === 'full' ? 'Full Day' : leave.odTimeType === 'custom' ? `Custom (${leave.odStartTime} - ${leave.odEndTime})` : leave.odTimeType || 'Full Day'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleViewDetails(leave)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-all text-xs sm:text-sm font-medium shadow-sm hover:shadow"
                    title="View Details"
                  >
                    <FaEye className="mr-1.5 sm:mr-2" />
                    View
                  </button>
                  {leave.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => openRemarksModal(leave, 'approve')}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all text-xs sm:text-sm font-medium shadow-sm hover:shadow"
                        title="Approve/Forward"
                      >
                        <FaCheck className="mr-1.5 sm:mr-2" />
                        Approve
                      </button>
                      <button
                        onClick={() => openRemarksModal(leave, 'reject')}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all text-xs sm:text-sm font-medium shadow-sm hover:shadow"
                        title="Reject"
                      >
                        <FaTimes className="mr-1.5 sm:mr-2" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave Details Modal */}
      {showLeaveDetailsModal && selectedLeaveForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-b from-primary to bg-gray-700 px-4 sm:px-6 py-3 sm:py-4 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-bold truncate">Leave Request Details</h2>
                    <p className="text-white/80 text-xs sm:text-sm flex items-center truncate">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary/30 rounded-full mr-1.5 sm:mr-2 animate-pulse flex-shrink-0"></span>
                      <span className="truncate">Employee Leave Application Information</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLeaveDetailsModal(false)}
                  className="text-white hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white hover:bg-opacity-10 flex-shrink-0 ml-2"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Employee Information Section */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-5">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="truncate">Employee Information</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                      <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{selectedLeaveForDetails.employeeName}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                      <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{selectedLeaveForDetails.employeeEmployeeId}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-sm sm:text-base text-gray-900 break-all">{selectedLeaveForDetails.employeeEmail}</p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <p className="text-sm sm:text-base text-gray-900 break-words">{selectedLeaveForDetails.employeePhoneNumber || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Leave Details Section */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-5">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">Leave Details</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                      <p className="text-sm sm:text-base font-medium text-gray-900">
                        {selectedLeaveForDetails.leaveType === 'CL' ? 'Casual Leave (CL)' :
                         selectedLeaveForDetails.leaveType === 'CCL' ? 'Compensatory Casual Leave (CCL)' :
                         selectedLeaveForDetails.leaveType === 'OD' ? 'On Duty (OD)' :
                         selectedLeaveForDetails.leaveType}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                        selectedLeaveForDetails.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        selectedLeaveForDetails.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        selectedLeaveForDetails.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                        selectedLeaveForDetails.status === 'Forwarded to HR' ? 'bg-purple-100 text-purple-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedLeaveForDetails.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <p className="text-sm sm:text-base text-gray-900">
                        {selectedLeaveForDetails.startDate ? new Date(selectedLeaveForDetails.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <p className="text-sm sm:text-base text-gray-900">
                        {selectedLeaveForDetails.endDate ? new Date(selectedLeaveForDetails.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Number of Days</label>
                      <p className="text-sm sm:text-base font-medium text-gray-900">{selectedLeaveForDetails.numberOfDays} {selectedLeaveForDetails.numberOfDays === 1 ? 'day' : 'days'}</p>
                    </div>
                    {selectedLeaveForDetails.leaveType === 'OD' && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">OD Duration</label>
                        <p className="text-sm sm:text-base text-gray-900 break-words">
                          {selectedLeaveForDetails.odTimeType === 'full' ? 'Full Day' :
                           selectedLeaveForDetails.odTimeType === 'custom' ? `Custom (${selectedLeaveForDetails.odStartTime} - ${selectedLeaveForDetails.odEndTime})` :
                           selectedLeaveForDetails.odTimeType || 'Full Day'}
                        </p>
                      </div>
                    )}
                    {selectedLeaveForDetails.leaveType === 'CCL' && Array.isArray(selectedLeaveForDetails.cclWorkedDates) && selectedLeaveForDetails.cclWorkedDates.length > 0 && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">CCL Worked Days</label>
                        <p className="text-sm sm:text-base text-gray-900 break-words">{selectedLeaveForDetails.cclWorkedDates.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason Section */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-5">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate">Reason for Leave</span>
                  </h3>
                  <p className="text-sm sm:text-base text-gray-900 leading-relaxed break-words">{selectedLeaveForDetails.reason || 'No reason provided'}</p>
                </div>

                {/* Remarks Section */}
                {selectedLeaveForDetails.remarks && (
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-5 border border-blue-200">
                    <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 sm:mb-4 flex items-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="truncate">Remarks</span>
                    </h3>
                    <p className="text-sm sm:text-base text-gray-900 leading-relaxed break-words">{selectedLeaveForDetails.remarks}</p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end space-x-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowLeaveDetailsModal(false)}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
              </div>
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
                disabled={isSubmitting}
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
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                  rows="3"
                  placeholder={actionType === 'approve' ? 'Optional remarks...' : 'Required remarks...'}
                  required={actionType === 'reject'}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowRemarksModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-all flex items-center justify-center gap-2 ${
                    actionType === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400' 
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                  } disabled:cursor-not-allowed disabled:opacity-75`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{actionType === 'approve' ? 'Processing...' : 'Rejecting...'}</span>
                    </>
                  ) : (
                    <span>{actionType === 'approve' ? 'Forward/Approve Leave' : 'Reject Leave'}</span>
                  )}
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