import React, { useState } from 'react';
import { FaBars, FaTimes, FaUser, FaUsers, FaClipboardList, FaTasks, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';

const menuItems = [
  { key: 'dashboard', label: 'Overview', icon: <FaUser /> },
  { key: 'employees', label: 'Employees', icon: <FaUsers /> },
  { key: 'leaves', label: 'Leave Requests', icon: <FaClipboardList /> },
  { key: 'ccl-work', label: 'CCL Work', icon: <FaTasks /> },
  { key: 'profile', label: 'Profile', icon: <FaUserCircle /> },
];

const HodSidebar = ({ activeSection, onSectionChange, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const campus = localStorage.getItem('campus');
  const branchCode = localStorage.getItem('branchCode');

  const toggleSidebar = () => setIsOpen((prev) => !prev);

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-primary text-white hover:bg-primary-dark transition-colors"
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
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
      <div className={`fixed top-0 left-0 h-full bg-secondary text-white w-64 transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-8 text-primary">
            {branchCode
              ? branchCode.toUpperCase() + ' Dashboard'
              : campus
                ? campus.charAt(0).toUpperCase() + campus.slice(1) + ' Dashboard'
                : 'HOD Dashboard'}
          </h2>
          <nav>
            <ul className="space-y-4">
              {menuItems.map((item) => (
                <li key={item.key}>
                  <button
                    onClick={() => {
                      onSectionChange(item.key);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors
                      ${activeSection === item.key
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
          <button
            onClick={onLogout}
            className="w-full mt-8 p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <FaSignOutAlt className="text-xl inline-block mr-2" /> Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default HodSidebar; 