import crypto from "node:crypto";
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

  // Use constant-time comparison to prevent timing attacks
  const tokenBuffer = Buffer.from(token);
  const providedBuffer = Buffer.from(provided);

  // If lengths differ, it's definitely not a match, but we still want to simulate
  // work to avoid leaking length information?
  // Actually, timingSafeEqual requires buffers of same length.
  // Standard practice: if lengths differ, return false immediately (leaks length)
  // or hash both values and compare hashes.
  // Given this is a simple access token, leaking length is a minor issue compared to content.
  // But let's be robust:
  if (tokenBuffer.length !== providedBuffer.length) {
    return Response.json(
      { success: false, error: "访问密钥无效" },
      { status: 401 },
    );
  }

  if (!crypto.timingSafeEqual(tokenBuffer, providedBuffer)) {
    return Response.json(
      { success: false, error: "访问密钥无效" },
      { status: 401 },
    );
  }

  return null;
}
