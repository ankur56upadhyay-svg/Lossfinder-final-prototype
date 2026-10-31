const analyticsService = require('../services/analyticsService');

const analyticsController = {
  async getSummary(req, res, next) {
    try {
      const userId = req.user.userId;
      const summary = await analyticsService.getSummary(userId);
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  },

  async getMonthly(req, res, next) {
    try {
      const userId = req.user.userId;
      const monthly = await analyticsService.getMonthlyBreakdown(userId);
      res.status(200).json({ monthly });
    } catch (err) {
      next(err);
    }
  },

  async getCategories(req, res, next) {
    try {
      const userId = req.user.userId;
      const data = await analyticsService.getCategories(userId);
      const mechanisms = await analyticsService.getMechanisms(userId);
      res.status(200).json({
        ...data,
        mechanisms
      });
    } catch (err) {
      next(err);
    }
  },

  async getSavings(req, res, next) {
    try {
      const userId = req.user.userId;
      const savings = await analyticsService.getSavings(userId);
      res.status(200).json(savings);
    } catch (err) {
      next(err);
    }
  },

  async getUpcoming(req, res, next) {
    try {
      const userId = req.user.userId;
      const upcoming = await analyticsService.getUpcoming(userId);
      res.status(200).json({ upcoming });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = analyticsController;
