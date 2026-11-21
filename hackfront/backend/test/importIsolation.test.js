const { test } = require('node:test');
const assert = require('node:assert/strict');

const importService = require('../services/importService');
const importRepository = require('../repositories/importRepository');
const transactionRepository = require('../repositories/transactionRepository');
const subscriptionDetectionService = require('../services/subscriptionDetectionService');

test('reuploading a statement creates a separate import and analysis', async () => {
  const originals = {
    create: importRepository.createImportBatch,
    save: importRepository.saveAnalysisSnapshot,
    transactions: transactionRepository.saveTransactionsBatch,
    detect: subscriptionDetectionService.analyzeForUser
  };
  const batches = [];
  const saved = [];
  const analyzed = [];
  importRepository.createImportBatch = async (userId, batch) => {
    batches.push({ userId, ...batch });
    return batch;
  };
  importRepository.saveAnalysisSnapshot = async (userId, importId, subs) => {
    saved.push({ userId, importId, subs });
    return true;
  };
  transactionRepository.saveTransactionsBatch = async (userId, importId, rows) => rows.length;
  subscriptionDetectionService.analyzeForUser = async (userId, options) => {
    analyzed.push({ userId, ...options });
    return [{ merchantKey: 'netflix', name: 'Netflix' }];
  };

  const transaction = {
    transactionDate: '2026-10-15',
    description: 'NETFLIX AUTOPAY',
    amount: 649,
    direction: 'debit',
    status: 'DEBIT',
    ref: 'bank-reference-1'
  };

  try {
    const first = await importService.processImport('usr_one', {
      bankName: 'Bank A', fileNames: ['first.csv'], transactions: [transaction, transaction]
    });
    const second = await importService.processImport('usr_one', {
      bankName: 'Bank A', fileNames: ['second.csv'], transactions: [transaction]
    });
    assert.notEqual(first.importId, second.importId);
    assert.equal(first.acceptedCount, 1);
    assert.equal(first.duplicateCount, 1);
    assert.equal(second.acceptedCount, 1);
    assert.deepEqual(batches.map(batch => batch.fileNames), [['first.csv'], ['second.csv']]);
    assert.deepEqual(analyzed.map(item => [item.importId, item.persist]), [
      [first.importId, false], [second.importId, false]
    ]);
    assert.deepEqual(saved.map(item => item.importId), [first.importId, second.importId]);
    assert.deepEqual(saved[0].subs.map(sub => sub.id), ['netflix']);
  } finally {
    importRepository.createImportBatch = originals.create;
    importRepository.saveAnalysisSnapshot = originals.save;
    transactionRepository.saveTransactionsBatch = originals.transactions;
    subscriptionDetectionService.analyzeForUser = originals.detect;
  }
});
