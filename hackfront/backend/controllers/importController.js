const importService = require('../services/importService');
const importRepository = require('../repositories/importRepository');
const subscriptionDetectionService = require('../services/subscriptionDetectionService');
const subscriptionRepository = require('../repositories/subscriptionRepository');

async function loadAnalysis(userId, importId) {
  const item = await importRepository.getImportById(userId, importId);
  if (!item) return null;

  if (item.analysisJson) {
    try {
      const subscriptions = JSON.parse(item.analysisJson);
      if (Array.isArray(subscriptions)) return { item, subscriptions };
    } catch (_) {
      // Older or incomplete imports can be reconstructed from their own transactions.
    }
  }

  const detected = await subscriptionDetectionService.analyzeForUser(userId, { importId, persist: false });
  // Existing accounts used to store decisions per user. Carry them over only when
  // there is one older import, where their source analysis is unambiguous.
  const imports = await importRepository.getImportsByUser(userId);
  const previous = imports.length === 1
    ? await subscriptionRepository.getSubscriptionsByUser(userId)
    : [];
  const previousByMerchant = new Map(previous.map(sub => [sub.id, sub]));
  const subscriptions = detected.map(sub => ({
    ...sub,
    id: sub.merchantKey,
    reviewDecision: previousByMerchant.get(sub.merchantKey)?.reviewDecision || null,
    cancelled: previousByMerchant.get(sub.merchantKey)?.userOverrideStatus === 'ended'
  }));
  await importRepository.saveAnalysisSnapshot(userId, importId, subscriptions);
  return { item, subscriptions };
}

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

      const { analysisJson, ...importSummary } = item;
      res.status(200).json({ import: importSummary });
    } catch (err) {
      next(err);
    }
  },

  async getImportAnalysis(req, res, next) {
    try {
      const analysis = await loadAnalysis(req.user.userId, req.params.importId);
      if (!analysis) return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Analysis not found.' }
      });
      const { analysisJson, ...importSummary } = analysis.item;
      res.status(200).json({ import: importSummary, subs: analysis.subscriptions });
    } catch (err) {
      next(err);
    }
  },

  async updateImportAnalysis(req, res, next) {
    try {
      const userId = req.user.userId;
      const { importId, merchantKey } = req.params;
      const analysis = await loadAnalysis(userId, importId);
      if (!analysis) return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Analysis not found.' }
      });
      const index = analysis.subscriptions.findIndex(sub => sub.merchantKey === merchantKey);
      if (index < 0) return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Subscription not found in this analysis.' }
      });

      const subscription = {
        ...analysis.subscriptions[index],
        ...(req.body.reviewDecision === undefined ? {} : { reviewDecision: req.body.reviewDecision }),
        ...(req.body.cancelled === undefined ? {} : { cancelled: req.body.cancelled }),
        ...(req.body.classificationDecision === undefined ? {} : { classificationDecision: req.body.classificationDecision })
      };
      const updated = [...analysis.subscriptions];
      updated[index] = subscription;
      if (req.body.classificationDecision !== undefined) {
        await importRepository.setClassificationPreference(userId, merchantKey, req.body.classificationDecision);
      }
      const saved = await importRepository.saveAnalysisSnapshot(userId, importId, updated);
      if (!saved) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analysis not found.' } });
      res.status(200).json({ subscription });
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
