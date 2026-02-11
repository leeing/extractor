import type { RateLimitConfig } from "@/features/settings/types";

interface RequestRecord {
  timestamp: number;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Client-side sliding window rate limiter.
 * Tracks request count and token usage to enforce rate limits.
 */
export class RateLimiter {
  private records: RequestRecord[] = [];
  private readonly config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /** Record a completed request with optional token usage */
  recordRequest(usage?: {
    promptTokens: number;
    completionTokens: number;
  }): void {
    this.records.push({
      timestamp: Date.now(),
      promptTokens: usage?.promptTokens ?? 0,
      completionTokens: usage?.completionTokens ?? 0,
    });
    this.cleanup();
  }

  /**
   * Calculate how many milliseconds to wait before the next request.
   * Returns 0 if the request can proceed immediately.
   */
  getWaitTimeMs(): number {
    this.cleanup();
    const now = Date.now();
    let maxWait = 0;

    // Check request count limit
    const maxReq = this.config.maxRequests;
    const windowSec = this.config.requestWindowSeconds;
    if (maxReq && maxReq > 0 && windowSec && windowSec > 0) {
      const windowMs = windowSec * 1000;
      const windowStart = now - windowMs;
      const recentRequests = this.records.filter(
        (r) => r.timestamp > windowStart,
      );
      if (recentRequests.length >= maxReq) {
        const oldest = recentRequests[0];
        if (oldest) {
          const wait = oldest.timestamp + windowMs - now;
          maxWait = Math.max(maxWait, wait);
        }
      }
    }

    // Check input tokens per minute
    const maxInputTPM = this.config.maxInputTokensPerMinute;
    if (maxInputTPM && maxInputTPM > 0) {
      const minuteAgo = now - 60_000;
      const recentInputTokens = this.records
        .filter((r) => r.timestamp > minuteAgo)
        .reduce((sum, r) => sum + r.promptTokens, 0);
      if (recentInputTokens >= maxInputTPM) {
        const oldestInWindow = this.records.find(
          (r) => r.timestamp > minuteAgo,
        );
        if (oldestInWindow) {
          const wait = oldestInWindow.timestamp + 60_000 - now;
          maxWait = Math.max(maxWait, wait);
        }
      }
    }

    // Check output tokens per minute
    const maxOutputTPM = this.config.maxOutputTokensPerMinute;
    if (maxOutputTPM && maxOutputTPM > 0) {
      const minuteAgo = now - 60_000;
      const recentOutputTokens = this.records
        .filter((r) => r.timestamp > minuteAgo)
        .reduce((sum, r) => sum + r.completionTokens, 0);
      if (recentOutputTokens >= maxOutputTPM) {
        const oldestInWindow = this.records.find(
          (r) => r.timestamp > minuteAgo,
        );
        if (oldestInWindow) {
          const wait = oldestInWindow.timestamp + 60_000 - now;
          maxWait = Math.max(maxWait, wait);
        }
      }
    }

    return Math.max(0, Math.ceil(maxWait));
  }

  /** Remove records older than the max relevant window (request window or 1 minute) */
  private cleanup(): void {
    const now = Date.now();
    const windowSec = this.config.requestWindowSeconds ?? 0;
    const maxAge = Math.max(windowSec * 1000, 60_000);
    this.records = this.records.filter((r) => now - r.timestamp <= maxAge);
  }
}

/** Sleep for ms, abortable via AbortSignal */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
