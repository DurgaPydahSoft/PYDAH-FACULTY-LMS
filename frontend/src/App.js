import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import LandingPage from "./components/Home";
import Home from "./components/Home.jsx";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import PrincipalLogin from "./pages/PrincipalLogin";
import PrincipalDashboard from "./pages/PrincipalDashboard";
import EmployeeLogin from "./pages/EmployeeLogin";
import EmployeeRegister from "./pages/EmployeeRegister";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import HodLogin from "./pages/HodLogin";
import HodDashboard from "./pages/HodDashboard";

// Import HR components
import HRLogin from './pages/HR/HRLogin';
import HRDashboard from './pages/HR/HRDashboard';
import RegisterEmployee from './pages/HR/RegisterEmployee';
import ManageEmployees from './pages/HR/ManageEmployees';

// Campus Principal Login Component
const CampusPrincipalLogin = () => {
  const { campus } = useParams();
  return <PrincipalLogin campus={campus} />;
};

// Campus Principal Dashboard Component
const CampusPrincipalDashboard = () => {
  const { campus } = useParams();
  return <PrincipalDashboard />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          {/* <Header /> */}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<Home />} />
            <Route path="/super-admin-login" element={<SuperAdminLogin />} />
            <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
            
            {/* Campus Principal Routes */}
            <Route path="/:campus/principal-login" element={<CampusPrincipalLogin />} />
            <Route path="/:campus/principal-dashboard" element={<CampusPrincipalDashboard />} />

            {/* Employee Routes */}
            <Route path="/employee-login" element={<EmployeeLogin />} />
            <Route path="/employee-register" element={<EmployeeRegister />} />
            <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
            
            {/* HOD Routes */}
            <Route path="/hod-login" element={<HodLogin />} />
            <Route path="/hod-dashboard" element={<HodDashboard />} />

            {/* HR Routes */}
            <Route path="/hr/login" element={<HRLogin />} />
            <Route path="/hr/dashboard" element={<HRDashboard />} />
            <Route path="/hr/register-employee" element={<RegisterEmployee />} />
            <Route path="/hr/manage-employees" element={<ManageEmployees />} />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {/*  <Footer />*/}
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
