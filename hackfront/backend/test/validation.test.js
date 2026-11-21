const { test } = require('node:test');
const assert = require('node:assert/strict');
const { importBatchSchema } = require('../validators/importValidators');
const { registerSchema } = require('../validators/authValidators');

test('import validator enforces file count, row count, and source file mapping', () => {
  const validRow = {
    transactionDate: '2026-11-21',
    description: 'Subscription',
    amount: 100,
    sourceFileIndex: 0
  };
  const input = { fileNames: ['bank.csv'], transactions: [validRow] };
  assert.equal(importBatchSchema.safeParse(input).success, true);
  assert.equal(importBatchSchema.safeParse({ ...input, transactions: Array(5001).fill(validRow) }).success, true);
  assert.equal(importBatchSchema.safeParse({ ...input, transactions: Array(20001).fill(validRow) }).success, false);
  assert.equal(importBatchSchema.safeParse({ ...input, fileNames: Array(11).fill('bank.csv') }).success, false);
  assert.equal(importBatchSchema.safeParse({ ...input, transactions: [{ ...validRow, sourceFileIndex: 1 }] }).success, false);
  assert.equal(importBatchSchema.safeParse({ ...input, transactions: [{ ...validRow, amount: -1 }] }).success, false);
});

test('registration schema normalizes valid email and rejects invalid email', () => {
  assert.equal(registerSchema.parse({ email: 'TEST@EXAMPLE.COM', password: 'Password123!' }).email, 'test@example.com');
  assert.equal(registerSchema.safeParse({ email: 'invalid', password: 'Password123!' }).success, false);
});
