import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosConfig';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaBuilding,
  FaUserTie,
  FaUsers,
  FaInfoCircle
} from 'react-icons/fa';

const DesignationManagementSection = () => {
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    displayName: '',
    campusTypes: [],
    employeeType: 'both',
    description: '',
    isActive: true
  });
  const [filter, setFilter] = useState({
    employeeType: 'all',
    isActive: 'all'
  });

  const campusOptions = [
    { value: 'engineering', label: 'Engineering' },
    { value: 'degree', label: 'Degree' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'diploma', label: 'Diploma' }
  ];

  const employeeTypeOptions = [
    { value: 'both', label: 'Both' },
    { value: 'teaching', label: 'Teaching' },
    { value: 'non-teaching', label: 'Non-Teaching' }
  ];

  useEffect(() => {
    fetchDesignations();
  }, [filter]);

  const fetchDesignations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.employeeType !== 'all') {
        params.append('employeeType', filter.employeeType);
      }
      if (filter.isActive !== 'all') {
        params.append('isActive', filter.isActive === 'active');
      }

      const response = await axiosInstance.get(`/hr/designations?${params.toString()}`);
      if (response.data.success) {
        setDesignations(response.data.data || []);
      } else {
        toast.error('Failed to fetch designations');
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
      toast.error('Failed to fetch designations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      code: '',
      displayName: '',
      campusTypes: [],
      employeeType: 'both',
      description: '',
      isActive: true
    });
    setShowCreateModal(true);
  };

  const handleEdit = (designation) => {
    setSelectedDesignation(designation);
    setFormData({
      name: designation.name,
      code: designation.code,
      displayName: designation.displayName,
      campusTypes: designation.campusTypes || [],
      employeeType: designation.employeeType || 'both',
      description: designation.description || '',
      isActive: designation.isActive !== false
    });
    setShowEditModal(true);
  };

  const handleCampusTypeToggle = (campusType) => {
    setFormData(prev => {
      const current = prev.campusTypes || [];
      const updated = current.includes(campusType)
        ? current.filter(ct => ct !== campusType)
        : [...current, campusType];
      return { ...prev, campusTypes: updated };
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return false;
    }
    if (!formData.code.trim()) {
      toast.error('Code is required');
      return false;
    }
    if (!formData.displayName.trim()) {
      toast.error('Display Name is required');
      return false;
    }
    if (formData.campusTypes.length === 0) {
      toast.error('Please select at least one campus type');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (showEditModal && selectedDesignation) {
        // Update
        const response = await axiosInstance.put(
          `/hr/designations/${selectedDesignation._id}`,
          formData
        );
        if (response.data.success) {
          toast.success('Designation updated successfully');
          setShowEditModal(false);
          fetchDesignations();
        } else {
          toast.error(response.data.msg || 'Failed to update designation');
        }
      } else {
        // Create
        const response = await axiosInstance.post('/hr/designations', formData);
        if (response.data.success) {
          toast.success('Designation created successfully');
          setShowCreateModal(false);
          fetchDesignations();
        } else {
          toast.error(response.data.msg || 'Failed to create designation');
        }
      }
    } catch (error) {
      console.error('Error saving designation:', error);
      toast.error(error.response?.data?.msg || 'Failed to save designation');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this designation?')) {
      return;
    }

    try {
      const response = await axiosInstance.delete(`/hr/designations/${id}`);
      if (response.data.success) {
        toast.success('Designation deactivated successfully');
        fetchDesignations();
      } else {
        toast.error(response.data.msg || 'Failed to deactivate designation');
      }
    } catch (error) {
      console.error('Error deleting designation:', error);
      toast.error(error.response?.data?.msg || 'Failed to deactivate designation');
    }
  };

  const filteredDesignations = designations.filter(des => {
    if (filter.employeeType !== 'all' && des.employeeType !== filter.employeeType && des.employeeType !== 'both') {
      return false;
    }
    if (filter.isActive !== 'all') {
      const isActive = filter.isActive === 'active';
      if (des.isActive !== isActive) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 mt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary mb-2">Designation Management</h2>
          <p className="text-gray-600 text-sm">Create and manage employee designations/roles for your campus</p>
        </div>
        <button
          onClick={handleCreate}
          className="w-full md:w-auto bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <FaPlus /> Create Designation
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee Type</label>
            <select
              className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
              value={filter.employeeType}
              onChange={(e) => setFilter({ ...filter, employeeType: e.target.value })}
            >
              <option value="all">All Types</option>
              <option value="teaching">Teaching</option>
              <option value="non-teaching">Non-Teaching</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
              value={filter.isActive}
              onChange={(e) => setFilter({ ...filter, isActive: e.target.value })}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Designations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campuses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDesignations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No designations found. Create your first designation to get started.
                  </td>
                </tr>
              ) : (
                filteredDesignations.map((designation) => (
                  <tr key={designation._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{designation.code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{designation.displayName}</div>
                      {designation.description && (
                        <div className="text-xs text-gray-500 mt-1">{designation.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {designation.campusTypes?.map((campus, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            <FaBuilding className="mr-1" />
                            {campusOptions.find(c => c.value === campus)?.label || campus}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        designation.employeeType === 'teaching'
                          ? 'bg-green-100 text-green-800'
                          : designation.employeeType === 'non-teaching'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {designation.employeeType === 'both' ? (
                          <>
                            <FaUsers className="mr-1" />
                            Both
                          </>
                        ) : (
                          <>
                            <FaUserTie className="mr-1" />
                            {designation.employeeType === 'teaching' ? 'Teaching' : 'Non-Teaching'}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        designation.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {designation.isActive ? (
                          <>
                            <FaCheck className="mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <FaTimes className="mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleEdit(designation)}
                          className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                        >
                          <FaEdit />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(designation._id)}
                          className="text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"
                        >
                          <FaTrash />
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary">
                {showEditModal ? 'Edit Designation' : 'Create New Designation'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedDesignation(null);
                }}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="e.g., associate_professor"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Internal name (lowercase, underscores)</p>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="e.g., ASSOC_PROF"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique code (uppercase)</p>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                  placeholder="e.g., Associate Professor"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Name shown to users</p>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">
                  Campus Types <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {campusOptions.map((campus) => (
                    <label
                      key={campus.value}
                      className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition ${
                        formData.campusTypes.includes(campus.value)
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-300 hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.campusTypes.includes(campus.value)}
                        onChange={() => handleCampusTypeToggle(campus.value)}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">{campus.label}</span>
                    </label>
                  ))}
                </div>
                {formData.campusTypes.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Please select at least one campus</p>
                )}
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">
                  Employee Type
                </label>
                <select
                  value={formData.employeeType}
                  onChange={(e) => setFormData({ ...formData, employeeType: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                >
                  {employeeTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                  rows="3"
                  placeholder="Add a description for this designation..."
                />
              </div>

              {showEditModal && (
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedDesignation(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  {showEditModal ? 'Update Designation' : 'Create Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignationManagementSection;

