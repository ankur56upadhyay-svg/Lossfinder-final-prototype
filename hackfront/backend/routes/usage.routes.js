const express = require('express');
const usageController = require('../controllers/usageController');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createUsageSchema } = require('../validators/usageValidators');

const router = express.Router();

router.use(authMiddleware);

router.get('/', usageController.listUsage);
router.post('/', validate(createUsageSchema), usageController.createUsage);
router.delete('/:usageEventId', usageController.deleteUsage);

module.exports = router;
