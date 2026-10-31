const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const importsRoutes = require('./routes/imports.routes');
const transactionsRoutes = require('./routes/transactions.routes');
const subscriptionsRoutes = require('./routes/subscriptions.routes');
const usageRoutes = require('./routes/usage.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const healthRoutes = require('./routes/health.routes');

const app = express();

// Security headers with relaxed contentSecurityPolicy for CDN tailwind & fonts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", env.FRONTEND_ORIGIN, "http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:3000"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const allowedOrigins = [
  env.FRONTEND_ORIGIN,
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin static file requests)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files from project root
const frontendPath = path.resolve(__dirname, '..');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/imports', importsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/analytics', analyticsRoutes);

// Fallback for API 404s
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return notFoundHandler(req, res);
  }
  next();
});

// Central error handler
app.use(errorHandler);

module.exports = app;
