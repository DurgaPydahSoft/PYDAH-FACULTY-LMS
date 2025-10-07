import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import LandingPage from "./components/Home";
import Home from "./components/Home.jsx";
import SuperAdminLogin from "./pages/SuperAdmin/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import PrincipalLogin from "./pages/Principal/PrincipalLogin";
import PrincipalDashboard from "./pages/Principal/PrincipalDashboard";
import EmployeeLogin from "./pages/Employee/EmployeeLogin";
// import EmployeeRegister from "./pages/Employee/EmployeeRegister";
import EmployeeDashboard from "./pages/Employee/EmployeeDashboard";
import HodLogin from "./pages/HOD/HodLogin";
import HodDashboard from "./pages/HOD/HodDashboard";

// Import HR components
import HRLogin from './pages/HR/HRLogin';
import HRDashboard from './pages/HR/HRDashboard';

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
            {/* <Route path="/employee-register" element={<EmployeeRegister />} /> */}
            <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
            
            {/* HOD Routes */}
            <Route path="/hod-login" element={<HodLogin />} />
            <Route path="/hod-dashboard" element={<HodDashboard />} />

            {/* HR Routes */}
            <Route path="/hr/login" element={<HRLogin />} />
            <Route path="/hr/dashboard" element={<HRDashboard />} />

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
