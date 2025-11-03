import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import config from '../config';

const API_BASE_URL = config.API_BASE_URL;

const HodPasswordResetModal = ({ 
  show, 
  onClose, 
  hod,
  token,
  loading,
  setLoading 
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!hod || !token) {
      setError('Missing required data');
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting to reset password for HOD:', hod._id);

      // Determine the endpoint based on the role (principal or hr)
      const endpoint = hod.model === 'User' || hod.model === 'Principal' 
        ? `/principal/hods/${hod._id}/reset-password?model=${hod.model || 'HOD'}`
        : `/hr/hods/${hod._id}/reset-password`;
      
      const response = await axios.post(
        `${API_BASE_URL}${endpoint}`,
        { newPassword },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Password reset response:', response.data);
      toast.success(response.data.msg || 'Password reset successful');
      
      // Clear form and close modal
      setNewPassword('');
      onClose();
    } catch (error) {
      console.error('Error resetting password:', error);
      const errorMessage = error.response?.data?.msg || 'Failed to reset password';
      setError(errorMessage);
      toast.error(errorMessage);

      // If unauthorized, redirect to login
      if (error.response?.status === 401) {
        localStorage.clear();
        window.location.href = '/';
      }
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Reset HOD Password</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              New Password for {hod?.name}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter new password"
              required
              disabled={loading}
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark flex items-center ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HodPasswordResetModal; 