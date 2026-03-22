import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, getRateLimitTier, RATE_LIMIT_TIERS } from "../../src/lib/rate-limit";

describe("rate-limit.ts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("should allow first request", () => {
      const result = checkRateLimit("test-store", "client-1", RATE_LIMIT_TIERS.auth);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMIT_TIERS.auth.maxRequests - 1);
    });

    it("should track requests within window", () => {
      checkRateLimit("test-store", "client-2", RATE_LIMIT_TIERS.auth);
      const result2 = checkRateLimit("test-store", "client-2", RATE_LIMIT_TIERS.auth);
      const result3 = checkRateLimit("test-store", "client-2", RATE_LIMIT_TIERS.auth);

      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it("should deny when over limit", () => {
      const config = RATE_LIMIT_TIERS.auth; // maxRequests: 3

      checkRateLimit("test-store", "client-3", config);
      checkRateLimit("test-store", "client-3", config);
      checkRateLimit("test-store", "client-3", config);
      const result = checkRateLimit("test-store", "client-3", config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should reset after window expires", () => {
      const config = RATE_LIMIT_TIERS.auth; // windowMs: 60_000

      checkRateLimit("test-store", "client-4", config);
      checkRateLimit("test-store", "client-4", config);
      checkRateLimit("test-store", "client-4", config);
      const deniedResult = checkRateLimit("test-store", "client-4", config);
      expect(deniedResult.allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(config.windowMs + 1);

      const resetResult = checkRateLimit("test-store", "client-4", config);
      expect(resetResult.allowed).toBe(true);
      expect(resetResult.remaining).toBe(config.maxRequests - 1);
    });

    it("should track different keys independently", () => {
      const config = RATE_LIMIT_TIERS.auth;

      checkRateLimit("test-store", "client-5", config);
      checkRateLimit("test-store", "client-5", config);
      checkRateLimit("test-store", "client-5", config);
      const client5Result = checkRateLimit("test-store", "client-5", config);
      expect(client5Result.allowed).toBe(false);

      // Different client should have separate limit
      const client6Result = checkRateLimit("test-store", "client-6", config);
      expect(client6Result.allowed).toBe(true);
      expect(client6Result.remaining).toBe(config.maxRequests - 1);
    });

    it("should track different stores independently", () => {
      const config = RATE_LIMIT_TIERS.auth;

      checkRateLimit("store-a", "client-7", config);
      checkRateLimit("store-a", "client-7", config);
      checkRateLimit("store-a", "client-7", config);
      const storeAResult = checkRateLimit("store-a", "client-7", config);
      expect(storeAResult.allowed).toBe(false);

      // Same client, different store
      const storeBResult = checkRateLimit("store-b", "client-7", config);
      expect(storeBResult.allowed).toBe(true);
      expect(storeBResult.remaining).toBe(config.maxRequests - 1);
    });

    it("should return correct resetAt timestamp", () => {
      const now = Date.now();
      const config = RATE_LIMIT_TIERS.auth;

      const result = checkRateLimit("test-store", "client-8", config);

      expect(result.resetAt).toBe(now + config.windowMs);
    });
  });

  describe("getRateLimitTier", () => {
    it("should return auth tier for /api/auth/ endpoints", () => {
      expect(getRateLimitTier("/api/auth/nonce", "GET")).toBe("auth");
      expect(getRateLimitTier("/api/auth/verify", "POST")).toBe("auth");
      expect(getRateLimitTier("/api/auth/session", "GET")).toBe("auth");
    });

    it("should return public tier for /api/verify/ endpoints", () => {
      expect(getRateLimitTier("/api/verify/proof", "POST")).toBe("public");
    });

    it("should return public tier for /api/stats endpoints", () => {
      expect(getRateLimitTier("/api/stats", "GET")).toBe("public");
      expect(getRateLimitTier("/api/stats/summary", "GET")).toBe("public");
    });

    it("should return read tier for GET requests", () => {
      expect(getRateLimitTier("/api/datasets", "GET")).toBe("read");
      expect(getRateLimitTier("/api/policies", "GET")).toBe("read");
    });

    it("should return read tier for HEAD requests", () => {
      expect(getRateLimitTier("/api/datasets/123/download", "HEAD")).toBe("read");
    });

    it("should return write tier for POST requests", () => {
      expect(getRateLimitTier("/api/datasets", "POST")).toBe("write");
    });

    it("should return write tier for PATCH requests", () => {
      expect(getRateLimitTier("/api/datasets/123", "PATCH")).toBe("write");
    });

    it("should return write tier for DELETE requests", () => {
      expect(getRateLimitTier("/api/datasets/123", "DELETE")).toBe("write");
    });

    it("should prioritize auth tier over method-based tiers", () => {
      expect(getRateLimitTier("/api/auth/logout", "POST")).toBe("auth");
    });

    it("should prioritize public tier over method-based tiers", () => {
      expect(getRateLimitTier("/api/verify/proof", "POST")).toBe("public");
    });
  });

  describe("RATE_LIMIT_TIERS configuration", () => {
    it("should have correct auth tier config", () => {
      expect(RATE_LIMIT_TIERS.auth).toEqual({
        maxRequests: 3,
        windowMs: 60_000,
      });
    });

    it("should have correct write tier config", () => {
      expect(RATE_LIMIT_TIERS.write).toEqual({
        maxRequests: 10,
        windowMs: 60_000,
      });
    });

    it("should have correct read tier config", () => {
      expect(RATE_LIMIT_TIERS.read).toEqual({
        maxRequests: 60,
        windowMs: 60_000,
      });
    });

    it("should have correct public tier config", () => {
      expect(RATE_LIMIT_TIERS.public).toEqual({
        maxRequests: 5,
        windowMs: 60_000,
      });
    });
  });
});
