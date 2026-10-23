const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { getAccessToken } = require('../utils/session');

const authenticateToken = async (req, res, next) => {
  const token = getAccessToken(req);

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists, is active, confirmed, and not blacklisted
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.is_active, u.is_blacklisted, u.blacklist_reason, u.auth_version,
              a.email_confirmed_at, a.confirmed_at, a.banned_until
       FROM public.users u
       LEFT JOIN auth.users a ON a.id = u.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = userResult.rows[0];

    if (!user.email_confirmed_at && !user.confirmed_at) {
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        message: 'Your email address has not been confirmed yet. Please verify your email before accessing protected resources.'
      });
    }
    
    if (user.is_blacklisted) {
      return res.status(403).json({
        success: false,
        message: `Account is blacklisted: ${user.blacklist_reason || 'Violated community rules'}`
      });
    }

    if (!user.is_active || decoded.authVersion !== user.auth_version) {
      return res.status(401).json({ 
        success: false, 
        message: 'Session is no longer valid' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  const token = getAccessToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userResult = await pool.query(
      'SELECT id, email, name, role, is_active, is_blacklisted, auth_version FROM public.users WHERE id = $1',
      [decoded.userId]
    );

    if (
      userResult.rows.length > 0 &&
      userResult.rows[0].is_active &&
      !userResult.rows[0].is_blacklisted &&
      decoded.authVersion === userResult.rows[0].auth_version
    ) {
      req.user = userResult.rows[0];
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth
};
