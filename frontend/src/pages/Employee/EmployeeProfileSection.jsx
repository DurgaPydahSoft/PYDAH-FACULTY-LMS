import React, { useRef, useState } from 'react';
import { FaUserCircle, FaCamera, FaTrash } from 'react-icons/fa';

const Row = ({ label, value }) => (
  <div>
    <p className="text-sm text-gray-600">{label}</p>
    <p className="font-medium break-words">{value ?? '—'}</p>
  </div>
);

const EmployeeProfileSection = ({ employee }) => {
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef(null);

  const handleProfilePictureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingProfile(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setUploadingProfile(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      {/* Profile Section */}
      <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="relative rounded-full overflow-hidden border-4 border-white shadow-lg w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 group mx-auto sm:mx-0">
            {previewImage || employee?.profilePicture ? (
              <img
                src={previewImage || employee?.profilePicture || ''}
                alt={employee?.name}
                className="w-full h-full object-cover"
                onError={e => { e.target.onerror = null; e.target.src = ''; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <FaUserCircle className="text-green-400 text-4xl sm:text-5xl lg:text-6xl" />
              </div>
            )}
            {/* Overlay for actions */}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 sm:p-2 bg-white rounded-full shadow hover:bg-gray-100"
                aria-label="Change profile picture"
                disabled={uploadingProfile}
              >
                <FaCamera className="text-gray-700 text-sm sm:text-lg lg:text-xl" />
              </button>
              {employee?.profilePicture && !previewImage && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="ml-1.5 sm:ml-2 p-1.5 sm:p-2 bg-red-500 rounded-full shadow hover:bg-red-600"
                  aria-label="Remove profile picture"
                  disabled={uploadingProfile}
                >
                  <FaTrash className="text-white text-sm sm:text-lg lg:text-xl" />
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleProfilePictureUpload}
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              disabled={uploadingProfile}
            />
            {uploadingProfile && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-full z-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary mb-1 break-words leading-tight">
              Welcome, {employee?.name}
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm">
              <span className="font-medium">{employee?.employeeId}</span> • {employee?.department}
            </p>
          </div>
        </div>
      </div>
      {/* Existing Profile Info Grid */}
      <h2 className="text-lg sm:text-xl font-semibold text-primary mb-4">Profile</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Row label="Name" value={employee?.name} />
        <Row label="Employee ID" value={employee?.employeeId} />
        <Row label="Email" value={employee?.email} />
        <Row label="Department" value={employee?.department} />
        <Row label="Designation" value={employee?.roleDisplayName} />
        <Row label="Campus" value={employee?.campus} />
        <Row label="Phone" value={employee?.phoneNumber} />
        <Row label="Status" value={employee?.status} />
        <Row label="Leave Balance" value={`${employee?.leaveBalance ?? 0} days`} />
        <Row label="CCL Balance" value={`${employee?.cclBalance ?? 0} days`} />
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Profile info is read-only here. Use existing actions to update picture or contact HR for details.
      </p>
    </div>
  );
};

export default EmployeeProfileSection;
// ... existing code ...