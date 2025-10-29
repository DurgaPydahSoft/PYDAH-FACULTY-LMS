import React, { useState, useEffect } from 'react';
import { FaPrint, FaFilePdf } from 'react-icons/fa';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axiosInstance from '../../utils/axiosConfig';
import LeaveDateEditModal from '../../components/LeaveDateEditModal';
import RemarksModal from '../../components/RemarksModal';

const LeavesManagement = ({
    branches = [],
    forwardedLeaves = [],
    cclWorkRequests = [],
    onLeavesUpdate,
    onCCLUpdate,
    token,
    loading = false
}) => {
    const [leaveFilters, setLeaveFilters] = useState({
        startDate: '',
        endDate: '',
        department: '',
        status: 'Forwarded by HOD'
    });
    const [cclFilters, setCclFilters] = useState({
        startDate: '',
        endDate: '',
        department: '',
        status: 'Forwarded to Principal'
    });
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [selectedLeaveForEdit, setSelectedLeaveForEdit] = useState(null);
    const [showDateEditModal, setShowDateEditModal] = useState(false);
    const [showRemarksModal, setShowRemarksModal] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [selectedAction, setSelectedAction] = useState(null);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [selectedCCLWork, setSelectedCCLWork] = useState(null);
    const [showCCLRemarksModal, setShowCCLRemarksModal] = useState(false);
    const [cclRemarks, setCclRemarks] = useState('');
    const [leavePage, setLeavePage] = useState(1);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportIncludeCCL, setExportIncludeCCL] = useState(true);
    const [exportIncludeSummary, setExportIncludeSummary] = useState(true);
    const [showLeaveDetailsModal, setShowLeaveDetailsModal] = useState(false);
    const [isSubmittingRemarks, setIsSubmittingRemarks] = useState(false);

    const LEAVES_PER_PAGE = 15;

   // Apply complete client-side filtering for leaves
const filteredLeaves = forwardedLeaves.filter(leave => {
  // Filter by status
  if (leaveFilters.status && leaveFilters.status !== 'All') {
    if (leave.status !== leaveFilters.status) {
      return false;
    }
  }

  // Filter by date range
  if (leaveFilters.startDate || leaveFilters.endDate) {
    const leaveStartDate = new Date(leave.startDate);
    const filterStart = leaveFilters.startDate ? new Date(leaveFilters.startDate) : null;
    const filterEnd = leaveFilters.endDate ? new Date(leaveFilters.endDate) : null;

    if (filterStart && filterEnd) {
      if (!(leaveStartDate >= filterStart && leaveStartDate <= filterEnd)) return false;
    } else if (filterStart) {
      if (!(leaveStartDate >= filterStart)) return false;
    } else if (filterEnd) {
      if (!(leaveStartDate <= filterEnd)) return false;
    }
  }

  // Filter by department - Check multiple possible field names
  if (leaveFilters.department) {
    const employeeDept = leave.employeeDepartment || 
                         leave.employee?.department || 
                         leave.department ||
                         leave.employee?.branchCode;
    
    console.log('Department filter check:', {
      filter: leaveFilters.department,
      employeeDept,
      leaveData: leave
    });
    
    if (employeeDept !== leaveFilters.department) {
      return false;
    }
  }

  return true;
});

// Apply complete client-side filtering for CCL requests
const filteredCCL = cclWorkRequests.filter(ccl => {
  // Filter by status
  if (cclFilters.status && cclFilters.status !== 'All') {
    if (ccl.status !== cclFilters.status) {
      return false;
    }
  }

  // Filter by date range
  if (cclFilters.startDate || cclFilters.endDate) {
    const cclDate = new Date(ccl.date);
    const filterStart = cclFilters.startDate ? new Date(cclFilters.startDate) : null;
    const filterEnd = cclFilters.endDate ? new Date(cclFilters.endDate) : null;

    if (filterStart && filterEnd) {
      if (!(cclDate >= filterStart && cclDate <= filterEnd)) return false;
    } else if (filterStart) {
      if (!(cclDate >= filterStart)) return false;
    } else if (filterEnd) {
      if (!(cclDate <= filterEnd)) return false;
    }
  }

  // Filter by department - Check multiple possible field names
  if (cclFilters.department) {
    const employeeDept = ccl.employeeDepartment || 
                        ccl.employee?.department || 
                        ccl.department ||
                        ccl.employee?.branchCode;
    
    console.log('CCL Department filter check:', {
      filter: cclFilters.department,
      employeeDept,
      cclData: ccl
    });
    
    if (employeeDept !== cclFilters.department) {
      return false;
    }
  }

  return true;
});

    // Calculate paginated leaves and CCLs
   // Calculate paginated leaves and CCLs
