/**
 * Lightweight sliding-window rate limiter for public website ingest.
 * In-process (per API instance). Edge/CDN rate limits can stack on top.
 */

export type RateLimitResult =
  | { allowed: true; remaining: number; resetMs: number }
  | { allowed: false; remaining: 0; resetMs: number; retryAfterSec: number };

type WindowState = {
  hits: number[];
};

export class SlidingWindowRateLimiter {
  private readonly windows = new Map<string, WindowState>();
  private lastSweep = Date.now();

  constructor(
    /** Max requests in window. */
    private readonly limit: number,
    /** Window length ms. */
    private readonly windowMs: number,
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    this.maybeSweep(now);
    const cutoff = now - this.windowMs;
    let state = this.windows.get(key);
    if (!state) {
      state = { hits: [] };
      this.windows.set(key, state);
    }
    state.hits = state.hits.filter((t) => t > cutoff);

    if (state.hits.length >= this.limit) {
      const oldest = state.hits[0] ?? now;
      const resetMs = oldest + this.windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
        retryAfterSec: Math.max(1, Math.ceil(Math.max(0, resetMs) / 1000)),
      };
    }

    state.hits.push(now);
    return {
      allowed: true,
      remaining: Math.max(0, this.limit - state.hits.length),
      resetMs: this.windowMs,
    };
  }

  /** Test helper */
  reset() {
    this.windows.clear();
  }

  private maybeSweep(now: number) {
    // Avoid unbounded growth if keys go idle
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    const cutoff = now - this.windowMs * 2;
    for (const [key, state] of this.windows) {
      state.hits = state.hits.filter((t) => t > cutoff);
      if (!state.hits.length) this.windows.delete(key);
    }
  }
}

/** ~120 orders / min per store token (bursty webhooks OK). */
export const websiteIngestByTokenLimiter = new SlidingWindowRateLimiter(120, 60_000);

/** ~60 req / min per remote IP (abuse from one IP across tokens). */
export const websiteIngestByIpLimiter = new SlidingWindowRateLimiter(60, 60_000);
