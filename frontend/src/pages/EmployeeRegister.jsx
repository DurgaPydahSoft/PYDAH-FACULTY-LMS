import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import config from '../config';

// Base URL for all API calls
const API_BASE_URL = config.API_BASE_URL;

// Add a hook to detect if the screen is mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

const EmployeeRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    employeeId: '',
    phoneNumber: '',
    campus: '',
    department: ''
  });

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const campuses = [
    { value: 'engineering', label: 'Engineering' },
    { value: 'degree', label: 'Degree' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'diploma', label: 'Diploma' }
  ];

  const isMobile = useIsMobile();

  // Fetch branches when campus changes
  useEffect(() => {
    const fetchBranches = async () => {
      if (!formData.campus) {
        setBranches([]);
        return;
      }
      try {
        // Use the new backend endpoint for employee registration
        const response = await axios.get(
          `${API_BASE_URL}/employee/branches?campus=${formData.campus}`
        );
        // Only show active branches
        const activeBranches = (response.data.branches || []).filter(b => b.isActive);
        setBranches(activeBranches);
        // Reset department if not in new list
        if (formData.department && !activeBranches.some(b => b.code === formData.department)) {
          setFormData(prev => ({ ...prev, department: '' }));
        }
      } catch (error) {
        setBranches([]);
      }
    };
    fetchBranches();
  }, [formData.campus]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    // Validate phone number
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    // Validate campus and department
    if (!formData.campus) {
      toast.error('Please select a campus');
      return;
    }
    if (!branches.some(b => b.code === formData.department)) {
      toast.error('Invalid department for selected campus');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/employee/register`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email.toLowerCase(),
        password: formData.password,
        employeeId: formData.employeeId,
        phoneNumber: formData.phoneNumber,
        campus: formData.campus.toLowerCase(),
        department: formData.department
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.data) {
        toast.success('Registration successful! Please login with your Employee ID and password.');
        sessionStorage.setItem('lastRegisteredId', formData.employeeId);
        setTimeout(() => {
          navigate('/employee-login');
        }, 2000);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.msg || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute top-0 right-0 w-24 h-24 sm:w-64 sm:h-64 text-primary/5" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M45.7,-78.2C58.9,-71.3,69.4,-59.1,77.2,-45.1C85,-31.1,90.1,-15.6,89.1,-0.8C88.1,14,81,28,73.1,41.1C65.2,54.2,56.5,66.4,44.8,74.5C33.1,82.6,18.6,86.6,3.3,82.3C-12,78,-24,65.4,-35.1,54.1C-46.2,42.8,-56.4,32.8,-64.1,20.8C-71.8,8.8,-77,-5.2,-74.8,-18.2C-72.6,-31.2,-63,-43.2,-51.2,-50.8C-39.4,-58.4,-25.4,-61.6,-11.8,-67.8C1.8,-74,15,-83.2,29.2,-85.1C43.4,-87,58.6,-81.6,45.7,-78.2Z" transform="translate(100 100)" />
        </svg>
        <svg className="absolute bottom-0 left-0 w-24 h-24 sm:w-64 sm:h-64 text-primary/5" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M45.7,-78.2C58.9,-71.3,69.4,-59.1,77.2,-45.1C85,-31.1,90.1,-15.6,89.1,-0.8C88.1,14,81,28,73.1,41.1C65.2,54.2,56.5,66.4,44.8,74.5C33.1,82.6,18.6,86.6,3.3,82.3C-12,78,-24,65.4,-35.1,54.1C-46.2,42.8,-56.4,32.8,-64.1,20.8C-71.8,8.8,-77,-5.2,-74.8,-18.2C-72.6,-31.2,-63,-43.2,-51.2,-50.8C-39.4,-58.4,-25.4,-61.6,-11.8,-67.8C1.8,-74,15,-83.2,29.2,-85.1C43.4,-87,58.6,-81.6,45.7,-78.2Z" transform="translate(100 100)" />
        </svg>
      </div>

      {/* Top SVG above card, always centered and visible */}
      <div className="w-full flex flex-col items-center justify-center mt-4 mb-2" style={{zIndex: 2}}>
        <svg className="w-16 h-16 sm:w-24 sm:h-24 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 12C17.21 12 19 10.21 19 8C19 5.79 17.21 4 15 4C12.79 4 11 5.79 11 8C11 10.21 12.79 12 15 12ZM6 10V7H4V10H1V12H4V15H6V12H9V10H6ZM15 14C12.33 14 7 15.34 7 18V20H23V18C23 15.34 17.67 14 15 14Z" fill="currentColor"/>
        </svg>
      </div>

      <div className="w-full max-w-[95%] sm:max-w-md bg-secondary rounded-neumorphic shadow-outerRaised p-3 sm:p-8 relative mt-0">
        <h2 className="text-xl sm:text-3xl font-bold text-primary mb-3 sm:mb-6 text-center">
          Employee Registration
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-gray-700 text-xs sm:text-base mb-1 sm:mb-2">First Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
                  </svg>
                </div>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full pl-8 sm:pl-10 p-2 sm:p-3 rounded-neumorphic bg-secondary shadow-innerSoft 
                           focus:outline-none text-xs sm:text-base border border-gray-300 
                           focus:border-primary transition-colors duration-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 text-xs sm:text-base mb-1 sm:mb-2">Last Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
                  </svg>
                </div>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full pl-8 sm:pl-10 p-2 sm:p-3 rounded-neumorphic bg-secondary shadow-innerSoft 
                           focus:outline-none text-xs sm:text-base border border-gray-300 
                           focus:border-primary transition-colors duration-300"
                />
              </div>
            </div>
          </div>

          {/* Employee ID */}
          <div>
            <label className="block text-gray-700 text-xs sm:text-base mb-1 sm:mb-2">Employee ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 4H4C2.89 4 2 4.89 2 6V18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V6H20V18ZM6 10H18V12H6V10ZM6 14H14V16H6V14Z" fill="currentColor"/>
                </svg>
              </div>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                required
                className="w-full pl-8 sm:pl-10 p-2 sm:p-3 rounded-neumorphic bg-secondary shadow-innerSoft 
                         focus:outline-none text-xs sm:text-base border border-gray-300 
                         focus:border-primary transition-colors duration-300"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-gray-700 text-xs sm:text-base mb-1 sm:mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM19.6 8.25L12.53 12.67C12.21 12.87 11.79 12.87 11.47 12.67L4.4 8.25C4.15 8.09 4 7.82 4 7.53C4 6.86 4.73 6.46 5.3 6.81L12 11L18.7 6.81C19.27 6.46 20 6.86 20 7.53C20 7.82 19.85 8.09 19.6 8.25Z" fill="currentColor"/>
                  </svg>
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-8 sm:pl-10 p-2 sm:p-3 rounded-neumorphic bg-secondary shadow-innerSoft 
                           focus:outline-none text-xs sm:text-base border border-gray-300 
                           focus:border-primary transition-colors duration-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 text-xs sm:text-base mb-1 sm:mb-2">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z" fill="currentColor"/>
                  </svg>
                </div>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10}"
                  placeholder="10-digit number"
                  className="w-full pl-8 sm:pl-10 p-2 sm:p-3 rounded-neumorphic bg-secondary shadow-innerSoft 
                           focus:outline-none text-xs sm:text-base border border-gray-300 
                           focus:border-primary transition-colors duration-300"
                />
              </div>
            </div>
          </div>

          {/* Campus and Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-gray-700 text-xs sm:text-base mb-1 sm:mb-2">Campus</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2ZM2 17L12 22L22 17V12L12 17L2 12V17Z" fill="currentColor"/>
                  </svg>
                </div>
                <select
                  name="campus"
                  value={formData.campus}
                  onChange={handleChange}
                  required
                  className="w-full pl-8 sm:pl-10 p-2 sm:p-3 rounded-neumorphic bg-secondary shadow-innerSoft 
                           focus:outline-none text-xs sm:text-base border border-gray-300 
                           focus:border-primary transition-colors duration-300"
                >
                  <option value="">Select Campus</option>
                  {campuses.map(campus => (
                    <option key={campus.value} value={campus.value}>
                      {campus.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-gray-700 text-xs sm:text-base mb-1 sm:mb-2">Department</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" fill="currentColor"/>
                  </svg>
                </div>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition"
                  required
                >
                  <option value="">Select a branch</option>
                  {branches.map(branch => (
                    <option key={branch._id || branch.code} value={branch.code}>
                      {isMobile ? branch.code : `${branch.name} (${branch.code})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Password Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-gray-700 text-xs sm:text-base mb-1 sm:mb-2">Password</label>
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
                  required
                  minLength="6"
                  className="w-full pl-8 sm:pl-10 p-2 sm:p-3 rounded-neumorphic bg-secondary shadow-innerSoft 
                           focus:outline-none text-xs sm:text-base border border-gray-300 
                           focus:border-primary transition-colors duration-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 text-xs sm:text-base mb-1 sm:mb-2">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9C13.71 2.9 15.1 4.29 15.1 6V8Z" fill="currentColor"/>
                  </svg>
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength="6"
                  className="w-full pl-8 sm:pl-10 p-2 sm:p-3 rounded-neumorphic bg-secondary shadow-innerSoft 
                           focus:outline-none text-xs sm:text-base border border-gray-300 
                           focus:border-primary transition-colors duration-300"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mt-4 sm:mt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-3 sm:px-6 py-2 sm:py-3 rounded-neumorphic bg-primary 
                       text-white shadow-outerRaised hover:shadow-innerSoft transition-all duration-300 
                       disabled:opacity-50 text-xs sm:text-base border-2 border-primary 
                       hover:bg-primary-dark flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
              </svg>
              {loading ? 'Registering...' : 'Register'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')} 
              className="w-full sm:w-auto px-3 sm:px-6 py-2 sm:py-3 rounded-neumorphic bg-secondary 
                       shadow-outerRaised hover:shadow-innerSoft transition-all duration-300 
                       text-gray-600 text-xs sm:text-base border border-gray-300 
                       hover:border-primary hover:text-primary flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="currentColor"/>
              </svg>
              <span className="inline-block">Back to Home</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeRegister; 