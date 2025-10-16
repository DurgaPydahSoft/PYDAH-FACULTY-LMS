import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaTimes, FaHome, FaUsers, FaClipboardList, FaTasks,FaUserPlus, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';


const HRSidebar = ({ activeSection, onSectionChange, hr }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaHome /> },
    { id: 'employees', label: 'Employees', icon: <FaUsers /> },
    { id: 'operations', label: 'Register Employee ', icon: <FaUserPlus /> },
    { id: 'leaves', label: 'Leave Requests', icon: <FaTasks />},
    { id: 'tasks', label: 'Task Management', icon: <FaTasks /> },
    { id: 'profile', label: 'Profile', icon: <FaUserCircle /> }
    
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('campus');
    navigate('/');
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-primary text-white hover:bg-primary-dark transition-colors"
      >
        {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full bg-gray-200 text-white w-64 transform transition-transform duration-300 ease-in-out z-50 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo Section */}
        <div className="p-2 border-b border-gray-300">
          <div className="flex items-center justify-center w-full h-20">
            <img
              src="/PYDAH_LOGO_PHOTO.jpg"
              alt="PYDAH Group Logo"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-6 flex-1">
          <nav>
            <ul className="space-y-4">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onSectionChange(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors
                      ${activeSection === item.id
                        ? 'bg-primary text-white shadow-innerSoft'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom Section with Heading and Logout */}
        <div className="p-6 border-t border-gray-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary">
              HR - {hr?.campus?.name || 'HR'}
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
      </div>
    </>
  );
};

export default HRSidebar;
