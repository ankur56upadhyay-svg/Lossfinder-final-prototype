const importService = require('../services/importService');
const importRepository = require('../repositories/importRepository');

const importController = {
  async createImport(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await importService.processImport(userId, req.body);
      res.status(201).json({
        message: 'Import processed successfully.',
        import: result
      });
    } catch (err) {
      next(err);
    }
  },

  async listImports(req, res, next) {
    try {
      const userId = req.user.userId;
      const imports = await importRepository.getImportsByUser(userId);
      res.status(200).json({
        imports
      });
    } catch (err) {
      next(err);
    }
  },

  async getImport(req, res, next) {
    try {
      const userId = req.user.userId;
      const { importId } = req.params;
      const item = await importRepository.getImportById(userId, importId);

      if (!item) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Import batch not found.'
          }
        });
      }

      res.status(200).json({
        import: item
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteImport(req, res, next) {
    try {
      const userId = req.user.userId;
      const { importId } = req.params;
      const deleted = await importRepository.deleteImport(userId, importId);

      if (!deleted) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Import batch not found.'
          }
        });
      }

      res.status(200).json({
        message: 'Import batch and associated transactions deleted.'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = importController;
