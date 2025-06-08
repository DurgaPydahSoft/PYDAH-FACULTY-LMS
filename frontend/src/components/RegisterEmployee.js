import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const RegisterEmployee = ({ show, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    employeeId: '',
    department: '',
    role: '',
    customRole: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomRoleInput, setShowCustomRoleInput] = useState(false);

  const getCampusRoles = () => {
    const campus = localStorage.getItem('campus')?.toLowerCase();
    switch (campus) {
      case 'engineering':
        return [
          'Associate Professor',
          'Assistant Professor',
          'Lab Assistant',
          'Technician',
          'Librarian',
          'PET',
          'Other'
        ];
      case 'diploma':
        return [
          'Lecturer',
          'Lab Assistant',
          'Technician',
          'Other'
        ];
      case 'pharmacy':
        return [
          'Associate Professor',
          'Assistant Professor',
          'Lab Assistant',
          'Lab Incharge',
          'Technician',
          'Other'
        ];
      case 'degree':
        return [
          'Associate Professor',
          'Assistant Professor',
          'Lab Assistant',
          'Lab Incharge',
          'Technician',
          'Other'
        ];
      default:
        return [];
    }
  };

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setFormData(prev => ({
      ...prev,
      role: selectedRole,
      customRole: selectedRole === 'Other' ? prev.customRole : ''
    }));
    setShowCustomRoleInput(selectedRole === 'Other');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let roleToSubmit = formData.role;
      if (formData.role === 'Other') {
        if (!formData.customRole.trim()) {
          throw new Error('Please enter a custom role');
        }
        roleToSubmit = formData.customRole.toLowerCase().replace(/\s+/g, '_');
      } else {
        roleToSubmit = formData.role.toLowerCase().replace(/\s+/g, '_');
      }

      const response = await axios.post(
        `${API_BASE_URL}/hr/employees`,
        {
          ...formData,
          role: roleToSubmit
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data) {
        toast.success('Employee registered successfully');
        onSuccess();
        onClose();
        setFormData({
          name: '',
          email: '',
          password: '',
          phoneNumber: '',
          employeeId: '',
          department: '',
          role: '',
          customRole: ''
        });
        setShowCustomRoleInput(false);
      }
    } catch (error) {
      console.error('Register Employee Error:', error);
      setError(error.response?.data?.msg || 'Failed to register employee');
      toast.error(error.response?.data?.msg || 'Failed to register employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-primary">Register New Employee</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter name"
              className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="Enter email"
              className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Enter password"
              className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1">Phone Number</label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              placeholder="Enter phone number"
              className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1">Employee ID</label>
            <input
              type="text"
              value={formData.employeeId}
              onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
              placeholder="Enter employee ID"
              className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1">Department</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              placeholder="Enter department"
              className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1">Role</label>
            <select
              value={formData.role}
              onChange={handleRoleChange}
              className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
              required
            >
              <option value="">Select a role</option>
              {getCampusRoles().map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          {showCustomRoleInput && (
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-1">Custom Role</label>
              <input
                type="text"
                value={formData.customRole}
                onChange={(e) => setFormData({...formData, customRole: e.target.value})}
                placeholder="Enter custom role"
                className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                required={showCustomRoleInput}
              />
            </div>
          )}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-primary-dark transition disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterEmployee; 