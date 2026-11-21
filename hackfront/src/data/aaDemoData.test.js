import test from 'node:test';
import assert from 'node:assert/strict';
import { AA_DEMO_ACCOUNTS, buildAaDemoTransactions } from './aaDemoData.js';
import { enrichTransactions } from '../engine/merchants.js';
import { findRecurring } from '../engine/recurring.js';
import { countsAsSubscription } from '../engine/paymentAssessment.js';

test('AA demo combines selected fictional accounts through the real guest analysis', () => {
  const rows = buildAaDemoTransactions(AA_DEMO_ACCOUNTS.map(account => account.id));
  assert.equal(rows.length, 48);
  const results = findRecurring(enrichTransactions(rows));
  assert.deepEqual(results.filter(countsAsSubscription).map(sub => sub.name).sort(),
    ['Google One', 'Netflix', 'Spotify Premium', 'YouTube Premium']);
  assert.deepEqual(results.filter(sub => !countsAsSubscription(sub)).map(sub => sub.name), ['Grocery Store']);
  assert.equal(results.find(sub => sub.name === 'Netflix').was, 499);
});

test('AA demo only loads chosen accounts and rejects unknown account IDs', () => {
  const rows = buildAaDemoTransactions(['demo-digital']);
  assert.equal(rows.length, 16);
  assert.equal(rows.some(row => row.narration.includes('NETFLIX')), false);
  assert.throws(() => buildAaDemoTransactions([]), /Choose at least one/);
  assert.throws(() => buildAaDemoTransactions(['real-bank']), /Choose at least one/);
});
