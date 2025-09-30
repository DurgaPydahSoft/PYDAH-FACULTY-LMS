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
    branchCode: ''
  });
  const [campuses, setCampuses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [campusLoading, setCampusLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
      if (!formData.campus) {
        setBranches([]);
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
  }, [formData.campus]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
      ...(name === 'campus' && { branchCode: '' })
    });
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

    try {
      console.log('Attempting HOD login with:', {
        email: formData.email,
        password: formData.password,
        campus: formData.campus,
        branchCode: formData.branchCode,
        url: `${API_BASE_URL}/hod/login`
      });

      const response = await axios.post(
        `${API_BASE_URL}/hod/login`,
        {
          email: formData.email,
          password: formData.password,
          campus: formData.campus,
          branchCode: formData.branchCode
        }
      );

      console.log('Login response:', response.data);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', 'hod');
      localStorage.setItem('campus', formData.campus);
      localStorage.setItem('branchCode', formData.branchCode);
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
          <h2 className="text-xl sm:text-3xl font-bold text-primary">HOD Login</h2>
          <p className="text-xs sm:text-base text-gray-600 mt-1 sm:mt-2">Access your department dashboard</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-2 sm:px-4 py-1.5 sm:py-3 rounded-lg mb-3 sm:mb-4 text-xs sm:text-base">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Add note about server load only when there's an error */}
          {!campusLoading && campuses.length === 0 && (
            <div className="mb-3 sm:mb-4 text-center">
              <p className="text-xs sm:text-sm text-gray-500 italic flex items-center justify-center gap-1">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
                </svg>
                Please wait for 30-40 seconds and try a refresh. Sometimes the server faces huge load.
              </p>
            </div>
          )}

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
              <p className="mt-2 text-sm text-gray-500">Loading campuses...</p>
            )}
            {!campusLoading && campuses.length === 0 && (
              <p className="mt-2 text-sm text-red-500">No active campuses found</p>
            )}
          </div>

          <div className="mb-3 sm:mb-6">
            <label className="block text-gray-700 text-xs sm:text-base font-bold mb-1 sm:mb-2">
              Branch Code
            </label>
            <select
              name="branchCode"
              value={formData.branchCode}
              onChange={handleChange}
              className="w-full p-2 sm:p-3 rounded-neumorphic shadow-innerSoft bg-background focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-base"
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
            disabled={loading || campusLoading}
            className="w-full bg-primary text-white py-2 sm:py-3 rounded-neumorphic hover:shadow-innerSoft transition-all duration-300 text-xs sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        {/* Add note for forgotten credentials */}
        <div className="mt-3 sm:mt-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500 italic">
            If you forgot/reset your credentials, please contact your Principal.
          </p>
        </div>

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

export default HodLogin;
