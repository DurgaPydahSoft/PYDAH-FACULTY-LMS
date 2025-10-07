import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaUniversity, FaCalendarAlt, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import config from '../../config';

const API_BASE_URL = config.API_BASE_URL;

const ProfileSection = ({ hr, onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    campus: ''
  });

  useEffect(() => {
    if (hr) {
      setProfileData({
        name: hr.name || '',
        email: hr.email || '',
        phoneNumber: hr.phoneNumber || '',
        campus: hr.campus?.name || ''
      });
    }
  }, [hr]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/hr/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileData.name,
          phoneNumber: profileData.phoneNumber
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Profile updated successfully');
        setIsEditing(false);
        if (onProfileUpdate) {
          onProfileUpdate(data.hr);
        }
      } else {
        throw new Error(data.msg || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileData({
      name: hr.name || '',
      email: hr.email || '',
      phoneNumber: hr.phoneNumber || '',
      campus: hr.campus?.name || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="p-6 mt-4">
      <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-3">
        <FaUser /> Profile Management
      </h2>

      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <FaUser className="text-primary text-3xl" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{hr?.name || 'HR User'}</h3>
                <p className="text-gray-600">Human Resources</p>
                <p className="text-sm text-gray-500">{hr?.campus?.name || 'Campus'}</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isEditing 
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {isEditing ? <FaTimes /> : <FaEdit />}
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h4>
          
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaUser className="inline mr-2" />
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={profileData.name}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="Enter your full name"
                />
              ) : (
                <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profileData.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaEnvelope className="inline mr-2" />
                Email Address
              </label>
              <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profileData.email}</p>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phoneNumber"
                  value={profileData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="Enter your phone number"
                />
              ) : (
                <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profileData.phoneNumber || 'Not provided'}</p>
              )}
            </div>

            {/* Campus */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaUniversity className="inline mr-2" />
                Campus
              </label>
              <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{profileData.campus}</p>
              <p className="text-xs text-gray-500 mt-1">Campus cannot be changed</p>
            </div>

            {/* Last Login */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaCalendarAlt className="inline mr-2" />
                Last Login
              </label>
              <p className="p-3 bg-gray-50 rounded-lg text-gray-900">
                {hr?.lastLogin ? new Date(hr.lastLogin).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center gap-2"
                disabled={loading}
              >
                <FaTimes />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2">Role</h5>
              <p className="text-blue-700">Human Resources</p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <h5 className="font-medium text-green-900 mb-2">Status</h5>
              <p className="text-green-700">Active</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <h5 className="font-medium text-purple-900 mb-2">Permissions</h5>
              <p className="text-purple-700">Employee Management</p>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <h5 className="font-medium text-orange-900 mb-2">Campus Access</h5>
              <p className="text-orange-700">{profileData.campus}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;
