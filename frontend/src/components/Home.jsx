import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUniversity, FaUserTie, FaChalkboardTeacher, FaUsers, FaUserShield, FaArrowRight } from 'react-icons/fa';
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

  // Login cards configuration
  const loginCards = [
    {
      id: 'employee',
      icon: FaUserTie,
      title: 'Employee Portal',
      description: 'Access leave management',
      route: '/employee-login',
      gradient: 'from-emerald-500 to-green-600',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    {
      id: 'hod',
      icon: FaChalkboardTeacher,
      title: 'HOD Login',
      description: 'Department head access portal',
      route: '/hod-login',
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'hr',
      icon: FaUsers,
      title: 'HR Login',
      description: 'Human Resources management portal',
      route: '/hr/login',
      gradient: 'from-purple-500 to-pink-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      id: 'principal',
      icon: FaUniversity,
      title: 'Principal Portal',
      description: 'Campus administration portal',
      route: '/default/principal-login',
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600'
    },
    {
      id: 'super-admin',
      icon: FaUserShield,
      title: 'Super Admin',
      description: 'System administration portal',
      route: '/super-admin-login',
      gradient: 'from-red-500 to-rose-600',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600'
    }
  ];

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Modern Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-green-50/50 to-primary/5"></div>
      
      {/* Animated Background Elements - Reduced on Mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="hidden sm:block absolute top-0 left-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="hidden sm:block absolute bottom-0 right-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-green-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8 sm:mb-12 md:mb-16 animate__animated animate__fadeInDown">
            <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-primary/20 to-green-500/20 backdrop-blur-sm border border-primary/30 mb-4 sm:mb-6">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full mr-2 animate-pulse"></span>
              <span className="text-xs sm:text-sm font-semibold text-primary">PYDAH Faculty LMS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold mb-3 sm:mb-4 md:mb-6 px-2">
              <span className="bg-gradient-to-r from-primary via-green-600 to-primary bg-clip-text text-transparent animate-gradient">
                Welcome to Leave Management
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 font-medium max-w-2xl mx-auto px-2">
              Select your role to access the portal
            </p>
          </div>

          {/* Login Cards Grid - 2x2 on left, Super Admin on right */}
          <div className="w-full mb-8 sm:mb-10 md:mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {/* Left Side: First 4 Cards in 2x2 Grid */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                {loginCards.slice(0, 4).map((card, index) => {
                  const IconComponent = card.icon;
                  return (
                    <div
                      key={card.id}
                      onClick={() => navigate(card.route)}
                      className="group relative bg-white rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-3.5 md:p-4 lg:p-5 shadow-md sm:shadow-lg hover:shadow-2xl active:shadow-lg transition-all duration-300 transform hover:-translate-y-1 sm:hover:-translate-y-2 active:translate-y-0 cursor-pointer overflow-hidden border border-gray-100 touch-manipulation min-h-[110px] sm:min-h-[140px] md:min-h-[160px]"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Gradient Overlay on Hover/Touch */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300`}></div>
                      
                      {/* Content */}
                      <div className="relative z-10 h-full flex flex-col">
                        {/* Icon */}
                        <div className={`${card.iconBg} w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center mb-2 sm:mb-2.5 md:mb-3 group-hover:scale-110 group-hover:rotate-3 group-active:scale-105 transition-all duration-300 flex-shrink-0`}>
                          <IconComponent className={`text-lg sm:text-xl md:text-2xl lg:text-[26px] ${card.iconColor} transition-colors duration-300`} />
                        </div>

                        {/* Title and Description */}
                        <div className="flex-grow">
                          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-1 sm:mb-1.5 group-hover:text-white group-active:text-white transition-colors duration-300 leading-tight">
                            {card.title}
                          </h3>
                          <p className="text-xs sm:text-sm md:text-sm text-gray-600 mb-2 sm:mb-3 md:mb-4 group-hover:text-white/90 group-active:text-white/90 transition-colors duration-300 leading-relaxed">
                            {card.description}
                          </p>
                        </div>

                        {/* Action Button - Mobile Optimized */}
                        <div className="flex items-center text-primary font-semibold group-hover:text-white group-active:text-white transition-colors duration-300 mt-auto">
                          <span className="text-xs sm:text-xs md:text-sm">Access Portal</span>
                          <FaArrowRight className="ml-1.5 sm:ml-2 text-xs sm:text-xs md:text-sm group-hover:translate-x-2 group-active:translate-x-1 transition-transform duration-300" />
                        </div>
                      </div>

                      {/* Decorative Corner Element */}
                      <div className={`absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 group-active:opacity-5 rounded-bl-full transition-opacity duration-300`}></div>
                    </div>
                  );
                })}
              </div>

              {/* Right Side: Super Admin Card */}
              {loginCards.slice(4).map((card, index) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    onClick={() => navigate(card.route)}
                    className={`group relative bg-white rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-3.5 md:p-4 lg:p-5 shadow-md sm:shadow-lg hover:shadow-2xl active:shadow-lg transition-all duration-300 transform hover:-translate-y-1 sm:hover:-translate-y-2 active:translate-y-0 cursor-pointer overflow-hidden border border-gray-100 touch-manipulation min-h-[110px] sm:min-h-[140px] md:min-h-[160px] lg:h-full ${
                      card.id === 'super-admin' ? 'flex items-center justify-center text-center' : ''
                    }`}
                    style={{ animationDelay: `${(index + 4) * 100}ms` }}
                  >
                    {/* Gradient Overlay on Hover/Touch */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300`}></div>
                    
                    {/* Content */}
                    <div
                      className={`relative z-10 flex flex-col ${
                        card.id === 'super-admin'
                          ? 'items-center text-center gap-3'
                          : 'h-full'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`${card.iconBg} w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center mb-2 sm:mb-2.5 md:mb-3 group-hover:scale-110 group-hover:rotate-3 group-active:scale-105 transition-all duration-300 flex-shrink-0`}>
                        <IconComponent className={`text-lg sm:text-xl md:text-2xl lg:text-[26px] ${card.iconColor} transition-colors duration-300`} />
                      </div>

                      {/* Title and Description */}
                      <div className="flex-grow">
                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-1 sm:mb-1.5 group-hover:text-white group-active:text-white transition-colors duration-300 leading-tight">
                          {card.title}
                        </h3>
                        <p className="text-xs sm:text-sm md:text-sm text-gray-600 mb-2 sm:mb-3 md:mb-4 group-hover:text-white/90 group-active:text-white/90 transition-colors duration-300 leading-relaxed">
                          {card.description}
                        </p>
                      </div>

                      {/* Action Button - Mobile Optimized */}
                      <div
                        className={`flex items-center text-primary font-semibold group-hover:text-white group-active:text-white transition-colors duration-300 ${
                          card.id === 'super-admin' ? 'justify-center' : 'mt-auto'
                        }`}
                      >
                        <span className="text-xs sm:text-xs md:text-sm">Access Portal</span>
                        <FaArrowRight className="ml-1.5 sm:ml-2 text-xs sm:text-xs md:text-sm group-hover:translate-x-2 group-active:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>

                    {/* Decorative Corner Element */}
                    <div className={`absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 group-active:opacity-5 rounded-bl-full transition-opacity duration-300`}></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Help Section - Mobile Optimized */}
          <div className="text-center mt-8 sm:mt-12 md:mt-16 px-2">
            <div className="inline-block bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-6 shadow-lg border border-gray-200 w-full sm:w-auto max-w-md mx-auto">
              <p className="text-gray-700 font-medium text-xs sm:text-sm md:text-base mb-1.5 sm:mb-2">
                Need help? Contact your system administrator
              </p>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-500">
                © 2024 PYDAH Leave Management System
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Home; 