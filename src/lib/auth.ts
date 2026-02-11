import { extractEnv } from "@/lib/env";

/**
 * Simple token-based authentication.
 * Returns null if auth passes, or a 401 Response if it fails.
 * When ACCESS_TOKEN is not set, auth is skipped (backward compatible).
 */
export function verifyAuth(req: Request): Response | null {
  const token = extractEnv.accessToken;
  if (!token) return null;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { success: false, error: "未提供访问密钥" },
      { status: 401 },
    );
  }

  const provided = authHeader.slice(7);
  if (provided !== token) {
    return Response.json(
      { success: false, error: "访问密钥无效" },
      { status: 401 },
    );
  }

  return null;
}
