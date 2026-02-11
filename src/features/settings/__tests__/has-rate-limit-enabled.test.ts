import { describe, expect, it } from "vitest";
import { hasRateLimitEnabled } from "@/features/settings/types";

describe("hasRateLimitEnabled", () => {
  it("returns false for undefined input", () => {
    expect(hasRateLimitEnabled(undefined)).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(hasRateLimitEnabled({})).toBe(false);
  });

  it("returns false when all fields are 0", () => {
    expect(
      hasRateLimitEnabled({
        maxRequests: 0,
        requestWindowSeconds: 0,
        maxInputTokensPerMinute: 0,
        maxOutputTokensPerMinute: 0,
      }),
    ).toBe(false);
  });

  it("returns false when all fields are undefined", () => {
    expect(
      hasRateLimitEnabled({
        maxRequests: undefined,
        requestWindowSeconds: undefined,
        maxInputTokensPerMinute: undefined,
        maxOutputTokensPerMinute: undefined,
      }),
    ).toBe(false);
  });

  it("returns true when only maxRequests > 0", () => {
    expect(hasRateLimitEnabled({ maxRequests: 5 })).toBe(true);
  });

  it("returns true when only maxInputTokensPerMinute > 0", () => {
    expect(hasRateLimitEnabled({ maxInputTokensPerMinute: 1000 })).toBe(true);
  });

  it("returns true when only maxOutputTokensPerMinute > 0", () => {
    expect(hasRateLimitEnabled({ maxOutputTokensPerMinute: 500 })).toBe(true);
  });

  it("returns true when multiple fields are > 0", () => {
    expect(
      hasRateLimitEnabled({
        maxRequests: 10,
        maxInputTokensPerMinute: 2000,
        maxOutputTokensPerMinute: 1000,
      }),
    ).toBe(true);
  });

  it("returns false when only requestWindowSeconds > 0 (window alone does not constitute rate limiting)", () => {
    expect(
      hasRateLimitEnabled({
        requestWindowSeconds: 60,
        maxRequests: 0,
        maxInputTokensPerMinute: 0,
        maxOutputTokensPerMinute: 0,
      }),
    ).toBe(false);
  });
});
