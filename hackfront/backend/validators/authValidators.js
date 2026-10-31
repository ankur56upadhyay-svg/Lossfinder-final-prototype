const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255).toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
};
