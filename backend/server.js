require('dotenv').config();
const express = require("express");
const connectDB = require("./config/db");
// const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const hodRoutes = require("./routes/hodRoutes"); // Import HOD routes
const superAdminRoutes = require("./routes/superAdminRoutes"); // Import Super Admin routes
const principalRoutes = require("./routes/principalRoutes"); // Import Principal routes
const hrRoutes = require("./routes/hrRoutes");
const cclRoutes = require("./routes/cclRoutes"); // Import CCL routes
const path = require("path");

const cors = require("cors");

connectDB();

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
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked request from:', origin);
      console.log('Normalized origin:', normalizedOrigin);
      console.log('Allowed origins:', allowedOrigins);
      // For development or if origin contains vercel, allow it
      if (process.env.NODE_ENV === 'development' || normalizedOrigin.includes('vercel.app')) {
        console.log('Allowing origin due to development mode or vercel domain');
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

// Debug route to check if server is running
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "index.html"));
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  res.status(500).json({ 
    msg: 'Something broke!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Enjoyy Coding! 🎉');
});
