import React, { useState } from 'react';
import { FaTasks, FaCheck, FaTimes, FaEye } from 'react-icons/fa';
import { MdEmail, MdPhone, MdPerson } from 'react-icons/md';

const CCLWorkSection = ({
  cclWorkRequests,
  handleApproveCCL,
  handleRejectCCL,
  showCCLRemarksModal,
  setShowCCLRemarksModal,
  selectedCCLWork,
  setSelectedCCLWork,
  cclRemarks,
  setCclRemarks,
  handleCCLRemarksSubmit
}) => {
  // Ensure cclWorkRequests is an array
  const safeCclWorkRequests = Array.isArray(cclWorkRequests) ? cclWorkRequests : [];
  
  const [showCCLDetailsModal, setShowCCLDetailsModal] = useState(false);
  const [selectedCCLForDetails, setSelectedCCLForDetails] = useState(null);

  const handleViewDetails = (cclWork) => {
    setSelectedCCLForDetails(cclWork);
    setShowCCLDetailsModal(true);
  };

  return (
    <div className="p-6 mt-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary">CCL Work Requests</h2>
      </div>

      {/* CCL Work Requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {safeCclWorkRequests.map((cclWork) => (
          <div key={cclWork._id} className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold text-primary">{cclWork.employeeName}</h4>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MdEmail className="text-primary" /> {cclWork.employeeEmail}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MdPerson className="text-primary" /> {cclWork.employeeEmployeeId}
                </p>
                {cclWork.employeePhoneNumber && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MdPhone className="text-primary" /> {cclWork.employeePhoneNumber}
                  </p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                cclWork.status === 'Approved' ? 'bg-green-100 text-green-800' :
                cclWork.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {cclWork.status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">
                <strong>Date:</strong> {new Date(cclWork.date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Hours:</strong> {cclWork.hours}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Work Type:</strong> {cclWork.workType}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Description:</strong> {cclWork.description}
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => handleViewDetails(cclWork)}
                className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                title="View Details"
              >
                <FaEye />
              </button>
              {cclWork.status === 'Pending' && (
                <>
                  <button
                    onClick={() => handleApproveCCL(cclWork._id)}
                    className="p-2 rounded-full bg-green-100 hover:bg-green-200 text-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
                    title="Approve"
                  >
                    <FaCheck />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCCLWork(cclWork);
                      setShowCCLRemarksModal(true);
                    }}
                    className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                    title="Reject"
                  >
                    <FaTimes />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CCL Work Details Modal */}
      {showCCLDetailsModal && selectedCCLForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">CCL Work Request Details</h2>
              <button
                onClick={() => setShowCCLDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee</label>
                  <p className="text-lg text-gray-900">{selectedCCLForDetails.employeeName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedCCLForDetails.employeeEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                  <p className="text-gray-900">{selectedCCLForDetails.employeeEmployeeId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900">{selectedCCLForDetails.employeePhoneNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <p className="text-gray-900">{new Date(selectedCCLForDetails.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hours</label>
                  <p className="text-gray-900">{selectedCCLForDetails.hours}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Work Type</label>
                  <p className="text-gray-900">{selectedCCLForDetails.workType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedCCLForDetails.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    selectedCCLForDetails.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedCCLForDetails.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="text-gray-900 mt-1">{selectedCCLForDetails.description}</p>
            </div>
            {selectedCCLForDetails.remarks && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <p className="text-gray-900 mt-1">{selectedCCLForDetails.remarks}</p>
              </div>
            )}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCCLDetailsModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject CCL with Remarks Modal */}
      {showCCLRemarksModal && selectedCCLWork && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-primary">Reject CCL Work Request</h2>
              <button
                onClick={() => setShowCCLRemarksModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-700 mb-4">
              Please provide a reason for rejecting this CCL work request.
            </p>
            <form onSubmit={handleCCLRemarksSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={cclRemarks}
                  onChange={(e) => setCclRemarks(e.target.value)}
                  className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                  rows="3"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCCLRemarksModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Reject CCL Work
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CCLWorkSection;