import axios from 'axios';
import config from '../config';

const API_BASE_URL = config.API_BASE_URL;

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  // Add these options to handle CORS and credentials
  withCredentials: true,
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Accept all status codes less than 500
  }
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add it to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request details in development
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers,
      baseURL: config.baseURL,
      timeout: config.timeout
    });
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Log response details in development
    console.log('API Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    if (error.code === 'ERR_NETWORK') {
      console.error('Network Error - Check if backend is running:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method
      });
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request Timeout:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout,
        method: error.config?.method
      });
    } else if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Response Error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No Response Error:', {
        request: error.request,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request Setup Error:', {
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 