import React from 'react';
import { FaUserTie, FaPlusCircle, FaEdit, FaKey, FaTrash } from 'react-icons/fa';

const PrincipalManagementSection = ({ 
  campuses, 
  showCreateModal, 
  setShowCreateModal,
  formData,
  setFormData,
  handleCreatePrincipal,
  handleEditPrincipal,
  handleEditPrincipalSubmit,
  showEditPrincipalModal,
  setShowEditPrincipalModal,
  editPrincipalData,
  setEditPrincipalData,
  handleResetPassword,
  handleResetPasswordSubmit,
  showResetPasswordModal,
  setShowResetPasswordModal,
  resetPasswordData,
  setResetPasswordData
}) => {
  return (
    <div className="p-6 mt-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <FaUserTie className="text-primary" /> Principal Management
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
        >
          <FaPlusCircle /> Create Principal Account
        </button>
      </div>

      {/* Principals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campuses.map((campus) => (
          <div
            key={campus._id}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-primary mb-2">
                  {campus.displayName}
                </h3>
                <p className="text-gray-600 text-sm mb-1">
                  <span className="font-medium">Type:</span> {campus.type}
                </p>
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Status:</span> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    campus.isActive !== false 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {campus.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>

            {/* Principal Information */}
            {campus.principalId ? (
              <div className="space-y-3">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">Assigned Principal</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Name:</span>
                      <span className="font-medium text-sm">{campus.principalId.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Email:</span>
                      <span className="font-medium text-sm break-all">{campus.principalId.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Last Login:</span>
                      <span className="font-medium text-sm">
                        {campus.principalId.lastLogin
                          ? new Date(campus.principalId.lastLogin).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Principal Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditPrincipal(campus.principalId)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <FaEdit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleResetPassword(campus.principalId._id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <FaKey size={14} />
                    Reset Password
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2">No Principal Assigned</h4>
                <p className="text-yellow-600 text-sm mb-3">This campus doesn't have a principal yet.</p>
                <button
                  onClick={() => {
                    setFormData({...formData, campusName: campus.name});
                    setShowCreateModal(true);
                  }}
                  className="w-full px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                >
                  <FaPlusCircle />
                  Assign Principal
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Principal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Create Principal Account</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreatePrincipal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                <select
                  value={formData.campusName}
                  onChange={(e) => setFormData({...formData, campusName: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select a campus</option>
                  {campuses.map((campus) => {
                    if (!campus.principalId) {
                      return (
                        <option key={campus._id} value={campus.name}>
                          {campus.displayName}
                        </option>
                      );
                    }
                    return null;
                  })}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                  Create Principal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Principal Modal */}
      {showEditPrincipalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Edit Principal Details</h2>
              <button
                onClick={() => setShowEditPrincipalModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditPrincipalSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editPrincipalData.name}
                  onChange={e => setEditPrincipalData({ ...editPrincipalData, name: e.target.value })}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editPrincipalData.email}
                  onChange={e => setEditPrincipalData({ ...editPrincipalData, email: e.target.value })}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditPrincipalModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Reset Principal Password</h2>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleResetPasswordSubmit(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalManagementSection;
