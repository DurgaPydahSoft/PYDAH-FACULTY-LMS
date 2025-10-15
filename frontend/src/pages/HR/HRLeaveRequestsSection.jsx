import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaCheck, FaTimes, FaEye, FaComment } from 'react-icons/fa';
import { FaFilePdf } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const HRLeaveRequestsSection = ({ branches }) => {
  branches = branches || [];
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  
  // New states for HR actions
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve', 'reject', 'view'
  const [hrRemarks, setHrRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // States for Reports Modal
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    startDate: '',
    endDate: '',
    department: '',
    leaveType: '',
    status: '',
  });

  useEffect(() => {
    fetchLeaveRequests();
    // eslint-disable-next-line
  }, [search, status, department, leaveType, page, limit]);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {
        search,
        status,
        department,
        leaveType,
        page,
        limit,
      };
      const response = await axios.get(`${API_BASE_URL}/hr/leave-requests`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaveRequests(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to fetch leave requests. Please try again.', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
    setLoading(false);
  };

  const handleSearchChange = (e) => setSearch(e.target.value);
  const handleStatusChange = (e) => setStatus(e.target.value);
  const handleDepartmentChange = (e) => setDepartment(e.target.value);
  const handleLeaveTypeChange = (e) => setLeaveType(e.target.value);
  const handlePageChange = (newPage) => setPage(newPage);

  // HR Action Functions
  const handleAction = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setHrRemarks('');
    setShowActionModal(true);
  };


   // Handle report filter changes
  const handleReportFilterChange = (e) => {
    setReportFilters({ ...reportFilters, [e.target.name]: e.target.value });
  };

  // Download PDF function
  const handleDownloadReportPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {
        ...reportFilters,
        page: 1,
        limit: 1000, // Get all for report
      };
      const response = await axios.get(`${API_BASE_URL}/hr/leave-requests`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data || [];

      // If no data found
      if (!data.length) {
        toast.error('No data found for the selected filters.');
        return;
      }

      // Prepare data for PDF - sort by employee name
      const sortedData = [...data].sort((a, b) => {
        const nameA = a.employeeName || '';
        const nameB = b.employeeName || '';
        return nameA.localeCompare(nameB);
      });

      // Prepare leave data for PDF
      const leaveData = sortedData.map((lr, idx) => [
        idx + 1,
        lr.employeeName || '',
        lr.employeeEmployeeId || '',
        lr.employeeDepartment || '',
        lr.leaveType || '',
        new Date(lr.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }),
        new Date(lr.endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }),
        lr.numberOfDays || '',
        lr.status || '',
      ]);

      const leaveHeaders = [[
        'S. No', 'Employee Name', 'Employee ID', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status'
      ]];

      const doc = new jsPDF('landscape', 'mm', 'a4');
      const collegeName = 'Pydah College of Engineering';
      const collegeAddress = 'An Autonomous Institution Kakinada | Andhra Pradesh | INDIA';
      const contactNumber = 'Contact: +91 99513 54444';
      const now = new Date();
      const month = now.toLocaleString('en-US', { month: 'long' });
      const year = now.getFullYear();

      // Create title based on filters
      let title = `Leave Requests Report - ${month} - ${year}`;
      let fileName = `Leave_Requests_Report_${month}_${year}.pdf`;

      if (reportFilters.department) {
        const branchName = branches.find(b => b.code === reportFilters.department)?.name || reportFilters.department;
        title = `Leave Requests Report - ${branchName} - ${month} - ${year}`;
        fileName = `Leave_Requests_Report_${branchName.replace(/\s+/g, '_')}_${month}_${year}.pdf`;
      }

      const logoUrl = window.location.origin + '/PYDAH_LOGO_PHOTO.jpg';

      // Helper to draw the PDF (with or without logo)
      const drawPDF = (logoImg) => {
        if (logoImg) doc.addImage(logoImg, 'PNG', 10, 5, 60, 30);
        doc.setFont('times', 'bold');
        doc.setTextColor('#333');
        doc.setFontSize(24);
        doc.text(collegeName, doc.internal.pageSize.width / 2, 15, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(collegeAddress, doc.internal.pageSize.width / 2, 22, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#D35400');
        doc.setFontSize(16);
        doc.text(title, doc.internal.pageSize.width / 2, 35, { align: 'center' });

        // Draw Leave Requests table
        doc.setFontSize(14);
        doc.setTextColor('#333');
        doc.text('Leave Requests', doc.internal.pageSize.width / 2, 45, { align: 'center' });
        // Split data into chunks of 12 rows per page
        const rowsPerPage = 12;
        const dataChunks = [];
        for (let i = 0; i < leaveData.length; i += rowsPerPage) {
          dataChunks.push(leaveData.slice(i, i + rowsPerPage));
        }

        // Process each chunk (page)
        dataChunks.forEach((chunk, pageIndex) => {
          if (pageIndex > 0) {
            doc.addPage();
            // Re-add header elements for new page
            if (logoImg) doc.addImage(logoImg, 'PNG', 10, 5, 60, 30);
            doc.setFont('times', 'bold');
            doc.setTextColor('#333');
            doc.setFontSize(24);
            doc.text(collegeName, doc.internal.pageSize.width / 2, 15, { align: 'center' });
            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text(collegeAddress, doc.internal.pageSize.width / 2, 22, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#D35400');
            doc.setFontSize(16);
            doc.text(title, doc.internal.pageSize.width / 2, 35, { align: 'center' });

            doc.setFontSize(14);
            doc.setTextColor('#333');
            doc.text('Leave Requests', doc.internal.pageSize.width / 2, 45, { align: 'center' });
          }

          const isLastPage = pageIndex === dataChunks.length - 1;

          autoTable(doc, {
            startY: pageIndex === 0 ? 50 : 50,
            head: leaveHeaders,
            body: chunk,
            styles: { fontSize: 10, cellPadding: 3, halign: 'center' },
            headStyles: {
              fillColor: [255, 213, 128],
              textColor: [0, 0, 0],
              fontStyle: 'bold',
              halign: 'center',
            },
            theme: 'grid',
            margin: { left: 10, right: 10 },
            tableWidth: doc.internal.pageSize.width - 20,
            columnStyles: {
              0: { cellWidth: 'auto', halign: 'center' },
              1: { cellWidth: 'auto', halign: 'left' },
              2: { cellWidth: 'auto', halign: 'center' },
              3: { cellWidth: 'auto', halign: 'center' },
              4: { cellWidth: 'auto', halign: 'center' },
              5: { cellWidth: 'auto', halign: 'center' },
              6: { cellWidth: 'auto', halign: 'center' },
              7: { cellWidth: 'auto', halign: 'center' },
              8: { cellWidth: 'auto', halign: 'center' },
            },
            didDrawPage: function (data) {
              // Add footer (always add page numbers on every page)
              let pageHeight = doc.internal.pageSize.height;
              doc.setFontSize(10);
              doc.setTextColor('#333');
              doc.text(collegeName, 10, pageHeight - 15);
              doc.text(contactNumber, doc.internal.pageSize.width / 2, pageHeight - 15, { align: 'center' });
              let pageNumber = doc.internal.getNumberOfPages();
              doc.text(`Page ${pageNumber}`, doc.internal.pageSize.width - 20, pageHeight - 15);

              // Add signatures and timestamp only on the last page
              if (isLastPage) {
                let signatureY = data.cursor.y + 20;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');

                // HR Signature on the left
                doc.text('HR Signature', 30, signatureY);

                // Principal Signature on the right
                doc.text('Principal Signature', doc.internal.pageSize.width - 70, signatureY);

                // Add timestamp at the bottom center
                let timestamp = new Date().toLocaleString('en-US', {
                  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
                });
                doc.setFontSize(10);
                doc.text(`Generated on: ${timestamp}`, doc.internal.pageSize.width / 2, signatureY + 10, { align: 'center' });
              }
            }
          });
        });

        // Save the PDF
        doc.save(fileName);
      };

      // Try to load the logo, then draw the PDF
      const logoImg = new window.Image();
      logoImg.crossOrigin = 'Anonymous';
      logoImg.src = logoUrl;
      logoImg.onload = () => drawPDF(logoImg);
      logoImg.onerror = () => drawPDF(null);

      setShowReportsModal(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to download report. Please try again.');
    }
  };

  const handleSubmitAction = async () => {
    if (!selectedRequest) return;
    
    setActionLoading(true);
    
    // Show loading toast
    const loadingToastId = toast.loading(
      `${actionType === 'approve' ? 'Approving' : 'Rejecting'} leave request...`,
      {
        position: "top-right",
        autoClose: false,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
      }
    );
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE_URL}/hr/leave-requests/${selectedRequest._id}/update-status`,
        { 
          status: actionType === 'approve' ? 'Approved' : 'Rejected',
          hrRemarks 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Dismiss loading toast
        toast.dismiss(loadingToastId);
        
        // Show success toast
        toast.success(
          `Leave request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully!${
            response.data.leaveRequest?.clDays && response.data.leaveRequest?.lopDays 
              ? ` (CL: ${response.data.leaveRequest.clDays} days, LOP: ${response.data.leaveRequest.lopDays} days)`
              : ''
          }`,
          {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
        
        // Refresh the leave requests
        fetchLeaveRequests();
        setShowActionModal(false);
        setSelectedRequest(null);
        setHrRemarks('');
        setActionType('view');
      }
    } catch (error) {
      console.error('Error updating leave request:', error);
      
      // Dismiss loading toast
      toast.dismiss(loadingToastId);
      
      // Show error toast
      const errorMessage = error.response?.data?.msg || 'Failed to update leave request. Please try again.';
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedRequest(null);
    setHrRemarks('');
    setActionType('');
  };

  return (
    <div className="p-6 mt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-primary">Leave Requests</h2>
        <button
          onClick={() => setShowReportsModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          <FaFilePdf />
          Reports
        </button>
      </div>
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search by name, ID, email"
          value={search}
          onChange={handleSearchChange}
          className="p-2 rounded bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
        />
        <select value={status} onChange={handleStatusChange} className="p-2 rounded bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50">
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Forwarded by HOD">Forwarded by HOD</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <select
          value={department}
          onChange={handleDepartmentChange}
          className="p-2 rounded bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
        >
          <option value="">All Departments</option>
          {branches.map(branch => (
            <option key={branch.code} value={branch.code}>{branch.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Leave Type"
          value={leaveType}
          onChange={handleLeaveTypeChange}
          className="p-2 rounded bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
        />
      </div>
      {/* Table for md+ screens */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied On</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveRequests.map((lr) => (
                <tr 
                  key={lr._id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleAction(lr, 'view')}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.employeeName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.employeeEmployeeId}</td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.employeeEmail}</td> */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.employeeDepartment}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.leaveType}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold
                      ${lr.status === 'Approved'
                        ? 'bg-green-100 text-green-800'
                        : lr.status === 'Rejected'
                        ? 'bg-red-100 text-red-800'
                        : lr.status === 'Forwarded by HOD'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'}`}
                    >
                      {lr.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(lr.startDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(lr.endDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.appliedOn ? new Date(lr.appliedOn).toLocaleDateString() : ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lr.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Card layout for small screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 md:hidden">
        {leaveRequests.map((lr) => (
          <div 
            key={lr._id} 
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleAction(lr, 'view')}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{lr.employeeName}</h3>
                <p className="text-sm text-gray-500">{lr.employeeEmail}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold
                ${lr.status === 'Approved'
                  ? 'bg-green-100 text-green-800'
                  : lr.status === 'Rejected'
                  ? 'bg-red-100 text-red-800'
                  : lr.status === 'Forwarded by HOD'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-yellow-100 text-yellow-800'}`}
              >
                {lr.status}
              </span>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600"><strong>Employee ID:</strong> {lr.employeeEmployeeId}</div>
              <div className="text-sm text-gray-600"><strong>Department:</strong> {lr.employeeDepartment}</div>
              <div className="text-sm text-gray-600"><strong>Leave Type:</strong> {lr.leaveType}</div>
              <div className="text-sm text-gray-600"><strong>Start:</strong> {new Date(lr.startDate).toLocaleDateString()}</div>
              <div className="text-sm text-gray-600"><strong>End:</strong> {new Date(lr.endDate).toLocaleDateString()}</div>
              <div className="text-sm text-gray-600"><strong>Applied On:</strong> {lr.appliedOn ? new Date(lr.appliedOn).toLocaleDateString() : ''}</div>
              <div className="text-sm text-gray-600"><strong>Reason:</strong> {lr.reason}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <button
          disabled={page <= 1}
          onClick={() => handlePageChange(page - 1)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {page} of {Math.ceil(total / limit)}
        </span>
        <button
          disabled={page >= Math.ceil(total / limit)}
          onClick={() => handlePageChange(page + 1)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Next
        </button>
      </div>

      {/* HR Action Modal */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-primary">Leave Request Details</h3>
            
            {/* Request Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div><strong>Employee:</strong> {selectedRequest.employeeName}</div>
                <div><strong>ID:</strong> {selectedRequest.employeeEmployeeId}</div>
                <div><strong>Department:</strong> {selectedRequest.employeeDepartment}</div>
                <div><strong>Leave Type:</strong> {selectedRequest.leaveType}</div>
                <div><strong>Start Date:</strong> {new Date(selectedRequest.startDate).toLocaleDateString()}</div>
                <div><strong>End Date:</strong> {new Date(selectedRequest.endDate).toLocaleDateString()}</div>
                <div><strong>Days:</strong> {selectedRequest.numberOfDays}</div>
                <div><strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold
                    ${selectedRequest.status === 'Approved'
                      ? 'bg-green-100 text-green-800'
                      : selectedRequest.status === 'Rejected'
                      ? 'bg-red-100 text-red-800'
                      : selectedRequest.status === 'Forwarded by HOD'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'}`}
                  >
                    {selectedRequest.status}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <strong>Reason:</strong> {selectedRequest.reason}
              </div>
            </div>

            {/* HR Remarks (for approve/reject) */}
            {actionType !== 'view' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HR Remarks {actionType === 'approve' ? '(Optional)' : '*'}
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows="3"
                  placeholder={actionType === 'approve' ? 'Add any remarks for approval...' : 'Please provide reason for rejection...'}
                  value={hrRemarks}
                  onChange={(e) => setHrRemarks(e.target.value)}
                  required={actionType === 'reject'}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeActionModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={actionLoading}
              >
                Close
              </button>
              
              {/* Show approve/reject buttons only for "Forwarded by HOD" status and when not in action mode */}
              {selectedRequest.status === 'Forwarded by HOD' && actionType === 'view' && (
                <>
                  <button
                    onClick={() => {
                      setActionType('approve');
                      setHrRemarks('');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve Leave
                  </button>
                  <button
                    onClick={() => {
                      setActionType('reject');
                      setHrRemarks('');
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reject Leave
                  </button>
                </>
              )}
            </div>

            {/* Submit Action Buttons (shown when approve/reject is selected) */}
            {actionType !== 'view' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setActionType('view');
                      setHrRemarks('');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitAction}
                    disabled={actionLoading || (actionType === 'reject' && !hrRemarks.trim())}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      actionType === 'approve'
                        ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300'
                        : 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300'
                    }`}
                  >
                    {actionLoading ? 'Processing...' : 
                     actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

 {/* Reports Modal */}
  {showReportsModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4">
        <h3 className="text-xl font-bold mb-4 text-primary">Download Leave Requests Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={reportFilters.startDate}
              onChange={handleReportFilterChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              value={reportFilters.endDate}
              onChange={handleReportFilterChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Department/Branch</label>
            <select
              name="department"
              value={reportFilters.department}
              onChange={handleReportFilterChange}
              className="w-full border rounded px-2 py-1"
            >
              <option value="">All</option>
              {branches.map(branch => (
                <option key={branch.code} value={branch.code}>{branch.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Leave Type</label>
            <input
              type="text"
              name="leaveType"
              value={reportFilters.leaveType}
              onChange={handleReportFilterChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Leave Status</label>
            <select
              name="status"
              value={reportFilters.status}
              onChange={handleReportFilterChange}
              className="w-full border rounded px-2 py-1"
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Forwarded by HOD">Forwarded by HOD</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <button
            onClick={() => setShowReportsModal(false)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadReportPDF}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <FaFilePdf />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  )}


    </div>
    
  );

 

 

  
   
};

export default HRLeaveRequestsSection;
