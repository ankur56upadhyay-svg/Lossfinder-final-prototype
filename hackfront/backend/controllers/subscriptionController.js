const subscriptionRepository = require('../repositories/subscriptionRepository');
const subscriptionDetectionService = require('../services/subscriptionDetectionService');

const subscriptionController = {
  async listSubscriptions(req, res, next) {
    try {
      const userId = req.user.userId;
      const subs = await subscriptionRepository.getSubscriptionsByUser(userId);

      res.status(200).json({
        bank: 'Your bank',
        isDemo: false,
        subs: subs
      });
    } catch (err) {
      next(err);
    }
  },

  async getSubscription(req, res, next) {
    try {
      const userId = req.user.userId;
      const { subscriptionId } = req.params;
      const sub = await subscriptionRepository.getSubscriptionById(userId, subscriptionId);

      if (!sub) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Subscription not found.'
          }
        });
      }

      res.status(200).json({
        subscription: sub
      });
    } catch (err) {
      next(err);
    }
  },

  async updateSubscription(req, res, next) {
    try {
      const userId = req.user.userId;
      const { subscriptionId } = req.params;
      const { status, notes } = req.body;

      const updated = await subscriptionRepository.updateSubscriptionStatus(
        userId,
        subscriptionId,
        status,
        notes
      );

      if (!updated) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Subscription not found.'
          }
        });
      }

      res.status(200).json({
        message: 'Subscription status updated.',
        subscription: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async reanalyze(req, res, next) {
    try {
      const userId = req.user.userId;
      const subs = await subscriptionDetectionService.analyzeForUser(userId);
      res.status(200).json({
        message: 'Re-analysis complete.',
        count: subs.length,
        subs: subs
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = subscriptionController;
