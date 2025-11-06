import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReactTyped } from "react-typed";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import 'animate.css';
import Footer from './Footer';
import { CircleBackground } from './CircleBackground';


// Import your images here (replace with your actual imports)
import PIC from './images/PYDAH LOGO.png';
import Durga_Prasad from './images/PIC_DP.jpg';
import Ravi from './images/ravi_IMAGE.jpg';
import PullToRefresh from "./PullToRefresh";

const LandingPage = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

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

    // Check if PWA is already installed
    const checkIfInstalled = () => {
      // Check if running in standalone mode (installed PWA)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('✅ App is already installed (standalone mode)');
        return true;
      }
      // Check iOS standalone mode
      if (window.navigator.standalone === true) {
        console.log('✅ App is already installed (iOS Safari)');
        return true;
      }
      // Check if launched from home screen
      if (window.matchMedia('(display-mode: fullscreen)').matches || 
          window.matchMedia('(display-mode: minimal-ui)').matches) {
        console.log('✅ App is already installed (fullscreen/minimal-ui)');
        return true;
      }
      return false;
    };

    // Check if already installed
    if (checkIfInstalled()) {
      setIsInstallable(false);
      return;
    }

    // PWA install prompt handling - must be added immediately
    let deferredPromptRef = null;

    const handleBeforeInstallPrompt = (e) => {
      console.log('🎯 beforeinstallprompt event fired');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPromptRef = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('✅ PWA install prompt available');
    };

    const handleAppInstalled = () => {
      console.log('✅ appinstalled event fired - App was installed');
      setIsInstallable(false);
      setDeferredPrompt(null);
      deferredPromptRef = null;
    };

    // Add event listeners immediately (before any async operations)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check PWA requirements
    const checkPWASupport = () => {
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasManifest = document.querySelector('link[rel="manifest"]');
      
      console.log('PWA Support Check:', {
        serviceWorker: hasServiceWorker,
        manifest: !!hasManifest,
        secureContext: window.isSecureContext
      });

      if (!hasServiceWorker) {
        console.warn('⚠️ Service Worker not supported');
      }
      if (!hasManifest) {
        console.warn('⚠️ Manifest not found');
      }
      if (!window.isSecureContext) {
        console.warn('⚠️ Not running in secure context (HTTPS required for PWA)');
      }

      return hasServiceWorker && hasManifest;
    };

    // Wait a bit for service worker to register before checking
    setTimeout(() => {
      if (checkPWASupport()) {
        console.log('✅ PWA requirements met');
      } else {
        console.warn('⚠️ PWA requirements not fully met');
      }
    }, 2000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
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

  const handleInstallClick = async () => {
    console.log('Install button clicked, deferredPrompt:', deferredPrompt);
    console.log('isInstallable:', isInstallable);

    if (!deferredPrompt) {
      console.log('No deferredPrompt available, trying fallback install methods');

      // Check if we're on iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      if (isIOS && isSafari) {
        // iOS Safari
        alert('To install this app:\n1. Tap the share button (📤)\n2. Select "Add to Home Screen"\n3. Tap "Add"');
      } else if (isIOS) {
        // Other iOS browsers
        alert('Please use Safari browser to install this app. In Safari, tap the share button and select "Add to Home Screen".');
      } else {
        // Desktop/other browsers
        alert('PWA installation is not available. Please use Chrome, Edge, or Safari browser for installation.');
      }
      return;
    }

    try {
      console.log('Prompting user for installation...');
      const result = await deferredPrompt.prompt();
      console.log('Prompt result:', result);

      const { outcome } = await deferredPrompt.userChoice;
      console.log('User choice outcome:', outcome);

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsInstallable(false);
        alert('App installed successfully!');
      } else {
        console.log('User dismissed the install prompt');
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install prompt failed:', error);
      alert('Installation failed. Please try again or use a different browser.');
    }
  };

  return (
    <div className="  bg-white ">
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
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="relative">
                <img
                  src={PIC}
                  alt="Pydah Logo"
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-24 md:h-16 rounded-xl object-contain bg-white p-1"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full animate-pulse"></div>
              </div>
              {/* PYDAH text visible only on mobile */}
              <div className="block sm:hidden">
                <h1 className="text-lg font-bold leading-tight">
                  <span className="bg-gradient-to-t from-black/80 to-primary/90 bg-clip-text text-transparent">
                    PYDAH
                  </span>
                </h1>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-lg md:text-xl font-bold leading-tight">
                  <span className="bg-gradient-to-t from-black/80 to-primary/90 bg-clip-text text-transparent">
                    Pydah Group Institutions
                  </span>
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
      <section className="relative min-h-screen min-w-full flex items-center justify-center pt-16 sm:pt-24 pb-16 sm:pb-24 bg-primary/10">
        <CircleBackground className="absolute inset-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 xl:gap-20 items-center relative z-20 max-w-7xl mx-auto">
            {/* Hero Content */}
            <div className="text-center lg:text-left animate__animated animate__fadeInUp w-full">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-accent/20 text-accent font-medium text-sm mb-6">
              <span className="w-2 h-2 bg-accent rounded-full mr-2 animate-pulse"></span>
              Now Live - Leave Management System
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 sm:mb-6">
              <span className="bg-gradient-to-t from-black/80 to-primary/90 bg-clip-text text-transparent">
                <ReactTyped
                  strings={[
                    "Smart Leave Flow",
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
                         shadow-lg hover:shadow-xl hover:bg-green-600 transform hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  Get Started
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              {isInstallable && (
                <button
                  onClick={handleInstallClick}
                  className="group relative px-4 sm:px-6 py-3 bg-green-600 text-white font-semibold rounded-xl
                           shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Download App
                  </span>
                  {/* <div className="absolute inset-0 bg-gradient-to-r from-green-700 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div> */}
                </button>
              )}
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6">
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
            <div className="relative animate__animated animate__fadeInRight mt-8 lg:mt-0 w-full">
            <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-gray-100 w-full">
              <Slider {...sliderSettings}>
                <div className="relative h-48 sm:h-48 md:h-80 lg:h-80">
                  <img
                    src="https://img.freepik.com/premium-photo/group-happy-smiling-business-people-standing-vector-illustration-cartoon-style_941097-22130.jpg"
                    alt="College Campus"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
                <div className="relative h-48 sm:h-48 md:h-80 lg:h-80">
                  <img
                    src="https://media.istockphoto.com/id/1471444483/photo/customer-satisfaction-survey-concept-users-rate-service-experiences-on-online-application.jpg?s=612x612&w=0&k=20&c=HFh1o4JU68KWv7PXgbLdIZT0_qepmgePEkvbsLJr5p0="
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
          </div>
        </CircleBackground>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 sm:py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-3 sm:mb-4 animate__animated animate__fadeInUp animate__delay-1s relative overflow-hidden">
              <span className="relative z-10 shimmer-text">About Pydah College</span>
              <div className="absolute inset-0 shimmer-overlay"></div>
            </h2>
            <div className="w-16 sm:w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mb-4 sm:mb-6 animate__animated animate__fadeIn animate__delay-2s"></div>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto animate__animated animate__fadeInUp animate__delay-3s">
              Leading the way in engineering education since 2009
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div className="relative order-last lg:order-first animate__animated animate__fadeInLeft animate__delay-4s">
              <div className="relative bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl sm:rounded-3xl p-3 sm:p-6 transform hover:scale-105 transition-transform duration-500">
                <img
                  src={PIC}
                  alt="Pydah College"
                  className="w-full h-auto rounded-xl sm:rounded-2xl shadow-lg"
                />
              </div>
              <div className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-lg animate__animated animate__bounceIn animate__delay-5s">
                <div className="text-lg sm:text-xl font-bold text-primary">15+</div>
                <div className="text-xs sm:text-sm text-gray-600">Years of Excellence</div>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start space-x-3 sm:space-x-4 group animate__animated animate__fadeInRight animate__delay-6s">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h4M9 7h6m-6 4h6m-6 4h6" />
                  </svg>
                </div>
                <div className="group-hover:translate-x-2 transition-transform duration-300">
                  <h3 className="text-base sm:text-lg font-semibold text-primary mb-1 group-hover:text-accent transition-colors duration-300">Autonomous Institution</h3>
                  <p className="text-sm sm:text-base text-gray-600 group-hover:text-gray-700 transition-colors duration-300">NAAC Grade A accredited institution with autonomous status, ensuring quality education.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4 group animate__animated animate__fadeInRight animate__delay-7s">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="group-hover:translate-x-2 transition-transform duration-300">
                  <h3 className="text-base sm:text-lg font-semibold text-primary mb-1 group-hover:text-accent transition-colors duration-300">Prime Location</h3>
                  <p className="text-sm sm:text-base text-gray-600 group-hover:text-gray-700 transition-colors duration-300">40-acre campus in Kakinada, Andhra Pradesh with world-class infrastructure.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4 group animate__animated animate__fadeInRight animate__delay-8s">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="group-hover:translate-x-2 transition-transform duration-300">
                  <h3 className="text-base sm:text-lg font-semibold text-primary mb-1 group-hover:text-accent transition-colors duration-300">Expert Faculty</h3>
                  <p className="text-sm sm:text-base text-gray-600 group-hover:text-gray-700 transition-colors duration-300">Distinguished faculty from premier institutes like IITs, ensuring top-quality education.</p>
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
