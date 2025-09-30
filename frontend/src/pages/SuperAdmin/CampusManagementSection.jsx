import React from 'react';
import { FaUniversity, FaPlusCircle, FaEdit, FaTrash } from 'react-icons/fa';

const CampusManagementSection = ({ 
  campuses, 
  showCreateCampusModal, 
  setShowCreateCampusModal,
  campusFormData,
  setCampusFormData,
  handleCreateCampus,
  handleUpdateCampusStatus
}) => {
  return (
    <div className="p-6 mt-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <FaUniversity className="text-primary" /> Campus Management
        </h2>
        <button
          onClick={() => setShowCreateCampusModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <FaPlusCircle /> Create New Campus
        </button>
      </div>

      {/* Campus Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campuses.map((campus) => (
          <div
            key={campus._id}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-primary mb-2">
                  {campus.displayName}
                </h3>
                <p className="text-gray-600 text-sm mb-1">
                  <span className="font-medium">System Name:</span> {campus.name}
                </p>
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

            {/* Principal Assignment Status */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Principal Assignment</h4>
              {campus.principalId ? (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-800 font-medium">{campus.principalId.name}</p>
                  <p className="text-green-600 text-sm">{campus.principalId.email}</p>
                  <p className="text-green-600 text-xs mt-1">
                    Last Login: {campus.principalId.lastLogin 
                      ? new Date(campus.principalId.lastLogin).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800 font-medium">No Principal Assigned</p>
                  <p className="text-yellow-600 text-sm">Create a principal account for this campus</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleUpdateCampusStatus(campus._id, campus.isActive === false)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  campus.isActive !== false
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {campus.isActive !== false ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Campus Modal */}
      {showCreateCampusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Create New Campus</h2>
              <button
                onClick={() => setShowCreateCampusModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCampus} className="space-y-4">
              <div>
                <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-1">
                  <FaUniversity className="inline text-primary" /> Campus Name (System)
                </label>
                <input
                  type="text"
                  value={campusFormData.name}
                  onChange={(e) => setCampusFormData({...campusFormData, name: e.target.value.toLowerCase()})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., engineering, pharmacy"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Use lowercase, no spaces (e.g., engineering, pharmacy)</p>
              </div>
              <div>
                <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-1">
                  <FaUniversity className="inline text-primary" /> Display Name
                </label>
                <input
                  type="text"
                  value={campusFormData.displayName}
                  onChange={(e) => setCampusFormData({...campusFormData, displayName: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., PYDAH Engineering College"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={campusFormData.type}
                  onChange={(e) => setCampusFormData({...campusFormData, type: e.target.value})}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select campus type</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Degree">Degree</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateCampusModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                  Create Campus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusManagementSection;
