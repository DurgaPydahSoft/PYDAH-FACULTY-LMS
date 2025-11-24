import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaUniversity, FaUserTie, FaUsers, FaCog, FaBars, FaTimes, FaUserFriends, FaTasks, FaSignOutAlt } from 'react-icons/fa';

const SuperAdminSidebar = ({ activeSection, onSectionChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaHome /> },
    { id: 'campuses', label: 'Campuses', icon: <FaUniversity /> },
    { id: 'principals', label: "Principals", icon: <FaUserTie /> },
    { id: 'employees', label: 'Employees', icon: <FaUserFriends /> },
    { id: 'hr-management', label: 'HR Management', icon: <FaUsers /> },
    { id: 'task-management', label: 'Task Management', icon: <FaTasks /> },
    { id: 'system-settings', label: 'System Settings', icon: <FaCog /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
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
      <div className={`fixed top-0 left-0 h-full bg-gradient-to-b from-emerald-800 to-emerald-700 text-white w-64 transform transition-transform duration-300 ease-in-out z-50 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo Section */}
        <div className=" border-b border-gray-300">
          <div className="flex items-center justify-center w-full h-20 space-x-3">
            <h1 className="text-4xl font-bold text-white">PYDAH</h1>
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
                        ? 'bg-white text-primary shadow-innerSoft'
                        : 'text-white hover:bg-gray-100 hover:text-primary'
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
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-xl font-bold text-white">
              Super Admin
            </h2>
            <button
              onClick={handleLogout}
              className="p-2 text-white hover:bg-red-500 rounded-lg transition-colors"
              title="Logout"
            >
              <FaSignOutAlt className="text-lg" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SuperAdminSidebar;
