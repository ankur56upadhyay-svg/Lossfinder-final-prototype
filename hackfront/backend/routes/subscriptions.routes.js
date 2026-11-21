const express = require('express');
const rateLimit = require('express-rate-limit');
const subscriptionController = require('../controllers/subscriptionController');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { updateSubscriptionSchema } = require('../validators/subscriptionValidators');

const router = express.Router();

const reanalysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: req => req.user.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many analyses. Please try again after 15 minutes.'
    }
  }
});

router.use(authMiddleware);

router.get('/', subscriptionController.listSubscriptions);
router.get('/:subscriptionId', subscriptionController.getSubscription);
router.patch('/:subscriptionId', validate(updateSubscriptionSchema), subscriptionController.updateSubscription);
router.post('/reanalyze', reanalysisLimiter, subscriptionController.reanalyze);

module.exports = router;
