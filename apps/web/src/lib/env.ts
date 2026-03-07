import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SHELBY_WALLET_ADDRESS: z.string().optional(),
  FORSETY_API_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().default("forsety-dev-secret-change-in-production-32ch"),
});

type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Missing environment variables: ${Object.keys(parsed.error.flatten().fieldErrors).join(", ")}`
      );
    }
    _env = parsed.data;
  }
  return _env;
}
