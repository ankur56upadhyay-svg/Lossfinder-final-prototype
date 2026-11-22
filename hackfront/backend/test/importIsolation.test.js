const { test } = require('node:test');
const assert = require('node:assert/strict');

const importService = require('../services/importService');
const importRepository = require('../repositories/importRepository');
const transactionRepository = require('../repositories/transactionRepository');

test('reuploading a statement creates a separate import and analysis', async () => {
  const originals = {
    create: importRepository.createImportBatch,
    save: importRepository.saveAnalysisSnapshot,
    getClassifications: importRepository.getClassificationPreferences,
    transactions: transactionRepository.saveTransactionsBatch
  };
  const batches = [];
  const saved = [];
  const preferences = {};
  importRepository.getClassificationPreferences = async () => preferences;
  importRepository.createImportBatch = async (userId, batch) => {
    batches.push({ userId, ...batch });
    return batch;
  };
  importRepository.saveAnalysisSnapshot = async (userId, importId, subs) => {
    saved.push({ userId, importId, subs });
    return true;
  };
  transactionRepository.saveTransactionsBatch = async (userId, importId, rows) => rows.length;

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
    preferences.netflix = 'not_recurring';
    const second = await importService.processImport('usr_one', {
      bankName: 'Bank A', fileNames: ['second.csv'], transactions: [transaction]
    });
    assert.notEqual(first.importId, second.importId);
    assert.equal(first.acceptedCount, 1);
    assert.equal(first.duplicateCount, 1);
    assert.equal(second.acceptedCount, 1);
    assert.deepEqual(batches.map(batch => batch.fileNames), [['first.csv'], ['second.csv']]);
    assert.deepEqual(saved.map(item => item.importId), [first.importId, second.importId]);
    assert.deepEqual(saved[0].subs, []);
    assert.deepEqual(saved[1].subs, []);
  } finally {
    importRepository.createImportBatch = originals.create;
    importRepository.saveAnalysisSnapshot = originals.save;
    importRepository.getClassificationPreferences = originals.getClassifications;
    transactionRepository.saveTransactionsBatch = originals.transactions;
  }
});

test('guest and signed-in imports produce the same analysis for one statement', async () => {
  const { analyzeTransactions, dedupeStatementTransactions, formatStatementTransactions } = await import('../../src/engine/analysis.js');
  const originals = {
    create: importRepository.createImportBatch,
    save: importRepository.saveAnalysisSnapshot,
    getClassifications: importRepository.getClassificationPreferences,
    transactions: transactionRepository.saveTransactionsBatch
  };
  const saved = [];
  importRepository.createImportBatch = async (_userId, batch) => batch;
  importRepository.saveAnalysisSnapshot = async (_userId, _importId, subs) => { saved.push(subs); return true; };
  importRepository.getClassificationPreferences = async () => ({});
  transactionRepository.saveTransactionsBatch = async (_userId, _importId, rows) => rows.length;

  const rows = [
    ['2026-07-01', 'NETFLIX AUTOPAY', 499, 'n1'],
    ['2026-08-01', 'NETFLIX AUTOPAY', 499, 'n2'],
    ['2026-09-01', 'NETFLIX AUTOPAY', 649, 'n3'],
    ['2026-10-01', 'NETFLIX AUTOPAY', 649, 'n4'],
    ['2026-10-02', 'GROCERY STORE', 700, 'g1']
  ].map(([transactionDate, description, amount, ref]) => ({
    transactionDate, description, amount, ref, direction: 'debit', sourceFileIndex: 0
  }));
  rows.push({ ...rows[0] });

  try {
    await importService.processImport('usr_one', { bankName: 'Bank A', fileNames: ['statement.csv'], transactions: rows });
    const guest = analyzeTransactions(dedupeStatementTransactions(formatStatementTransactions(rows)));
    const signedIn = saved[0].map(({ reviewDecision, cancelled, classificationDecision, ...sub }) => sub);
    assert.deepEqual(signedIn, guest);
    assert.deepEqual(signedIn.map(sub => [sub.id, sub.status.kind, sub.price]), [['netflix', 'hike', 649]]);
  } finally {
    importRepository.createImportBatch = originals.create;
    importRepository.saveAnalysisSnapshot = originals.save;
    importRepository.getClassificationPreferences = originals.getClassifications;
    transactionRepository.saveTransactionsBatch = originals.transactions;
  }
});

test('an import over the account quota is rejected before saving transactions', async () => {
  const originalCreate = importRepository.createImportBatch;
  const originalSave = transactionRepository.saveTransactionsBatch;
  let saved = false;
  importRepository.createImportBatch = async () => null;
  transactionRepository.saveTransactionsBatch = async () => { saved = true; return 1; };
  try {
    await assert.rejects(importService.processImport('usr_one', {
      fileNames: ['statement.csv'],
      transactions: [{ transactionDate: '2026-10-15', description: 'NETFLIX AUTOPAY', amount: 649 }]
    }), error => error.status === 429 && error.code === 'FILE_QUOTA_EXCEEDED');
    assert.equal(saved, false);
  } finally {
    importRepository.createImportBatch = originalCreate;
    transactionRepository.saveTransactionsBatch = originalSave;
  }
});

test('a statement spanning more than two years is rejected before quota reservation', async () => {
  const originalCreate = importRepository.createImportBatch;
  let reserved = false;
  importRepository.createImportBatch = async () => { reserved = true; return {}; };
  try {
    await assert.rejects(importService.processImport('usr_one', {
      fileNames: ['statement.csv'],
      transactions: [
        { sourceFileIndex: 0, transactionDate: '2023-01-01', description: 'PAYMENT', amount: 100 },
        { sourceFileIndex: 0, transactionDate: '2026-01-02', description: 'PAYMENT', amount: 100 }
      ]
    }), error => error.status === 400 && error.code === 'STATEMENT_DATE_RANGE_EXCEEDED');
    assert.equal(reserved, false);
  } finally {
    importRepository.createImportBatch = originalCreate;
  }
});
