const express = require('express');
const transactionController = require('../controllers/transactionController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', transactionController.listTransactions);
router.get('/:transactionId', transactionController.getTransaction);
router.delete('/:transactionId', transactionController.deleteTransaction);

module.exports = router;
