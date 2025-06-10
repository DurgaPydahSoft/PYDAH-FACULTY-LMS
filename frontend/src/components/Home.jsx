import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUniversity, FaUserTie, FaChalkboardTeacher, FaUsers, FaUserShield } from 'react-icons/fa';
import { GiMedicines } from 'react-icons/gi';
import { MdSchool } from 'react-icons/md';
import { PiBooksFill } from 'react-icons/pi';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const Home = () => {
  const navigate = useNavigate();
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/super-admin/campuses/active`);
        setCampuses(response.data);
      } catch (err) {
        console.error('Error fetching campuses:', err);
        setError('Failed to load campuses. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCampuses();
  }, []);

  // Map campus types to icons
  const getCampusIcon = (type) => {
    const iconMap = {
      'Engineering': <FaUniversity className="text-3xl text-primary" />,
      'Degree': <MdSchool className="text-3xl text-primary" />,
      'Pharmacy': <GiMedicines className="text-3xl text-primary" />,
      'Diploma': <PiBooksFill className="text-3xl text-primary" />,
      'default': <FaUniversity className="text-3xl text-primary" />
    };
    return iconMap[type] || iconMap.default;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between relative overflow-x-hidden">
      {/* SVG Accent Background */}
      
      <div className="relative z-10 max-w-5xl mx-auto w-full px-2 sm:px-6 py-8 flex-1 flex flex-col justify-center">
        {/* Header Section */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-xl md:text-3xl font-extrabold text-primary mb-3 tracking-tight drop-shadow-sm">
            Welcome to PYDAH Leave Management System
          </h1>
          <p className="text-lg md:text-xl text-gray-600 font-medium">
            Please select your role to proceed
          </p>
        </div>

        {/* Login Cards - Responsive Horizontal Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 items-center mb-10 w-full max-w-5xl mx-auto">
          {/* Employee Access Card */}
          <div className="bg-secondary p-5 md:p-6 rounded-neumorphic shadow-outerRaised flex flex-col gap-2 w-full">
            <div className="flex items-center mb-2">
              <FaUserTie className="text-3xl text-primary mr-3" />
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-primary">Employee Portal</h3>
                <p className="text-gray-600 text-sm md:text-base">Access leave management</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 mt-2">
              <button
                onClick={() => navigate('/employee-login')}
                className="w-full py-2 px-4 rounded-neumorphic bg-primary text-white shadow-outerRaised hover:shadow-innerSoft transition-all duration-300 text-base font-medium"
              >
                Login
              </button>
            </div>
          </div>
          {/* HOD Login Card */}
          <div 
            onClick={() => navigate('/hod-login')}
            className="bg-secondary p-5 md:p-6 rounded-neumorphic shadow-outerRaised hover:shadow-innerSoft transition-all duration-300 cursor-pointer flex items-center gap-3 group w-full"
          >
            <FaChalkboardTeacher className="text-3xl text-primary" />
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-primary group-hover:underline">HOD Login</h3>
              <p className="text-gray-600 text-sm md:text-base">Department head access portal</p>
            </div>
          </div>
          {/* HR Login Card */}
          <div 
            onClick={() => navigate('/hr/login')}
            className="bg-secondary p-5 md:p-6 rounded-neumorphic shadow-outerRaised hover:shadow-innerSoft transition-all duration-300 cursor-pointer flex items-center gap-3 group w-full"
          >
            <FaUsers className="text-3xl text-primary" />
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-primary group-hover:underline">HR Login</h3>
              <p className="text-gray-600 text-sm md:text-base">Human Resources management portal</p>
            </div>
          </div>
          {/* Super Admin Login Card */}
          <div 
            onClick={() => navigate('/super-admin-login')}
            className="bg-secondary p-5 md:p-6 rounded-neumorphic shadow-outerRaised hover:shadow-innerSoft transition-all duration-300 cursor-pointer flex items-center gap-3 group w-full"
          >
            <FaUserShield className="text-3xl text-primary" />
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-primary group-hover:underline">Super Admin Login</h3>
              <p className="text-gray-600 text-sm md:text-base">System administration portal</p>
            </div>
          </div>
          {/* Principal Login Card */}
          <div 
            onClick={() => navigate('/default/principal-login')}
            className="bg-secondary p-5 md:p-6 rounded-neumorphic shadow-outerRaised hover:shadow-innerSoft transition-all duration-300 cursor-pointer flex items-center gap-3 group w-full"
          >
            <FaUniversity className="text-3xl text-primary" />
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-primary group-hover:underline">Principal Portal</h3>
              <p className="text-gray-600 text-sm md:text-base">Campus administration portal</p>
            </div>
          </div>
        </div>
        {/* Help Section */}
        <div className="text-center text-gray-600 mt-8">
          <p className="font-medium">Need help? Contact your system administrator</p>
          <p className="text-xs mt-2">© 2024 PYDAH Leave Management System</p>
        </div>
      </div>
    </div>
  );
};

export default Home; 