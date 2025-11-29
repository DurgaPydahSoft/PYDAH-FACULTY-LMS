import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaTimes, FaHome, FaUsers, FaClipboardList, FaTasks, FaUserPlus, FaUserCircle, FaSignOutAlt, FaUserTie, FaRegCalendarCheck, FaClock, FaIdCard } from 'react-icons/fa';


const HRSidebar = ({ activeSection, onSectionChange, hr }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaHome /> },
    { id: 'employees', label: 'Employees', icon: <FaUsers /> },
    { id: 'operations', label: 'Register Employee', icon: <FaUserPlus /> },
    { id: 'hod-management', label: 'HOD Management', icon: <FaUserTie /> },
    { id: 'designations', label: 'Designations', icon: <FaIdCard /> },
    { id: 'attendance', label: 'Attendance', icon: <FaClock /> },
    { id: 'leaves', label: 'Leave Requests', icon: <FaTasks /> },
    { id: 'my-leaves', label: 'My Leave Requests', icon: <FaRegCalendarCheck /> },
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
      <div className={`fixed top-0 left-0 h-screen bg-gradient-to-b from-primary to bg-gray-800 text-white w-64 transform transition-transform duration-300 ease-in-out z-50 flex flex-col overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo Section - Fixed at top */}
        <div className="flex-shrink-0 border-b border-gray-300">
          <div className="flex items-center justify-center w-full h-20 space-x-3">
            <h1 className="text-4xl font-bold text-white">PYDAH</h1>
          </div>
        </div>

        {/* Navigation Section - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sidebar-scroll">
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
                        ? 'bg-white text-primary shadow-innerSoft'
                        : 'text-white hover:bg-gray-100 hover:text-primary'
                      }`}
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <span className="text-left">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom Section with Heading and Logout - Fixed at bottom */}
        <div className="flex-shrink-0 p-6 border-t border-gray-300 bg-gradient-to-b from-primary to bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white truncate">
              HR - {hr?.campus?.name || 'HR'}
            </h2>
            <button
              onClick={handleLogout}
              className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center flex-shrink-0"
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
