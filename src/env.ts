import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT: z.coerce.number().optional(),
  DATABASE_URL: z.url(),
  NODE_ENV: z.string(),
  JWT_SECRET: z.string(),
});

export const env = envSchema.parse(process.env);