const allLeaveRows = [
  ...filteredLeaves.map(leave => ({ ...leave, _isLeave: true })),
  ...filteredCCL.map(ccl => ({ ...ccl, _isLeave: false })) // Use filteredCCL instead of cclWorkRequests
];
    const totalLeavePages = Math.ceil(allLeaveRows.length / LEAVES_PER_PAGE) || 1;
    const paginatedLeaveRows = allLeaveRows.slice((leavePage - 1) * LEAVES_PER_PAGE, leavePage * LEAVES_PER_PAGE);

    const handleLeaveAction = async (action) => {
        if (!selectedLeave) return;

        try {
            console.log('Updating leave request:', {
                leaveId: selectedLeave._id,
                action,
                remarks,
                token: token ? 'Present' : 'Missing'
            });

            const response = await axiosInstance.put(
                `/principal/leave-request/${selectedLeave._id}`,
                {
                    action: action.toLowerCase() === "approved" ? "approve" : "reject",
                    remarks: remarks || `${action.toLowerCase()} by Principal`
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.status === 200) {
                toast.success(`Leave request ${action.toLowerCase()} successfully`);
                setSelectedLeave(null);
                setRemarks('');
                onLeavesUpdate(); // Refresh the leave requests
            }
        } catch (error) {
            console.error('Error updating leave request:', error);
            toast.error(error.response?.data?.msg || 'Failed to update leave request');
        }
    };

    const handleApproveWithDates = async (requestData) => {
        try {
            const response = await axiosInstance.put(
                `/principal/leave-request/${selectedLeaveForEdit._id}`,
                requestData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.status === 200) {
                toast.success('Leave request approved successfully!');
                onLeavesUpdate(); // Refresh the data
                setShowDateEditModal(false);
                setSelectedLeaveForEdit(null);
            }
        } catch (error) {
            console.error('Error approving leave request:', error);
            toast.error(error.response?.data?.msg || 'Error approving leave request');
        }
    };

    const handleRejectWithDates = async (requestData) => {
        try {
            const response = await axiosInstance.put(
                `/principal/leave-request/${selectedLeaveForEdit._id}`,
                requestData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.status === 200) {
                toast.success('Leave request rejected successfully!');
                onLeavesUpdate(); // Refresh the data
                setShowDateEditModal(false);
                setSelectedLeaveForEdit(null);
            }
        } catch (error) {
            console.error('Error rejecting leave request:', error);
            toast.error(error.response?.data?.msg || 'Error rejecting leave request');
        }
    };

    const handleRemarksSubmit = async (remarks) => {
        if (!selectedRequestId || !selectedAction) {
            console.error('Missing required data:', { selectedRequestId, selectedAction });
            return;
        }

        try {
            setIsSubmittingRemarks(true);
            const response = await axiosInstance.put(
                `/principal/leave-request/${selectedRequestId}`,
                {
                    action: selectedAction,
                    remarks: remarks || `${selectedAction === 'approve' ? 'Approved' : 'Rejected'} by Principal`
                }
            );

            if (response.data) {
                setSelectedRequestId(null);
                setSelectedAction(null);
                setShowRemarksModal(false);
                setRemarks('');
                toast.success(response.data.msg || 'Leave request updated successfully');
                onLeavesUpdate(); // Refresh leaves
            }
        } catch (error) {
            console.error('Error updating leave request:', error);
            toast.error(error.response?.data?.msg || 'Failed to update leave request');
        } finally {
            setIsSubmittingRemarks(false);
        }
    };

    // Handle CCL work request action
    const handleCCLWorkAction = async (status) => {
        try {
            if (!selectedCCLWork) return;

            console.log('Updating CCL work request:', {
                requestId: selectedCCLWork._id,
                status,
                remarks: cclRemarks || `${status} by Principal`
            });

            const response = await axiosInstance.put(
                `/principal/ccl-work-requests/${selectedCCLWork._id}`,
                {
                    status,
                    remarks: cclRemarks || `${status} by Principal`
                }
            );

            console.log('CCL work request update response:', response.data);

            if (response.data.success) {
                setSelectedCCLWork(null);
                setCclRemarks('');
                setShowCCLRemarksModal(false);
                toast.success(response.data.message || 'CCL work request updated successfully');
                onCCLUpdate(); // Refresh CCL requests
            } else {
                toast.error(response.data.message || 'Failed to update CCL work request');
            }
        } catch (error) {
            console.error('Error updating CCL work request:', error);
            toast.error(error.response?.data?.message || 'Failed to update CCL work request');
        }
    };

    const exportToPDF = (pdfIncludeCCL = true, pdfIncludeSummary = true) => {
        if (!forwardedLeaves.length && !cclWorkRequests.length) {
            alert('No requests to export for the current filters.');
            return;
        }

        // Filter leave requests by date range and status
        const filteredLeaves = forwardedLeaves.filter(leave => {
            // Filter by date range
            if (leaveFilters.startDate || leaveFilters.endDate) {
                const leaveStartDate = new Date(leave.startDate);
                const filterStart = leaveFilters.startDate ? new Date(leaveFilters.startDate) : null;
                const filterEnd = leaveFilters.endDate ? new Date(leaveFilters.endDate) : null;

                if (filterStart && filterEnd) {
                    if (!(leaveStartDate >= filterStart && leaveStartDate <= filterEnd)) return false;
                } else if (filterStart) {
                    if (!(leaveStartDate >= filterStart)) return false;
                } else if (filterEnd) {
                    if (!(leaveStartDate <= filterEnd)) return false;
                }
            }

            // Filter by department
            if (leaveFilters.department && leave.employeeDepartment !== leaveFilters.department) {
                return false;
            }

            // Filter by status - only include approved requests
            if (leave.status !== 'Approved') {
                return false;
            }

            return true;
        });

        // Sort filteredLeaves by department, then by employee name
        const sortedLeaves = [...filteredLeaves].sort((a, b) => {
            const deptA = (a.employeeDepartment || a.employee?.department || '').toLowerCase();
            const deptB = (b.employeeDepartment || b.employee?.department || '').toLowerCase();
            if (deptA < deptB) return -1;
            if (deptA > deptB) return 1;
            const nameA = (a.employeeName || a.employee?.name || '').toLowerCase();
            const nameB = (b.employeeName || b.employee?.name || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        // PDF export: use modified dates/days if isModifiedByPrincipal
        const leaveData = sortedLeaves.map((lr, idx) => [
            idx + 1,
            lr.employeeName || lr.employee?.name || '',
            lr.employeeEmployeeId || lr.employee?.employeeId || '',
            lr.employeeDepartment || lr.employee?.department || '',
            lr.leaveType || lr.type || '',
            lr.isModifiedByPrincipal
                ? new Date(lr.approvedStartDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
                : new Date(lr.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }),
            lr.isModifiedByPrincipal
                ? new Date(lr.approvedEndDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
                : new Date(lr.endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }),
            lr.isModifiedByPrincipal ? lr.approvedNumberOfDays || '' : lr.numberOfDays || '',
            lr.status || '',
        ]);

        // Filter CCL requests by date range and status
        const filteredCCL = pdfIncludeCCL ? cclWorkRequests.filter(ccl => {
            // Filter by date range
            if (cclFilters.startDate || cclFilters.endDate) {
                const cclDate = new Date(ccl.date);
                const filterStart = cclFilters.startDate ? new Date(cclFilters.startDate) : null;
                const filterEnd = cclFilters.endDate ? new Date(cclFilters.endDate) : null;

                if (filterStart && filterEnd) {
                    if (!(cclDate >= filterStart && cclDate <= filterEnd)) return false;
                } else if (filterStart) {
                    if (!(cclDate >= filterStart)) return false;
                } else if (filterEnd) {
                    if (!(cclDate <= filterEnd)) return false;
                }
            }

            // Filter by department
            if (cclFilters.department && ccl.employeeDepartment !== cclFilters.department) {
                return false;
            }

            // Filter by status - only include approved requests
            if (ccl.status !== 'Approved') {
                return false;
            }

            return true;
        }) : [];

        if (!filteredLeaves.length && !filteredCCL.length) {
            alert('No approved requests found in the selected date range.');
            return;
        }

        // Sort filteredCCL by department, then by employee name
        const sortedCCL = [...filteredCCL].sort((a, b) => {
            const deptA = (a.employeeDepartment || a.employee?.department || '').toLowerCase();
            const deptB = (b.employeeDepartment || b.employee?.department || '').toLowerCase();
            if (deptA < deptB) return -1;
            if (deptA > deptB) return 1;
            const nameA = (a.employeeName || a.employee?.name || '').toLowerCase();
            const nameB = (b.employeeName || b.employee?.name || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        const cclData = sortedCCL.map((ccl, idx) => [
            idx + 1,
            ccl.employeeName || ccl.employee?.name || '',
            ccl.cclRequestId || `CCL${new Date(ccl.date).getFullYear()}${ccl.employeeDepartment?.substring(0, 3).toUpperCase()}${ccl._id.toString().slice(-4)}`,
            ccl.employeeEmployeeId || 'N/A',
            ccl.employeeDepartment || 'N/A',
            new Date(ccl.date).toLocaleDateString(),
            ccl.assignedTo || 'N/A',
            ccl.reason || '',
            ccl.status || 'N/A'
        ]);

        const leaveHeaders = [[
            'S. No', 'Employee Name', 'Employee ID', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status'
        ]];

        const cclHeaders = [[
            'S. No', 'Name', 'Employee ID', 'Dept', 'Date', 'Assigned To', 'Reason', 'Status'
        ]];

        // Create PDF in A4 portrait mode
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 5; // 15mm margin on all sides
        const contentWidth = pageWidth - (2 * margin);

        const collegeName = 'Pydah College of Engineering';
        const collegeAddress = 'An Autonomous Institution Kakinada | Andhra Pradesh | INDIA';
        const contactNumber = 'Contact: +91 99513 54444';
        const now = new Date();
        const month = now.toLocaleString('en-US', { month: 'long' });
        const year = now.getFullYear();
        const title = `Leave Requests - ${month} - ${year}`;
        const logoUrl = window.location.origin + '/PYDAH_LOGO_PHOTO.jpg';

        // Helper to draw the PDF (with or without logo)
        const drawPDF = (logoImg) => {
            let currentY = margin;

            // Header Section
            if (logoImg) {
                doc.addImage(logoImg, 'PNG', margin, currentY, 40, 25);
            }

            // College name and details - centered
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text(collegeName, pageWidth / 2, currentY + 8, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(collegeAddress, pageWidth / 2, currentY + 14, { align: 'center' });
            doc.text(contactNumber, pageWidth / 2, currentY + 19, { align: 'center' });

            currentY += 30;

            // Title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(211, 84, 0); // Orange color
            doc.text(title, pageWidth / 2, currentY, { align: 'center' });
            currentY += 10;

            // Horizontal line
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 8;

            // Function to check if we need a new page
            const checkPageBreak = (requiredHeight) => {
                if (currentY + requiredHeight > pageHeight - margin) {
                    doc.addPage();
                    currentY = margin;
                    return true;
                }
                return false;
            };

            // Leave Requests table
            if (sortedLeaves.length > 0) {
                checkPageBreak(20);


                autoTable(doc, {
                    startY: currentY,
                    head: leaveHeaders,
                    body: leaveData,
                    margin: { left: margin, right: margin },
                    styles: {
                        fontSize: 8,
                        cellPadding: 2,
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1
                    },
                    headStyles: {
                        fillColor: [255, 213, 128],
                        textColor: [0, 0, 0],
                        fontStyle: 'bold',
                        lineWidth: 0.1
                    },
                    theme: 'grid',
                    tableWidth: contentWidth,
                    columnStyles: {
                        0: { cellWidth: 12, halign: 'center' }, // S. No
                        1: { cellWidth: 30, halign: 'left' },   // Employee Name
                        2: { cellWidth: 25, halign: 'center' }, // Employee ID
                        3: { cellWidth: 25, halign: 'center' }, // Department
                        4: { cellWidth: 20, halign: 'center' }, // Leave Type
                        5: { cellWidth: 25, halign: 'center' }, // Start Date
                        6: { cellWidth: 25, halign: 'center' }, // End Date
                        7: { cellWidth: 15, halign: 'center' }, // Days
                        8: { cellWidth: 20, halign: 'center' }, // Status
                    },
                    didDrawPage: (data) => {
                        currentY = data.cursor.y + 5;
                    }
                });

                currentY = doc.lastAutoTable.finalY + 10;
            }

            // CCL Work Requests table
            if (pdfIncludeCCL && sortedCCL.length > 0) {
                checkPageBreak(20);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                doc.text('CCL Work Requests', margin, currentY);
                currentY += 5;

                autoTable(doc, {
                    startY: currentY,
                    head: cclHeaders,
                    body: cclData,
                    margin: { left: margin, right: margin },
                    styles: {
                        fontSize: 8,
                        cellPadding: 2,
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1
                    },
                    headStyles: {
                        fillColor: [255, 213, 128],
                        textColor: [0, 0, 0],
                        fontStyle: 'bold',
                        lineWidth: 0.1
                    },
                    theme: 'grid',
                    tableWidth: contentWidth,
                    columnStyles: {
                        0: { cellWidth: 12, halign: 'center' }, // S. No
                        1: { cellWidth: 25, halign: 'left' },   // Name
                        2: { cellWidth: 25, halign: 'center' }, // Employee ID
                        3: { cellWidth: 20, halign: 'center' }, // Dept
                        4: { cellWidth: 20, halign: 'center' }, // Date
                        5: { cellWidth: 25, halign: 'center' }, // Assigned To
                        6: { cellWidth: 35, halign: 'left', overflow: 'linebreak' }, // Reason
                        7: { cellWidth: 18, halign: 'center' }, // Status
                    },
                    didDrawPage: (data) => {
                        currentY = data.cursor.y + 5;
                    }
                });

                currentY = doc.lastAutoTable.finalY + 10;
            }

            // Summary Table
            if (pdfIncludeSummary) {
                // Build summary from filtered, approved leave and CCL requests
                const summaryMap = {};
                allLeaveRows.filter(row => row.status === 'Approved').forEach(row => {
                    const name = row.employeeName || row.employee?.name || 'Unknown';
                    if (!summaryMap[name]) {
                        summaryMap[name] = { CCL: 0, OD: 0, CL: 0 };
                    }
                    let type = row.leaveType || row.type;
                    let days = row.isModifiedByPrincipal ? row.approvedNumberOfDays : row.numberOfDays;
                    if (!type && row._isLeave === false) type = 'CCL';
                    if (type === 'CCL' || (row._isLeave === false)) summaryMap[name].CCL += Number(days) || 0;
                    else if (type === 'OD') summaryMap[name].OD += Number(days) || 0;
                    else if (type === 'CL') summaryMap[name].CL += Number(days) || 0;
                });

                const sortedNames = Object.keys(summaryMap).sort();
                const summaryData = sortedNames.map(name => [
                    name,
                    summaryMap[name].CCL,
                    summaryMap[name].OD,
                    summaryMap[name].CL
                ]);

                const summaryHeaders = [[
                    'Employee Name', 'CCL Approved', 'OD Approved', 'CL Approved'
                ]];

                if (sortedNames.length > 0) {
                    checkPageBreak(20);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.setTextColor(0, 0, 0);
                    doc.text('Summary (Approved Requests)', margin, currentY);
                    currentY += 5;

                    autoTable(doc, {
                        startY: currentY,
                        head: summaryHeaders,
                        body: summaryData,
                        margin: { left: margin, right: margin },
                        styles: {
                            fontSize: 8,
                            cellPadding: 2,
                            lineColor: [0, 0, 0],
                            lineWidth: 0.1
                        },
                        headStyles: {
                            fillColor: [255, 213, 128],
                            textColor: [0, 0, 0],
                            fontStyle: 'bold',
                            lineWidth: 0.1
                        },
                        theme: 'grid',
                        tableWidth: contentWidth,
                        columnStyles: {
                            0: { cellWidth: 60, halign: 'left' },   // Employee Name
                            1: { cellWidth: 30, halign: 'center' }, // CCL Approved
                            2: { cellWidth: 30, halign: 'center' }, // OD Approved
                            3: { cellWidth: 30, halign: 'center' }, // CL Approved
                        },
                        didDrawPage: (data) => {
                            currentY = data.cursor.y + 5;
                        }
                    });

                    currentY = doc.lastAutoTable.finalY + 10;
                }
            }

            // Footer Section
            const finalY = Math.max(currentY, pageHeight - 25);

            // Timestamp
            const timestamp = new Date().toLocaleString('en-US', {
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
            });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${timestamp}`, margin, finalY);

            // Page number
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }

            // Principal signature on last page
            doc.setPage(pageCount);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text('Principal Signature', pageWidth - margin - 40, finalY, { align: 'right' });

            // Save the PDF
            const fileName = pdfIncludeCCL ?
                `Leave_and_CCL_Requests_${month}_${year}.pdf` :
                `Leave_Requests_${month}_${year}.pdf`;
            doc.save(fileName);
        };

        // Try to load the logo, then draw the PDF
        const logoImg = new window.Image();
        logoImg.crossOrigin = 'Anonymous';
        logoImg.src = logoUrl;
        logoImg.onload = () => drawPDF(logoImg);
        logoImg.onerror = () => drawPDF(null);
    };

    const handlePrintFilteredRequests = () => {
        if (!forwardedLeaves.length && !cclWorkRequests.length) {
            alert('No requests to print for the current filters.');
            return;
        }
        const leaveRows = forwardedLeaves.map(lr => `
      <tr>
      <td>${lr.employeeName || lr.employee?.name || ''}</td>
        <td>${lr.leaveRequestId || ''}</td>
        
        <td>${lr.employeeEmployeeId || lr.employee?.employeeId || ''}</td>
        <td>${lr.employeeDepartment || lr.employee?.department || ''}</td>
        <td>${lr.leaveType || lr.type || ''}</td>
        <td>${lr.startDate ? new Date(lr.startDate).toLocaleDateString() : ''} - ${lr.endDate ? new Date(lr.endDate).toLocaleDateString() : ''}</td>
        <td>${lr.numberOfDays || ''}</td>
        <td>${lr.status}</td>
      </tr>
    `).join('');
        const cclRows = cclWorkRequests.map(ccl => `
      <tr>
      <td>${ccl.employeeName || 'Unknown'}</td>
        <td>${ccl.cclRequestId || `CCLW${new Date(ccl.date).getFullYear()}${ccl.employeeDepartment?.substring(0, 3).toUpperCase()}${ccl._id.toString().slice(-4)}`}</td>
        
        <td>${ccl.employeeEmployeeId || 'N/A'}</td>
        <td>${ccl.employeeDepartment || 'N/A'}</td>
        <td>CCL Work</td>
        <td>${new Date(ccl.date).toLocaleDateString()}</td>
        <td>${ccl.assignedTo || ''}</td>
        <td>${ccl.reason || ''}</td>
        <td>${ccl.status}</td>
      </tr>
    `).join('');
        const tableRows = leaveRows + cclRows;
        const printWindow = window.open('', '', 'width=900,height=700');
        printWindow.document.write(`
      <html>
        <head>
          <title>Filtered Leave Requests</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #333; padding: 8px; text-align: left; }
            th { background: #f3f3f3; }
          </style>
        </head>
        <body>
          <h2>Filtered Leave Requests</h2>
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Name</th>
                <th>Emp ID</th>
                <th>Department</th>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>No of Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const clearLeaveFilters = () => {
        setLeaveFilters({
            startDate: '',
            endDate: '',
            department: '',
            status: 'Forwarded by HOD'
        });
    };

    const handleRecentLeaveClick = (leaveId) => {
        const leave = forwardedLeaves.find(l => l._id === leaveId);
        if (leave) {
            setSelectedLeave(leave);
            setShowLeaveDetailsModal(true);
        }
    };

    const handleRecentCCLClick = (cclId) => {
        const ccl = cclWorkRequests.find(w => w._id === cclId);
        if (ccl) {
            setSelectedCCLWork(ccl);
            setShowCCLRemarksModal(true);
        }
    };

    if (loading) {
        return (
            <div className="p-6 mt-4">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 mt-4">
            <h2 className="text-2xl font-bold text-primary mb-6">Leave Requests</h2>

            {/* Print Button for Approved Requests */}
            <div className="flex justify-end mb-4 gap-2">
                <button
                    className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary-dark transition flex items-center gap-2"
                    onClick={handlePrintFilteredRequests}
                >
                    <FaPrint />
                    Print Filtered Requests
                </button>
                <button
                    className="bg-orange-600 text-white px-4 py-2 rounded shadow hover:bg-orange-700 transition flex items-center gap-2"
                    onClick={() => setShowExportModal(true)}
                >
                    <FaFilePdf />
                    Export to PDF
                </button>
            </div>

            <div className="bg-secondary rounded-neumorphic shadow-outerRaised p-6">
                {/* Filter UI for leaves */}
                <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                            <input
                                type="date"
                                value={leaveFilters.startDate}
                                onChange={e => setLeaveFilters({ ...leaveFilters, startDate: e.target.value })}
                                className="w-full p-2 rounded-neumorphic shadow-innerSoft bg-background border border-gray-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                            <input
                                type="date"
                                value={leaveFilters.endDate}
                                onChange={e => setLeaveFilters({ ...leaveFilters, endDate: e.target.value })}
                                className="w-full p-2 rounded-neumorphic shadow-innerSoft bg-background border border-gray-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <select
                                value={leaveFilters.department}
                                onChange={e => setLeaveFilters({ ...leaveFilters, department: e.target.value })}
                                className="w-full p-2 rounded-neumorphic shadow-innerSoft bg-background border border-gray-300"
                            >
                                <option value="">All Departments</option>
                                {branches.map(branch => (
                                    <option key={branch.code} value={branch.code}>{branch.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={leaveFilters.status}
                                onChange={e => setLeaveFilters({ ...leaveFilters, status: e.target.value })}
                                className="w-full p-2 rounded-neumorphic shadow-innerSoft bg-background border border-gray-300"
                            >
                                <option value="Forwarded by HOD">Forwarded by HOD</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                                <option value="All">All Status</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={clearLeaveFilters}
                            className="bg-gray-500 text-white px-4 py-2 rounded shadow hover:bg-gray-600 transition"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Responsive Table for md+ screens, Cards for small screens */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg overflow-hidden">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Request ID</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Emp ID</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Leave Type</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Dates</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {/* Leave Request List View */}
                            {paginatedLeaveRows.map((row) => {
                                if (row._isLeave) {
                                    return (
                                        <tr key={row._id} className={`${row.originalStartDate && row.originalEndDate ? 'bg-yellow-50' : ''} border-b hover:bg-gray-50`}>
                                            <td className="px-4 py-3 font-mono text-primary">{row.leaveRequestId}</td>
                                            <td className="px-4 py-3">{row.employee?.name || row.employeeName || 'Unknown'}</td>
                                            <td className="px-4 py-3">{row.employee?.employeeId || row.employeeEmployeeId || 'N/A'}</td>
                                            <td className="px-4 py-3">{row.type ? row.type.charAt(0).toUpperCase() + row.type.slice(1) : row.leaveType ? row.leaveType.charAt(0).toUpperCase() + row.leaveType.slice(1) : 'N/A'}</td>
                                            <td className="px-4 py-3">
                                                {row.isModifiedByPrincipal ? (
                                                    <div>
                                                        <div className="line-through text-gray-500">
                                                            {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-green-600 font-medium">
                                                            {new Date(row.approvedStartDate).toLocaleDateString()} - {new Date(row.approvedEndDate).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                            ${row.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                            row.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                                row.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-yellow-100 text-yellow-800'}`}
                                                    >
                                                        {row.status || 'N/A'}
                                                    </span>
                                                    {row.originalStartDate && row.originalEndDate && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                            </svg>
                                                            Modified
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    className="bg-primary text-white px-3 py-1 rounded-md text-xs hover:bg-primary-dark transition-colors"
                                                    onClick={() => {
                                                        setSelectedLeave(row);
                                                        setShowLeaveDetailsModal(true);
                                                    }}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                } else {
                                    // CCL Work Request
                                    return (
                                        <tr key={row._id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono text-primary">{row.cclRequestId || `CCL${new Date(row.date).getFullYear()}${row.employeeDepartment?.substring(0, 3).toUpperCase()}${row._id.toString().slice(-4)}`}</td>
                                            <td className="px-4 py-3">{row.employeeName || 'Unknown'}</td>
                                            <td className="px-4 py-3">{row.employeeEmployeeId || 'N/A'}</td>
                                            <td className="px-4 py-3">CCL Work</td>
                                            <td className="px-4 py-3">{new Date(row.date).toLocaleDateString()}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                          ${row.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                        row.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                            row.status === 'Forwarded to Principal' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-yellow-100 text-yellow-800'}`}
                                                >
                                                    {row.status || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    className="bg-primary text-white px-3 py-1 rounded-md text-xs hover:bg-primary-dark transition-colors"
                                                    onClick={() => {
                                                        setSelectedCCLWork(row);
                                                        setShowCCLRemarksModal(true);
                                                    }}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }
                            })}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <div className="flex justify-center items-center gap-2 mt-4">
                        <button
                            className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
                            onClick={() => setLeavePage(p => Math.max(1, p - 1))}
                            disabled={leavePage === 1}
                        >
                            Prev
                        </button>
                        {Array.from({ length: totalLeavePages }, (_, i) => (
                            <button
                                key={i + 1}
                                className={`px-3 py-1 rounded font-semibold ${leavePage === i + 1 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                                onClick={() => setLeavePage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
                            onClick={() => setLeavePage(p => Math.min(totalLeavePages, p + 1))}
                            disabled={leavePage === totalLeavePages}
                        >
                            Next
                        </button>
                    </div>

                    {/* Summary Table */}
                    <div className="mt-8">
                        <h3 className="text-lg font-bold text-primary mb-2">Summary (Approved Requests)</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white rounded-lg overflow-hidden border">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Employee Name</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">CCL Approved</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">OD Approved</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">CL Approved</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        // Build summary from filtered, approved leave and CCL requests
                                        const summaryMap = {};
                                        // Only consider approved requests
                                        allLeaveRows.filter(row => row.status === 'Approved').forEach(row => {
                                            // Get employee name
                                            const name = row.employeeName || row.employee?.name || 'Unknown';
                                            if (!summaryMap[name]) {
                                                summaryMap[name] = { CCL: 0, OD: 0, CL: 0 };
                                            }
                                            // Determine leave type and days
                                            let type = row.leaveType || row.type;
                                            let days = row.isModifiedByPrincipal ? row.approvedNumberOfDays : row.numberOfDays;
                                            if (!type && row._isLeave === false) type = 'CCL'; // fallback for CCL work
                                            if (type === 'CCL' || (row._isLeave === false)) summaryMap[name].CCL += Number(days) || 0;
                                            else if (type === 'OD') summaryMap[name].OD += Number(days) || 0;
                                            else if (type === 'CL') summaryMap[name].CL += Number(days) || 0;
                                        });
                                        // Sort by employee name
                                        const sortedNames = Object.keys(summaryMap).sort();
                                        return sortedNames.length === 0 ? (
                                            <tr><td colSpan={4} className="text-center text-gray-400 py-4">No approved requests in current filters</td></tr>
                                        ) : (
                                            sortedNames.map(name => (
                                                <tr key={name}>
                                                    <td className="px-4 py-2">{name}</td>
                                                    <td className="px-4 py-2">{summaryMap[name].CCL}</td>
                                                    <td className="px-4 py-2">{summaryMap[name].OD}</td>
                                                    <td className="px-4 py-2">{summaryMap[name].CL}</td>
                                                </tr>
                                            ))
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Card layout for small screens */}
                <div className="md:hidden grid grid-cols-1 gap-4">
                    {forwardedLeaves.map((leave) => (
                        <div
                            key={leave._id}
                            className="bg-white p-4 rounded-lg shadow-innerSoft border border-gray-100"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-mono text-primary text-sm">{leave.leaveRequestId}</span>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                  ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                        leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                            leave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                                                'bg-yellow-100 text-yellow-800'}`}
                                >
                                    {leave.status || 'N/A'}
                                </span>
                            </div>
                            <div className="mb-1 text-sm"><span className="font-semibold">Name:</span> {leave.employee?.name || leave.employeeName || 'Unknown'}</div>
                            <div className="mb-1 text-sm"><span className="font-semibold">Emp ID:</span> {leave.employee?.employeeId || leave.employeeEmployeeId || 'N/A'}</div>
                            <div className="mb-1 text-sm"><span className="font-semibold">Leave Type:</span> {leave.type ? leave.type.charAt(0).toUpperCase() + leave.type.slice(1) : leave.leaveType ? leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1) : 'N/A'}</div>
                            <div className="mb-1 text-sm">
                                <span className="font-semibold">Dates:</span>
                                {leave.originalStartDate && leave.originalEndDate ? (
                                    <div>
                                        <div className="line-through text-gray-500">
                                            {new Date(leave.originalStartDate).toLocaleDateString()} - {new Date(leave.originalEndDate).toLocaleDateString()}
                                        </div>
                                        <div className="text-green-600 font-medium">
                                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                ) : (
                                    <span>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                    ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                            leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                leave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-yellow-100 text-yellow-800'}`}
                                    >
                                        {leave.status || 'N/A'}
                                    </span>
                                    {leave.originalStartDate && leave.originalEndDate && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            Modified
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className="bg-primary text-white px-3 py-1 rounded-md text-xs hover:bg-primary-dark transition-colors"
                                        onClick={() => {
                                            setSelectedLeave(leave);
                                            setShowLeaveDetailsModal(true);
                                        }}
                                    >
                                        View
                                    </button>
                                    {(leave.status === 'Forwarded by HOD' || leave.status === 'Approved') && (
                                        <button
                                            className="bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600 transition-colors"
                                            onClick={() => {
                                                setSelectedRequestId(leave._id);
                                                setSelectedAction('reject');
                                                setShowRemarksModal(true);
                                            }}
                                            title={leave.status === 'Approved' ? 'Reject Approved Request' : 'Reject Request'}
                                        >
                                            Reject
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Leave Details Modal */}
            {showLeaveDetailsModal && selectedLeave && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-3 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg sm:text-xl font-bold text-primary">Leave Request Details</h3>
                            <button
                                onClick={() => setSelectedLeave(null)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-3 sm:space-y-4">

                            {/* Employee Information */}
                            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-2">Employee Information</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Name</p>
                                        <p className="font-medium text-sm sm:text-base">{selectedLeave.employee?.name || selectedLeave.employeeName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Employee ID</p>
                                        <p className="font-medium text-sm sm:text-base">{selectedLeave.employee?.employeeId || selectedLeave.employeeEmployeeId}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Email</p>
                                        <p className="font-medium text-sm sm:text-base break-words">{selectedLeave.employee?.email || selectedLeave.employeeEmail}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Department</p>
                                        <p className="font-medium text-sm sm:text-base">{selectedLeave.employee?.department?.name || selectedLeave.employeeDepartment}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Leave Details */}
                            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-2">Leave Details</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <p className="text-gray-600">Request ID</p>
                                        <p className="font-mono text-base text-primary">{selectedLeave.leaveRequestId}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Leave Type</p>
                                        <p className="font-medium text-sm sm:text-base">
                                            {selectedLeave.type ? selectedLeave.type.charAt(0).toUpperCase() + selectedLeave.type.slice(1) : selectedLeave.leaveType ? selectedLeave.leaveType.charAt(0).toUpperCase() + selectedLeave.leaveType.slice(1) : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        {/* Show original vs approved dates if modified (EmployeeDashboard logic) */}
                                        {selectedLeave.isModifiedByPrincipal ? (
                                            <div className="col-span-1 sm:col-span-2">
                                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                        </svg>
                                                        <h5 className="font-semibold text-yellow-800">Leave Dates Modified by Principal</h5>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <p className="text-sm text-yellow-800">Original Request:</p>
                                                            <p className="font-medium text-sm">{new Date(selectedLeave.startDate).toLocaleDateString()} to {new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                                                            <p className="text-xs text-yellow-700">({selectedLeave.numberOfDays} days)</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-yellow-800">Approved Dates:</p>
                                                            <p className="font-medium text-sm">{new Date(selectedLeave.approvedStartDate).toLocaleDateString()} to {new Date(selectedLeave.approvedEndDate).toLocaleDateString()}</p>
                                                            <p className="text-xs text-yellow-700">({selectedLeave.approvedNumberOfDays} days)</p>
                                                        </div>
                                                        {selectedLeave.principalModificationReason && (
                                                            <div>
                                                                <p className="text-sm text-yellow-800">Modification Reason:</p>
                                                                <p className="text-sm">{selectedLeave.principalModificationReason}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="col-span-1 sm:col-span-2">
                                                <p className="text-sm text-gray-600">Duration</p>
                                                <p className="font-medium text-sm sm:text-base">{new Date(selectedLeave.startDate).toLocaleDateString()} to {new Date(selectedLeave.endDate).toLocaleDateString()} ({selectedLeave.numberOfDays} days)</p>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Applied On</p>
                                        <p className="font-medium text-sm sm:text-base">
                                            {selectedLeave.appliedOn ? new Date(selectedLeave.appliedOn).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Status</p>
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                      ${selectedLeave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                selectedLeave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                    selectedLeave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
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
                                    {/* Add Modification Details Section */}
                                    {selectedLeave.originalStartDate && selectedLeave.originalEndDate && (
                                        <div className="col-span-1 sm:col-span-2">
                                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                    <h5 className="font-semibold text-yellow-800">Leave Dates Modified by Principal</h5>
                                                </div>
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-sm text-yellow-800">Original Request:</p>
                                                        <p className="font-medium text-sm">{new Date(selectedLeave.originalStartDate).toLocaleDateString()} to {new Date(selectedLeave.originalEndDate).toLocaleDateString()}</p>
                                                        <p className="text-xs text-yellow-700">({selectedLeave.originalNumberOfDays} days)</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-yellow-800">Approved Dates:</p>
                                                        <p className="font-medium text-sm">{new Date(selectedLeave.startDate).toLocaleDateString()} to {new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                                                        <p className="text-xs text-yellow-700">({selectedLeave.numberOfDays} days)</p>
                                                    </div>
                                                    {selectedLeave.modificationReason && (
                                                        <div>
                                                            <p className="text-sm text-yellow-800">Modification Reason:</p>
                                                            <p className="text-sm">{selectedLeave.modificationReason}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="col-span-1 sm:col-span-2">
                                        <p className="text-sm text-gray-600">Reason</p>
                                        <p className="font-medium text-sm sm:text-base">{selectedLeave.reason || 'No reason provided'}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Remarks */}
                            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-2">Remarks</h4>
                                <div className="space-y-2">
                                    {selectedLeave.hodRemarks && (
                                        <div>
                                            <p className="text-sm text-gray-600">HOD Remarks</p>
                                            <p className="font-medium text-sm sm:text-base">{selectedLeave.hodRemarks}</p>
                                        </div>
                                    )}
                                    {selectedLeave.principalRemarks && (
                                        <div>
                                            <p className="text-sm text-gray-600">Principal Remarks</p>
                                            <p className="font-medium text-sm sm:text-base">{selectedLeave.principalRemarks}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Alternate Schedule */}
                            {selectedLeave.alternateSchedule && selectedLeave.alternateSchedule.length > 0 && (
                                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                                    <h4 className="font-semibold text-gray-900 mb-2">Alternate Schedule</h4>
                                    <div className="space-y-3 sm:space-y-4">
                                        {selectedLeave.alternateSchedule.map((schedule, index) => (
                                            <div key={index} className="bg-white p-2 sm:p-3 rounded-md">
                                                <p className="font-medium text-sm sm:text-base mb-2">
                                                    Date: {schedule.date ? new Date(schedule.date).toLocaleDateString() : 'N/A'}
                                                </p>
                                                {schedule.periods && schedule.periods.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {schedule.periods.map((period, pIndex) => (
                                                            <div key={pIndex} className="bg-gray-50 p-2 rounded">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    <div>
                                                                        <span className="text-sm text-gray-600">Period:</span>{' '}
                                                                        <span className="font-medium text-sm sm:text-base">{period.periodNumber || 'N/A'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-sm text-gray-600">Class:</span>{' '}
                                                                        <span className="font-medium text-sm sm:text-base">{period.assignedClass || 'N/A'}</span>
                                                                    </div>
                                                                    <div className="col-span-1 sm:col-span-2">
                                                                        <span className="text-sm text-gray-600">Substitute Faculty:</span>{' '}
                                                                        <span className="font-medium text-sm sm:text-base">
                                                                            {typeof period.substituteFaculty === 'object' && period.substituteFaculty?.name
                                                                                ? period.substituteFaculty.name
                                                                                : period.substituteFacultyName
                                                                                    ? period.substituteFacultyName
                                                                                    : (typeof period.substituteFaculty === 'string' && period.substituteFaculty)
                                                                                        ? period.substituteFaculty
                                                                                        : 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500 italic text-sm sm:text-base">No periods assigned for this day</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {(selectedLeave.status === 'Forwarded by HOD' || selectedLeave.status === 'Approved') && (
                                <div className="flex justify-end space-x-4 mt-6">
                                    {selectedLeave.status === 'Forwarded by HOD' && (
                                        <button
                                            onClick={() => {
                                                setShowLeaveDetailsModal(false);
                                                setSelectedLeaveForEdit(selectedLeave);
                                                setShowDateEditModal(true);
                                            }}
                                            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                                        >
                                            Review & Approve
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            setShowLeaveDetailsModal(false);
                                            setSelectedLeaveForEdit(selectedLeave);
                                            setShowDateEditModal(true);
                                        }}
                                        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                                    >
                                        {selectedLeave.status === 'Approved' ? 'Reject Approved Request' : 'Review & Reject'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Date Edit Modal */}
            <LeaveDateEditModal
                isOpen={showDateEditModal}
                onClose={() => {
                    setShowDateEditModal(false);
                    setSelectedLeaveForEdit(null);
                }}
                leaveRequest={selectedLeaveForEdit}
                onApprove={handleApproveWithDates}
                onReject={handleRejectWithDates}
            />

            {/* Remarks Modal */}
            <RemarksModal
                show={showRemarksModal}
                onClose={() => {
                    setShowRemarksModal(false);
                    setSelectedAction(null);
                    setSelectedRequestId(null);
                }}
                onSubmit={handleRemarksSubmit}
                action={selectedAction}
            />

            {/* CCL Work Request Remarks Modal */}
            {showCCLRemarksModal && selectedCCLWork && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Review CCL Work Request
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Remarks
                            </label>
                            <textarea
                                value={cclRemarks}
                                onChange={(e) => setCclRemarks(e.target.value)}
                                rows="3"
                                className="w-full p-2 lg:p-3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Enter your remarks..."
                            />
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => {
                                    setSelectedCCLWork(null);
                                    setCclRemarks('');
                                    setShowCCLRemarksModal(false);
                                }}
                                className="px-3 lg:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleCCLWorkAction('Approved')}
                                className="px-3 lg:px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => handleCCLWorkAction('Rejected')}
                                className="px-3 lg:px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Options Modal */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4 text-primary">Export to PDF Options</h3>
                        <div className="mb-4 space-y-3">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={exportIncludeCCL}
                                    onChange={e => setExportIncludeCCL(e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-primary"
                                />
                                Include CCL Work Requests
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={exportIncludeSummary}
                                    onChange={e => setExportIncludeSummary(e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-primary"
                                />
                                Include Summary Table
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                onClick={() => setShowExportModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                                onClick={() => {
                                    setShowExportModal(false);
                                    exportToPDF(exportIncludeCCL, exportIncludeSummary);
                                }}
                            >
                                Export
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeavesManagement;