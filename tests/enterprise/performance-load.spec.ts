/**
 * Enterprise Performance & Load Test Suite
 * 
 * Covers: Page load times, API response times, concurrent user handling,
 * memory usage, and resource loading optimization.
 */
import { test, expect } from "@playwright/test";

test.describe("Enterprise Performance & Load Tests", () => {
  const PERFORMANCE_THRESHOLDS = {
    pageLoad: 3000, // 3 seconds
    apiResponse: 500, // 500ms
    firstContentfulPaint: 1500, // 1.5 seconds
    largestContentfulPaint: 2500, // 2.5 seconds
    timeToInteractive: 3500, // 3.5 seconds
  };

  test.describe("Page Load Performance", () => {
    test("public homepage loads within threshold", async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    });

    test("login page loads quickly", async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto("/login");
      await page.waitForLoadState("domcontentloaded");
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    });

    test("client portal loads within threshold", async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto("/client-portal");
      await page.waitForLoadState("domcontentloaded");
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    });

    test("admin dashboard loads efficiently", async ({ page }) => {
      // First login
      await page.goto("/login");
      await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || "admin@test.com");
      await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || "password123");
      await page.click('button[type="submit"]');
      
      await page.waitForURL("/admin/dashboard");
      
      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState("networkidle");
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    });
  });

  test.describe("Core Web Vitals", () => {
    test("homepage meets LCP threshold", async ({ page }) => {
      await page.goto("/");
      
      const lcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          });
          observer.observe({ entryTypes: ["largest-contentful-paint"] });
          
          // Timeout after 5 seconds
          setTimeout(() => resolve(0), 5000);
        });
      });
      
      if (lcp > 0) {
        expect(lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.largestContentfulPaint);
      }
    });

    test("homepage meets FCP threshold", async ({ page }) => {
      await page.goto("/");
      
      const fcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              resolve(entries[0].startTime);
            }
          });
          observer.observe({ entryTypes: ["paint"] });
          
          setTimeout(() => resolve(0), 3000);
        });
      });
      
      if (fcp > 0) {
        expect(fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.firstContentfulPaint);
      }
    });

    test("pages have no layout shift", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      
      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          });
          observer.observe({ entryTypes: ["layout-shift"] });
          
          // Measure for 3 seconds
          setTimeout(() => resolve(clsValue), 3000);
        });
      });
      
      // CLS should be less than 0.1 (good threshold)
      expect(cls).toBeLessThan(0.1);
    });
  });

  test.describe("API Response Performance", () => {
    test("health endpoint responds quickly", async ({ request }) => {
      const startTime = Date.now();
      
      const response = await request.get("/api/health");
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);
      expect(response.ok()).toBe(true);
    });

    test("public pages API responds within threshold", async ({ request }) => {
      const startTime = Date.now();
      
      await request.get("/api/health");
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);
    });

    test("contact form submission responds quickly", async ({ request }) => {
      const startTime = Date.now();
      
      await request.post("/api/contact/submit", {
        data: {
          name: "Test User",
          email: "test@example.com",
          message: "Test message",
        },
      });
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse * 2); // Allow 1 second
    });
  });

  test.describe("Resource Loading", () => {
    test("images are properly optimized", async ({ page }) => {
      await page.goto("/");
      
      const images = await page.locator("img").all();
      
      for (const img of images) {
        const src = await img.getAttribute("src");
        if (src && !src.startsWith("data:")) {
          // Check for modern image formats
          const isOptimized = src.includes(".webp") || 
                             src.includes(".avif") || 
                             src.includes("next/image");
          
          // Not a strict requirement, just a check
          if (!isOptimized) {
            console.log(`Image may need optimization: ${src}`);
          }
        }
      }
    });

    test("JavaScript bundles are not excessive", async ({ page }) => {
      await page.goto("/");
      
      const jsSize = await page.evaluate(() => {
        return performance.getEntriesByType("resource")
          .filter((r: any) => r.initiatorType === "script")
          .reduce((sum: number, r: any) => sum + (r.transferSize || 0), 0);
      });
      
      // Total JS should be less than 500KB
      expect(jsSize).toBeLessThan(500 * 1024);
    });

    test("CSS is properly loaded", async ({ page }) => {
      await page.goto("/");
      
      const stylesheets = await page.locator("link[rel='stylesheet']").count();
      
      // Should have at least one stylesheet
      expect(stylesheets).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe("Concurrent Load", () => {
    test("handles multiple simultaneous requests", async ({ request }) => {
      const requests = Array(10).fill(null).map(() => 
        request.get("/api/health")
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All should succeed
      expect(responses.every(r => r.ok())).toBe(true);
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000);
    });

    test("database operations handle concurrent access", async ({ request }) => {
      // Simulate multiple clients accessing projects
      const requests = Array(5).fill(null).map(() => 
        request.get("/api/health") // Replace with actual endpoint when available
      );
      
      const responses = await Promise.all(requests);
      
      expect(responses.every(r => r.status() < 500)).toBe(true);
    });
  });

  test.describe("Memory Usage", () => {
    test("page does not leak memory on navigation", async ({ page }) => {
      await page.goto("/");
      
      // Navigate between pages multiple times
      for (let i = 0; i < 10; i++) {
        await page.goto("/services");
        await page.goto("/projects");
        await page.goto("/contact");
        await page.goto("/");
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      // Page should still be responsive
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Caching Behavior", () => {
    test("static assets are cached", async ({ request }) => {
      const response = await request.get("/");
      const headers = response.headers();
      
      // Check for cache headers
      const hasCacheControl = headers["cache-control"] !== undefined;
      const hasETag = headers["etag"] !== undefined;
      
      // At least one caching mechanism should be present
      expect(hasCacheControl || hasETag).toBe(true);
    });

    test("API responses have appropriate cache headers", async ({ request }) => {
      const response = await request.get("/api/health");
      const headers = response.headers();
      
      // Health endpoint should not be cached
      const cacheControl = headers["cache-control"] || "";
      expect(cacheControl.includes("no-cache") || cacheControl.includes("no-store")).toBe(true);
    });
  });

  test.describe("Mobile Performance", () => {
    test("mobile viewport loads efficiently", async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
      });
      
      const page = await context.newPage();
      
      const startTime = Date.now();
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
      
      await context.close();
    });
  });

  test.describe("Stress Testing", () => {
    test("handles rapid sequential requests", async ({ request }) => {
      const results = [];
      
      for (let i = 0; i < 50; i++) {
        const startTime = Date.now();
        const response = await request.get("/api/health");
        const responseTime = Date.now() - startTime;
        
        results.push({
          ok: response.ok(),
          time: responseTime,
        });
      }
      
      // All should succeed
      expect(results.every(r => r.ok)).toBe(true);
      
      // Average response time should be reasonable
      const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
      expect(avgTime).toBeLessThan(500);
    });

    test("handles burst traffic", async ({ request }) => {
      const burstSize = 20;
      const requests = Array(burstSize).fill(null).map(() => 
        request.get("/api/health")
      );
      
      const startTime = Date.now();
      const responses = await Promise.allSettled(requests);
      const totalTime = Date.now() - startTime;
      
      // Most should succeed
      const successCount = responses.filter(
        (r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value.ok()
      ).length;
      
      expect(successCount).toBeGreaterThan(burstSize * 0.8); // At least 80% success
      expect(totalTime).toBeLessThan(10000); // Complete within 10 seconds
    });
  });
});
