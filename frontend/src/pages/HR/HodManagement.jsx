import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosConfig';
import { FaUserTie, FaPencilAlt, FaKey, FaTrash } from 'react-icons/fa';

const HodManagement = ({ onHodUpdate, campus }) => {
  const [hods, setHods] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'defaultPassword',
    branchCode: '',
    HODId: ''
  });
  const [selectedHod, setSelectedHod] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
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
    if (!formData.name || !formData.email || !formData.branchCode) {
      setError('Please fill in all required fields');
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
  
  // Helper to check if edit form is dirty and valid
  const isEditFormDirty = selectedHod && (
    formData.name !== selectedHod.name ||
    formData.email !== selectedHod.email ||
    formData.branchCode !== (selectedHod.department?.code || selectedHod.branchCode || '')
  );
  
  const isEditFormBranchValid = safeBranches.some(b => b.code === formData.branchCode);

  // Handle create HOD
  const handleCreateHOD = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    try {
      // Get campus type with proper capitalization
      const campusType = typeof campus === 'string' 
        ? campus.charAt(0).toUpperCase() + campus.slice(1)
        : campus?.type?.charAt(0).toUpperCase() + (campus?.type || '').slice(1);
      
      if (!campusType) {
        throw new Error('Campus information is missing');
      }

      // Find the selected branch from branches array
      const selectedBranch = branches.find(branch => branch.code === formData.branchCode);
      if (!selectedBranch) {
        throw new Error('Invalid branch selected');
      }

      // Get the current user (HR) to use their campus reference
      const currentUser = JSON.parse(localStorage.getItem('user'));
      if (!currentUser || !currentUser.campus) {
        throw new Error('HR user campus information not found');
      }

      // Debug log the current user and campus data with more details
      console.group('User and Campus Data');
      console.log('Current user:', JSON.parse(JSON.stringify(currentUser)));
      console.log('Campus object structure:', {
        hasCampus: !!currentUser.campus,
        campusType: currentUser.campus?.type,
        campusName: currentUser.campus?.name,
        campusLocation: currentUser.campus?.location,
        rawCampus: currentUser.campus
      });
      console.groupEnd();

      // Define valid campus types (must match the backend enum exactly)
      const validCampusTypes = ['Engineering', 'Diploma', 'Pharmacy', 'Degree'];
      
      // Try to extract campus type in order of priority
      let actualCampusType = null;
      
      // 1. Try to get from campus.type (direct property)
      if (currentUser.campus?.type) {
        actualCampusType = currentUser.campus.type;
        console.log('Found campus type from campus.type:', actualCampusType);
      } 
      // 2. Try to get from campus.name (capitalized)
      else if (currentUser.campus?.name) {
        actualCampusType = currentUser.campus.name;
        console.log('Using campus name as type:', actualCampusType);
      }
      // 3. Try to get from props as fallback
      else if (campusType) {
        actualCampusType = campusType;
        console.log('Using campus type from props:', actualCampusType);
      }
      
      // If we still don't have a campus type, try to infer it from the branch code
      if (!actualCampusType && formData.branchCode) {
        const campusFromBranch = validCampusTypes.find(type => 
          formData.branchCode.toUpperCase().startsWith(type.substring(0, 3).toUpperCase())
        );
        if (campusFromBranch) {
          actualCampusType = campusFromBranch;
          console.log('Inferred campus type from branch code:', actualCampusType);
        }
      }
      
      console.log('Derived campus type:', actualCampusType);
      
      // Normalize the campus type (case-insensitive match)
      const normalizedCampusType = actualCampusType && validCampusTypes.find(
        type => type.toLowerCase() === actualCampusType.toLowerCase()
      );
      
      if (!normalizedCampusType) {
        console.error('Available campus types:', validCampusTypes);
        console.error('Provided campus type:', actualCampusType);
        throw new Error(`Invalid campus type '${actualCampusType}'. Must be one of: ${validCampusTypes.join(', ')}`);
      }

      // Ensure we have all required fields
      const HODId = (formData.HODId || formData.email).trim().toLowerCase();
      if (!HODId) {
        throw new Error('HOD ID is required');
      }

      // Get the HR's campus ID - this should be an ObjectId
      const campusId = currentUser.campus?._id || currentUser.campus;
      if (!campusId) {
        throw new Error('HR campus ID is required');
      }

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password || 'defaultPassword',
        HODId: HODId,
        department: {
          name: selectedBranch.name.trim(),
          code: formData.branchCode.trim().toUpperCase(),
          campusType: normalizedCampusType || 'Engineering' // Default to Engineering if not set
        },
        status: 'active' // Default status
      };

      console.log('Final payload for HOD creation:', JSON.stringify(payload, null, 2));

      console.log('Creating HOD with payload:', payload);

      const createRes = await axiosInstance.post('/hr/hods', payload);
      toast.success('HOD created successfully');
      setShowCreateModal(false);
      setFormData({
        name: '',
        email: '',
        password: 'defaultPassword',
        branchCode: '',
        HODId: ''
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
    setFormData({
      name: hod.name,
      email: hod.email,
      branchCode: hod.department?.code || hod.branchCode || '',
      HODId: hod.HODId || '',
      password: 'defaultPassword' // Keep password for form consistency
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHod) return;
    
    if (!validateForm()) return;

    try {
      // Determine campus type robustly (support campus prop or current user)
      const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
      })();

      let derivedCampus = null;
      if (typeof campus === 'string') derivedCampus = campus;
      else if (campus && typeof campus === 'object') derivedCampus = campus.type || campus.name;
      else if (currentUser && currentUser.campus) derivedCampus = currentUser.campus.type || currentUser.campus.name;

      const campusType = derivedCampus ? String(derivedCampus).charAt(0).toUpperCase() + String(derivedCampus).slice(1) : 'Engineering';

      // Find the selected branch from branches array
      const selectedBranch = safeBranches.find(branch => branch.code === formData.branchCode);
      if (!selectedBranch) {
        throw new Error('Invalid branch selected');
      }

      const updateRes = await axiosInstance.put(`/hr/hods/${selectedHod._id}`, {
        name: formData.name,
        email: formData.email,
        HODId: formData.HODId || formData.email.toLowerCase(),
        department: {
          name: selectedBranch.name,
          code: formData.branchCode,
          campusType: campusType
        }
      });

      // Update local list with returned data
      if (updateRes?.data) {
        const updated = updateRes.data;
        setHods(prev => prev.map(h => (h._id === updated._id ? updated : h)));
      }

      setShowEditModal(false);
      toast.success('HOD updated successfully');
      if (onHodUpdate) onHodUpdate();
    } catch (error) {
      console.error('Update HOD Error:', error);
      const errorMsg = error.response?.data?.msg || 'Failed to update HOD';
      setError(errorMsg);
      toast.error(errorMsg);
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

  // Handle password reset
  const handleResetPassword = async (newPassword) => {
    if (!selectedHod) return;

    try {
      await axiosInstance.post(`/hr/hods/${selectedHod._id}/reset-password`, {
        newPassword
      });
      toast.success('Password reset successfully');
      setShowPasswordResetModal(false);
    } catch (error) {
      console.error('Reset Password Error:', error);
      toast.error(error.response?.data?.msg || 'Failed to reset password');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HOD Management</h1>
          <p className="text-gray-600">Manage Head of Department assignments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full md:w-auto bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center"
        >
          <FaUserTie className="mr-2" /> Create HOD
        </button>
      </div>

      {/* HODs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {hods.map((hod) => (
                <tr key={hod._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <FaUserTie className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{hod.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {hod.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {hod.department?.name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {hod.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditClick(hod)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit"
                    >
                      <FaPencilAlt />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedHod(hod);
                        setShowPasswordResetModal(true);
                      }}
                      className="text-yellow-600 hover:text-yellow-900 ml-2"
                      title="Reset Password"
                    >
                      <FaKey />
                    </button>
                    <button
                      onClick={() => handleDeleteHod(hod._id)}
                      className="text-red-600 hover:text-red-900 ml-2"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
              {hods.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    No HODs found. Click "Create HOD" to add a new one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create HOD Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                  <FaUserTie className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Create New HOD</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 text-left">Name</label>
                      <input
                        type="text"
                        id="name"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-left">Email</label>
                      <input
                        type="email"
                        id="email"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label htmlFor="hodId" className="block text-sm font-medium text-gray-700 text-left">HOD ID</label>
                      <input
                        type="text"
                        id="hodId"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter HOD ID (optional)"
                        value={formData.HODId}
                        onChange={(e) => setFormData({...formData, HODId: e.target.value})}
                      />
                      <p className="mt-1 text-xs text-gray-500">If left blank, email will be used as HOD ID</p>
                    </div>
                    <div>
                      <label htmlFor="branchCode" className="block text-sm font-medium text-gray-700 text-left">Branch <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select
                          id="branchCode"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          value={formData.branchCode}
                          onChange={(e) => setFormData({...formData, branchCode: e.target.value})}
                          required
                        >
                          <option value="">Select Branch</option>
                          {Array.isArray(branches) && branches.length > 0 ? (
                            branches.map((branch) => (
                              <option key={branch.code} value={branch.code}>
                                {branch.name} ({branch.code})
                              </option>
                            ))
                          ) : (
                            <option disabled>No branches available</option>
                          )}
                        </select>
                        {!loading && branches.length === 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 text-yellow-700 text-sm rounded">
                            <p>No branches found for your campus.</p>
                            <p className="text-xs mt-1">Debug info: {JSON.stringify({
                              branchesCount: branches.length,
                              isArray: Array.isArray(branches),
                              sample: branches.slice(0, 2)
                            })}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {error && (
                      <div className="mt-2 text-sm text-red-600">
                        {error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                    onClick={handleCreateHOD}
                    disabled={!formData.name || !formData.email || !formData.branchCode}
                  >
                    Create HOD
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                    onClick={() => {
                      setShowCreateModal(false);
                      setError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit HOD Modal */}
      {showEditModal && selectedHod && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                  <FaPencilAlt className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Edit HOD</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 text-left">Name</label>
                      <input
                        type="text"
                        id="edit-name"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 text-left">Email</label>
                      <input
                        type="email"
                        id="edit-email"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">HOD ID</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Enter HOD ID (optional)"
                        value={formData.HODId}
                        onChange={(e) => setFormData({ ...formData, HODId: e.target.value })}
                      />
                      <p className="mt-1 text-xs text-gray-500">If left blank, email will be used as HOD ID</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department <span className="text-red-500">*</span></label>
                      <select
                        id="edit-branchCode"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={formData.branchCode}
                        onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                        required
                      >
                        <option value="">Select Department</option>
                        {Array.isArray(branches) && branches.length > 0 ? (
                          branches.map((branch) => (
                            <option key={branch.code} value={branch.code}>
                              {branch.name} ({branch.code})
                            </option>
                          ))
                        ) : (
                          <option disabled>Loading departments...</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                  onClick={handleEditSubmit}
                  disabled={!formData.name || !formData.email || !formData.branchCode}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordResetModal && selectedHod && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPasswordResetModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                  <FaKey className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Reset Password</h3>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      Reset password for <span className="font-medium">{selectedHod.name}</span>?
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      A new password will be generated and sent to their email.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:col-start-2 sm:text-sm"
                  onClick={() => handleResetPassword('newRandomPassword123')}
                >
                  Reset Password
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  onClick={() => setShowPasswordResetModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodManagement;