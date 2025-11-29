require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
// const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const hodRoutes = require("./routes/hodRoutes"); // Import HOD routes
const superAdminRoutes = require("./routes/superAdminRoutes"); // Import Super Admin routes
const principalRoutes = require("./routes/principalRoutes"); // Import Principal routes
const hrRoutes = require("./routes/hrRoutes");
const cclRoutes = require("./routes/cclRoutes"); // Import CCL routes
const designationRoutes = require("./routes/designationRoutes"); // Import Designation routes
const path = require("path");

const cors = require("cors");

// Connect to database (non-blocking - don't wait for it to start server)
connectDB().catch(err => {
  console.error('Database connection failed:', err);
  // Don't exit - let server start anyway, it will retry on first request
  // On Render, we want the server to start even if DB is temporarily unavailable
});

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://pydah-faculty-lms.vercel.app',
      'https://pydah-faculty-lms-*.vercel.app', // Pattern for preview deployments
      'http://localhost:3000',
      'http://localhost:5000'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Normalize origin (remove trailing slash)
    const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '').toLowerCase();
      
      // Exact match
      if (normalizedOrigin === normalizedAllowed) {
        return true;
      }
      
      // Pattern match for vercel preview deployments
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*').toLowerCase();
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(normalizedOrigin);
      }
      
      // Contains check (fallback)
      return normalizedOrigin.includes(normalizedAllowed) || normalizedAllowed.includes(normalizedOrigin);
    });
    
    // Always allow vercel.app domains
    if (normalizedOrigin.includes('vercel.app')) {
      console.log('Allowing vercel.app domain:', origin);
      return callback(null, true);
    }
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked request from:', origin);
      console.log('Normalized origin:', normalizedOrigin);
      console.log('Allowed origins:', allowedOrigins);
      // For development, allow it
      if (process.env.NODE_ENV === 'development') {
        console.log('Allowing origin due to development mode');
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-auth-token',
    'Origin',
    'Accept',
    'X-Requested-With',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware first (before other middleware)
app.use(cors(corsOptions));

// Handle preflight OPTIONS requests explicitly
app.options('*', cors(corsOptions));

// Add CORS debugging middleware (after CORS)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS' || (req.path.includes('/api/') && req.headers.origin)) {
    console.log('CORS Debug:', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      'access-control-request-method': req.headers['access-control-request-method']
    });
  }
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// app.use("/api/auth", authRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/principal", principalRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/ccl", cclRoutes); // CCL routes
app.use("/api/hr/designations", designationRoutes); // Designation routes

// Debug route to check if server is running
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: "ok", 
    timestamp: new Date(),
    database: dbStatus,
    uptime: process.uptime()
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "index.html"));
});


// Error handling middleware (must be after CORS to ensure headers are set)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  
  // Ensure CORS headers are set even on errors
  const origin = req.headers.origin;
  if (origin) {
    const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
    const allowedOrigins = [
      'https://pydah-faculty-lms.vercel.app',
      'http://localhost:3000',
      'http://localhost:5000'
    ];
    
    const isAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '').toLowerCase();
      return normalizedOrigin === normalizedAllowed || normalizedOrigin.includes('vercel.app');
    });
    
    if (isAllowed || process.env.NODE_ENV === 'development' || normalizedOrigin.includes('vercel.app')) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ 
      msg: 'CORS policy blocked this request',
      error: err.message
    });
  }
  
  // Handle multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      msg: 'File too large',
      error: err.message
    });
  }
  
  // Handle other errors
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({ 
    msg: err.message || 'Something broke!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Enjoyy Coding! 🎉');
});
