const { z } = require('zod');

const updateSubscriptionSchema = z.object({
  status: z.enum(['active', 'cancelled', 'ignored', 'ended']).optional(),
  reviewDecision: z.enum(['keep', 'review', 'consider_cancelling']).optional(),
  notes: z.string().max(500).optional(),
});

module.exports = {
  updateSubscriptionSchema,
};
