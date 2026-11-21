import test from 'node:test';
import assert from 'node:assert/strict';
import { assessPayment, countsAsSubscription } from './paymentAssessment.js';
import backend from '../../backend/utils/paymentAssessment.js';
import { enrichTransactions } from './merchants.js';
import { findRecurring } from './recurring.js';

const cases = [
  [{ name: 'Grocery Store', category: 'Other', narrations: ['CARD GROCERY STORE'], amounts: [980, 1030, 950] }, 'needs_review'],
  [{ name: 'ABC Hosting', category: 'Other', narrations: ['CARD AUTOPAY ABC HOSTING'], amounts: [499, 499, 499] }, 'likely'],
  [{ name: 'Netflix', category: 'Streaming', narrations: ['CARD NETFLIX'], amounts: [499, 499, 499] }, 'likely'],
  [{ name: 'Unfamiliar Merchant', category: 'Other', narrations: ['CARD PAYMENT'], amounts: [500, 500, 500] }, 'needs_review'],
];

test('guest and signed-in classification policies agree on common cases', () => {
  for (const [input, expected] of cases) {
    assert.deepEqual(assessPayment(input), backend.assessPayment(input));
    assert.equal(assessPayment(input).assessment, expected);
  }
});

test('unconfirmed candidates are excluded and user answers update totals', () => {
  const candidate = { assessment: 'needs_review', classificationDecision: null };
  assert.equal(countsAsSubscription(candidate), false);
  assert.equal(countsAsSubscription({ ...candidate, classificationDecision: 'subscription' }), true);
  assert.equal(countsAsSubscription({ assessment: 'likely', classificationDecision: 'not_recurring' }), false);
  assert.equal(countsAsSubscription({ assessment: 'likely' }), true);
});

test('a repeating grocery payment appears for review while a recurring Netflix charge counts', () => {
  const rows = [];
  for (const month of [4, 5, 6, 7]) {
    const date = day => new Date(2026, month - 1, day);
    rows.push({ date: date(5), narration: 'CARD RECUR NETFLIX', amount: 499 });
    rows.push({ date: date(20), narration: 'CARD GROCERY STORE', amount: 920 + month * 13 });
  }
  const results = findRecurring(enrichTransactions(rows));
  const grocery = results.find(sub => sub.name === 'Grocery Store');
  const netflix = results.find(sub => sub.name === 'Netflix');
  assert.equal(grocery.assessment, 'needs_review');
  assert.equal(countsAsSubscription(grocery), false);
  assert.equal(netflix.assessment, 'likely');
  assert.equal(countsAsSubscription(netflix), true);
});
