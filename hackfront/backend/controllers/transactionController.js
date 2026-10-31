const transactionRepository = require('../repositories/transactionRepository');

const transactionController = {
  async listTransactions(req, res, next) {
    try {
      const userId = req.user.userId;
      const { merchant, direction, from, to, importId, page = 1, limit = 50 } = req.query;

      const filters = {
        merchantKey: merchant,
        direction,
        dateFrom: from,
        dateTo: to,
        importId
      };

      const pagination = {
        page: Math.max(1, parseInt(page, 10) || 1),
        limit: Math.min(200, Math.max(1, parseInt(limit, 10) || 50))
      };

      const result = await transactionRepository.getTransactionsByUser(userId, filters, pagination);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getTransaction(req, res, next) {
    try {
      const userId = req.user.userId;
      const { transactionId } = req.params;
      const item = await transactionRepository.getTransactionById(userId, transactionId);

      if (!item) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Transaction not found.'
          }
        });
      }

      res.status(200).json({
        transaction: item
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteTransaction(req, res, next) {
    try {
      const userId = req.user.userId;
      const { transactionId } = req.params;
      const deleted = await transactionRepository.deleteTransaction(userId, transactionId);

      if (!deleted) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Transaction not found.'
          }
        });
      }

      res.status(200).json({
        message: 'Transaction deleted.'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = transactionController;
