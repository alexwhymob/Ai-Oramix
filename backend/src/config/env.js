import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3003),
  FRONTEND_URL: z.string().url().default('http://localhost:5175'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  AUTH_COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  AUTH_COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
  MFA_ISSUER: z.string().min(1).default('Oramix Assessment Platform'),
  WEB_PUSH_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  WEB_PUSH_VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  WEB_PUSH_SUBJECT: z.string().url().default('mailto:security@oramix.pt'),
  MONGODB_URI: z.string().min(1).optional(),
  MONGODB_DIRECT_URI: z.string().min(1).optional(),
  MONGODB_DB_NAME: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  LLM_CONFIG_ENCRYPTION_KEY: z.string().min(32).optional(),
  LLM_PROVIDER: z.enum(['openai', 'google', 'anthropic']).default('openai'),
  LLM_MODEL: z.string().min(1).default('gpt-5.4'),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  EMAIL_PROVIDER: z.enum(['resend', 'smtp']).default('resend'),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).default('Oramix Assessment Platform <onboarding@resend.dev>'),
  SCHEDULER_ENABLED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  SCHEDULER_INTERVAL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  OTEL_ENABLED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  OTEL_SERVICE_NAME: z.string().min(1).default('oramix-ai-backend'),
  OTEL_PROMETHEUS_PORT: z.coerce.number().int().min(1024).max(65535).default(9464),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  RATE_LIMIT_REQUIRE_REDIS: z.enum(['true', 'false']).default('false').transform((value) => value === 'true')
  ,S3_ENDPOINT: z.string().url().optional()
  ,S3_ACCESS_KEY: z.string().min(1).optional()
  ,S3_SECRET_KEY: z.string().min(1).optional()
  ,S3_BUCKET: z.string().min(1).default('oramix-exports')
});

export const env = envSchema.parse(process.env);
