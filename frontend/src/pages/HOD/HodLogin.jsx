import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "font-awesome/css/font-awesome.min.css"; // Importing Font Awesome
import { validateEmail } from '../../utils/validators';
import config from '../../config';
import Loading from '../../components/Loading';

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

const HodLogin = () => {
  const { campus } = useParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    campus: '',
    branchCode: '',
    hodType: 'teaching' // Add hodType field
  });
  const [campuses, setCampuses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [campusLoading, setCampusLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isTeaching = formData.hodType === 'teaching';

  // Fetch campuses from backend
  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        console.log('Fetching campuses from:', `${API_BASE_URL}/super-admin/campuses/active`);
        const response = await axios.get(`${API_BASE_URL}/super-admin/campuses/active`);
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
          setCampuses([]);
        }
      } catch (error) {
        console.error('Error fetching campuses:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        setCampuses([]);
      } finally {
        setCampusLoading(false);
      }
    };

    fetchCampuses();
  }, []);

  useEffect(() => {
    const fetchBranches = async () => {
      // Only fetch branches for teaching HODs
      if (!formData.campus || !isTeaching) {
        setBranches([]);
        if (!isTeaching) {
          setFormData(prev => ({ ...prev, branchCode: '' }));
        }
        return;
      }
      try {
        const response = await axios.get(
          `${API_BASE_URL}/employee/branches?campus=${formData.campus}`
        );
        const activeBranches = (response.data.branches || []).filter(b => b.isActive);
        setBranches(activeBranches);
        if (formData.branchCode && !activeBranches.some(b => b.code === formData.branchCode)) {
          setFormData(prev => ({ ...prev, branchCode: '' }));
        }
      } catch (error) {
        setBranches([]);
      }
    };
    fetchBranches();
  }, [formData.campus, isTeaching]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    
    // Clear branchCode when switching to non-teaching or changing campus
    if (name === 'hodType' && value === 'non-teaching') {
      newFormData.branchCode = '';
    } else if (name === 'campus') {
      newFormData.branchCode = '';
    }
    
    setFormData(newFormData);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate email
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate branchCode for teaching HODs
    if (isTeaching && !formData.branchCode) {
      setError('Please select a branch for teaching HOD');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting HOD login with:', {
        email: formData.email,
        password: formData.password,
        campus: formData.campus,
        branchCode: formData.branchCode,
        url: `${API_BASE_URL}/hod/login`
      });

      // Prepare login payload
      const loginPayload = {
        email: formData.email,
        password: formData.password,
        campus: formData.campus,
        hodType: formData.hodType
      };

      // Only include branchCode for teaching HODs
      if (isTeaching && formData.branchCode) {
        loginPayload.branchCode = formData.branchCode;
      }

      const response = await axios.post(
        `${API_BASE_URL}/hod/login`,
        loginPayload
      );

      console.log('Login response:', response.data);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', 'hod');
      localStorage.setItem('campus', formData.campus);
      if (isTeaching && formData.branchCode) {
        localStorage.setItem('branchCode', formData.branchCode);
      } else {
        localStorage.removeItem('branchCode');
      }
      navigate('/hod-dashboard');
    } catch (error) {
      console.error('Login error:', error.response || error);
      setError(error.response?.data?.msg || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse delay-1000"></div>
      </div>

      {/* Back Button - Positioned absolutely */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/80 backdrop-blur-sm text-primary rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all duration-300 flex items-center justify-center group"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="currentColor"/>
        </svg>
      </button>

      {/* Main Content */}
      <div className="w-full max-w-[95%] sm:max-w-md lg:max-w-6xl xl:max-w-7xl relative z-10">
        {/* Two Column Layout for Large Screens */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12 xl:gap-16">
          {/* Left Side - Header/Logo Section */}
          <div className="flex flex-col items-center lg:items-start justify-center mb-6 sm:mb-8 lg:mb-0 lg:flex-1 lg:max-w-md xl:max-w-lg">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-primary to-gray-800 rounded-2xl shadow-xl flex items-center justify-center mb-4 lg:mb-6 transform hover:scale-105 transition-transform duration-300">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
              </svg>
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-to-r from-primary to-gray-800 bg-clip-text text-transparent text-center lg:text-left">
              HOD Login
            </h2>
            <p className="text-sm hidden lg:block lg:text-lg xl:text-xl text-gray-600 mt-2 lg:mt-4 text-center lg:text-left max-w-md">
              Access your department dashboard and manage leave requests efficiently
            </p>
            {/* Additional decorative elements for large screens */}
            <div className="hidden lg:flex flex-col gap-4 mt-8">
              <div className="flex items-center gap-3 text-gray-600">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">Secure authentication</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">Real-time updates</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm">Protected access</span>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="lg:flex-1 lg:max-w-md xl:max-w-lg">
            {/* Login Card */}
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 sm:p-8 lg:p-10 relative overflow-hidden">
          {/* Card Gradient Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-gray-800 to-primary"></div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3 shadow-sm">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm sm:text-base font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {/* Add note about server load only when there's an error */}
            {!campusLoading && campuses.length === 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-xs sm:text-sm">Please wait for 30-40 seconds and try a refresh. Sometimes the server faces huge load.</p>
              </div>
            )}

            {/* HOD Type Selection */}
            <div>
              <label className="flex items-center gap-2 text-gray-700 text-sm sm:text-base font-semibold mb-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                HOD Type <span className="text-red-500">*</span>
              </label>
              <select
                name="hodType"
                value={formData.hodType}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base shadow-sm hover:shadow-md"
                required
              >
                <option value="teaching">Teaching</option>
                <option value="non-teaching">Non-Teaching</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-gray-700 text-sm sm:text-base font-semibold mb-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Campus <span className="text-red-500">*</span>
              </label>
              <select
                name="campus"
                value={formData.campus}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={campusLoading}
              >
                <option value="">Select Campus</option>
                {campuses.map((campus) => (
                  <option key={campus.name} value={campus.name}>
                    {campus.displayName}
                  </option>
                ))}
              </select>
              {campusLoading && (
                <p className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading campuses...
                </p>
              )}
              {!campusLoading && campuses.length === 0 && (
                <p className="mt-2 text-sm text-red-500 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  No active campuses found
                </p>
              )}
            </div>

            {/* Branch Code - Only for Teaching HODs */}
            {isTeaching ? (
              <div>
                <label className="flex items-center gap-2 text-gray-700 text-sm sm:text-base font-semibold mb-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Branch Code <span className="text-red-500">*</span>
                </label>
                <select
                  name="branchCode"
                  value={formData.branchCode}
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={!formData.campus}
                >
                  <option value="">Select Branch Code</option>
                  {branches.map((branch) => (
                    <option key={branch.code} value={branch.code}>
                      {isMobile ? branch.code : `${branch.name} (${branch.code})`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-50 to-primary/5 border-l-4 border-primary rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-gray-700 font-medium">
                    Non-teaching HODs do not require branch selection.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-gray-700 text-sm sm:text-base font-semibold mb-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base shadow-sm hover:shadow-md placeholder-gray-400"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-gray-700 text-sm sm:text-base font-semibold mb-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base shadow-sm hover:shadow-md placeholder-gray-400"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || campusLoading}
              className="w-full bg-gradient-to-r from-primary to-gray-800 text-white py-3.5 rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-300 text-sm sm:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

            {/* Add note for forgotten credentials */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-xs sm:text-sm text-gray-600 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                If you forgot/reset your credentials, please contact your Principal.
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HodLogin;
