import { z } from "zod";

const envSchema = z.object({
  EXTRACT_BASE_URL: z.string().optional().default(""),
  EXTRACT_MODEL_ID: z.string().optional().default(""),
  EXTRACT_API_KEY: z.string().optional().default(""),
  EXTRACT_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().min(0).default(0),
  EXTRACT_RATE_LIMIT_REQUEST_WINDOW_SECONDS: z.coerce
    .number()
    .min(0)
    .default(0),
  EXTRACT_RATE_LIMIT_MAX_INPUT_TPM: z.coerce.number().min(0).default(0),
  EXTRACT_RATE_LIMIT_MAX_OUTPUT_TPM: z.coerce.number().min(0).default(0),
  ACCESS_TOKEN: z.string().optional().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[env] Invalid environment variables:", parsed.error.format());
  throw new Error("Invalid environment variables");
}

const env = parsed.data;

/** Server-side extraction config from environment */
export const extractEnv = {
  get baseUrl(): string {
    return env.EXTRACT_BASE_URL;
  },
  get modelId(): string {
    return env.EXTRACT_MODEL_ID;
  },
  get apiKey(): string {
    return env.EXTRACT_API_KEY;
  },
  get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.modelId && this.apiKey);
  },
  get rateLimitMaxRequests(): number {
    return env.EXTRACT_RATE_LIMIT_MAX_REQUESTS;
  },
  get rateLimitRequestWindowSeconds(): number {
    return env.EXTRACT_RATE_LIMIT_REQUEST_WINDOW_SECONDS;
  },
  get rateLimitMaxInputTPM(): number {
    return env.EXTRACT_RATE_LIMIT_MAX_INPUT_TPM;
  },
  get rateLimitMaxOutputTPM(): number {
    return env.EXTRACT_RATE_LIMIT_MAX_OUTPUT_TPM;
  },
  get accessToken(): string {
    return env.ACCESS_TOKEN;
  },
} as const;
