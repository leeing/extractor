/**
 * Type-safe environment variable access.
 * All server-side env vars are validated at import time.
 *
 * Lightweight alternative to t3-env for projects without Zod.
 */

function requireEnvOrEmpty(key: string): string {
  return process.env[key] ?? "";
}

/** Warn if extraction env is partially configured */
function validateEnv(): void {
  const vars = {
    EXTRACT_BASE_URL: process.env.EXTRACT_BASE_URL,
    EXTRACT_MODEL_ID: process.env.EXTRACT_MODEL_ID,
    EXTRACT_API_KEY: process.env.EXTRACT_API_KEY,
  };
  const set = Object.entries(vars).filter(([, v]) => Boolean(v));
  const missing = Object.entries(vars).filter(([, v]) => !v);

  if (set.length > 0 && missing.length > 0) {
    console.warn(
      `[env] Incomplete extraction config: ${missing.map(([k]) => k).join(", ")} not set. ` +
        `Set all three variables or none.`,
    );
  }
}

validateEnv();

/** Server-side extraction config from environment */
export const extractEnv = {
  get baseUrl(): string {
    return requireEnvOrEmpty("EXTRACT_BASE_URL");
  },
  get modelId(): string {
    return requireEnvOrEmpty("EXTRACT_MODEL_ID");
  },
  get apiKey(): string {
    return requireEnvOrEmpty("EXTRACT_API_KEY");
  },
  get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.modelId && this.apiKey);
  },
  get rateLimitMaxRequests(): number {
    return Number(process.env.EXTRACT_RATE_LIMIT_MAX_REQUESTS) || 0;
  },
  get rateLimitRequestWindowSeconds(): number {
    return Number(process.env.EXTRACT_RATE_LIMIT_REQUEST_WINDOW_SECONDS) || 0;
  },
  get rateLimitMaxInputTPM(): number {
    return Number(process.env.EXTRACT_RATE_LIMIT_MAX_INPUT_TPM) || 0;
  },
  get rateLimitMaxOutputTPM(): number {
    return Number(process.env.EXTRACT_RATE_LIMIT_MAX_OUTPUT_TPM) || 0;
  },
} as const;
