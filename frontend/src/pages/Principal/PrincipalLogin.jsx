import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosConfig';
import { API_BASE_URL } from '../../config';
import { CircleBackground } from '../../components/CircleBackground';

const PrincipalLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    campus: ''
  });
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [campusLoading, setCampusLoading] = useState(true);
  const [error, setError] = useState(null);
  

  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        console.log('Fetching campuses from:', `${API_BASE_URL}/super-admin/campuses/active`);
        const response = await axiosInstance.get('/super-admin/campuses/active');
        console.log('Campus API Response:', response.data);
        
        if (response.data && Array.isArray(response.data)) {
          // Filter out any invalid entries and sort
          const validCampuses = response.data.filter(campus => 
            campus && campus.name && campus.displayName
          ).map(campus => ({
            ...campus,
            displayName: campus.displayName || campus.name.charAt(0).toUpperCase() + campus.name.slice(1)
          }));
          
          console.log('Valid campuses:', validCampuses);
          
          if (validCampuses.length > 0) {
            const sortedCampuses = validCampuses.sort((a, b) => 
              a.displayName.localeCompare(b.displayName)
            );
            console.log('Sorted campuses:', sortedCampuses);
            setCampuses(sortedCampuses);
          } else {
            console.warn('No valid campuses found in response');
            setCampuses([]);
          }
        } else {
          console.error('Invalid response format:', response.data);
          toast.error('Failed to load campuses. Invalid response format.');
          setCampuses([]);
        }
      } catch (error) {
        console.error('Error fetching campuses:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        toast.error(error.response?.data?.msg || 'Failed to load campuses. Please try again later.');
        setCampuses([]);
      } finally {
        setCampusLoading(false);
      }
    };

    fetchCampuses();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Ensure campus is lowercase for consistency
      const campusToUse = formData.campus.toLowerCase();
      console.log('Login attempt:', {
        email: formData.email.toLowerCase(),
        campus: campusToUse,
      });

      const response = await axiosInstance.post('/principal/login', {
        email: formData.email.toLowerCase(),
        password: formData.password,
        campus: campusToUse,
      });

      console.log('Login response:', response.data);

      // Store token and user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Set default authorization header
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      // Navigate to dashboard with lowercase campus
      const dashboardPath = `/${response.data.user.campus.toLowerCase()}/principal-dashboard`;
      console.log('Navigating to:', dashboardPath);
      navigate(dashboardPath, { replace: true });
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError(err.response?.data?.msg || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CircleBackground circleCount={24} className="relative min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-10 max-w-md w-full bg-secondary rounded-neumorphic shadow-outerRaised p-8">
        <div className="relative">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
            Principal Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please select your campus and enter your credentials
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Add note about server load only when there's an error */}
          {!campusLoading && campuses.length === 0 && (
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500 italic flex items-center justify-center gap-1">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
                </svg>
                Please wait for 30-40 seconds and try a refresh. Sometimes the server faces huge load.
              </p>
            </div>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            {/* Campus Selection */}
            <div>
              <label htmlFor="campus" className="block text-sm font-medium text-gray-700">
                Select Campus
              </label>
              <select
                id="campus"
                name="campus"
                required
                value={formData.campus}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
                disabled={campusLoading}
              >
                <option value="">Select a campus</option>
                {campuses.map((campus) => (
                  <option key={campus._id} value={campus.name}>
                    {campus.displayName}
                  </option>
                ))}
              </select>
              {campusLoading && (
                <p className="mt-2 text-sm text-gray-500">Loading campuses...</p>
              )}
              {!campusLoading && campuses.length === 0 && (
                <p className="mt-2 text-sm text-red-500">No active campuses found</p>
              )}
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || campusLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          <div className="mt-4 flex justify-center">        
          <div
         onClick={() => navigate(-1)}
          className="absolute top-2 left-2 text-primary text-center text-xs sm:text-base py-2 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="currentColor"/>
          </svg>
            </div>
          </div>
          {/* Add note for forgotten credentials */}
          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-500 italic">
              If you forgot/reset your credentials, please contact Super Admin.
            </p>
          </div>
        </form>
      </div>
    </CircleBackground>
  );
};


export default PrincipalLogin; 