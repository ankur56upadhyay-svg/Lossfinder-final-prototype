require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:8000'),
  JWT_SECRET: z.string().min(16).default('lossfinder_dev_secret_key_change_in_production_min_32_chars'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
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

module.exports = parsed.data;
