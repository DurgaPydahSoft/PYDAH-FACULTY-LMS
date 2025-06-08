import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import config from '../../config';
import Loading from '../../components/Loading';

const API_BASE_URL = config.API_BASE_URL;

const HRLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    campus: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const campuses = [
    { value: 'engineering', label: 'PYDAH Engineering College' },
    { value: 'degree', label: 'PYDAH Degree College' },
    { value: 'pharmacy', label: 'PYDAH College of Pharmacy' },
    { value: 'diploma', label: 'PYDAH Polytechnic College' },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/hr/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          password: formData.password,
          campus: formData.campus.toLowerCase()
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || 'Login failed');
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('role', 'hr');
      login(data.token, data.user);
      toast.success('Login successful!');
      navigate('/hr/dashboard');
    } catch (error) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute top-0 left-0 w-20 h-20 sm:w-40 sm:h-40 text-primary/5" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M45.7,-78.2C58.9,-71.3,69.4,-59.1,77.2,-45.1C85,-31.1,90.1,-15.6,89.1,-0.8C88.1,14,81,28,73.1,41.1C65.2,54.2,56.5,66.4,44.8,74.5C33.1,82.6,18.6,86.6,3.3,82.3C-12,78,-24,65.4,-35.1,54.1C-46.2,42.8,-56.4,32.8,-64.1,20.8C-71.8,8.8,-77,-5.2,-74.8,-18.2C-72.6,-31.2,-63,-43.2,-51.2,-50.8C-39.4,-58.4,-25.4,-61.6,-11.8,-67.8C1.8,-74,15,-83.2,29.2,-85.1C43.4,-87,58.6,-81.6,45.7,-78.2Z" transform="translate(100 100)" />
        </svg>
        <svg className="absolute bottom-0 right-0 w-20 h-20 sm:w-40 sm:h-40 text-primary/5" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M45.7,-78.2C58.9,-71.3,69.4,-59.1,77.2,-45.1C85,-31.1,90.1,-15.6,89.1,-0.8C88.1,14,81,28,73.1,41.1C65.2,54.2,56.5,66.4,44.8,74.5C33.1,82.6,18.6,86.6,3.3,82.3C-12,78,-24,65.4,-35.1,54.1C-46.2,42.8,-56.4,32.8,-64.1,20.8C-71.8,8.8,-77,-5.2,-74.8,-18.2C-72.6,-31.2,-63,-43.2,-51.2,-50.8C-39.4,-58.4,-25.4,-61.6,-11.8,-67.8C1.8,-74,15,-83.2,29.2,-85.1C43.4,-87,58.6,-81.6,45.7,-78.2Z" transform="translate(100 100)" />
        </svg>
      </div>
      {/* Top SVG above card, always centered and visible */}
      <div className="w-full flex flex-col items-center justify-center mt-4 mb-2" style={{zIndex: 2}}>
        <svg className="w-14 h-14 sm:w-20 sm:h-20 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
        </svg>
      </div>
      <div className="w-full max-w-[95%] sm:max-w-md bg-secondary rounded-neumorphic shadow-outerRaised p-3 sm:p-8 relative">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-3xl font-bold text-primary">HR Login</h2>
          <p className="text-xs sm:text-base text-gray-600 mt-1 sm:mt-2">Access your HR dashboard</p>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-2 sm:px-4 py-1.5 sm:py-3 rounded-lg mb-3 sm:mb-4 text-xs sm:text-base">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-3 sm:mb-6">
            <label className="block text-gray-700 text-xs sm:text-base font-bold mb-1 sm:mb-2">
              Campus
            </label>
            <select
              name="campus"
              value={formData.campus}
              onChange={handleChange}
              className="w-full p-2 sm:p-3 rounded-neumorphic shadow-innerSoft bg-background focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-base"
              required
            >
              <option value="">Select Campus</option>
              {campuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3 sm:mb-6">
            <label className="block text-gray-700 text-xs sm:text-base font-bold mb-1 sm:mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 sm:p-3 rounded-neumorphic shadow-innerSoft bg-background focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-base"
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="mb-3 sm:mb-6">
            <label className="block text-gray-700 text-xs sm:text-base font-bold mb-1 sm:mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 sm:p-3 rounded-neumorphic shadow-innerSoft bg-background focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-base"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 sm:py-3 rounded-neumorphic hover:shadow-innerSoft transition-all duration-300 text-xs sm:text-base"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <button
          onClick={() => navigate('/')}
          className="mt-3 sm:mt-4 w-full text-primary hover:text-blue-800 text-center text-xs sm:text-base border border-primary rounded-neumorphic py-2 hover:bg-primary hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="currentColor"/>
          </svg>
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default HRLogin; 