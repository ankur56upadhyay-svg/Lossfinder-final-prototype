const { z } = require('zod');

const transactionInputSchema = z.object({
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().nonnegative('Amount must be non-negative'),
  currency: z.string().max(10).default('INR'),
  direction: z.enum(['debit', 'credit']).default('debit'),
  transactionType: z.string().max(50).optional().default('purchase'),
  ref: z.string().max(100).optional().default(''),
  method: z.string().max(50).optional().default(''),
  status: z.string().max(50).optional().default('DEBIT'),
});

const importBatchSchema = z.object({
  bankName: z.string().max(100).optional().default('Your bank'),
  transactions: z.array(transactionInputSchema).min(1, 'At least one transaction is required').max(5000, 'Batch exceeds maximum limit of 5000 transactions'),
});

module.exports = {
  transactionInputSchema,
  importBatchSchema,
};
