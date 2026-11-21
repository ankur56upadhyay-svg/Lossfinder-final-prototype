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
  fileNames: z.array(z.string().trim().min(1).max(255)).max(20).optional(),
  transactions: z.array(transactionInputSchema).min(1, 'At least one transaction is required').max(5000, 'Batch exceeds maximum limit of 5000 transactions'),
});

const updateAnalysisSchema = z.object({
  reviewDecision: z.enum(['keep', 'review', 'consider_cancelling']).optional(),
  cancelled: z.boolean().optional(),
}).refine(value => value.reviewDecision !== undefined || value.cancelled !== undefined, {
  message: 'A decision or cancellation status is required.'
});

module.exports = {
  transactionInputSchema,
  importBatchSchema,
  updateAnalysisSchema,
};
