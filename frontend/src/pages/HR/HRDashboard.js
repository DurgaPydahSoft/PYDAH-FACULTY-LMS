import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PasswordResetModal from '../../components/PasswordResetModal';
import { FaUserTie, FaUsers, FaRegCalendarCheck, FaCamera, FaTrash, FaUserCircle } from 'react-icons/fa';
import { MdOutlineLogout } from 'react-icons/md';
import * as XLSX from 'xlsx';
import config from '../../config';
import Loading from '../../components/Loading';



const API_BASE_URL = config.API_BASE_URL;
const HRDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    employeeId: '',
    phoneNumber: '',
    campus: '',
    department: '',
    role: '',
    customRole: '',
    leaveBalanceByExperience: ''
  });
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    role: '',
    customRole: '',
    department: '',
    status: '',
    branchCode: '',
    leaveBalance: 12,
    leaveBalanceByExperience: ''
  });
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [selectedEmployeeForReset, setSelectedEmployeeForReset] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkData, setBulkData] = useState([]);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkEditableData, setBulkEditableData] = useState([]);
  const [bulkBranches, setBulkBranches] = useState([]);
  const [bulkRoles, setBulkRoles] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);

  // Profile picture states
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedEmployeeForPicture, setSelectedEmployeeForPicture] = useState(null);

  const fileInputRef = useRef(null);

  const campuses = [
    { value: 'engineering', label: 'Engineering' },
    { value: 'degree', label: 'Degree' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'diploma', label: 'Diploma' }
  ];

  useEffect(() => {
    fetchEmployeeStats();
    fetchEmployees();
    fetchRoles();
  }, [search, department, status]);

  // // Add periodic refresh of employee data
  // useEffect(() => {
  //   const refreshInterval = setInterval(() => {
  //     fetchEmployees();
  //     fetchEmployeeStats();
  //   }, 10000); // Refresh every 10 seconds

  //   return () => clearInterval(refreshInterval);
  // }, [search, department, status]);

  useEffect(() => {
    const fetchBranches = async () => {
      if (!newEmployee.campus) {
        setBranches([]);
        return;
      }
      try {
        const response = await fetch(
          `${API_BASE_URL}/employee/branches?campus=${newEmployee.campus}`
        );
        const data = await response.json();
        const activeBranches = (data.branches || []).filter(b => b.isActive);
        setBranches(activeBranches);
        if (newEmployee.department && !activeBranches.some(b => b.code === newEmployee.department)) {
          setNewEmployee(prev => ({ ...prev, department: '' }));
        }
      } catch (error) {
        setBranches([]);
      }
    };
    fetchBranches();
  }, [newEmployee.campus]);

  useEffect(() => {
    // Set campus to HR's campus on open
    if (user?.campus?.name && !newEmployee.campus) {
      setNewEmployee(prev => ({ ...prev, campus: user.campus.name }));
    }
  }, [user, showRegisterModal]);

  const fetchEmployeeStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/hr/employees`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch employee stats');
      const data = await response.json();
      setStats({
        totalEmployees: data.length,
        activeEmployees: data.filter(emp => emp.status === 'active').length,
        inactiveEmployees: data.filter(emp => emp.status === 'inactive').length,
      });
    } catch (error) {
      setError('Failed to fetch employee statistics');
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (department) queryParams.append('department', department);
      if (status) queryParams.append('status', status);
      // Add timestamp to prevent caching
      queryParams.append('_t', Date.now());
      
      const response = await fetch(`${API_BASE_URL}/hr/employees?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data);
      setError(null);
    } catch (error) {
      setError('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/hr/roles`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setRoles(data);
        // Set default role if available
        if (data.length > 0 && !newEmployee.role) {
          setNewEmployee(prev => ({ ...prev, role: data[0].value }));
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
    }
  };

  const getCampusRoles = (campusType) => {
    const roles = {
      engineering: [
        { value: 'associate_professor', label: 'Associate Professor' },
        { value: 'assistant_professor', label: 'Assistant Professor' },
        { value: 'lab_incharge', label: 'Lab Incharge' },
        { value: 'lab_assistant', label: 'Lab Assistant' },
        { value: 'technician', label: 'Technician' },
        { value: 'librarian', label: 'Librarian' },
        { value: 'pet', label: 'PET' },
        { value: 'other', label: 'Other' }
      ],
      diploma: [
        { value: 'senior_lecturer', label: 'Senior Lecturer' },
        { value: 'lecturer', label: 'Lecturer' },
        { value: 'lab_incharge', label: 'Lab Incharge' },
        { value: 'lab_assistant', label: 'Lab Assistant' },
        { value: 'technician', label: 'Technician' },
        { value: 'other', label: 'Other' }
      ],
      pharmacy: [
        { value: 'associate_professor', label: 'Associate Professor' },
        { value: 'assistant_professor', label: 'Assistant Professor' },
        { value: 'lab_incharge', label: 'Lab Incharge' },
        { value: 'lab_assistant', label: 'Lab Assistant' },
        { value: 'technician', label: 'Technician' },
        { value: 'other', label: 'Other' }
      ],
      degree: [
        { value: 'associate_professor', label: 'Associate Professor' },
        { value: 'assistant_professor', label: 'Assistant Professor' },
        { value: 'lab_incharge', label: 'Lab Incharge' },
        { value: 'lab_assistant', label: 'Lab Assistant' },
        { value: 'technician', label: 'Technician' },
        { value: 'other', label: 'Other' }
      ]
    };
    return roles[campusType] || [];
  };

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setNewEmployee(prev => ({
      ...prev,
      role: selectedRole,
      customRole: selectedRole === 'other' ? prev.customRole : ''
    }));
  };

  const handleRegisterEmployee = async () => {
    if (newEmployee.password !== newEmployee.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(newEmployee.phoneNumber)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    if (!newEmployee.campus) {
      toast.error('Please select a campus');
      return;
    }
    if (!branches.some(b => b.code === newEmployee.department)) {
      toast.error('Invalid department for selected campus');
      return;
    }
    if (!newEmployee.role) {
      toast.error('Please select a role');
      return;
    }
    if (newEmployee.role === 'other' && !newEmployee.customRole) {
      toast.error('Please enter a custom role');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: `${newEmployee.firstName} ${newEmployee.lastName}`,
        email: newEmployee.email.toLowerCase(),
        password: newEmployee.password,
        employeeId: newEmployee.employeeId,
        phoneNumber: newEmployee.phoneNumber,
        role: newEmployee.role,
        department: newEmployee.department,
        branchCode: newEmployee.department,
        leaveBalanceByExperience: newEmployee.leaveBalanceByExperience
      };
      if (newEmployee.role === 'other') {
        payload.customRole = newEmployee.customRole;
      }
      const response = await fetch(`${API_BASE_URL}/hr/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Failed to register employee');
      }
      setShowRegisterModal(false);
      setNewEmployee({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        employeeId: '',
        phoneNumber: '',
        campus: '',
        department: '',
        role: '',
        customRole: '',
        leaveBalanceByExperience: ''
      });
      fetchEmployees();
      fetchEmployeeStats();
      toast.success('Employee registered successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to register employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('campus');
    localStorage.removeItem('branchCode');
    navigate('/');
  };

  // Open edit modal and set form
  const handleEditClick = (employee) => {
    setEditEmployee(employee);
    setEditForm({
      name: employee.name || '',
      email: employee.email || '',
      phoneNumber: employee.phoneNumber || '',
      role: employee.role || '',
      customRole: employee.role === 'other' ? (employee.roleDisplayName || '') : '',
      department: employee.department || '',
      status: employee.status || 'active',
      branchCode: employee.branchCode || '',
      leaveBalance: employee.leaveBalance || 12,
      leaveBalanceByExperience: employee.leaveBalanceByExperience !== undefined ? employee.leaveBalanceByExperience : ''
    });
    setShowEditModal(true);
  };

  // Submit edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatePayload = {
        name: editForm.name,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber,
        role: editForm.role,
        customRole: editForm.role === 'other' ? editForm.customRole : '',
        department: editForm.department,
        status: editForm.status,
        branchCode: editForm.branchCode,
        leaveBalance: parseInt(editForm.leaveBalance),
        leaveBalanceByExperience: parseInt(editForm.leaveBalanceByExperience)
      };
        const response = await fetch(`${API_BASE_URL}/hr/employees/${editEmployee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updatePayload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Failed to update employee');
      }
      const data = await response.json();
      setEmployees(prevEmployees =>
        prevEmployees.map(emp =>
          emp._id === editEmployee._id ? { ...emp, ...data.employee } : emp
        )
      );
      setShowEditModal(false);
      setEditEmployee(null);
      fetchEmployees(); // Ensure the list is refreshed
      toast.success('Employee updated successfully!');
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update employee.');
    }
  };

  const fetchBranchesForCampus = async (campus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employee/branches?campus=${campus}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch branches');
      }
      const data = await response.json();
      // Filter only active branches
      return (data.branches || []).filter(branch => branch.isActive);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to fetch branches');
      return [];
    }
  };

  const fetchRolesForCampus = async (campus) => {
    try {
        const response = await fetch(`${API_BASE_URL}/hr/roles?campus=${campus}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
      return [];
    }
  };

  const validateBulkRow = (row) => {
    const errors = {};
    
    // Name validation
    if (!row.name || row.name.trim() === '') {
      errors.name = 'Name is required';
    } else if (row.name.length < 2) {
      errors.name = 'Name is too short';
    } else if (row.name.length > 100) {
      errors.name = 'Name is too long';
    } else if (!/^[a-zA-Z\s.]*$/.test(row.name)) {
      errors.name = 'Name can only contain letters, spaces and dots';
    }

    // Enhanced email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!row.email) {
      errors.email = 'Email is required';
    } else {
      const [localPart] = row.email.split('@');
      if (localPart.length < 5) {
        errors.email = 'Email must have at least 5 characters before @';
      } else if (!emailRegex.test(row.email)) {
        errors.email = 'Invalid email format';
      } else if (row.email.length > 100) {
        errors.email = 'Email is too long';
      } else if (row.email.includes('..') || row.email.includes('--')) {
        errors.email = 'Invalid email format';
      }
    }

    // Employee ID validation
    if (!row.employeeId) {
      errors.employeeId = 'Employee ID is required';
    } else if (!/^[A-Za-z0-9-]+$/.test(row.employeeId)) {
      errors.employeeId = 'Employee ID can only contain letters, numbers and hyphens';
    } else if (row.employeeId.length < 3) {
      errors.employeeId = 'Employee ID is too short';
    } else if (row.employeeId.length > 20) {
      errors.employeeId = 'Employee ID is too long';
    }

    // Phone number validation
    if (!row.phoneNumber) {
      errors.phoneNumber = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(String(row.phoneNumber))) {
      errors.phoneNumber = 'Phone number must be 10 digits';
    }

    // Leave Balance by Experience validation
    if (!row.leaveBalanceByExperience) {
      errors.leaveBalanceByExperience = 'Leave balance by experience is required';
    } else if (isNaN(Number(row.leaveBalanceByExperience))) {
      errors.leaveBalanceByExperience = 'Leave balance must be a number';
    } else if (Number(row.leaveBalanceByExperience) < 0) {
      errors.leaveBalanceByExperience = 'Leave balance cannot be negative';
    } else if (Number(row.leaveBalanceByExperience) > 30) {
      errors.leaveBalanceByExperience = 'Leave balance cannot exceed 30';
    }

    // Campus validation
    if (!row.campus) {
      errors.campus = 'Campus is required';
    } else if (row.campus !== user?.campus?.name) {
      errors.campus = `Campus must be ${user?.campus?.name}`;
    }

    // Branch validation
    if (!row.branchCode) {
      errors.branchCode = 'Branch is required';
    } else {
      const validBranch = row.branches?.find(b => b.code === row.branchCode);
      if (!validBranch) {
        errors.branchCode = 'Invalid branch for selected campus';
      }
    }

    // Role validation
    if (!row.role) {
      errors.role = 'Role is required';
    } else if (!row.roles || !row.roles.some(r => r.value === row.role)) {
      errors.role = 'Invalid role for selected campus';
    } else if (row.role === 'other' && !row.customRole) {
      errors.customRole = 'Custom role is required';
    } else if (row.role === 'other' && row.customRole) {
      if (row.customRole.length < 2) {
        errors.customRole = 'Custom role is too short';
      } else if (row.customRole.length > 50) {
        errors.customRole = 'Custom role is too long';
      }
    }

    // Status validation
    if (row.status && !['active', 'inactive'].includes(row.status)) {
      errors.status = 'Status must be active or inactive';
    }

    // Designation validation (optional)
    if (row.designation && row.designation.length > 50) {
      errors.designation = 'Designation is too long';
    }

    return errors;
  };

  const isRowValid = (errors) => Object.keys(errors).length === 0;

  const handleBulkFileChange = async (e) => {
    const file = e.target.files[0];
    setBulkFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        // Always set campus to HR's campus
        const hrCampus = user?.campus?.name;
        if (!hrCampus) {
          toast.error('HR campus not found');
          return;
        }

        // Fetch branches and roles for HR's campus ONCE
        const branches = await fetchBranchesForCampus(hrCampus);
        if (branches.length === 0) {
          toast.error('No active branches found for your campus');
          return;
        }
        const roles = await fetchRolesForCampus(hrCampus);
        if (!roles || roles.length === 0) {
          toast.error('No roles found for your campus');
          return;
        }

        const editable = data.map(row => ({
          ...row,
          campus: hrCampus,
          branchCode: row.branchCode || '',
          role: row.role || '',
          customRole: row.customRole || '',
          branches, // Use the same branches for all rows
          roles,    // Use the same roles for all rows
        }));
        setBulkEditableData(editable);
        setBulkErrors(editable.map(validateBulkRow));
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleBulkFieldChange = async (idx, field, value) => {
    const updated = [...bulkEditableData];
    updated[idx][field] = value;

    // Handle special cases
    if (field === 'campus') {
      updated[idx].branches = await fetchBranchesForCampus(value);
      updated[idx].roles = await fetchRolesForCampus(value);
      updated[idx].branchCode = '';
      updated[idx].role = '';
      updated[idx].customRole = '';
    } else if (field === 'role' && value !== 'other') {
      updated[idx].customRole = '';
    } else if (field === 'name') {
      updated[idx][field] = value.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    } else if (field === 'email') {
      updated[idx][field] = value.toLowerCase();
    }

    setBulkEditableData(updated);
    // Validate the updated row
    const errors = [...bulkErrors];
    errors[idx] = validateBulkRow(updated[idx]);
    setBulkErrors(errors);
  };

  const isBulkValid = bulkEditableData.length > 0 && bulkErrors.every(err => Object.keys(err).length === 0);

  const handleBulkRegister = async () => {
    setBulkLoading(true);
    setBulkResults([]);
    try {
      if (!isBulkValid) {
        toast.error('Please fix validation errors before submitting.');
        setBulkLoading(false);
        return;
      }
      const employees = bulkEditableData.map(row => ({
        ...row,
        branchCode: row.branchCode,
        campus: row.campus,
        role: row.role,
        customRole: row.role === 'other' ? row.customRole : '',
      }));
      const response = await fetch(`${API_BASE_URL}/hr/employees/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ employees }),
      });
      const data = await response.json();
      if (response.ok) {
        setBulkResults(data.results);
        fetchEmployees();
        fetchEmployeeStats();
        toast.success('Bulk registration completed!');
      } else {
        toast.error(data.msg || 'Bulk registration failed');
      }
    } catch (error) {
      toast.error(error.message || 'Bulk registration failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Profile picture handling functions
  const handleProfilePictureUpload = async (event, employeeId) => {
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
      const response = await fetch(`${API_BASE_URL}/hr/employees/${employeeId}/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        // Update the employee in the list
        setEmployees(prevEmployees =>
          prevEmployees.map(emp =>
            emp._id === employeeId
              ? { ...emp, profilePicture: data.profilePicture }
              : emp
          )
        );
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

  const handleDeleteProfilePicture = async (employeeId) => {
    setUploadingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/hr/employees/${employeeId}/delete-profile-picture`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        // Update the employee in the list
        setEmployees(prevEmployees =>
          prevEmployees.map(emp =>
            emp._id === employeeId
              ? { ...emp, profilePicture: null }
              : emp
          )
        );
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
    <div className="min-h-screen bg-background flex flex-col items-center p-2 sm:p-4">
      <div className="w-full max-w-6xl mx-auto mt-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary text-center flex items-center gap-2">
            <FaUserTie className="text-primary text-xl sm:text-2xl" /> HR Dashboard - {user?.campus?.name}
          </h2>
          <button
            className="w-full sm:w-auto justify-center px-4 py-2 bg-red-500 text-white rounded-md shadow hover:bg-red-600 transition flex items-center gap-2 mt-4 sm:mt-0"
            onClick={handleLogout}
          >
            <MdOutlineLogout className="text-lg" /> Logout
          </button>
        </div>
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-secondary p-6 rounded-neumorphic shadow-outerRaised flex flex-col items-center gap-2">
            <FaUsers className="text-primary text-3xl mb-2" />
            <h3 className="text-lg font-semibold text-primary mb-1">Total Employees</h3>
            <p className="text-3xl font-bold">{stats.totalEmployees}</p>
          </div>
          <div className="bg-secondary p-6 rounded-neumorphic shadow-outerRaised flex flex-col items-center gap-2">
            <FaUsers className="text-green-600 text-3xl mb-2" />
            <h3 className="text-lg font-semibold text-primary mb-1">Active Employees</h3>
            <p className="text-3xl font-bold">{stats.activeEmployees}</p>
          </div>
          <div className="bg-secondary p-6 rounded-neumorphic shadow-outerRaised flex flex-col items-center gap-2">
            <FaUsers className="text-red-600 text-3xl mb-2" />
            <h3 className="text-lg font-semibold text-primary mb-1">Inactive Employees</h3>
            <p className="text-3xl font-bold">{stats.inactiveEmployees}</p>
          </div>
        </div>
        {/* Employee Management Section */}
        <div className="bg-secondary rounded-neumorphic shadow-outerRaised p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
            <h3 className="text-xl font-semibold text-primary flex items-center gap-2"><FaRegCalendarCheck className="text-primary text-xl" /> Employee Management</h3>
            <button
              className="bg-primary text-white px-4 py-2 rounded-md shadow hover:bg-primary-dark transition flex items-center gap-2"
              onClick={() => setShowRegisterModal(true)}
            >
              <FaUserTie className="text-white text-lg" /> Register New Employee
            </button>
            <button
              className="bg-primary text-white px-4 py-2 rounded-md shadow hover:bg-primary/20 transition flex items-center gap-2"
              onClick={() => setShowBulkModal(true)}
            >
              <FaUsers className="text-white text-lg" />Bulk Register
            </button>
          </div>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
              placeholder="Search by name, email, or ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
              value={department}
              onChange={e => setDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {branches.map(branch => (
                <option key={branch.code} value={branch.code}>{branch.name} ({branch.code})</option>
              ))}
            </select>
            <select
              className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {/* Employee Table (desktop/tablet) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map(employee => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {employee.profilePicture ? (
                            <img
                              src={employee.profilePicture}
                              alt={employee.name}
                              className="h-10 w-10 rounded-full object-cover border border-gray-200"
                              onError={e => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div className={`h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-gray-200 ${employee.profilePicture ? 'hidden' : 'flex'}`}>
                            <span className="text-primary font-semibold text-sm">
                              {employee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.employeeId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.leaveBalance || 12}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{employee.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => handleEditClick(employee)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => {
                            setSelectedEmployeeForReset(employee);
                            setShowPasswordResetModal(true);
                          }}
                        >
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Employee Cards (mobile) */}
          <div className="md:hidden space-y-4">
            {employees.map(employee => (
              <div key={employee._id} className="bg-white rounded-lg shadow p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 flex-shrink-0">
                      {employee.profilePicture ? (
                        <img
                          src={employee.profilePicture}
                          alt={employee.name}
                          className="h-12 w-12 rounded-full object-cover border border-gray-200"
                          onError={e => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div className={`h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-gray-200 ${employee.profilePicture ? 'hidden' : 'flex'}`}>
                        <span className="text-primary font-semibold text-lg">
                          {employee.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-base">{employee.name}</div>
                      <div className="text-xs text-gray-500">ID: {employee.employeeId}</div>
                      <div className="text-xs text-gray-500">{employee.email}</div>
                      <div className="text-xs text-gray-500">{employee.department}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{employee.status}</span>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <button
                    className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/20 transition-colors text-sm"
                    onClick={() => handleEditClick(employee)}
                  >
                    Edit
                  </button>
                  <button
                    className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                    onClick={() => {
                      setSelectedEmployeeForReset(employee);
                      setShowPasswordResetModal(true);
                    }}
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Register Employee Modal */}
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                onClick={() => setShowRegisterModal(false)}
              >
                &times;
              </button>
              <h3 className="text-xl font-bold text-primary mb-4 text-center">Register New Employee</h3>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleRegisterEmployee();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="First Name"
                    value={newEmployee.firstName}
                    onChange={e => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Last Name"
                    value={newEmployee.lastName}
                    onChange={e => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                    required
                  />
                </div>
                <input
                  type="text"
                  className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                  placeholder="Employee ID"
                  value={newEmployee.employeeId}
                  onChange={e => setNewEmployee({ ...newEmployee, employeeId: e.target.value })}
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="email"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Email"
                    value={newEmployee.email}
                    onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    required
                  />
                  <input
                    type="tel"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Phone Number"
                    value={newEmployee.phoneNumber}
                    onChange={e => setNewEmployee({ ...newEmployee, phoneNumber: e.target.value })}
                    required
                    pattern="[0-9]{10}"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    value={newEmployee.campus}
                    onChange={e => setNewEmployee({ ...newEmployee, campus: e.target.value })}
                    required
                    disabled
                  >
                    <option value="">Select Campus</option>
                    {campuses.filter(campus => campus.value === user?.campus?.name).map(campus => (
                      <option key={campus.value} value={campus.value}>{campus.label}</option>
                    ))}
                  </select>
                  <select
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    value={newEmployee.department}
                    onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    required
                  >
                    <option value="">Select Department</option>
                    {branches.map(branch => (
                      <option key={branch.code} value={branch.code}>{branch.name} ({branch.code})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="number"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Leave Balance by Experience"
                    value={newEmployee.leaveBalanceByExperience}
                    onChange={e => setNewEmployee({ ...newEmployee, leaveBalanceByExperience: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-4">
                  <select
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    value={newEmployee.role}
                    onChange={handleRoleChange}
                    required
                  >
                    <option value="">Select Role</option>
                    {getCampusRoles(user?.campus?.name).map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                  {newEmployee.role === 'other' && (
                    <input
                      type="text"
                      className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                      placeholder="Enter Custom Role"
                      value={newEmployee.customRole}
                      onChange={e => setNewEmployee({ ...newEmployee, customRole: e.target.value })}
                      required
                    />
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="password"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Password"
                    value={newEmployee.password}
                    onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <input
                    type="password"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Confirm Password"
                    value={newEmployee.confirmPassword}
                    onChange={e => setNewEmployee({ ...newEmployee, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                    onClick={() => setShowRegisterModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-dark transition"
                    disabled={loading}
                  >
                    {loading ? 'Registering...' : 'Register'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Edit Employee Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-lg sm:max-w-lg max-h-[90vh] overflow-y-auto relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                onClick={() => setShowEditModal(false)}
              >
                &times;
              </button>
              <h3 className="text-xl font-bold text-primary mb-4 text-center">Edit Employee</h3>
              
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative rounded-full overflow-hidden border-4 border-white shadow w-24 h-24 mb-4 group">
                  {previewImage || editEmployee?.profilePicture ? (
                    <img
                      src={previewImage || editEmployee?.profilePicture || ''}
                      alt={editEmployee?.name}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.onerror = null; e.target.src = ''; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <FaUserCircle className="text-gray-400 text-4xl" />
                    </div>
                  )}
                  {/* Overlay for actions */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-10">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
                      aria-label="Change profile picture"
                      disabled={uploadingProfile}
                    >
                      <FaCamera className="text-gray-700 text-lg" />
                    </button>
                    {editEmployee?.profilePicture && !previewImage && (
                      <button
                        onClick={() => {
                          setSelectedEmployeeForPicture(editEmployee);
                          setShowDeleteModal(true);
                        }}
                        className="ml-2 p-2 bg-red-500 rounded-full shadow hover:bg-red-600"
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
                    onChange={(e) => handleProfilePictureUpload(e, editEmployee._id)}
                    accept="image/jpeg,image/png,image/jpg"
                    className="hidden"
                    disabled={uploadingProfile}
                  />
                  {uploadingProfile && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-full z-20">
                      <Loading />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Click on the image to change profile picture
                </p>
              </div>
              
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Enter full name"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Enter email address"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Enter phone number"
                    value={editForm.phoneNumber}
                    onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value, customRole: e.target.value === 'other' ? editForm.customRole : '' })}
                    required
                  >
                    <option value="">Select Role</option>
                    {getCampusRoles(user?.campus?.name).map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                  {editForm.role === 'other' && (
                    <input
                      type="text"
                      className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                      placeholder="Enter Custom Role"
                      value={editForm.customRole}
                      onChange={e => setEditForm({ ...editForm, customRole: e.target.value })}
                      required
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <select
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    value={editForm.department}
                    onChange={e => setEditForm({ ...editForm, department: e.target.value, branchCode: e.target.value })}
                    required
                  >
                    <option value="">Select Department</option>
                    {branches.map(branch => (
                      <option key={branch.code} value={branch.code}>{branch.name} ({branch.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Leave Balance</label>
                  <input
                    type="number"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Enter leave balance"
                    value={editForm.leaveBalance}
                    onChange={e => setEditForm({ ...editForm, leaveBalance: e.target.value })}
                    min="0"
                    max="30"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Leave Balance by Experience</label>
                  <input
                    type="number"
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Enter leave balance by experience"
                    value={editForm.leaveBalanceByExperience}
                    onChange={e => setEditForm({ ...editForm, leaveBalanceByExperience: e.target.value })}
                    min="0"
                    max="30"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-dark transition"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Password Reset Modal */}
        <PasswordResetModal
          show={showPasswordResetModal}
          onClose={() => {
            setShowPasswordResetModal(false);
            setSelectedEmployeeForReset(null);
          }}
          employeeId={selectedEmployeeForReset?._id}
          token={localStorage.getItem('token')}
          loading={loading}
          setLoading={setLoading}
          resetApiPath={`/hr/employees/:id/reset-password`}
        />
        {/* Bulk Register Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkFile(null);
                  setBulkEditableData([]);
                  setBulkResults([]);
                  setBulkErrors([]);
                }}
              >
                &times;
              </button>
              <h3 className="text-xl font-bold text-primary mb-4 text-center">Bulk Register Employees</h3>
              
              {/* Add Download Sample Button */}
              <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <button
                  onClick={() => window.open('/bulk_employee_registration.xlsx', '_blank')}
                  className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download Sample Template
                </button>
                <div className="text-sm text-gray-600 w-full sm:w-auto text-center sm:text-right">
                  Upload your Excel file below
                </div>
              </div>

              <div className="mb-4">
                <input type="file" accept=".xlsx,.xls" onChange={handleBulkFileChange} />
              </div>
              {bulkEditableData.length > 0 && (
                <>
                  <div className="mb-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-100 border border-green-500"></div>
                        <span className="text-sm">Valid</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 border border-red-500"></div>
                        <span className="text-sm">Invalid</span>
                      </div>
                    </div>
                    <div className="text-sm">
                      {bulkEditableData.filter((_, idx) => isRowValid(bulkErrors[idx])).length} of {bulkEditableData.length} records valid
                    </div>
                  </div>
                  <div className="mb-4 overflow-x-auto">
                    <table className="min-w-full text-xs border">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border px-2 py-1">Status</th>
                          <th className="border px-2 py-1">Name</th>
                          <th className="border px-2 py-1">Email</th>
                          <th className="border px-2 py-1">Employee ID</th>
                          <th className="border px-2 py-1">Phone</th>
                          <th className="border px-2 py-1">Campus</th>
                          <th className="border px-2 py-1">Branch</th>
                          <th className="border px-2 py-1">Role</th>
                          <th className="border px-2 py-1">Custom Role</th>
                          <th className="border px-2 py-1">Leave Balance</th>
                          <th className="border px-2 py-1">Status</th>
                          <th className="border px-2 py-1">Designation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkEditableData.map((row, idx) => {
                          const rowErrors = bulkErrors[idx];
                          const isValid = isRowValid(rowErrors);
                          return (
                            <tr key={idx} className={isValid ? 'bg-green-50' : 'bg-red-50'}>
                              <td className="border px-2 py-1">
                                <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              </td>
                              <td className="border px-2 py-1">
                                <input
                                  type="text"
                                  value={row.name || ''}
                                  onChange={(e) => handleBulkFieldChange(idx, 'name', e.target.value)}
                                  className="w-full bg-transparent border-none outline-none"
                                />
                              </td>
                              <td className="border px-2 py-1">
                                <input
                                  type="email"
                                  value={row.email || ''}
                                  onChange={(e) => handleBulkFieldChange(idx, 'email', e.target.value)}
                                  className="w-full bg-transparent border-none outline-none"
                                />
                              </td>
                              <td className="border px-2 py-1">
                                <input
                                  type="text"
                                  value={row.employeeId || ''}
                                  onChange={(e) => handleBulkFieldChange(idx, 'employeeId', e.target.value)}
                                  className="w-full bg-transparent border-none outline-none"
                                />
                              </td>
                              <td className="border px-2 py-1">
                                <input
                                  type="text"
                                  value={row.phoneNumber || ''}
                                  onChange={(e) => handleBulkFieldChange(idx, 'phoneNumber', e.target.value)}
                                  className="w-full bg-transparent border-none outline-none"
                                />
                              </td>
                              <td className="border px-2 py-1">
                                <input
                                  type="text"
                                  value={row.campus || ''}
                                  className="w-full bg-transparent border-none outline-none"
                                  readOnly
                                />
                              </td>
                              <td className="border px-2 py-1">
                                <select
                                  value={row.branchCode || ''}
                                  onChange={(e) => handleBulkFieldChange(idx, 'branchCode', e.target.value)}
                                  className="w-full bg-transparent border-none outline-none"
                                >
                                  <option value="">Select Branch</option>
                                  {row.branches?.map(branch => (
                                    <option key={branch.code} value={branch.code}>
                                      {branch.name} ({branch.code})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="border px-2 py-1">
                                <select
                                  value={row.role || ''}
                                  onChange={(e) => handleBulkFieldChange(idx, 'role', e.target.value)}
                                  className="w-full bg-transparent border-none outline-none"
                                >
                                  <option value="">Select Role</option>
                                  {row.roles?.map(role => (
                                    <option key={role.value} value={role.value}>
                                      {role.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="border px-2 py-1">
                                <input
                                  type="text"
                                  value={row.customRole || ''}
                                  onChange={(e) => handleBulkFieldChange(idx, 'customRole', e.target.value)}
                                  className="w-full bg-transparent border-none outline-none"
                                  placeholder="Custom role if 'other'"
                                />
                              </td>
                              <td className="border px-2 py-1">
                                <input
                                  type="number"
                                  value={row.leaveBalanceByExperience || ''}
                                  onChange={(e) => handleBulkFieldChange(idx, 'leaveBalanceByExperience', e.target.value)}
                                  className="w-full bg-transparent border-none outline-none"
                                />
                              </td>
                              <td className="border px-2 py-1">
                                <select
                                  value={row.status || 'active'}
                                  onChange={(e) => handleBulkFieldChange(idx, 'status', e.target.value)}
                                  className="w-full bg-transparent border-none outline-none"
                                >
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                </select>
                              </td>
                              <td className="border px-2 py-1">
                                <input
                                  type="text"
                                  value={row.designation || ''}
                                  onChange={(e) => handleBulkFieldChange(idx, 'designation', e.target.value)}
                                  className="w-full bg-transparent border-none outline-none"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                      onClick={() => {
                        setShowBulkModal(false);
                        setBulkFile(null);
                        setBulkEditableData([]);
                        setBulkResults([]);
                        setBulkErrors([]);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-dark transition"
                      onClick={handleBulkRegister}
                      disabled={bulkLoading || !isBulkValid}
                    >
                      {bulkLoading ? 'Registering...' : 'Register All'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Delete Profile Picture Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full text-center">
              <FaTrash className="mx-auto text-red-500 text-3xl mb-2" />
              <h3 className="text-lg font-semibold mb-2">Remove Profile Picture?</h3>
              <p className="text-gray-600 mb-4">Are you sure you want to delete the profile picture for {selectedEmployeeForPicture?.name}?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleDeleteProfilePicture(selectedEmployeeForPicture._id)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  disabled={uploadingProfile}
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  disabled={uploadingProfile}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRDashboard; 