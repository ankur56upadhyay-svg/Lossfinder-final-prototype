const { z } = require('zod');
const { MAX_FILES_IN_WINDOW, MAX_TRANSACTIONS_PER_IMPORT } = require('../config/uploadLimits');

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
  sourceFileIndex: z.number().int().min(0).max(MAX_FILES_IN_WINDOW - 1),
});

const importBatchSchema = z.object({
  bankName: z.string().max(100).optional().default('Your bank'),
  fileNames: z.array(z.string().trim().min(1).max(255)).min(1).max(MAX_FILES_IN_WINDOW),
  transactions: z.array(transactionInputSchema).min(1, 'At least one transaction is required').max(MAX_TRANSACTIONS_PER_IMPORT, 'An analysis can contain at most 20,000 transactions'),
}).superRefine((value, context) => {
  value.transactions.forEach((row, index) => {
    if (row.sourceFileIndex >= value.fileNames.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['transactions', index, 'sourceFileIndex'], message: 'Statement index must match an uploaded file.' });
    }
  });
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
