const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notifications');
const messagesRoutes = require('./routes/messages');

const app = express();

const path = require('path');

// Security middleware with proper CORS configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // Allow the custom header `X-Skip-Auth-Redirect` used by the frontend
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Skip-Auth-Redirect', 'X-Requested-With'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure CORS preflight requests are answered early
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Skip-Auth-Redirect, X-Requested-With');
  res.sendStatus(204);
});

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connexion à MongoDB réussie'))
.catch(err => {
  console.error('❌ Erreur de connexion à MongoDB:', err);
  process.exit(1);
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// API Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messagesRoutes);

// Serve uploaded files statically (local fallback for images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Handle 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route non trouvée' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Une erreur est survenue sur le serveur'
  });
});
// ...routes already registered above

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'BarryLand API est opérationnelle',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur BarryLand démarré sur le port ${PORT}`);
  console.log(`📍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API disponible sur: http://localhost:${PORT}/api`);
});

module.exports = app;