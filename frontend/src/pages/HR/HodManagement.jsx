import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosConfig';
import HodPasswordResetModal from '../../components/HodPasswordResetModal';

const HodManagement = ({ onHodUpdate, campus }) => {
  const [hods, setHods] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    branchCode: '',
    HODId: '',
    hodType: 'teaching' // Default to teaching
  });
  const [selectedHod, setSelectedHod] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    department: '',
    status: ''
  });
  const [error, setError] = useState('');

  // Debug effect to log branches state changes with more details
  useEffect(() => {
    console.log('Branches state updated:', {
      isArray: Array.isArray(branches),
      length: branches?.length || 0,
      sample: branches?.slice(0, 2),
      allBranches: branches
    });

    // Log the branch select element's options when branches update
    if (document.getElementById('branchCode')) {
      const select = document.getElementById('branchCode');
      console.log('Select element options:', {
        options: Array.from(select.options).map(opt => ({
          value: opt.value,
          text: opt.text,
          disabled: opt.disabled
        }))
      });
    }
  }, [branches]);

  // Fetch HODs and branches
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        console.log('Starting to fetch branches...');
        console.log('Current user:', JSON.parse(localStorage.getItem('user')));

        // Fetch HODs and branches in parallel
        const [hodsRes, branchesRes] = await Promise.all([
          axiosInstance.get('/hr/hods').catch((err) => {
            console.error('Error fetching HODs:', err);
            return { data: [] };
          }),
          axiosInstance.get('/hr/branches')
            .then(response => {
              console.log('Raw branches response:', response);
              console.log('Branches response data:', response?.data);
              return response;
            })
            .catch(err => {
              console.error('Error fetching branches:', err);
              console.error('Error response:', err.response);
              return { data: { success: false, data: [] } };
            })
        ]);

        console.log('HODs response data structure:', {
          isArray: Array.isArray(hodsRes?.data),
          data: hodsRes?.data
        });

        console.log('Branches response data structure:', {
          isSuccess: branchesRes?.data?.success,
          isDataArray: Array.isArray(branchesRes?.data?.data),
          data: branchesRes?.data
        });

        const hodsData = Array.isArray(hodsRes?.data) ? hodsRes.data : [];

        // Extract branches from the response data
        let branchesData = [];
        if (branchesRes?.data?.success && Array.isArray(branchesRes.data.data)) {
          branchesData = branchesRes.data.data.map(branch => ({
            ...branch,
            // Ensure code and name are strings and trim any whitespace
            code: String(branch.code || '').trim(),
            name: String(branch.name || '').trim()
          }));
          console.log('Processed branches data:', branchesData);
        } else {
          console.error('Branches data is not in expected format:', branchesRes?.data);
        }

        console.log('Setting state with:', {
          hodsCount: hodsData.length,
          branchesCount: branchesData.length,
          branchesSample: branchesData.slice(0, 2) // Show first 2 branches as sample
        });

        setHods(hodsData);
        setBranches(branchesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
        setHods([]);
        setBranches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Ensure branches is always an array
  const safeBranches = Array.isArray(branches) ? branches : [];

  // Form validation helper
  const validateForm = () => {
    if (!formData.name || !formData.email) {
      setError('Please fill in all required fields');
      return false;
    }

    // Password is required
    if (!formData.password || formData.password.length < 6) {
      setError('Password is required and must be at least 6 characters');
      return false;
    }

    // For teaching HODs, branchCode is required
    if (formData.hodType === 'teaching' && !formData.branchCode) {
      setError('Branch is required for teaching HODs');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };


  // Handle create HOD
  const handleCreateHOD = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    try {
      // Get the current user (HR) to use their campus reference
      const currentUser = JSON.parse(localStorage.getItem('user'));
      if (!currentUser || !currentUser.campus) {
        throw new Error('HR user campus information not found');
      }

      // Ensure we have all required fields
      const HODId = (formData.HODId || formData.email).trim().toLowerCase();
      if (!HODId) {
        throw new Error('HOD ID is required');
      }

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(), // Use the password from form
        HODId: HODId,
        hodType: formData.hodType,
        status: 'active' // Default status
      };

      // Only process branch and department for teaching HODs
      if (formData.hodType === 'teaching') {
        // Get campus type with proper capitalization
        const campusType = typeof campus === 'string'
          ? campus.charAt(0).toUpperCase() + campus.slice(1)
          : campus?.type?.charAt(0).toUpperCase() + (campus?.type || '').slice(1);

        if (!campusType) {
          throw new Error('Campus information is missing');
        }

        // Find the selected branch from branches array
        const selectedBranch = branches.find(branch => branch.code === formData.branchCode);
        if (!selectedBranch || !formData.branchCode) {
          throw new Error('Branch is required for teaching HODs');
        }

        // Define valid campus types (must match the backend enum exactly)
        const validCampusTypes = ['Engineering', 'Diploma', 'Pharmacy', 'Degree'];

        // Try to extract campus type in order of priority
        let actualCampusType = null;

        // 1. Try to get from campus.type (direct property)
        if (currentUser.campus?.type) {
          actualCampusType = currentUser.campus.type;
        }
        // 2. Try to get from campus.name (capitalized)
        else if (currentUser.campus?.name) {
          actualCampusType = currentUser.campus.name;
        }
        // 3. Try to get from props as fallback
        else if (campusType) {
          actualCampusType = campusType;
        }

        // If we still don't have a campus type, try to infer it from the branch code
        if (!actualCampusType && formData.branchCode) {
          const campusFromBranch = validCampusTypes.find(type =>
            formData.branchCode.toUpperCase().startsWith(type.substring(0, 3).toUpperCase())
          );
          if (campusFromBranch) {
            actualCampusType = campusFromBranch;
          }
        }

        // Normalize the campus type (case-insensitive match)
        const normalizedCampusType = actualCampusType && validCampusTypes.find(
          type => type.toLowerCase() === actualCampusType.toLowerCase()
        );

        if (!normalizedCampusType) {
          throw new Error(`Invalid campus type '${actualCampusType}'. Must be one of: ${validCampusTypes.join(', ')}`);
        }

        // Add department for teaching HODs
        payload.department = {
          name: selectedBranch.name.trim(),
          code: formData.branchCode.trim().toUpperCase(),
          campusType: normalizedCampusType || 'Engineering'
        };
      }
      // For non-teaching HODs, no department or branch needed - payload is ready

      console.log('Final payload for HOD creation:', JSON.stringify(payload, null, 2));

      console.log('Creating HOD with payload:', payload);

      const createRes = await axiosInstance.post('/hr/hods', payload);
      toast.success('HOD created successfully');
      setShowCreateModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        branchCode: '',
        HODId: '',
        hodType: 'teaching'
      });
      // Update local list so UI reflects the change immediately
      if (createRes?.data) {
        setHods(prev => [createRes.data, ...prev]);
      }
      if (onHodUpdate) onHodUpdate();
    } catch (error) {
      console.error('Create HOD Error:', error);
      const errorMsg = error.response?.data?.msg || 'Failed to create HOD';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  // Handle edit HOD
  const handleEditClick = (hod) => {
    setSelectedHod(hod);
    setEditForm({
      name: hod.name,
      email: hod.email,
      phoneNumber: hod.phoneNumber || '',
      department: hod.department?.code || hod.branchCode || '',
      status: hod.status || (hod.isActive ? 'active' : 'inactive')
    });
    setShowEditModal(true);
  };

  // Helper to check if edit form is dirty and valid
  const isEditFormDirty = selectedHod && (
    editForm.name !== selectedHod.name ||
    editForm.email !== selectedHod.email ||
    editForm.phoneNumber !== (selectedHod.phoneNumber || '') ||
    editForm.department !== (selectedHod.department?.code || selectedHod.branchCode || '') ||
    editForm.status !== (selectedHod.status || (selectedHod.isActive ? 'active' : 'inactive'))
  );

  const isEditFormDepartmentValid = selectedHod?.hodType === 'non-teaching' || safeBranches.some(b => b.code === editForm.department);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHod || !isEditFormDirty || !isEditFormDepartmentValid) return;

    try {
      // Build update payload
      const updatePayload = {
        name: editForm.name,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber,
        status: editForm.status
      };

      // Only include department if it's a teaching HOD and department has changed
      if (selectedHod.hodType !== 'non-teaching') {
        const currentUser = (() => {
          try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
        })();

        let derivedCampus = null;
        if (typeof campus === 'string') derivedCampus = campus;
        else if (campus && typeof campus === 'object') derivedCampus = campus.type || campus.name;
        else if (currentUser && currentUser.campus) derivedCampus = currentUser.campus.type || currentUser.campus.name;

        const campusType = derivedCampus ? String(derivedCampus).charAt(0).toUpperCase() + String(derivedCampus).slice(1) : 'Engineering';

        if (editForm.department !== (selectedHod.department?.code || selectedHod.branchCode || '') &&
          safeBranches.some(b => b.code === editForm.department)) {
          const branch = safeBranches.find(b => b.code === editForm.department);
          updatePayload.department = {
            name: branch.name,
            code: branch.code,
            campusType: campusType
          };
        }
      }

      const response = await axiosInstance.put(`/hr/hods/${selectedHod._id}`, updatePayload);

      setShowEditModal(false);
      toast.success('HOD details updated successfully');
      if (onHodUpdate) onHodUpdate(); // Refresh the HOD list
    } catch (error) {
      console.error('Error updating HOD:', error);
      toast.error(error.response?.data?.msg || 'Failed to update HOD');
    }
  };

  // Handle delete HOD
  const handleDeleteHod = async (hodId) => {
    if (window.confirm('Are you sure you want to delete this HOD?')) {
      try {
        await axiosInstance.delete(`/hr/hods/${hodId}`);
        toast.success('HOD deleted successfully');
        // Remove from local list immediately
        setHods(prev => prev.filter(h => h._id !== hodId));
        if (onHodUpdate) onHodUpdate();
      } catch (error) {
        console.error('Delete HOD Error:', error);
        toast.error(error.response?.data?.msg || 'Failed to delete HOD');
      }
    }
  };

  const handleResetPassword = (hod) => {
    setSelectedHod(hod);
    setShowPasswordResetModal(true);
  };

  const token = localStorage.getItem('token');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 mt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-primary">HOD Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full md:w-auto bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create HOD
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Table for md+ screens */}
        <div className="overflow-x-auto hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {hods.map((hod) => (
                <tr key={hod._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-lg">
                          {hod.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{hod.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{hod.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="group relative">
                      <span className="text-sm text-gray-900">{hod.department?.code || hod.branchCode || (hod.hodType === 'non-teaching' ? 'Non-Teaching' : 'Unknown')}</span>
                      {hod.hodType === 'teaching' && (hod.department?.code || hod.branchCode) && (
                        <div className="hidden group-hover:block absolute z-10 bg-gray-900 text-white text-xs rounded py-1 px-2 left-0 -bottom-8 whitespace-nowrap">
                          {branches.find(b => b.code === (hod.department?.code || hod.branchCode))?.name || hod.department?.name || 'Unknown'}
                        </div>
                      )}
                      {hod.hodType === 'non-teaching' && (
                        <div className="mt-1">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Non-Teaching HOD
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{hod.phoneNumber || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold
                      ${(hod.status === 'active' || hod.isActive)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'}`}
                    >
                      {hod.status || (hod.isActive ? 'Active' : 'Inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditClick(hod)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleResetPassword(hod)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      Reset Password
                    </button>
                    <button
                      onClick={() => handleDeleteHod(hod._id)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card layout for small screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 md:hidden">
          {hods.map((hod) => (
            <div key={hod._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold text-xl">
                      {hod.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{hod.name}</h3>
                    <p className="text-sm text-gray-500">{hod.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1">{hod.hodType === 'non-teaching' ? 'Non-Teaching' : (branches.find(b => b.code === (hod.department?.code || hod.branchCode))?.name || hod.department?.name || hod.department?.code || hod.branchCode || 'Unknown')}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="font-medium">Phone:</span>
                  <span className="ml-1">{hod.phoneNumber || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${(hod.status === 'active' || hod.isActive)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'}`}
                  >
                    {hod.status || (hod.isActive ? 'Active' : 'Inactive')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEditClick(hod)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => handleResetPassword(hod)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Reset Password
                </button>
                <button
                  onClick={() => handleDeleteHod(hod._id)}
                  className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create HOD Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary">Create New HOD</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateHOD} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-gray-700 text-sm font-semibold mb-1">HOD Type <span className="text-red-500">*</span></label>
                  <select
                    value={formData.hodType}
                    onChange={(e) => {
                      const hodType = e.target.value;
                      setFormData({
                        ...formData,
                        hodType,
                        branchCode: hodType === 'teaching' ? formData.branchCode : ''
                      });
                    }}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    required
                  >
                    <option value="teaching">Teaching</option>
                    <option value="non-teaching">Non-Teaching</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">HOD ID <span className="text-gray-400 text-xs">(optional)</span></label>
                  <input
                    type="text"
                    value={formData.HODId}
                    onChange={(e) => setFormData({ ...formData, HODId: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Leave empty to use email as ID"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    required
                    minLength={6}
                  />
                  <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
                </div>
                {formData.hodType === 'teaching' && (
                  <div className="sm:col-span-2">
                    <label className="block text-gray-700 text-sm font-semibold mb-1">Branch</label>
                    <select
                      value={formData.branchCode}
                      onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                      className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                      required
                    >
                      <option value="">Select a branch</option>
                      {(branches || []).map((branch) => (
                        <option key={branch._id || branch.code} value={branch.code}>
                          {`${branch.name} (${branch.code})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {formData.hodType === 'non-teaching' && (
                  <div className="sm:col-span-2 mt-2 p-3 bg-blue-50 text-blue-700 text-sm rounded">
                    <p>Non-teaching HODs do not require branch selection.</p>
                  </div>
                )}
              </div>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError('');
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.name || !formData.email || !formData.password || formData.password.length < 6 || (formData.hodType === 'teaching' && !formData.branchCode)}
                  className="bg-primary text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit HOD Modal */}
      {showEditModal && selectedHod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 lg:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg lg:text-xl font-bold mb-4">Edit HOD Details</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="mt-1 block w-full p-2 lg:p-3 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="mt-1 block w-full p-2 lg:p-3 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    className="mt-1 block w-full p-2 lg:p-3 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  />
                </div>
                {selectedHod.hodType !== 'non-teaching' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <select
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                      required
                    >
                      <option value="">Select a branch</option>
                      {branches.filter(b => b.isActive).map(branch => (
                        <option key={branch.code} value={branch.code}>
                          {`${branch.name} (${branch.code})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`bg-primary text-white px-3 lg:px-4 py-2 rounded-md hover:bg-primary-dark ${(!isEditFormDirty || !isEditFormDepartmentValid) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!isEditFormDirty || !isEditFormDepartmentValid}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      <HodPasswordResetModal
        show={showPasswordResetModal}
        onClose={() => {
          setShowPasswordResetModal(false);
          setSelectedHod(null);
        }}
        hod={selectedHod}
        token={token}
        loading={resetPasswordLoading}
        setLoading={setResetPasswordLoading}
        role="hr"
      />
    </div>
  );
};

export default HodManagement;