const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');

const app = express();
const configuredOrigins = (env.frontendUrl || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/$/, '');
  if (configuredOrigins.includes(normalizedOrigin)) return true;

  if (env.nodeEnv === 'development') {
    try {
      const parsed = new URL(origin);
      const hostname = parsed.hostname;
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '[::1]' ||
        /^192\.168\.\d+\.\d+$/.test(hostname) ||
        /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
};

if (!env.jwtSecret || env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
}

if (env.trustProxy) {
  app.set('trust proxy', 1);
}

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const itemRoutes = require('./routes/items');
const claimRoutes = require('./routes/claims');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const locationRoutes = require('./routes/locations');
const categoryRoutes = require('./routes/categories');
const mediaRoutes = require('./routes/media');
const flagRoutes = require('./routes/flags');
const reviewRoutes = require('./routes/reviews');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' }
}));
app.use(cors({
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'development' ? 1000 : env.apiRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb', parameterLimit: 100 }));

if (env.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}
app.use(compression());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', authenticateToken, claimRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/flags', authenticateToken, flagRoutes);
app.use('/api/reviews', reviewRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

module.exports = app;
