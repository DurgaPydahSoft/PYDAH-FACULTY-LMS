import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { validateEmail, validateCampus } from '../utils/validators';
import config from '../config';
import axiosInstance from '../utils/axiosConfig';
import Loading from '../components/Loading';

const API_BASE_URL = config.API_BASE_URL;

const PrincipalLogin = () => {
  const { campus } = useParams();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!validateCampus(campus)) {
      navigate('/');
    }
  }, [campus, navigate]);

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

    // Validate email only
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      // Capitalize campus type
      const campusType = campus.charAt(0).toUpperCase() + campus.slice(1);
      
      console.log('Attempting principal login with:', {
        ...formData,
        campus: campusType,
        url: `${API_BASE_URL}/principal/login`
      });

      const response = await axiosInstance.post('/principal/login', {
        ...formData,
        campus: campusType
      });

      console.log('Login response:', response.data);

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', 'principal');
        localStorage.setItem('campus', campus);
        navigate(`/${campus}/principal-dashboard`);
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Login error:', error.response || error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setError(error.response.data?.msg || 'Login failed');
      } else if (error.request) {
        // The request was made but no response was received
        setError('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError('Error setting up request: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-secondary rounded-neumorphic shadow-outerRaised p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary">
            {campus.charAt(0).toUpperCase() + campus.slice(1)} Principal Login
          </h2>
          <p className="text-gray-600 mt-2">
            Access your campus dashboard
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 rounded-neumorphic shadow-innerSoft bg-background
                       focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 rounded-neumorphic shadow-innerSoft bg-background
                       focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-neumorphic
                     hover:shadow-innerSoft transition-all duration-300"
          >
            Login
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="mt-4 w-full text-primary hover:text-blue-800 text-center"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default PrincipalLogin; 