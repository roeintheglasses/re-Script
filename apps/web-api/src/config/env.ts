/**
 * Environment configuration for web API server
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().default(3001),
  
  // Redis configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  
  // Security
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT: z.coerce.number().default(100), // requests per minute
  
  // File upload
  MAX_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB
  UPLOAD_TIMEOUT: z.coerce.number().default(30000), // 30 seconds
  
  // Job processing
  JOB_TIMEOUT: z.coerce.number().default(300000), // 5 minutes
  MAX_CONCURRENT_JOBS: z.coerce.number().default(5),
});

export type Config = z.infer<typeof envSchema>;

export const config: Config = envSchema.parse(process.env);