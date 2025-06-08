import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUniversity, FaUserTie, FaChalkboardTeacher, FaUsers, FaUserShield } from 'react-icons/fa';
import { GiMedicines } from 'react-icons/gi';
import { MdSchool } from 'react-icons/md';
import { PiBooksFill } from 'react-icons/pi';

const Home = () => {
  const navigate = useNavigate();

  const campuses = [
    {
      name: 'Engineering',
      code: 'engineering',
      description: 'PYDAH College of Engineering',
      icon: <FaUniversity className="text-3xl text-primary" />
    },
    {
      name: 'Degree',
      code: 'degree',
      description: 'PYDAH Degree College',
      icon: <MdSchool className="text-3xl text-primary" />
    },
    {
      name: 'Pharmacy',
      code: 'pharmacy',
      description: 'PYDAH College of Pharmacy',
      icon: <GiMedicines className="text-3xl text-primary" />
    },
    {
      name: 'Diploma',
      code: 'diploma',
      description: 'PYDAH Polytechnic College',
      icon: <PiBooksFill className="text-3xl text-primary" />
    }
  ];

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

        {/* Professional Grid Layout */}
        <div className="relative">
          {/* Vertical Divider for large screens */}
          <div className="hidden lg:block absolute left-1/2 top-0 h-full w-px bg-gray-200"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-12 gap-x-20 items-start mb-10">
            {/* Left Side - Staff Login Options */}
            <div className="space-y-6 bg-white rounded-2xl shadow-lg p-6 md:p-8 w-full max-w-xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-primary mb-4 md:mb-6">Staff Access</h2>
              {/* Employee Access Card */}
              <div className="bg-secondary p-5 md:p-6 rounded-neumorphic shadow-outerRaised flex flex-col gap-2">
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
                className="bg-secondary p-5 md:p-6 rounded-neumorphic shadow-outerRaised hover:shadow-innerSoft transition-all duration-300 cursor-pointer flex items-center gap-3 group"
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
                className="bg-secondary p-5 md:p-6 rounded-neumorphic shadow-outerRaised hover:shadow-innerSoft transition-all duration-300 cursor-pointer flex items-center gap-3 group"
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
                className="bg-secondary p-5 md:p-6 rounded-neumorphic shadow-outerRaised hover:shadow-innerSoft transition-all duration-300 cursor-pointer flex items-center gap-3 group"
              >
                <FaUserShield className="text-3xl text-primary" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-primary group-hover:underline">Super Admin Login</h3>
                  <p className="text-gray-600 text-sm md:text-base">System administration portal</p>
                </div>
              </div>
            </div>
            {/* Right Side - Campus Principal Login */}
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 w-full max-w-xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-primary mb-4 md:mb-6">Principal Login</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {campuses.map((campus) => (
                  <div
                    key={campus.code}
                    onClick={() => navigate(`/${campus.code}/principal-login`)}
                    className="bg-secondary p-5 md:p-6 rounded-neumorphic shadow-outerRaised hover:shadow-innerSoft transition-all duration-300 cursor-pointer flex flex-col items-center group"
                  >
                    <div className="mb-2">{campus.icon}</div>
                    <h3 className="text-base md:text-lg font-semibold text-primary group-hover:underline mb-1">
                      {campus.name}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 text-center">
                      {campus.description}
                    </p>
                  </div>
                ))}
              </div>
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