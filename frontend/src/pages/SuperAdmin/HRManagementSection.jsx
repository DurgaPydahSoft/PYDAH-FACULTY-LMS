import React from 'react';
import { FaUsers, FaPlusCircle, FaEdit, FaKey, FaTrash } from 'react-icons/fa';

const HRManagementSection = ({ 
  hrs, 
  campuses,
  showCreateHRModal, 
  setShowCreateHRModal,
  hrFormData,
  setHrFormData,
  handleCreateHR,
  handleEditHR,
  handleEditHRSubmit,
  showEditHRModal,
  setShowEditHRModal,
  editHRData,
  setEditHRData,
  handleResetHRPassword,
  handleResetHRPasswordSubmit,
  showResetHRPasswordModal,
  setShowResetHRPasswordModal,
  resetHRPasswordData,
  setResetHRPasswordData,
  handleUpdateHRStatus
}) => {
  return (
    <div className="p-6 mt-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <FaUsers className="text-primary" /> HR Management
        </h2>
        <button
          onClick={() => setShowCreateHRModal(true)}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
        >
          <FaPlusCircle /> Create HR Account
        </button>
      </div>

      {/* HR Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hrs.map((hr) => (
          <div
            key={hr._id}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-primary mb-2">
                  {hr.name}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium break-all">{hr.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Campus:</span>
                    <span className="font-medium">{hr.campus?.name || 'No Campus'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last Login:</span>
                    <span className="font-medium">
                      {hr.lastLogin
                        ? new Date(hr.lastLogin).toLocaleString()
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      hr.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {hr.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* HR Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleEditHR(hr)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <FaEdit size={14} />
                Edit
              </button>
              <button
                onClick={() => handleResetHRPassword(hr._id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <FaKey size={14} />
                Reset Password
              </button>
              <button
                onClick={() => handleUpdateHRStatus(hr._id, hr.status === 'active' ? 'inactive' : 'active')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  hr.status === 'active'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <FaTrash size={14} />
                {hr.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create HR Modal */}
      {showCreateHRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Create HR Account</h2>
              <button
                onClick={() => setShowCreateHRModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateHR} className="space-y-4">
              <div>
                <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-1">
                  <FaUsers className="inline text-primary" /> Name
                </label>
                <input
                  type="text"
                  value={hrFormData.name}
                  onChange={(e) => setHrFormData({...hrFormData, name: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-1">
                  <FaUsers className="inline text-primary" /> Email
                </label>
                <input
                  type="email"
                  value={hrFormData.email}
                  onChange={(e) => setHrFormData({...hrFormData, email: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-1">
                  <FaKey className="inline text-primary" /> Password
                </label>
                <input
                  type="password"
                  value={hrFormData.password}
                  onChange={(e) => setHrFormData({...hrFormData, password: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-1">
                  <FaUsers className="inline text-primary" /> Campus
                </label>
                <select
                  value={hrFormData.campusName}
                  onChange={(e) => setHrFormData({...hrFormData, campusName: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select a campus</option>
                  {campuses
                    .slice() // copy array to avoid mutating state
                    .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
                    .map((campus) => (
                      <option key={campus._id} value={campus.name}>
                        {campus.displayName}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateHRModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                  Create HR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit HR Modal */}
      {showEditHRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Edit HR Details</h2>
              <button
                onClick={() => setShowEditHRModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditHRSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editHRData.name}
                  onChange={e => setEditHRData({ ...editHRData, name: e.target.value })}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editHRData.email}
                  onChange={e => setEditHRData({ ...editHRData, email: e.target.value })}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditHRModal(false)}
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

      {/* Reset HR Password Modal */}
      {showResetHRPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Reset HR Password</h2>
              <button
                onClick={() => setShowResetHRPasswordModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleResetHRPasswordSubmit(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={resetHRPasswordData.newPassword}
                  onChange={e => setResetHRPasswordData({ ...resetHRPasswordData, newPassword: e.target.value })}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowResetHRPasswordModal(false)}
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

export default HRManagementSection;
