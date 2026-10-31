const { z } = require('zod');

const updateSubscriptionSchema = z.object({
  status: z.enum(['active', 'cancelled', 'ignored', 'ended']),
  notes: z.string().max(500).optional(),
});

module.exports = {
  updateSubscriptionSchema,
};
