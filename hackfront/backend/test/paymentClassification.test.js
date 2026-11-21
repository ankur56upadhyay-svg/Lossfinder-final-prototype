const { test } = require('node:test');
const assert = require('node:assert/strict');
const transactionRepository = require('../repositories/transactionRepository');
const subscriptionDetectionService = require('../services/subscriptionDetectionService');

test('signed-in detection sends repeated grocery payments to review and keeps recurring Netflix', async () => {
  const original = transactionRepository.getAllDebitTransactionsByUser;
  const rows = [];
  for (const month of [4, 5, 6, 7]) {
    rows.push({ date: `2026-${String(month).padStart(2, '0')}-05`, narration: 'CARD RECUR NETFLIX', debit: 499, credit: 0, status: 'DEBIT', method: 'CARD', ref: `netflix-${month}` });
    rows.push({ date: `2026-${String(month).padStart(2, '0')}-20`, narration: 'CARD GROCERY STORE', debit: 920 + month * 13, credit: 0, status: 'DEBIT', method: 'CARD', ref: `grocery-${month}` });
  }
  transactionRepository.getAllDebitTransactionsByUser = async () => rows;
  try {
    const results = await subscriptionDetectionService.analyzeForUser('usr_test', { importId: 'imp_test', persist: false });
    assert.equal(results.find(sub => sub.merchantKey === 'netflix').assessment, 'likely');
    assert.equal(results.find(sub => sub.merchantKey.includes('grocery')).assessment, 'needs_review');
  } finally {
    transactionRepository.getAllDebitTransactionsByUser = original;
  }
});
