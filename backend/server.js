require('dotenv').config();
const express = require("express");
const connectDB = require("./config/db");
// const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const hodRoutes = require("./routes/hodRoutes"); // Import HOD routes
const superAdminRoutes = require("./routes/superAdminRoutes"); // Import Super Admin routes
const principalRoutes = require("./routes/principalRoutes"); // Import Principal routes
const hrRoutes = require("./routes/hrRoutes");
const path = require("path");

const cors = require("cors");

connectDB();

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://pydah-faculty-lms.vercel.app',
      'http://localhost:3000',
      'http://localhost:5000'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked request from:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-auth-token',
    'Origin',
    'Accept',
    'X-Requested-With'
  ],
  exposedHeaders: ['Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// // Add CORS debugging middleware
// app.use((req, res, next) => {
//   console.log('CORS Debug:', {
//     origin: req.headers.origin,
//     method: req.method,
//     path: req.path,
//     headers: req.headers
//   });
//   next();
// });

app.use(cors(corsOptions));
app.use(express.json());

// Routes
// app.use("/api/auth", authRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/principal", principalRoutes);
app.use("/api/hr", hrRoutes);

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
