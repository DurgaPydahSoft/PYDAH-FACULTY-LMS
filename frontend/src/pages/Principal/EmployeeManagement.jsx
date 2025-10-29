import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaFilePdf } from 'react-icons/fa';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axiosInstance from '../../utils/axiosConfig';

const EmployeeManagement = ({ 
  branches = [], 
  employees = [], 
  allEmployees = [],
  onEmployeeUpdate,
  token,
  loading = false 
}) => {
  const [employeeFilters, setEmployeeFilters] = useState({
    search: '',
    department: '',
    status: ''
  });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editEmployeeForm, setEditEmployeeForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    department: '',
    status: 'active',
    specialPermission: false,
    specialLeaveMaxDays: 20
  });
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  // Apply filters when filters or employees change
  useEffect(() => {
    applyEmployeeFilters();
  }, [employeeFilters, allEmployees]);

  const applyEmployeeFilters = () => {
    console.log('applyEmployeeFilters called with:', {
      employeeDataLength: allEmployees.length,
      filters: employeeFilters
    });

    // Apply client-side filtering
    let filtered = [...allEmployees];

    // Apply search filter
    if (employeeFilters.search) {
      const searchTerm = employeeFilters.search.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.name?.toLowerCase().includes(searchTerm) ||
        emp.email?.toLowerCase().includes(searchTerm) ||
        emp.employeeId?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply department filter
    if (employeeFilters.department) {
      console.log('Applying department filter for:', employeeFilters.department);
      filtered = filtered.filter(emp => {
        const empDept = emp.branchCode || emp.department;
        const matches = empDept === employeeFilters.department;
        return matches;
      });
    }

    // Apply status filter
    if (employeeFilters.status) {
      filtered = filtered.filter(emp =>
        emp.status === employeeFilters.status
      );
    }

    console.log('Filtered employees:', {
      total: allEmployees.length,
      filtered: filtered.length,
      filters: employeeFilters
    });

    setFilteredEmployees(filtered);
  };

  const handleEditEmployeeClick = (employee) => {
    setEditingEmployee(employee);
    setEditEmployeeForm({
      name: employee.name,
      email: employee.email,
      phoneNumber: employee.phoneNumber,
      department: employee.department,
      status: employee.status,
      specialPermission: Boolean(employee.specialPermission),
      specialLeaveMaxDays: employee.specialLeaveMaxDays !== undefined
        ? employee.specialLeaveMaxDays
        : (employee.specialMaxDays !== undefined
          ? employee.specialMaxDays
          : 20)
    });
  };

  const handleEditEmployeeSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ensure specialPermission is a boolean and specialLeaveMaxDays is a number
      const payload = {
        ...editEmployeeForm,
        specialPermission: Boolean(editEmployeeForm.specialPermission),
        specialLeaveMaxDays: editEmployeeForm.specialPermission ? Number(editEmployeeForm.specialLeaveMaxDays) : undefined
      };

      console.log('Submitting employee update:', payload);

      const response = await axiosInstance.put(
        `/principal/employees/${editingEmployee._id}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        toast.success('Employee updated successfully');
        await onEmployeeUpdate(); // Refresh the employees list with the latest data
        setEditingEmployee(null);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error(error.response?.data?.msg || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      try {
        const response = await axiosInstance.delete(
          `/principal/employees/${employeeId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.data) {
          toast.success('Employee deleted successfully');
          await onEmployeeUpdate(); // Refresh the employees list
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        toast.error(error.response?.data?.msg || 'Failed to delete employee');
      }
    }
  };

  const exportEmployeesToPDF = () => {
    if (!filteredEmployees.length) {
      alert('No employees to export.');
      return;
    }

    // Sort employees by department, then by name
    const sortedEmployees = [...filteredEmployees].sort((a, b) => {
      const deptA = (a.branchCode || a.department || '').toLowerCase();
      const deptB = (b.branchCode || b.department || '').toLowerCase();
      if (deptA < deptB) return -1;
      if (deptA > deptB) return 1;
      // If departments are equal, sort by employee name
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

    // Prepare employee data for PDF
    const employeeData = sortedEmployees.map((emp, idx) => [
      idx + 1,
      emp.employeeId || 'N/A',
      emp.name || 'N/A',
      emp.email || 'N/A',
      emp.branchCode || emp.department || 'N/A',
      emp.role ? emp.role.charAt(0).toUpperCase() + emp.role.slice(1) : 'N/A',
      emp.phoneNumber || 'N/A'
    ]);

    const employeeHeaders = [[
      'S. No', 'Employee ID', 'Name', 'Email', 'Department', 'Designation', 'Phone'
    ]];

    // Use portrait orientation for better vertical space
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const collegeName = 'Pydah College of Engineering';
    const collegeAddress = 'An Autonomous Institution Kakinada | Andhra Pradesh | INDIA';
    const contactNumber = 'Contact: +91 99513 54444';
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();

    // Create title based on applied filters
    let title = `Employee Directory - ${month} - ${year}`;
    let fileName = `Employee_Directory_${month}_${year}.pdf`;

    if (employeeFilters.department) {
      const branchName = branches.find(b => b.code === employeeFilters.department)?.name || employeeFilters.department;
      const branchCode = employeeFilters.department;
      title = `Employee Directory - ${branchName} - ${month} - ${year}`;
      fileName = `Employee_Directory_${branchCode}_${month}_${year}.pdf`;
    } else if (employeeFilters.status) {
      title = `Employee Directory - ${employeeFilters.status.charAt(0).toUpperCase() + employeeFilters.status.slice(1)} Employees - ${month} - ${year}`;
      fileName = `Employee_Directory_${employeeFilters.status}_${month}_${year}.pdf`;
    }

    const logoUrl = window.location.origin + '/PYDAH_LOGO_PHOTO.jpg';

    // Helper to draw the PDF (with or without logo)
    const drawPDF = (logoImg) => {
      if (logoImg) doc.addImage(logoImg, 'PNG', 15, 10, 40, 20);
      doc.setFont('times', 'bold');
      doc.setTextColor('#333');
      doc.setFontSize(20);
      doc.text(collegeName, doc.internal.pageSize.width / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(collegeAddress, doc.internal.pageSize.width / 2, 28, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#D35400');
      doc.text(title, doc.internal.pageSize.width / 2, 40, { align: 'center' });

      // Draw Employee Directory table
      doc.setFontSize(12);
      doc.setTextColor('#333');
      doc.text('Employee Directory', 15, 50);
      autoTable(doc, {
        startY: 55,
        head: employeeHeaders,
        body: employeeData,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: {
          fillColor: [255, 213, 128],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        },
        theme: 'grid',
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        columnStyles: {
          0: { cellWidth: 12 }, // S. No
          1: { cellWidth: 25 }, // Employee ID
          2: { cellWidth: 35 }, // Name
          3: { cellWidth: 40 }, // Email
          4: { cellWidth: 25 }, // Department
          5: { cellWidth: 25 }, // Designation
          6: { cellWidth: 25 }, // Phone
        },
        didDrawPage: function (data) {
          // Add footer
          let pageHeight = doc.internal.pageSize.height;
          doc.setFontSize(10);
          doc.setTextColor('#333');
          doc.text(collegeName, 15, pageHeight - 15);
          doc.text(contactNumber, doc.internal.pageSize.width / 2, pageHeight - 15, { align: 'center' });
          let pageNumber = doc.internal.getNumberOfPages();
          doc.text(`Page ${pageNumber}`, doc.internal.pageSize.width - 20, pageHeight - 15);

          // Add signatures - HOD on left, Principal on right
          let signatureY = data.cursor.y + 25;
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          
          // HOD Signature on the left
          doc.text('HOD Signature', 30, signatureY);
          
          // Principal Signature on the right
          doc.text('Principal Signature', doc.internal.pageSize.width - 70, signatureY);

          // Add timestamp at the bottom center
          let timestamp = new Date().toLocaleString('en-US', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
          });
          doc.setFontSize(10);
          doc.setTextColor('#333');
          doc.text(`Generated on: ${timestamp}`, doc.internal.pageSize.width / 2, signatureY + 10, { align: 'center' });
        }
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
  };

  const clearFilters = () => {
    setEmployeeFilters({ search: '', department: '', status: '' });
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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary">Employee Management</h2>
        <button
          className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary-dark transition flex items-center gap-2"
          onClick={exportEmployeesToPDF}
        >
          <FaFilePdf />
          Export to PDF
        </button>
      </div>

      <div className="bg-secondary rounded-neumorphic shadow-outerRaised p-6">
        {/* Employee filters */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={employeeFilters.search}
              onChange={(e) => setEmployeeFilters({ ...employeeFilters, search: e.target.value })}
              className="p-2 rounded-neumorphic shadow-innerSoft bg-background"
            />
            <select
              value={employeeFilters.department}
              onChange={(e) => setEmployeeFilters({ ...employeeFilters, department: e.target.value })}
              className="p-2 rounded-neumorphic shadow-innerSoft bg-background"
            >
              <option value="">All Departments</option>
              {branches && branches.length > 0 ? (
                branches.map((branch) => (
                  <option key={branch.code} value={branch.code}>{branch.name}</option>
                ))
              ) : (
                <option value="" disabled>Loading departments...</option>
              )}
            </select>
            <select
              value={employeeFilters.status}
              onChange={(e) => setEmployeeFilters({ ...employeeFilters, status: e.target.value })}
              className="p-2 rounded-neumorphic shadow-innerSoft bg-background"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {(employeeFilters.search || employeeFilters.department || employeeFilters.status) && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Employee list: Table only on md+ screens */}
        <div className="overflow-x-auto hidden md:block">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Employee ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Department</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Designation</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{employee.employeeId}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{employee.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{employee.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="group relative">
                      <span>{employee.branchCode || employee.department}</span>
                      <div className="hidden group-hover:block absolute z-10 bg-black text-white text-xs rounded py-1 px-2 left-0 -bottom-8">
                        {branches.find(b => b.code === (employee.branchCode || employee.department))?.name || employee.department}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{employee.phoneNumber || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${employee.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'}`}
                    >
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditEmployeeClick(employee)}
                        className="bg-blue-500 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-600 transition-colors flex items-center gap-1"
                        title="Edit Employee"
                      >
                        <FaEdit className="text-xs" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee._id)}
                        className="bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600 transition-colors flex items-center gap-1"
                        title="Delete Employee"
                      >
                        <FaTrash className="text-xs" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEmployees.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No employees found matching the current filters.
            </div>
          )}
        </div>

        {/* Employee Cards Section: always visible, only show on mobile (block on mobile, hidden on md+) */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:hidden">
          {filteredEmployees.map((employee) => (
            <div
              key={employee._id}
              className="bg-white rounded-xl shadow p-4 flex flex-col items-center cursor-pointer hover:shadow-lg transition"
              onClick={() => handleEditEmployeeClick(employee)}
              title={`Edit ${employee.name}`}
            >
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-primary mb-2 flex items-center justify-center">
                {employee.profilePicture ? (
                  <img
                    src={employee.profilePicture}
                    alt={employee.name}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentNode.querySelector('svg').style.display = 'block'; }}
                    style={{ display: 'block' }}
                  />
                ) : null}
                <svg
                  className="w-12 h-12 text-gray-300 absolute"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ display: employee.profilePicture ? 'none' : 'block' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-800 truncate w-20">{employee.name}</div>
                <div className="text-xs text-gray-500 truncate w-20">{employee.employeeId}</div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1
                  ${employee.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'}`}
                >
                  {employee.status}
                </span>
              </div>
            </div>
          ))}
          {filteredEmployees.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No employees found matching the current filters.
            </div>
          )}
        </div>
      </div>

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Employee</h2>
            <form onSubmit={handleEditEmployeeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editEmployeeForm.name}
                  onChange={(e) => setEditEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={editEmployeeForm.email}
                  onChange={(e) => setEditEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  value={editEmployeeForm.phoneNumber}
                  onChange={(e) => setEditEmployeeForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <select
                  value={editEmployeeForm.department}
                  onChange={(e) => setEditEmployeeForm(prev => ({ ...prev, department: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  required
                >
                  <option value="">Select Department</option>
                  {branches.map(branch => (
                    <option key={branch._id} value={branch.code}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={editEmployeeForm.status}
                  onChange={(e) => setEditEmployeeForm(prev => ({ ...prev, status: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editEmployeeForm.specialPermission}
                  onChange={(e) => setEditEmployeeForm(prev => ({ ...prev, specialPermission: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  id="specialPermission"
                />
                <label htmlFor="specialPermission" className="ml-2 block text-sm text-gray-700">
                  Special Permission
                </label>
              </div>
              {editEmployeeForm.specialPermission && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Special Leave Max Days</label>
                  <input
                    type="number"
                    value={editEmployeeForm.specialLeaveMaxDays}
                    onChange={(e) => setEditEmployeeForm(prev => ({ ...prev, specialLeaveMaxDays: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    min="1"
                    max="365"
                  />
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  Update Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;