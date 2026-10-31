const express = require('express');
const importController = require('../controllers/importController');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { importBatchSchema } = require('../validators/importValidators');

const router = express.Router();

router.use(authMiddleware);

router.post('/', validate(importBatchSchema), importController.createImport);
router.get('/', importController.listImports);
router.get('/:importId', importController.getImport);
router.delete('/:importId', importController.deleteImport);

module.exports = router;
