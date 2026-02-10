/**
 * API endpoint to expose non-sensitive env-based model configuration.
 * Returns baseUrl, modelId, and whether an API key is configured (but NOT the key itself).
 */
import { extractEnv } from "@/lib/env";

export async function GET(): Promise<Response> {
  return Response.json({
    success: true,
    data: {
      baseUrl: extractEnv.baseUrl,
      modelId: extractEnv.modelId,
      hasApiKey: Boolean(extractEnv.apiKey),
      isConfigured: extractEnv.isConfigured,
    },
  });
}
