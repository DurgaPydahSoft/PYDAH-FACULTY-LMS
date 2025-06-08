import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReactTyped } from "react-typed";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import 'animate.css';
import Footer from './Footer';

// Import your images here (replace with your actual imports)
import PIC from './images/PYDAH LOGO.png';
import Durga_Prasad from './images/PIC_DP.jpg';
import Ravi from './images/ravi_IMAGE.jpg';
import PullToRefresh from "./PullToRefresh";

const LandingPage = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const employeeId = searchParams.get('employeeId');
    const password = searchParams.get('password');

    if (employeeId && password) {
      console.log("URL parameters found, redirecting to login");
      navigate(`/login?employeeId=${employeeId}&password=${password}`);
    }

    // Handle scroll effect for header
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navigate]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavClick = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 4000,
    adaptiveHeight: true,
    dotsClass: "slick-dots custom-dots",
    responsive: [
      {
        breakpoint: 768,
        settings: {
          dots: true,
          arrows: false,
          adaptiveHeight: true
        }
      }
    ]
  };

  const handleRefresh = () => {
    console.log("Refreshing data...");
  };

  return (
    <div className="min-h-[100dvh] min-h-screen bg-white overflow-x-hidden">
      <PullToRefresh onRefresh={handleRefresh} />
      {/* Header with mobile menu */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-primary/20' 
          : 'bg-white'
      }`}>
        <div className="container mx-auto px-2 sm:px-4 py-2 md:py-4 flex items-center justify-between">
          {/* Logo and Info Bar Section for mobile */}
          <div className="flex flex-col xs:flex-row xs:items-center space-y-1 xs:space-y-0 xs:space-x-2 sm:space-x-3 animate__animated animate__fadeInLeft w-full">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <img 
                  src={PIC}
                  alt="Pydah Logo" 
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-24 md:h-16 rounded-xl object-contain bg-white p-1"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full animate-pulse"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-primary leading-tight">
                  Pydah Group Institutions
                </h1>
                <p className="text-xs md:text-sm text-accent font-medium">Engineering Excellence</p>
              </div>
            </div>
            {/* Info Bar always visible on mobile, hidden on sm+
            <div className="block sm:hidden ml-0 xs:ml-2">
              <p className="text-xs text-primary font-semibold">Autonomous Institution | Kakinada, AP</p>
            </div> */}
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus:outline-none"
          >
            <svg 
              className="w-6 h-6 text-primary" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <button onClick={() => handleNavClick('about')} className="text-primary hover:text-accent transition-colors font-medium bg-transparent border-none outline-none cursor-pointer">About</button>
            <button onClick={() => handleNavClick('features')} className="text-primary hover:text-accent transition-colors font-medium bg-transparent border-none outline-none cursor-pointer">Features</button>
            <button onClick={() => handleNavClick('team')} className="text-primary hover:text-accent transition-colors font-medium bg-transparent border-none outline-none cursor-pointer">Team</button>
            <button onClick={() => handleNavClick('contact')} className="text-primary hover:text-accent transition-colors font-medium bg-transparent border-none outline-none cursor-pointer">Contact</button>
          </nav>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`md:hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden bg-white border-t border-gray-100`}>
          <nav className="container mx-auto px-4 py-3 flex flex-col space-y-3">
            <button 
              className="text-primary hover:text-accent transition-colors font-medium py-2 text-left bg-transparent border-none outline-none cursor-pointer"
              onClick={() => handleNavClick('about')}
            >
              About
            </button>
            <button 
              className="text-primary hover:text-accent transition-colors font-medium py-2 text-left bg-transparent border-none outline-none cursor-pointer"
              onClick={() => handleNavClick('features')}
            >
              Features
            </button>
            <button 
              className="text-primary hover:text-accent transition-colors font-medium py-2 text-left bg-transparent border-none outline-none cursor-pointer"
              onClick={() => handleNavClick('team')}
            >
              Team
            </button>
            <button 
              className="text-primary hover:text-accent transition-colors font-medium py-2 text-left bg-transparent border-none outline-none cursor-pointer"
              onClick={() => handleNavClick('contact')}
            >
              Contact
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen min-w-screen flex items-center justify-center pt-16 sm:pt-24 px-2 sm:px-4 bg-primary/20">
        <div className="container  grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-center relative z-20 w-full ">
          {/* Hero Content */}
          <div className="text-center lg:text-left animate__animated animate__fadeInUp px-2 sm:px-0 w-full">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-accent/20 text-accent font-medium text-sm mb-6">
              <span className="w-2 h-2 bg-accent rounded-full mr-2 animate-pulse"></span>
              Now Live - Leave Management System
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 sm:mb-6">
              <span className="bg-gradient-to-b from-primary to-primary/80 bg-clip-text text-transparent">
                <ReactTyped
                  strings={[
                    "Smart Leave Management",
                    "Seamless Staff Portal",
                    "Digital Leave Tracking",
                    "A Pydah Soft Product"
                  ]}
                  typeSpeed={60}
                  backSpeed={40}
                  loop
                />
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-700 mb-6 sm:mb-8 max-w-2xl mx-auto lg:mx-0">
              Transform your leave management experience with our intuitive, 
              modern platform designed for Pydah College faculty and staff.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={() => navigate("/home")}
                className="group relative px-4 sm:px-6 py-3 bg-primary text-white font-semibold rounded-xl 
                         shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  Get Started
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button className="px-4 sm:px-6 py-3 border-2 border-primary text-primary font-semibold rounded-xl
                               hover:bg-primary hover:text-white transition-all duration-300">
                Learn More
              </button>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary">500+</div>
                <div className="text-xs sm:text-sm text-gray-600">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary">99%</div>
                <div className="text-xs sm:text-sm text-gray-600">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary">24/7</div>
                <div className="text-xs sm:text-sm text-gray-600">Support</div>
              </div>
            </div>
          </div>
          {/* Hero Visual */}
          <div className="relative animate__animated animate__fadeInRight mt-8 lg:mt-0 px-2 sm:px-0 w-full">
            <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-gray-100 w-full">
              <Slider {...sliderSettings}>
                <div className="relative h-48 sm:h-48 md:h-80 lg:h-80">
                  <img
                    src="https://static.wixstatic.com/media/bfee2e_a361f3557fc440c98d1d2edf8c1f0d1f~mv2.jpg/v1/fill/w_1891,h_783,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/bfee2e_a361f3557fc440c98d1d2edf8c1f0d1f~mv2.jpg"
                    alt="College Campus"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
                <div className="relative h-48 sm:h-48 md:h-80 lg:h-80">
                  <img
                    src="https://www.vidyavision.com/CollegeUploads/Photos/2019-30-3-15-05-13_Screenshot%20(160).png"
                    alt="College Campus"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              </Slider>
            </div>
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-12 h-12 sm:w-16 sm:h-16 bg-accent/20 rounded-full animate-bounce"></div>
            <div className="absolute -bottom-4 -left-4 w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-full animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 sm:py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-3 sm:mb-4">About Pydah College</h2>
            <div className="w-16 sm:w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mb-4 sm:mb-6"></div>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Leading the way in engineering education since 2009
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div className="relative order-last lg:order-first">
              <div className="relative bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl sm:rounded-3xl p-3 sm:p-6">
                <img
                  src={PIC}
                  alt="Pydah College"
                  className="w-full h-auto rounded-xl sm:rounded-2xl shadow-lg"
                />
              </div>
              <div className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-lg">
                <div className="text-lg sm:text-xl font-bold text-primary">15+</div>
                <div className="text-xs sm:text-sm text-gray-600">Years of Excellence</div>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h4M9 7h6m-6 4h6m-6 4h6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-primary mb-1">Autonomous Institution</h3>
                  <p className="text-sm sm:text-base text-gray-600">NAAC Grade A accredited institution with autonomous status, ensuring quality education.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-primary mb-1">Prime Location</h3>
                  <p className="text-sm sm:text-base text-gray-600">40-acre campus in Kakinada, Andhra Pradesh with world-class infrastructure.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-primary mb-1">Expert Faculty</h3>
                  <p className="text-sm sm:text-base text-gray-600">Distinguished faculty from premier institutes like IITs, ensuring top-quality education.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 px-4 bg-gradient-to-br from-secondary to-lightBeige">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-3 sm:mb-4">System Features</h2>
            <div className="w-16 sm:w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mb-4 sm:mb-6"></div>
            <p className="text-base sm:text-lg text-gray-600">Powerful tools for seamless leave management</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-primary mb-2 sm:mb-3">Easy Leave Requests</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Submit leave applications effortlessly with our intuitive interface. Track status in real-time.</p>
            </div>

            <div className="group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-primary mb-2 sm:mb-3">Quick Approvals</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Managers can review and approve requests instantly with automated notifications and reminders.</p>
            </div>

            <div className="group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-primary mb-2 sm:mb-3">Admin Dashboard</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Comprehensive analytics and reporting tools for efficient leave record management and insights.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-12 sm:py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-3 sm:mb-4">Meet Our Developers</h2>
            <div className="w-16 sm:w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mb-4 sm:mb-6"></div>
            <p className="text-base sm:text-lg text-gray-600">The talented minds behind this innovative system</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {/* Developer - Ravi */}
            <div className="group bg-gradient-to-br from-secondary to-lightBeige rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <img
                    src={Ravi}
                    alt="Ravi"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-lg sm:text-xl font-bold text-primary mb-1">Ravi Buraga</h3>
                <p className="text-accent font-semibold mb-2 sm:mb-3">Full Stack Developer</p>
                
                <div className="bg-white/50 rounded-lg sm:rounded-xl p-2 sm:p-3 mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    Expert in <span className="font-semibold text-primary">MERN Stack & REST APIs</span>. 
                    Specializes in seamless frontend-backend integration and database optimization.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mb-3 sm:mb-4">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">React</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">Node.js</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">MongoDB</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">REST API</span>
                </div>

                <a
                  href="https://www.linkedin.com/in/ravi-buraga-54b0bb280/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 sm:px-4 py-2 bg-primary text-white font-semibold rounded-lg
                           hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 text-sm"
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn Profile
                </a>
              </div>
            </div>

            {/* Developer - Durga Prasad */}
            <div className="group bg-gradient-to-br from-secondary to-lightBeige rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <img
                    src={Durga_Prasad}
                    alt="Durga Prasad"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-lg sm:text-xl font-bold text-primary mb-1">Durga Prasad</h3>
                <p className="text-accent font-semibold mb-2 sm:mb-3">Full Stack Developer</p>
                
                <div className="bg-white/50 rounded-lg sm:rounded-xl p-2 sm:p-3 mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    Skilled in <span className="font-semibold text-primary">React, Node.js & MongoDB</span>. 
                    Passionate about responsive web applications and clean UI/UX design.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mb-3 sm:mb-4">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">React</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">UI/UX</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">MongoDB</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">Responsive</span>
                </div>

                <a
                  href="https://www.linkedin.com/in/durga-prasad-kakileti-bannu/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 sm:px-4 py-2 bg-primary text-white font-semibold rounded-lg
                           hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 text-sm"
                >
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn Profile
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;