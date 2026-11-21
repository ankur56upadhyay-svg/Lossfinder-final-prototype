const express = require('express');
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

// Render terminates HTTPS at its proxy. Trust only the immediate proxy hop.
if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = new Set(env.NODE_ENV === 'production'
  ? [env.FRONTEND_ORIGIN]
  : [env.FRONTEND_ORIGIN, 'http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:3000']);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    const error = new Error('Request origin not allowed.');
    error.status = 403;
    error.code = 'ORIGIN_FORBIDDEN';
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Browsers send Origin on writes. Referer is a fallback for clients that omit it.
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  let origin = req.get('origin');
  if (!origin) {
    const referer = req.get('referer');
    try {
      origin = referer ? new URL(referer).origin : null;
    } catch (_) {
      origin = null;
    }
  }

  if (origin && allowedOrigins.has(origin)) return next();
  return res.status(403).json({
    error: {
      code: 'ORIGIN_FORBIDDEN',
      message: 'Request origin not allowed.'
    }
  });
});

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
