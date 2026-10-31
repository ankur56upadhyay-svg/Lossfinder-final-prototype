const { z } = require('zod');

const createUsageSchema = z.object({
  merchantKey: z.string().min(1, 'Merchant key is required').max(100),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  eventType: z.string().min(1, 'Event type is required').max(50),
  notes: z.string().max(500).optional().default(''),
});

module.exports = {
  createUsageSchema,
};
