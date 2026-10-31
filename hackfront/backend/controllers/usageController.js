const crypto = require('crypto');
const usageRepository = require('../repositories/usageRepository');
const subscriptionDetectionService = require('../services/subscriptionDetectionService');

const usageController = {
  async listUsage(req, res, next) {
    try {
      const userId = req.user.userId;
      const { merchantKey } = req.query;
      const events = await usageRepository.getUsageEventsByUser(userId, merchantKey);

      res.status(200).json({
        usageEvents: events
      });
    } catch (err) {
      next(err);
    }
  },

  async createUsage(req, res, next) {
    try {
      const userId = req.user.userId;
      const { merchantKey, eventDate, eventType, notes } = req.body;
      const usageEventId = 'use_' + crypto.randomBytes(8).toString('hex');

      const event = await usageRepository.createUsageEvent(userId, {
        usageEventId,
        merchantKey,
        eventDate,
        eventType,
        notes
      });

      // Re-run subscription detection so usage status updates
      try {
        await subscriptionDetectionService.analyzeForUser(userId);
      } catch (e) {}

      res.status(201).json({
        message: 'Usage event recorded.',
        usageEvent: event
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteUsage(req, res, next) {
    try {
      const userId = req.user.userId;
      const { usageEventId } = req.params;
      const deleted = await usageRepository.deleteUsageEvent(userId, usageEventId);

      if (!deleted) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Usage event not found.'
          }
        });
      }

      // Re-run subscription detection
      try {
        await subscriptionDetectionService.analyzeForUser(userId);
      } catch (e) {}

      res.status(200).json({
        message: 'Usage event deleted.'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = usageController;
