const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/summary', analyticsController.getSummary);
router.get('/monthly', analyticsController.getMonthly);
router.get('/categories', analyticsController.getCategories);
router.get('/savings', analyticsController.getSavings);
router.get('/upcoming', analyticsController.getUpcoming);

module.exports = router;
