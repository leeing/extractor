/**
 * API endpoint to expose non-sensitive env-based model configuration.
 * Returns baseUrl, modelId, and whether an API key is configured (but NOT the key itself).
 */
import { verifyAuth } from "@/lib/auth";
import { extractEnv } from "@/lib/env";

export async function GET(req: Request): Promise<Response> {
  const authResponse = verifyAuth(req);
  if (authResponse) return authResponse;

  return Response.json({
    success: true,
    data: {
      baseUrl: extractEnv.baseUrl,
      modelId: extractEnv.modelId,
      hasApiKey: Boolean(extractEnv.apiKey),
      isConfigured: extractEnv.isConfigured,
      requiresAuth: Boolean(extractEnv.accessToken),
      rateLimit: {
        maxRequests: extractEnv.rateLimitMaxRequests,
        requestWindowSeconds: extractEnv.rateLimitRequestWindowSeconds,
        maxInputTokensPerMinute: extractEnv.rateLimitMaxInputTPM,
        maxOutputTokensPerMinute: extractEnv.rateLimitMaxOutputTPM,
      },
    },
  });
}
