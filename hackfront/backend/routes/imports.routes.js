const express = require('express');
const rateLimit = require('express-rate-limit');
const importController = require('../controllers/importController');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { importBatchSchema, updateAnalysisSchema } = require('../validators/importValidators');

const router = express.Router();

const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: req => req.user.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many imports. Please try again after 15 minutes.'
    }
  }
});

router.use(authMiddleware);

router.post('/', importLimiter, validate(importBatchSchema), importController.createImport);
router.get('/', importController.listImports);
router.get('/:importId', importController.getImport);
router.get('/:importId/analysis', importController.getImportAnalysis);
router.patch('/:importId/analysis/:merchantKey', validate(updateAnalysisSchema), importController.updateImportAnalysis);
router.delete('/:importId', importController.deleteImport);

module.exports = router;
