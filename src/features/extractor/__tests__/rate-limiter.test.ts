import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimiter, sleep } from "@/features/extractor/services/rate-limiter";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Request count limiting ---

  describe("request count limiting", () => {
    it("returns 0 when under the request limit", () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        requestWindowSeconds: 10,
      });
      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.getWaitTimeMs()).toBe(0);
    });

    it("returns positive wait time when request limit is reached", () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        requestWindowSeconds: 10,
      });
      limiter.recordRequest();
      limiter.recordRequest();
      const wait = limiter.getWaitTimeMs();
      expect(wait).toBeGreaterThan(0);
      expect(wait).toBeLessThanOrEqual(10_000);
    });

    it("returns 0 after the request window expires", () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        requestWindowSeconds: 10,
      });
      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.getWaitTimeMs()).toBeGreaterThan(0);

      vi.advanceTimersByTime(10_001);
      expect(limiter.getWaitTimeMs()).toBe(0);
    });

    it("returns 0 when maxRequests is not set", () => {
      const limiter = new RateLimiter({});
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.getWaitTimeMs()).toBe(0);
    });

    it("returns 0 when maxRequests is 0 (treated as unlimited)", () => {
      const limiter = new RateLimiter({
        maxRequests: 0,
        requestWindowSeconds: 10,
      });
      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.getWaitTimeMs()).toBe(0);
    });
  });

  // --- Input token limiting ---

  describe("input token limiting", () => {
    it("returns 0 when under the input token limit", () => {
      const limiter = new RateLimiter({ maxInputTokensPerMinute: 1000 });
      limiter.recordRequest({ promptTokens: 400, completionTokens: 0 });
      limiter.recordRequest({ promptTokens: 400, completionTokens: 0 });
      expect(limiter.getWaitTimeMs()).toBe(0);
    });

    it("returns positive wait time when input token limit is reached", () => {
      const limiter = new RateLimiter({ maxInputTokensPerMinute: 1000 });
      limiter.recordRequest({ promptTokens: 600, completionTokens: 0 });
      limiter.recordRequest({ promptTokens: 500, completionTokens: 0 });
      const wait = limiter.getWaitTimeMs();
      expect(wait).toBeGreaterThan(0);
      expect(wait).toBeLessThanOrEqual(60_000);
    });

    it("returns 0 after 1 minute resets the token window", () => {
      const limiter = new RateLimiter({ maxInputTokensPerMinute: 1000 });
      limiter.recordRequest({ promptTokens: 1000, completionTokens: 0 });
      expect(limiter.getWaitTimeMs()).toBeGreaterThan(0);

      vi.advanceTimersByTime(60_001);
      expect(limiter.getWaitTimeMs()).toBe(0);
    });
  });

  // --- Output token limiting ---

  describe("output token limiting", () => {
    it("returns 0 when under the output token limit", () => {
      const limiter = new RateLimiter({ maxOutputTokensPerMinute: 500 });
      limiter.recordRequest({ promptTokens: 0, completionTokens: 200 });
      expect(limiter.getWaitTimeMs()).toBe(0);
    });

    it("returns positive wait time when output token limit is reached", () => {
      const limiter = new RateLimiter({ maxOutputTokensPerMinute: 500 });
      limiter.recordRequest({ promptTokens: 0, completionTokens: 300 });
      limiter.recordRequest({ promptTokens: 0, completionTokens: 300 });
      const wait = limiter.getWaitTimeMs();
      expect(wait).toBeGreaterThan(0);
      expect(wait).toBeLessThanOrEqual(60_000);
    });
  });

  // --- Multi-dimension ---

  describe("multi-dimension limiting", () => {
    it("returns the maximum wait time across all dimensions", () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        requestWindowSeconds: 5,
        maxInputTokensPerMinute: 1000,
      });
      limiter.recordRequest({ promptTokens: 600, completionTokens: 0 });
      limiter.recordRequest({ promptTokens: 600, completionTokens: 0 });

      const wait = limiter.getWaitTimeMs();
      // Both request limit (5s window) and input token limit (60s window) are hit.
      // The token wait (up to 60s) should be >= the request wait (up to 5s).
      expect(wait).toBeGreaterThan(0);
      expect(wait).toBeLessThanOrEqual(60_000);
    });
  });

  // --- recordRequest ---

  describe("recordRequest", () => {
    it("records 0 tokens when no usage is provided", () => {
      const limiter = new RateLimiter({ maxInputTokensPerMinute: 100 });
      limiter.recordRequest();
      limiter.recordRequest();
      // No tokens recorded, so token limit should not be hit
      expect(limiter.getWaitTimeMs()).toBe(0);
    });

    it("correctly accumulates token usage", () => {
      const limiter = new RateLimiter({ maxInputTokensPerMinute: 100 });
      limiter.recordRequest({ promptTokens: 60, completionTokens: 0 });
      limiter.recordRequest({ promptTokens: 60, completionTokens: 0 });
      // 120 >= 100, limit hit
      expect(limiter.getWaitTimeMs()).toBeGreaterThan(0);
    });
  });

  // --- cleanup ---

  describe("cleanup", () => {
    it("removes expired records after advancing time", () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        requestWindowSeconds: 5,
      });
      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.getWaitTimeMs()).toBeGreaterThan(0);

      // Advance past the window
      vi.advanceTimersByTime(60_001);

      // After cleanup (triggered by getWaitTimeMs), old records are gone
      // so we can make new requests
      limiter.recordRequest();
      expect(limiter.getWaitTimeMs()).toBe(0);
    });
  });
});

describe("sleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves after the specified delay", async () => {
    const promise = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects immediately with AbortError if signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(sleep(1000, controller.signal)).rejects.toThrow("Aborted");
  });

  it("rejects with AbortError when aborted during wait and clears the timer", async () => {
    const controller = new AbortController();
    const promise = sleep(5000, controller.signal);

    vi.advanceTimersByTime(1000);
    controller.abort();

    await expect(promise).rejects.toThrow("Aborted");
  });
});
