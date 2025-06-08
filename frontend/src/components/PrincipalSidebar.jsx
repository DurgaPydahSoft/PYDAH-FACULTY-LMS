import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaUsers, FaUserTie, FaCalendarAlt, FaClipboardList, FaUser, FaBars, FaTimes } from 'react-icons/fa';
import { FaDiagramProject } from "react-icons/fa6";

const PrincipalSidebar = ({ activeSection, onSectionChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const campus = localStorage.getItem('campus');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaHome />, path: `/principal/${campus}/dashboard` },
    { id: 'hods', label: 'HOD Management', icon: <FaUserTie />, path: `/principal/${campus}/hods` },
    { id: 'employees', label: 'Employees', icon: <FaUsers />, path: `/principal/${campus}/employees` },
    { id: 'leaves', label: 'Leave Requests', icon: <FaCalendarAlt />, path: `/principal/${campus}/leaves` },
    { id: 'ccl-work', label: 'CCL Work Requests', icon: <FaClipboardList />, path: `/principal/${campus}/ccl-work` },
    { id: 'branches', label: 'Branch Management', icon: <FaDiagramProject />, path: `/principal/${campus}/branches` },
    
    
    
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
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
      <div className={`fixed top-0 left-0 h-full bg-secondary text-white w-64 transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-8 text-primary">
            {campus ? campus.charAt(0).toUpperCase() + campus.slice(1) : 'Principal'} Dashboard
          </h2>
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
          <button
            onClick={handleLogout}
            className="w-full mt-8 p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default PrincipalSidebar; 