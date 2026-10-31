const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authMiddleware(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.af_token) {
    token = req.cookies.af_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in.',
      }
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Your session is invalid or expired. Please log in again.',
      }
    });
  }
}

function optionalAuth(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.af_token) {
    token = req.cookies.af_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (e) {
      // Ignore invalid token in optionalAuth
    }
  }
  next();
}

module.exports = {
  authMiddleware,
  optionalAuth,
};
