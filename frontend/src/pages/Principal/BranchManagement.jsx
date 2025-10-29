import React, { useState } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosConfig'; // Import your axios instance

const BranchManagement = ({ 
  branches = [], 
  hods = [], 
  onBranchUpdate, 
  token,
  loading = false 
}) => {
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
  const [showEditBranchModal, setShowEditBranchModal] = useState(false);
  const [showDeleteBranchModal, setShowDeleteBranchModal] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', code: '' });
  const [editBranchData, setEditBranchData] = useState({ _id: '', name: '', code: '' });
  const [deleteBranchId, setDeleteBranchId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle create branch
  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post('/principal/branches', newBranch, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data) {
        toast.success('Branch created successfully');
        setNewBranch({ name: '', code: '' });
        setShowCreateBranchModal(false);
        onBranchUpdate(); // Refresh branches list
      }
    } catch (error) {
      console.error('Error creating branch:', error);
      toast.error(error.response?.data?.msg || 'Failed to create branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit branch
  const handleEditBranchClick = (branch) => {
    setEditBranchData({ 
      _id: branch._id, 
      name: branch.name, 
      code: branch.code 
    });
    setShowEditBranchModal(true);
  };

  const handleEditBranchSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      console.log('Updating branch:', editBranchData);
      
      const response = await axiosInstance.put(
        `/principal/branches/${editBranchData._id}`,
        { 
          name: editBranchData.name, 
          code: editBranchData.code 
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Update response:', response);

      if (response.data) {
        toast.success('Branch updated successfully');
        setShowEditBranchModal(false);
        setEditBranchData({ _id: '', name: '', code: '' });
        onBranchUpdate(); // Refresh branches list
      }
    } catch (error) {
      console.error('Error updating branch:', {
        error: error.response?.data,
        status: error.response?.status,
        url: `/principal/branches/${editBranchData._id}`
      });
      toast.error(error.response?.data?.msg || 'Failed to update branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete branch
  const handleDeleteBranchClick = (branchId) => {
    setDeleteBranchId(branchId);
    setShowDeleteBranchModal(true);
  };

  const handleDeleteBranchConfirm = async () => {
    if (!deleteBranchId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await axiosInstance.delete(
        `/principal/branches/${deleteBranchId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data) {
        toast.success('Branch deleted successfully');
        setShowDeleteBranchModal(false);
        setDeleteBranchId(null);
        onBranchUpdate(); // Refresh branches list
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error(error.response?.data?.msg || 'Failed to delete branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get HOD name for a branch
  const getHodName = (branch) => {
    if (!branch.hodId) return 'No HOD Assigned';
    const hod = hods.find(h => h._id === branch.hodId);
    return hod ? hod.name : 'N/A';
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-primary">Branch Management</h2>
        <button
          onClick={() => setShowCreateBranchModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-md"
        >
          <FaPlus className="text-sm" />
          Create Branch
        </button>
      </div>

      {/* Branches Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  HOD
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No branches found. Create your first branch to get started.
                  </td>
                </tr>
              ) : (
                branches.map((branch) => (
                  <tr key={branch._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{branch.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{branch.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          branch.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getHodName(branch)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditBranchClick(branch)}
                          className="text-blue-600 hover:text-blue-900 transition-colors flex items-center gap-1 px-3 py-1 border border-blue-600 rounded hover:bg-blue-50"
                          title="Edit Branch"
                          disabled={isSubmitting}
                        >
                          <FaEdit className="text-sm" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBranchClick(branch._id)}
                          className="text-red-600 hover:text-red-900 transition-colors flex items-center gap-1 px-3 py-1 border border-red-600 rounded hover:bg-red-50"
                          title="Delete Branch"
                          disabled={isSubmitting}
                        >
                          <FaTrash className="text-sm" />
                          <span className="hidden sm:inline">Delete</span>
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

      {/* Create Branch Modal */}
      {showCreateBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-primary mb-4">Create New Branch</h3>
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter branch name"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Code *
                </label>
                <input
                  type="text"
                  value={newBranch.code}
                  onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value.toUpperCase() })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter branch code"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateBranchModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {showEditBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-primary mb-4">Edit Branch</h3>
            <form onSubmit={handleEditBranchSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  value={editBranchData.name}
                  onChange={(e) => setEditBranchData({ ...editBranchData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Code *
                </label>
                <input
                  type="text"
                  value={editBranchData.code}
                  onChange={(e) => setEditBranchData({ ...editBranchData, code: e.target.value.toUpperCase() })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditBranchModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Updating...' : 'Update Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Branch Confirmation Modal */}
      {showDeleteBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Delete Branch</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this branch? This action cannot be undone and may affect associated HODs and employees.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteBranchModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBranchConfirm}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete Branch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagement;