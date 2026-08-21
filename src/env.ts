import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT: z.coerce.number(),
  DATABASE_URL: z.url(),
});

export const env = envSchema.parse(process.env);
