/**
 * Enterprise Rate Limiting Test Suite
 * 
 * Covers: Token bucket algorithm, window-based limiting, edge cases,
 * and concurrent request handling.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("Rate Limiting Module", () => {
  beforeEach(() => {
    // Reset module state between tests
    vi.resetModules();
  });

  describe("Basic Rate Limiting", () => {
    it("should allow requests within limit", () => {
      const key = "test-client-1";
      
      for (let i = 0; i < 5; i++) {
        const result = rateLimit(key, 10, 60000);
        expect(result.allowed).toBe(true);
        expect(result.retryAfterSeconds).toBeGreaterThan(0);
      }
    });

    it("should block requests exceeding limit", () => {
      const key = "test-client-2";
      const limit = 3;

      // Exhaust the limit
      for (let i = 0; i < limit; i++) {
        rateLimit(key, limit, 60000);
      }

      // Next request should be blocked
      const result = rateLimit(key, limit, 60000);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("should reset bucket after window expires", () => {
      const key = "test-client-3";
      const windowMs = 100; // 100ms window for testing

      // Exhaust the limit
      for (let i = 0; i < 3; i++) {
        rateLimit(key, 3, windowMs);
      }

      // Should be blocked
      expect(rateLimit(key, 3, windowMs).allowed).toBe(false);

      // Wait for window to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          // Should be allowed again
          const result = rateLimit(key, 3, windowMs);
          expect(result.allowed).toBe(true);
          resolve(undefined);
        }, windowMs + 10);
      });
    });
  });

  describe("Isolation Between Keys", () => {
    it("should isolate different client keys", () => {
      const limit = 5;

      // Exhaust limit for client A
      for (let i = 0; i < limit; i++) {
        rateLimit("client-a", limit, 60000);
      }

      // Client A should be blocked
      expect(rateLimit("client-a", limit, 60000).allowed).toBe(false);

      // Client B should still be allowed
      expect(rateLimit("client-b", limit, 60000).allowed).toBe(true);
    });

    it("should handle many unique keys independently", () => {
      const limit = 10;

      for (let i = 0; i < 100; i++) {
        const key = `client-${i}`;
        const result = rateLimit(key, limit, 60000);
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe("Retry-After Calculation", () => {
    it("should provide accurate retry-after time", () => {
      const key = "test-retry";
      const windowMs = 5000; // 5 seconds

      // First request sets the window
      const firstResult = rateLimit(key, 1, windowMs);
      expect(firstResult.allowed).toBe(true);
      expect(firstResult.retryAfterSeconds).toBe(5);

      // Second request should be blocked with retry time
      const secondResult = rateLimit(key, 1, windowMs);
      expect(secondResult.allowed).toBe(false);
      expect(secondResult.retryAfterSeconds).toBeGreaterThan(0);
      expect(secondResult.retryAfterSeconds).toBeLessThanOrEqual(5);
    });

    it("should return minimum 1 second for retry-after", () => {
      const key = "test-min-retry";
      const windowMs = 50; // Very short window

      // First request
      rateLimit(key, 1, windowMs);

      // Wait almost the entire window
      return new Promise((resolve) => {
        setTimeout(() => {
          // Blocked request should still report at least 1 second
          const result = rateLimit(key, 1, windowMs);
          if (!result.allowed) {
            expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
          }
          resolve(undefined);
        }, 40);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle limit of 1 correctly", () => {
      const key = "test-limit-1";

      expect(rateLimit(key, 1, 60000).allowed).toBe(true);
      expect(rateLimit(key, 1, 60000).allowed).toBe(false);
    });

    it("should handle very small window", () => {
      const key = "test-small-window";

      // Should still work with 1ms window
      const result = rateLimit(key, 10, 1);
      expect(result.allowed).toBe(true);
    });

    it("should handle large limit values", () => {
      const key = "test-large-limit";
      const largeLimit = 10000;

      const result = rateLimit(key, largeLimit, 60000);
      expect(result.allowed).toBe(true);
    });

    it("should handle special characters in keys", () => {
      const specialKeys = [
        "key:with:colons",
        "key/with/slashes",
        "key.with.dots",
        "key@with@ats",
        "key-with-dashes",
        "key_with_underscores",
        "key with spaces",
        "🔑emoji-key",
        "key\nwith\nnewlines",
        "key\twith\ttabs",
      ];

      specialKeys.forEach((key) => {
        const result = rateLimit(key, 10, 60000);
        expect(result.allowed).toBe(true);
      });
    });

    it("should handle empty string key gracefully", () => {
      const result = rateLimit("", 10, 60000);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Concurrent Request Simulation", () => {
    it("should handle rapid sequential requests", () => {
      const key = "test-rapid";
      const limit = 100;
      let allowedCount = 0;

      for (let i = 0; i < 150; i++) {
        const result = rateLimit(key, limit, 60000);
        if (result.allowed) allowedCount++;
      }

      expect(allowedCount).toBe(limit);
    });

    it("should maintain accurate count across many requests", () => {
      const key = "test-accuracy";
      const limit = 50;

      // First batch: exactly at limit
      for (let i = 0; i < limit; i++) {
        expect(rateLimit(key, limit, 60000).allowed).toBe(true);
      }

      // Next batch: should all be blocked
      for (let i = 0; i < 10; i++) {
        expect(rateLimit(key, limit, 60000).allowed).toBe(false);
      }
    });
  });
});

// Re-import vi for the beforeEach hook
import { vi } from "vitest";
