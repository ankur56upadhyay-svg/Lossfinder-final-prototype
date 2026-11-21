const { test } = require('node:test');
const assert = require('node:assert/strict');
const { importBatchSchema } = require('../validators/importValidators');
const { registerSchema } = require('../validators/authValidators');

test('patched validator rejects oversized imports and invalid transaction values', () => {
  const validRow = {
    transactionDate: '2026-11-21',
    description: 'Subscription',
    amount: 100
  };
  assert.equal(importBatchSchema.safeParse({ transactions: Array(5001).fill(validRow) }).success, false);
  assert.equal(importBatchSchema.safeParse({ transactions: [{ ...validRow, amount: -1 }] }).success, false);
  assert.equal(importBatchSchema.safeParse({ transactions: [validRow] }).success, true);
});

test('registration schema normalizes valid email and rejects invalid email', () => {
  assert.equal(registerSchema.parse({ email: 'TEST@EXAMPLE.COM', password: 'Password123!' }).email, 'test@example.com');
  assert.equal(registerSchema.safeParse({ email: 'invalid', password: 'Password123!' }).success, false);
});
