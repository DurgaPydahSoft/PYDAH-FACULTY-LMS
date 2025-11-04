import React, { useState, useRef } from 'react';
import { FaClock, FaUpload, FaFileExcel, FaDownload, FaTimes, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaCalendarAlt, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import config from '../../config';
import * as XLSX from 'xlsx';

const API_BASE_URL = config.API_BASE_URL;

const AttendanceManagementSection = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('upload'); // 'upload' or 'view'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceByDate, setAttendanceByDate] = useState(null);
  const [loadingDate, setLoadingDate] = useState(false);
  const fileInputRef = useRef(null);

  // Get status badge color
  const getStatusBadge = (status) => {
    const statusColors = {
      'Present': 'bg-green-100 text-green-800 border-green-300',
      'Absent': 'bg-red-100 text-red-800 border-red-300',
      'Half-Day Present': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Incomplete': 'bg-orange-100 text-orange-800 border-orange-300',
      'Leave': 'bg-purple-100 text-purple-800 border-purple-300',
      'Not Marked': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return statusColors[status] || statusColors['Not Marked'];
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
        toast.error('Please upload a valid Excel file (.xlsx, .xls) or CSV file');
        return;
      }
      
      setSelectedFile(file);
      handleFileUpload(file);
    }
  };

  // Handle file upload and get preview
  const handleFileUpload = async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/hr/attendance/preview`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Failed to upload file');
      }

      setPreviewData(data);
      toast.success(`File processed successfully! ${data.summary.total} records found.`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Failed to upload file');
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };

  // Submit attendance records
  const handleSubmitAttendance = async () => {
    if (!previewData || !previewData.preview || previewData.preview.length === 0) {
      toast.error('No attendance data to submit');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/hr/attendance/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          attendanceRecords: previewData.preview
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Failed to submit attendance');
      }

      toast.success(`Attendance submitted successfully! ${data.summary.successful} records saved, ${data.summary.updated} updated.`);
      setPreviewData(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh attendance by date if viewing
      if (viewMode === 'view') {
        fetchAttendanceByDate();
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      toast.error(error.message || 'Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  // Download Excel template
  const handleDownloadTemplate = () => {
    const templateData = [
      ['Employee ID', 'Date', 'In Time', 'Out Time'],
      ['EMP001', '2024-01-15', '09:00', '17:30'],
      ['EMP002', '2024-01-15', '09:15', '17:45']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Template');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Employee ID
      { wch: 12 }, // Date
      { wch: 10 }, // In Time
      { wch: 10 }  // Out Time
    ];

    XLSX.writeFile(wb, 'Attendance_Template.xlsx');
    toast.success('Template downloaded successfully!');
  };

  // Fetch attendance by date
  const fetchAttendanceByDate = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    setLoadingDate(true);
    try {
      const response = await fetch(`${API_BASE_URL}/hr/attendance/date/${selectedDate}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Failed to fetch attendance');
      }

      setAttendanceByDate(data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error(error.message || 'Failed to fetch attendance');
      setAttendanceByDate(null);
    } finally {
      setLoadingDate(false);
    }
  };

  // Handle date change
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'view') {
      fetchAttendanceByDate();
    }
  };

  return (
    <div className="p-6 mt-4">
      <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-3">
        <FaClock className="text-primary" /> Attendance Management
      </h2>

      {/* Mode Toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => handleViewModeChange('upload')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
              viewMode === 'upload'
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaUpload className="inline mr-2" /> Upload Attendance
          </button>
          <button
            onClick={() => handleViewModeChange('view')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
              viewMode === 'view'
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaCalendarAlt className="inline mr-2" /> View by Date
          </button>
        </div>
      </div>

      {/* Upload Mode */}
      {viewMode === 'upload' && (
        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaFileExcel className="text-primary" /> Upload Excel File
            </h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
                id="attendance-file-input"
              />
              <label
                htmlFor="attendance-file-input"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                <FaUpload className="text-4xl text-gray-400" />
                <div>
                  <p className="text-gray-700 font-medium">
                    {selectedFile ? selectedFile.name : 'Click to upload Excel file'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Supports .xlsx, .xls, and .csv files
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-4 flex gap-4">
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FaDownload /> Download Template
              </button>
            </div>
          </div>

          {/* Preview Section */}
          {loading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600">Processing file...</p>
            </div>
          )}

          {previewData && !loading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FaInfoCircle className="text-primary" /> Preview
                </h3>
                <button
                  onClick={() => {
                    setPreviewData(null);
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Header Mapping Info */}
              {previewData.headerMapping && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <FaInfoCircle /> Detected Header Mapping
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Employee ID:</span>
                      <span className={`px-2 py-1 rounded ${previewData.headerMapping.employeeId === 'Not Found' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {previewData.headerMapping.employeeId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Date:</span>
                      <span className={`px-2 py-1 rounded ${previewData.headerMapping.date === 'Not Found' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {previewData.headerMapping.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">In Time:</span>
                      <span className={`px-2 py-1 rounded ${previewData.headerMapping.inTime === 'Not Found' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {previewData.headerMapping.inTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Out Time:</span>
                      <span className={`px-2 py-1 rounded ${previewData.headerMapping.outTime === 'Not Found' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {previewData.headerMapping.outTime}
                      </span>
                    </div>
                  </div>
                  {previewData.headerMapping.detectedHeaders && (
                    <div className="mt-3 pt-3 border-t border-blue-300">
                      <p className="text-xs text-blue-700">
                        <span className="font-medium">All detected columns:</span> {previewData.headerMapping.detectedHeaders.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium">Total Records</p>
                  <p className="text-2xl font-bold text-blue-800">{previewData.summary.total}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-red-600 font-medium">Errors</p>
                  <p className="text-2xl font-bold text-red-800">{previewData.summary.errors}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-600 font-medium">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-800">{previewData.summary.warnings}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-600 font-medium">Existing</p>
                  <p className="text-2xl font-bold text-orange-800">{previewData.summary.withExistingAttendance}</p>
                </div>
              </div>

              {/* Errors */}
              {previewData.errors && previewData.errors.length > 0 && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <FaExclamationTriangle /> Errors
                  </h4>
                  <ul className="space-y-1 text-sm text-red-700">
                    {previewData.errors.map((error, idx) => (
                      <li key={idx}>
                        Row {error.row}: {error.employeeId ? `Employee ${error.employeeId} - ` : ''}{error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {previewData.warnings && previewData.warnings.length > 0 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                    <FaExclamationTriangle /> Warnings
                  </h4>
                  <ul className="space-y-1 text-sm text-yellow-700">
                    {previewData.warnings.map((warning, idx) => (
                      <li key={idx}>
                        Row {warning.row}: {warning.employeeId ? `Employee ${warning.employeeId} - ` : ''}{warning.warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">In Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Out Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Info</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.preview.map((record, idx) => (
                      <tr key={idx} className={record.hasExistingAttendance ? 'bg-orange-50' : ''}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.employeeId}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {record.employeeName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {record.date}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {record.inTime || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {record.outTime || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {record.leaveInfo ? (
                            <span className="text-xs">
                              {record.leaveInfo.leaveType}
                              {record.leaveInfo.isHalfDay && ` (Half-Day ${record.leaveInfo.session})`}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Submit Button */}
              {previewData.summary.errors === 0 && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSubmitAttendance}
                    disabled={submitting}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle /> Submit Attendance
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* View Mode */}
      {viewMode === 'view' && (
        <div className="space-y-6">
          {/* Date Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button
                onClick={fetchAttendanceByDate}
                disabled={loadingDate}
                className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingDate ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <FaSearch /> View Attendance
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          {attendanceByDate && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Attendance for {attendanceByDate.date}
                </h3>
                {attendanceByDate.summary && (
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 font-semibold">Present: {attendanceByDate.summary.present}</span>
                    <span className="text-red-600 font-semibold">Absent: {attendanceByDate.summary.absent}</span>
                    <span className="text-yellow-600 font-semibold">Half-Day: {attendanceByDate.summary.halfDay}</span>
                    <span className="text-gray-600 font-semibold">Not Marked: {attendanceByDate.summary.notMarked}</span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">In Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Out Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceByDate.attendance.map((record, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.employeeId}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {record.employeeName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {record.employeeDepartment}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {record.inTime || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {record.outTime || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceManagementSection;

