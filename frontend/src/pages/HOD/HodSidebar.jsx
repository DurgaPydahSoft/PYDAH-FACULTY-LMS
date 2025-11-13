import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaTimes, FaHome, FaUsers, FaClipboardList, FaTasks, FaUserCircle, FaSignOutAlt, FaClipboardCheck } from 'react-icons/fa';

const HodSidebar = ({ activeSection, onSectionChange, hod }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaHome /> },
    { id: 'employees', label: 'Employees', icon: <FaUsers /> },
    { id: 'leaves', label: 'Leave Requests', icon: <FaClipboardList /> },
    { id: 'ccl-work', label: 'CCL Work', icon: <FaTasks /> },
    { id: 'tasks', label: 'My Tasks', icon: <FaClipboardCheck /> },
    { id: 'task-management', label: 'Manage Tasks', icon: <FaTasks /> },
    { id: 'profile', label: 'Profile', icon: <FaUserCircle /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('campus');
    localStorage.removeItem('branchCode');
    navigate('/');
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-primary to-gray-800 text-white shadow-md">
        <div className="flex items-center justify-between p-4">
          {/* Left: Hamburger Menu */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-white hover:bg-white hover:bg-opacity-20 transition-colors"
          >
            {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>

          {/* Center: PYDAH Logo */}
          <h1 className="text-2xl font-bold text-white absolute left-1/2 transform -translate-x-1/2">
            PYDAH
          </h1>

          {/* Right: Logout Icon */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-md text-white hover:bg-white hover:bg-opacity-20 transition-colors"
            title="Logout"
          >
            <FaSignOutAlt size={18} />
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full bg-gradient-to-b from-primary to-gray-800 text-white w-64 transform transition-transform duration-300 ease-in-out z-50 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:mt-0 mt-16`}>

        {/* Logo Section - Hidden on mobile, shown on desktop */}
        <div className="border-b border-gray-300 hidden lg:block">
          <div className="flex items-center justify-center w-full h-20 space-x-3">
            <h1 className="text-4xl font-bold text-white">PYDAH</h1>
          </div>
        </div>

        {/* User Info - Mobile Only */}
        <div className="lg:hidden p-6 border-b border-gray-300 bg-primary-dark">
          <div className="flex items-center space-x-3">
            <FaUserCircle className="text-3xl text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">
                {hod?.department?.name
                  ? hod.department.name.toUpperCase()
                  : hod?.department?.code
                    ? hod.department.code.toUpperCase()
                    : 'HOD'
                }
              </h2>
              <p className="text-sm text-gray-200">HOD Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-6 flex-1 overflow-y-auto">
          <nav>
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onSectionChange(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center space-x-4 p-4 rounded-xl transition-all duration-200
                      ${activeSection === item.id
                        ? 'bg-white text-primary shadow-lg'
                        : 'text-white hover:bg-white hover:bg-opacity-20 hover:shadow-md'
                      }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom Section with Logout - Desktop Only */}
        <div className="p-6 border-t border-gray-300 hidden lg:block">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {hod?.department?.name
                ? hod.department.name.toUpperCase()
                : hod?.department?.code
                  ? hod.department.code.toUpperCase()
                  : 'HOD'
              }
            </h2>
            <button
              onClick={handleLogout}
              className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center"
              title="Logout"
            >
              <FaSignOutAlt size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Logout Button - Fixed at bottom */}
        <div className="lg:hidden p-4 border-t border-gray-300 bg-primary-dark">
          <button
            onClick={handleLogout}
            className="w-full p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default HodSidebar;