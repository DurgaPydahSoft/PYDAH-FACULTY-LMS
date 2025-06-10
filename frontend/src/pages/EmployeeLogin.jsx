import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import config from '../config';
import Loading from '../components/Loading';

// Base URL for all API calls
const API_BASE_URL = config.API_BASE_URL;

const EmployeeLogin = () => {
  const [formData, setFormData] = useState({
    employeeId: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Auto-fill employeeId if coming from registration
  useEffect(() => {
    const lastRegisteredId = sessionStorage.getItem('lastRegisteredId');
    if (lastRegisteredId) {
      setFormData(prev => ({ ...prev, employeeId: lastRegisteredId }));
      sessionStorage.removeItem('lastRegisteredId'); // Clear it after use
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Ensure employeeId is a string
      const loginData = {
        employeeId: formData.employeeId.toString(),
        password: formData.password
      };

      console.log('Attempting login with:', { employeeId: loginData.employeeId });
      
      const response = await axios.post(
        `${API_BASE_URL}/employee/login`,
        loginData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Login response:', response.data);

      if (response.data && response.data.token && response.data.user) {
        const { token, user } = response.data;
        
        try {
          // Store all necessary user data
          localStorage.setItem('token', token);
          localStorage.setItem('role', 'employee');
          localStorage.setItem('employeeId', user.employeeId);
          localStorage.setItem('campus', user.campus);
          localStorage.setItem('department', user.department);
          localStorage.setItem('name', user.name);
          localStorage.setItem('email', user.email);
          
          // Set default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Navigate to dashboard
          toast.success('Login successful!');
          navigate('/employee-dashboard', { replace: true });
        } catch (error) {
          console.error('Error setting up session:', error);
          localStorage.clear();
          delete axios.defaults.headers.common['Authorization'];
          setError('Error setting up session. Please try logging in again.');
          toast.error('Error setting up session. Please try again.');
        }
      } else {
        console.error('Invalid server response:', response.data);
        setError('Invalid login response from server');
        toast.error('Login failed: Invalid server response');
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error);
      setError(error.response?.data?.msg || 'Login failed. Please try again.');
      toast.error(error.response?.data?.msg || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-2 sm:p-4">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute top-0 left-0 w-48 h-48 sm:w-64 sm:h-64 text-primary/5" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M45.7,-78.2C58.9,-71.3,69.4,-59.1,77.2,-45.1C85,-31.1,90.1,-15.6,89.1,-0.8C88.1,14,81,28,73.1,41.1C65.2,54.2,56.5,66.4,44.8,74.5C33.1,82.6,18.6,86.6,3.3,82.3C-12,78,-24,65.4,-35.1,54.1C-46.2,42.8,-56.4,32.8,-64.1,20.8C-71.8,8.8,-77,-5.2,-74.8,-18.2C-72.6,-31.2,-63,-43.2,-51.2,-50.8C-39.4,-58.4,-25.4,-61.6,-11.8,-67.8C1.8,-74,15,-83.2,29.2,-85.1C43.4,-87,58.6,-81.6,45.7,-78.2Z" transform="translate(100 100)" />
        </svg>
        <svg className="absolute bottom-0 right-0 w-48 h-48 sm:w-64 sm:h-64 text-primary/5" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M45.7,-78.2C58.9,-71.3,69.4,-59.1,77.2,-45.1C85,-31.1,90.1,-15.6,89.1,-0.8C88.1,14,81,28,73.1,41.1C65.2,54.2,56.5,66.4,44.8,74.5C33.1,82.6,18.6,86.6,3.3,82.3C-12,78,-24,65.4,-35.1,54.1C-46.2,42.8,-56.4,32.8,-64.1,20.8C-71.8,8.8,-77,-5.2,-74.8,-18.2C-72.6,-31.2,-63,-43.2,-51.2,-50.8C-39.4,-58.4,-25.4,-61.6,-11.8,-67.8C1.8,-74,15,-83.2,29.2,-85.1C43.4,-87,58.6,-81.6,45.7,-78.2Z" transform="translate(100 100)" />
        </svg>
      </div>

      <div className="w-full max-w-[95%] sm:max-w-md bg-secondary rounded-neumorphic shadow-outerRaised p-3 sm:p-8 relative">
        {/* Decorative Top Element */}
        <div className="absolute -top-10 sm:-top-12 left-1/2 transform -translate-x-1/2">
          <svg className="w-16 h-16 sm:w-24 sm:h-24 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
          </svg>
        </div>

        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-3xl font-bold text-primary">Employee Login</h2>
          <p className="text-xs sm:text-base text-gray-600 mt-1 sm:mt-2">Access your leave management portal</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-2 sm:px-4 py-1.5 sm:py-3 rounded-lg mb-3 sm:mb-4 text-xs sm:text-base">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3 sm:mb-6">
            <label className="block text-gray-700 text-xs sm:text-base font-bold mb-1 sm:mb-2">
              Employee ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
                </svg>
              </div>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                className="w-full pl-8 sm:pl-10 p-2 sm:p-3 rounded-neumorphic shadow-innerSoft bg-background
                         focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-base
                         border border-gray-300 focus:border-primary transition-colors duration-300"
                placeholder="Enter your Employee ID"
                required
              />
            </div>
          </div>

          <div className="mb-3 sm:mb-6">
            <label className="block text-gray-700 text-xs sm:text-base font-bold mb-1 sm:mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9C13.71 2.9 15.1 4.29 15.1 6V8Z" fill="currentColor"/>
                </svg>
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-8 sm:pl-10 p-2 sm:p-3 rounded-neumorphic shadow-innerSoft bg-background
                         focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-base
                         border border-gray-300 focus:border-primary transition-colors duration-300"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-2 sm:py-3 rounded-neumorphic
                     hover:shadow-innerSoft transition-all duration-300 text-xs sm:text-base
                     border-2 border-primary hover:bg-primary-dark flex items-center justify-center gap-2"
          >
           
            Login
          </button>
        </form>

        
        {/* <div className="mt-3 sm:mt-6 text-center">
          <p className="text-xs sm:text-base text-gray-600">
            Don't have an account?{' '}
            <span
              onClick={() => navigate('/employee-register')}
              className="text-primary cursor-pointer hover:underline font-medium"
            >
              Register here
            </span>
          </p>
        </div> */}

        <button
          onClick={() => navigate('/')}
          className="mt-3 sm:mt-4 w-full text-primary hover:text-blue-800 text-center text-xs sm:text-base
                   border border-primary rounded-neumorphic py-2 hover:bg-primary hover:text-white
                   transition-all duration-300 flex items-center justify-center gap-2"
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

export default EmployeeLogin; 