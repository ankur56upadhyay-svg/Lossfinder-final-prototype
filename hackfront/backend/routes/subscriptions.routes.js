const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { updateSubscriptionSchema } = require('../validators/subscriptionValidators');

const router = express.Router();

router.use(authMiddleware);

router.get('/', subscriptionController.listSubscriptions);
router.get('/:subscriptionId', subscriptionController.getSubscription);
router.patch('/:subscriptionId', validate(updateSubscriptionSchema), subscriptionController.updateSubscription);
router.post('/reanalyze', subscriptionController.reanalyze);

module.exports = router;
