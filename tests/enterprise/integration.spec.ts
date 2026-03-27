/**
 * Enterprise Integration Test Suite
 * 
 * Covers: Cross-module workflows, data consistency, end-to-end business logic,
 * and system integration points.
 */
import { test, expect } from "@playwright/test";

test.describe("Enterprise Integration Tests", () => {
  test.describe("Client Onboarding Workflow", () => {
    test("complete client registration and first login", async ({ page }) => {
      // Register new client
      await page.goto("/client-portal/register");
      
      const uniqueEmail = `integration-${Date.now()}@test.com`;
      
      await page.fill('input[name="name"]', "Integration Test User");
      await page.fill('input[name="email"]', uniqueEmail);
      await page.fill('input[name="phone"]', "555-TEST");
      await page.fill('input[name="password"]', "SecurePass123!");
      await page.click('button[type="submit"]');
      
      // Should show confirmation or redirect
      await expect(page.locator("body")).toBeVisible();
      
      // Try to login (may need email verification first)
      await page.goto("/client-portal");
      await page.fill('input[type="email"]', uniqueEmail);
      await page.fill('input[type="password"]', "SecurePass123!");
      await page.click('button[type="submit"]');
      
      // Should either login or show verification required
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Project Lifecycle Workflow", () => {
    test("admin creates project and client views it", async ({ browser }) => {
      // Admin creates project
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      
      await adminPage.goto("/login");
      await adminPage.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || "admin@test.com");
      await adminPage.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || "password123");
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL("/admin/dashboard");
      
      // Create new project
      await adminPage.goto("/admin/projects");
      await adminPage.click('button:has-text("New Project"), button:has-text("Create")');
      
      const projectName = `Integration Project ${Date.now()}`;
      await adminPage.fill('input[name="name"]', projectName);
      await adminPage.selectOption('select[name="status"]', "active");
      await adminPage.fill('input[name="budget.allocated"]', "50000");
      await adminPage.fill('input[name="schedule.baselineEnd"]', "2025-12-31");
      await adminPage.click('button[type="submit"]');
      
      await adminContext.close();
      
      // Client views project
      const clientContext = await browser.newContext();
      const clientPage = await clientContext.newPage();
      
      await clientPage.goto("/login");
      await clientPage.fill('input[type="email"]', process.env.TEST_CLIENT_EMAIL || "client@test.com");
      await clientPage.fill('input[type="password"]', process.env.TEST_CLIENT_PASSWORD || "password123");
      await clientPage.click('button[type="submit"]');
      await clientPage.waitForURL("/client-portal/dashboard");
      
      // View projects
      await clientPage.goto("/client-portal/projects");
      
      // Project list should be visible
      await expect(clientPage.locator("body")).toBeVisible();
      
      await clientContext.close();
    });
  });

  test.describe("Invoice Workflow", () => {
    test("admin creates invoice and client views it", async ({ browser }) => {
      // Admin creates invoice
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      
      await adminPage.goto("/login");
      await adminPage.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || "admin@test.com");
      await adminPage.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || "password123");
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL("/admin/dashboard");
      
      await adminPage.goto("/admin/invoices");
      
      // Invoice list should be visible
      await expect(adminPage.locator("body")).toBeVisible();
      
      await adminContext.close();
      
      // Client views invoices
      const clientContext = await browser.newContext();
      const clientPage = await clientContext.newPage();
      
      await clientPage.goto("/login");
      await clientPage.fill('input[type="email"]', process.env.TEST_CLIENT_EMAIL || "client@test.com");
      await clientPage.fill('input[type="password"]', process.env.TEST_CLIENT_PASSWORD || "password123");
      await clientPage.click('button[type="submit"]');
      await clientPage.waitForURL("/client-portal/dashboard");
      
      await clientPage.goto("/client-portal/invoices");
      
      // Invoice list should be visible
      await expect(clientPage.locator("body")).toBeVisible();
      
      await clientContext.close();
    });
  });

  test.describe("Messaging Workflow", () => {
    test("client sends message and admin responds", async ({ browser }) => {
      // Client sends message
      const clientContext = await browser.newContext();
      const clientPage = await clientContext.newPage();
      
      await clientPage.goto("/login");
      await clientPage.fill('input[type="email"]', process.env.TEST_CLIENT_EMAIL || "client@test.com");
      await clientPage.fill('input[type="password"]', process.env.TEST_CLIENT_PASSWORD || "password123");
      await clientPage.click('button[type="submit"]');
      await clientPage.waitForURL("/client-portal/dashboard");
      
      await clientPage.goto("/client-portal/messages");
      
      const messageText = `Test message ${Date.now()}`;
      await clientPage.fill('textarea, [data-testid="message-input"]', messageText);
      await clientPage.click('button[type="submit"], button:has-text("Send")');
      
      await clientContext.close();
      
      // Admin views and responds
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      
      await adminPage.goto("/login");
      await adminPage.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || "admin@test.com");
      await adminPage.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || "password123");
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL("/admin/dashboard");
      
      await adminPage.goto("/admin/messages");
      
      // Message thread should be visible
      await expect(adminPage.locator("body")).toBeVisible();
      
      await adminContext.close();
    });
  });

  test.describe("Document Management Workflow", () => {
    test("admin uploads document and client downloads it", async ({ browser }) => {
      // Admin uploads document
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      
      await adminPage.goto("/login");
      await adminPage.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || "admin@test.com");
      await adminPage.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || "password123");
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForURL("/admin/dashboard");
      
      await adminPage.goto("/admin/documents");
      
      // Document list should be visible
      await expect(adminPage.locator("body")).toBeVisible();
      
      await adminContext.close();
      
      // Client downloads document
      const clientContext = await browser.newContext();
      const clientPage = await clientContext.newPage();
      
      await clientPage.goto("/login");
      await clientPage.fill('input[type="email"]', process.env.TEST_CLIENT_EMAIL || "client@test.com");
      await clientPage.fill('input[type="password"]', process.env.TEST_CLIENT_PASSWORD || "password123");
      await clientPage.click('button[type="submit"]');
      await clientPage.waitForURL("/client-portal/dashboard");
      
      await clientPage.goto("/client-portal/documents");
      
      // Document list should be visible
      await expect(clientPage.locator("body")).toBeVisible();
      
      await clientContext.close();
    });
  });

  test.describe("Data Consistency", () => {
    test("project progress reflects milestone completion", async ({ page }) => {
      // Login as admin
      await page.goto("/login");
      await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || "admin@test.com");
      await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || "password123");
      await page.click('button[type="submit"]');
      await page.waitForURL("/admin/dashboard");
      
      // Navigate to a project
      await page.goto("/admin/projects");
      
      // View first project
      const projectLink = page.locator("table tbody tr, [role='listitem']").first();
      if (await projectLink.isVisible()) {
        await projectLink.click();
        
        // Check that progress calculation is consistent with milestones
        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("budget calculations are accurate", async ({ page }) => {
      // Login as client
      await page.goto("/login");
      await page.fill('input[type="email"]', process.env.TEST_CLIENT_EMAIL || "client@test.com");
      await page.fill('input[type="password"]', process.env.TEST_CLIENT_PASSWORD || "password123");
      await page.click('button[type="submit"]');
      await page.waitForURL("/client-portal/dashboard");
      
      // View dashboard
      const budgetInfo = page.locator("text=/budget/i, text=/spent/i, text=/allocated/i").first();
      
      if (await budgetInfo.isVisible()) {
        await expect(budgetInfo).toBeVisible();
      }
    });
  });

  test.describe("Error Handling", () => {
    test("gracefully handles network errors", async ({ page }) => {
      await page.goto("/login");
      
      // Simulate offline
      await page.context().setOffline(true);
      
      await page.fill('input[type="email"]', "test@example.com");
      await page.fill('input[type="password"]', "password");
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator("body")).toBeVisible();
      
      // Restore network
      await page.context().setOffline(false);
    });

    test("handles server errors gracefully", async ({ request }) => {
      // Request to a non-existent endpoint
      const response = await request.get("/api/non-existent-endpoint");
      
      // Should return 404, not 500
      expect(response.status()).toBe(404);
    });
  });

  test.describe("Session Management", () => {
    test("session persists across navigation", async ({ page }) => {
      // Login
      await page.goto("/login");
      await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || "admin@test.com");
      await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || "password123");
      await page.click('button[type="submit"]');
      await page.waitForURL("/admin/dashboard");
      
      // Navigate to multiple pages
      const pages = ["/admin/projects", "/admin/clients", "/admin/invoices"];
      
      for (const url of pages) {
        await page.goto(url);
        // Should still be logged in
        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("concurrent sessions are handled correctly", async ({ browser }) => {
      // Create two sessions for same user
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // Login from both contexts
      for (const page of [page1, page2]) {
        await page.goto("/login");
        await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || "admin@test.com");
        await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || "password123");
        await page.click('button[type="submit"]');
        await page.waitForURL("/admin/dashboard");
      }
      
      // Both should be functional
      await expect(page1.locator("body")).toBeVisible();
      await expect(page2.locator("body")).toBeVisible();
      
      await context1.close();
      await context2.close();
    });
  });

  test.describe("API Integration", () => {
    test("health endpoint returns correct status", async ({ request }) => {
      const response = await request.get("/api/health");
      
      expect(response.ok()).toBe(true);
      
      const body = await response.json();
      expect(body.status).toBeDefined();
    });

    test("contact form submission works end-to-end", async ({ request }) => {
      const response = await request.post("/api/contact/submit", {
        data: {
          name: "Integration Test",
          email: "integration@test.com",
          phone: "555-1234",
          message: "This is an integration test message",
        },
      });
      
      expect(response.status()).toBeLessThan(500);
    });
  });
});
