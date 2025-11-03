import React from 'react';
import { FaUserCircle, FaEnvelope, FaBuilding, FaPhone } from 'react-icons/fa';

const ProfileSection = ({ hod }) => {
  return (
    <div className="p-6 mt-10">
      <h2 className="text-2xl font-bold text-primary mb-6">Your Profile</h2>
      
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Profile Avatar */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
              <FaUserCircle className="text-white text-4xl" />
            </div>
          </div>
          
          {/* Profile Information */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <FaUserCircle className="text-primary text-xl" />
              <div>
                <h3 className="text-xl font-semibold text-primary">{hod?.name || 'HOD'}</h3>
                <p className="text-gray-600">Head of Department</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <FaEnvelope className="text-primary text-xl" />
              <div>
                <p className="text-gray-700 font-medium">Email</p>
                <p className="text-gray-900">{hod?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <FaBuilding className="text-primary text-xl" />
              <div>
                <p className="text-gray-700 font-medium">Department</p>
                <p className="text-gray-900">{hod?.department?.name || hod?.branchCode || 'N/A'}</p>
              </div>
            </div>
            
            {hod?.phoneNumber && (
              <div className="flex items-center gap-3">
                <FaPhone className="text-primary text-xl" />
                <div>
                  <p className="text-gray-700 font-medium">Phone</p>
                  <p className="text-gray-900">{hod.phoneNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Additional Information */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold text-primary mb-4">Department Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-700 font-medium">Campus</p>
              <p className="text-gray-900">{hod?.campus || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-700 font-medium">Branch Code</p>
              <p className="text-gray-900">{hod?.branchCode || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        {/* Status Information */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold text-primary mb-4">Account Status</h4>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              hod?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {hod?.status || 'active'}
            </span>
            <p className="text-gray-700">Your account is currently {hod?.status || 'active'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;
