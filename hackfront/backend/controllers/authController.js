const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const env = require('../config/env');
const logger = require('../utils/logger');

function issueToken(user) {
  return jwt.sign(
    { userId: user.userId, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setAuthCookie(res, token) {
  res.cookie('af_token', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

const authController = {
  async register(req, res, next) {
    try {
      const { email, password } = req.body;

      const existing = await userRepository.findByEmail(email);
      if (existing) {
        return res.status(409).json({
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists. Please log in.'
          }
        });
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
      const createdAt = new Date().toISOString();

      const user = await userRepository.createUser({
        userId,
        email,
        passwordHash,
        createdAt
      });

      const token = issueToken(user);
      setAuthCookie(res, token);

      logger.info('User registered successfully', { userId });

      res.status(201).json({
        user: {
          userId: user.userId,
          email: user.email,
          createdAt: user.createdAt
        },
        token
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await userRepository.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.'
          }
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.'
          }
        });
      }

      const token = issueToken(user);
      setAuthCookie(res, token);

      logger.info('User logged in successfully', { userId: user.userId });

      res.status(200).json({
        user: {
          userId: user.userId,
          email: user.email,
          createdAt: user.createdAt
        },
        token
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res) {
    res.clearCookie('af_token', {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax'
    });
    res.status(200).json({
      message: 'Logged out successfully.'
    });
  },

  async me(req, res, next) {
    try {
      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found.'
          }
        });
      }

      res.status(200).json({
        user: {
          userId: user.userId,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteUserData(req, res, next) {
    try {
      const userId = req.user.userId;
      await userRepository.deleteUserData(userId);

      res.clearCookie('af_token', {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax'
      });

      res.status(200).json({
        message: 'All your financial and account data has been permanently deleted.'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
