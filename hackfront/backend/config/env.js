require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:8000'),
  JWT_SECRET: z.string().min(16).optional(),
  COOKIE_SECURE: z.enum(['true', 'false']).transform(value => value === 'true').default('false'),
  NEO4J_URI: z.string().default('bolt://localhost:7687'),
  NEO4J_USERNAME: z.string().default('neo4j'),
  NEO4J_PASSWORD: z.string().default('password'),
  NEO4J_DATABASE: z.string().default('neo4j'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && (!parsed.data.JWT_SECRET || parsed.data.JWT_SECRET.length < 32)) {
  console.error('JWT_SECRET must be set to at least 32 characters in production.');
  process.exit(1);
}

const frontendOrigin = new URL(parsed.data.FRONTEND_ORIGIN).origin;

if (parsed.data.NODE_ENV === 'production' && (!process.env.FRONTEND_ORIGIN || !frontendOrigin.startsWith('https://'))) {
  console.error('FRONTEND_ORIGIN must be an HTTPS origin in production.');
  process.exit(1);
}

module.exports = {
  ...parsed.data,
  FRONTEND_ORIGIN: frontendOrigin,
  JWT_SECRET: parsed.data.JWT_SECRET || 'lossfinder_dev_secret_key_change_in_production_min_32_chars',
  COOKIE_SECURE: parsed.data.NODE_ENV === 'production' || parsed.data.COOKIE_SECURE
};
