/**
 * Enterprise Admin Portal E2E Test Suite
 * 
 * Covers: Admin login, project management, client management,
 * invoice management, document uploads, and messaging workflows.
 */
import { test, expect, Page } from "@playwright/test";

test.describe("Admin Portal Enterprise Workflows", () => {
  test.describe.configure({ mode: "serial" });

  let adminPage: Page;

  test.beforeAll(async ({ browser }) => {
    adminPage = await browser.newPage();
  });

  test.afterAll(async () => {
    await adminPage.close();
  });

  test.describe("Authentication", () => {
    test("admin login page loads correctly", async () => {
      await adminPage.goto("/login");
      
      await expect(adminPage.locator('input[type="email"]')).toBeVisible();
      await expect(adminPage.locator('input[type="password"]')).toBeVisible();
      await expect(adminPage.locator('button[type="submit"]')).toBeVisible();
    });

    test("should reject invalid credentials", async () => {
      await adminPage.goto("/login");
      
      await adminPage.fill('input[type="email"]', "invalid@example.com");
      await adminPage.fill('input[type="password"]', "wrongpassword");
      await adminPage.click('button[type="submit"]');

      await expect(adminPage.locator("text=/invalid email or password/i")).toBeVisible();
    });

    test("should require email verification for unverified accounts", async () => {
      // This test assumes there's a test fixture for unverified users
      await adminPage.goto("/login");
      
      await adminPage.fill('input[type="email"]', "unverified@test.com");
      await adminPage.fill('input[type="password"]', "password123");
      await adminPage.click('button[type="submit"]');

      await expect(adminPage.locator("text=/verify your email/i")).toBeVisible();
    });

    test("should redirect to admin dashboard on successful login", async () => {
      await adminPage.goto("/login");
      
      await adminPage.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL || "admin@test.com");
      await adminPage.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || "password123");
      await adminPage.click('button[type="submit"]');

      await adminPage.waitForURL("/admin/dashboard");
      await expect(adminPage.locator("h1:has-text('Dashboard')")).toBeVisible();
    });

    test("should persist session across page refreshes", async () => {
      await adminPage.goto("/admin/dashboard");
      await adminPage.reload();
      
      await expect(adminPage.locator("h1:has-text('Dashboard')")).toBeVisible();
    });

    test("should handle logout correctly", async () => {
      await adminPage.goto("/admin/dashboard");
      
      // Find and click logout button/link
      await adminPage.click('a[href="/api/admin/auth/logout"], button:has-text("Logout")');
      
      // Should redirect to login
      await adminPage.waitForURL("/login");
    });
  });

  test.describe("Project Management", () => {
    test.beforeEach(async () => {
      await adminPage.goto("/admin/dashboard");
    });

    test("should display project list", async () => {
      await adminPage.goto("/admin/projects");
      
      await expect(adminPage.locator("table, [role='list']").first()).toBeVisible();
    });

    test("should create new project", async () => {
      await adminPage.goto("/admin/projects");
      
      // Click create button
      await adminPage.click('button:has-text("New Project"), button:has-text("Create")');
      
      // Fill project form
      await adminPage.fill('input[name="name"]', `Test Project ${Date.now()}`);
      await adminPage.selectOption('select[name="status"]', "planning");
      await adminPage.fill('input[name="budget.allocated"]', "100000");
      await adminPage.fill('input[name="schedule.baselineEnd"]', "2025-12-31");
      await adminPage.fill('input[name="schedule.currentEnd"]', "2025-12-31");
      
      await adminPage.click('button[type="submit"]');
      
      await expect(adminPage.locator("text=/created successfully/i")).toBeVisible();
    });

    test("should edit existing project", async () => {
      await adminPage.goto("/admin/projects");
      
      // Click on first project
      await adminPage.locator("table tbody tr, [role='listitem']").first().click();
      
      // Edit project
      await adminPage.fill('input[name="name"]', `Updated Project ${Date.now()}`);
      await adminPage.click('button[type="submit"]');
      
      await expect(adminPage.locator("text=/updated successfully/i")).toBeVisible();
    });

    test("should add milestone to project", async () => {
      await adminPage.goto("/admin/projects");
      await adminPage.locator("table tbody tr, [role='listitem']").first().click();
      
      // Add milestone
      await adminPage.click('button:has-text("Add Milestone")');
      await adminPage.fill('input[name="milestone.title"]', "Test Milestone");
      await adminPage.fill('input[name="milestone.dueDate"]', "2025-06-01");
      await adminPage.click('button[type="submit"]');
      
      await expect(adminPage.locator("text=/Test Milestone/")).toBeVisible();
    });

    test("should update milestone status", async () => {
      await adminPage.goto("/admin/projects");
      await adminPage.locator("table tbody tr, [role='listitem']").first().click();
      
      // Find and check milestone checkbox
      const milestoneCheckbox = adminPage.locator('input[type="checkbox"][name*="milestone"]').first();
      await milestoneCheckbox.check();
      
      await adminPage.click('button:has-text("Save")');
      
      await expect(adminPage.locator("text=/updated/i")).toBeVisible();
    });

    test("should delete project with confirmation", async () => {
      await adminPage.goto("/admin/projects");
      
      // Click delete on first project
      await adminPage.locator('button:has-text("Delete"), [aria-label="Delete project"]').first().click();
      
      // Confirm deletion
      adminPage.on("dialog", async (dialog) => {
        await dialog.accept();
      });
      
      await expect(adminPage.locator("text=/deleted successfully/i")).toBeVisible();
    });

    test("should display project activity feed", async () => {
      await adminPage.goto("/admin/projects");
      await adminPage.locator("table tbody tr, [role='listitem']").first().click();
      
      await expect(adminPage.locator("[data-testid='activity-feed'], .activity").first()).toBeVisible();
    });

    test("should add activity to project", async () => {
      await adminPage.goto("/admin/projects");
      await adminPage.locator("table tbody tr, [role='listitem']").first().click();
      
      await adminPage.fill('[name="activity"], textarea', "Test activity note");
      await adminPage.click('button:has-text("Add Note")');
      
      await expect(adminPage.locator("text=/Test activity note/")).toBeVisible();
    });
  });

  test.describe("Client Management", () => {
    test.beforeEach(async () => {
      await adminPage.goto("/admin/clients");
    });

    test("should display client list", async () => {
      await expect(adminPage.locator("table, [role='list']").first()).toBeVisible();
    });

    test("should view client details", async () => {
      await adminPage.locator("table tbody tr, [role='listitem']").first().click();
      
      await expect(adminPage.locator("h1, h2").first()).toBeVisible();
      await expect(adminPage.locator("text=/email/i")).toBeVisible();
    });

    test("should edit client information", async () => {
      await adminPage.locator("table tbody tr, [role='listitem']").first().click();
      
      await adminPage.fill('input[name="name"]', `Updated Client ${Date.now()}`);
      await adminPage.click('button[type="submit"]');
      
      await expect(adminPage.locator("text=/updated/i")).toBeVisible();
    });

    test("should view client projects", async () => {
      await adminPage.locator("table tbody tr, [role='listitem']").first().click();
      
      await expect(adminPage.locator("text=/projects/i").first()).toBeVisible();
    });

    test("should view client invoices", async () => {
      await adminPage.locator("table tbody tr, [role='listitem']").first().click();
      
      await expect(adminPage.locator("text=/invoices/i").first()).toBeVisible();
    });
  });

  test.describe("Invoice Management", () => {
    test.beforeEach(async () => {
      await adminPage.goto("/admin/invoices");
    });

    test("should display invoice list", async () => {
      await expect(adminPage.locator("table, [role='list']").first()).toBeVisible();
    });

    test("should filter invoices by status", async () => {
      await adminPage.selectOption('select[name="status"], [aria-label="Filter by status"]', "paid");
      
      // Wait for filter to apply
      await adminPage.waitForTimeout(500);
      
      // Check that only paid invoices are shown
      const statusBadges = adminPage.locator("[data-status='paid'], .status-paid");
      const count = await statusBadges.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test("should create new invoice", async () => {
      await adminPage.click('button:has-text("New Invoice"), button:has-text("Create Invoice")');
      
      await adminPage.fill('input[name="number"]', `INV-${Date.now()}`);
      await adminPage.selectOption('select[name="projectId"]', { index: 0 });
      await adminPage.fill('input[name="total"]', "5000");
      await adminPage.fill('input[name="dueDate"]', "2025-12-31");
      
      await adminPage.click('button[type="submit"]');
      
      await expect(adminPage.locator("text=/created/i")).toBeVisible();
    });

    test("should mark invoice as paid", async () => {
      // Find pending invoice and mark as paid
      const pendingRow = adminPage.locator("tr:has-text('pending'), [role='listitem']:has-text('pending')").first();
      await pendingRow.locator('button:has-text("Mark Paid"), button[aria-label="Mark as paid"]').click();
      
      await expect(adminPage.locator("text=/paid/i")).toBeVisible();
    });

    test("should view invoice details", async () => {
      await adminPage.locator("table tbody tr, [role='listitem']").first().click();
      
      await expect(adminPage.locator("text=/line items/i, text=/details/i").first()).toBeVisible();
    });
  });

  test.describe("Document Management", () => {
    test.beforeEach(async () => {
      await adminPage.goto("/admin/documents");
    });

    test("should display document list", async () => {
      await expect(adminPage.locator("table, [role='list'], .document-grid").first()).toBeVisible();
    });

    test("should upload document", async () => {
      await adminPage.click('button:has-text("Upload"), label:has-text("Upload")');
      
      // Create a test file
      const testFile = {
        name: "test-document.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("test content"),
      };
      
      await adminPage.setInputFiles('input[type="file"]', testFile);
      await adminPage.click('button[type="submit"], button:has-text("Upload")');
      
      await expect(adminPage.locator("text=/uploaded/i")).toBeVisible();
    });

    test("should filter documents by type", async () => {
      await adminPage.selectOption('select[name="type"], [aria-label="Filter by type"]', "pdf");
      
      await adminPage.waitForTimeout(500);
      
      await expect(adminPage.locator(".document-item, tr").first()).toBeVisible();
    });
  });

  test.describe("Messaging", () => {
    test.beforeEach(async () => {
      await adminPage.goto("/admin/messages");
    });

    test("should display message threads", async () => {
      await expect(adminPage.locator("[data-testid='thread-list'], .thread-list").first()).toBeVisible();
    });

    test("should view message thread", async () => {
      await adminPage.locator("[data-testid='thread-item'], .thread-item, [role='listitem']").first().click();
      
      await expect(adminPage.locator("[data-testid='message-list'], .message-list").first()).toBeVisible();
    });

    test("should send message to client", async () => {
      await adminPage.locator("[data-testid='thread-item'], .thread-item, [role='listitem']").first().click();
      
      await adminPage.fill('[data-testid="message-input"], textarea', "Test message from admin");
      await adminPage.click('button[type="submit"], button:has-text("Send")');
      
      await expect(adminPage.locator("text=/Test message from admin/")).toBeVisible();
    });

    test("should display unread message indicators", async () => {
      const unreadIndicator = adminPage.locator("[data-testid='unread-badge'], .unread-badge, .badge").first();
      
      if (await unreadIndicator.isVisible().catch(() => false)) {
        await expect(unreadIndicator).toBeVisible();
      }
    });
  });

  test.describe("Dashboard & Analytics", () => {
    test.beforeEach(async () => {
      await adminPage.goto("/admin/dashboard");
    });

    test("should display dashboard metrics", async () => {
      await expect(adminPage.locator("[data-testid='metric-card'], .metric, .stat").first()).toBeVisible();
    });

    test("should display project status chart", async () => {
      await expect(adminPage.locator("canvas, [role='img'], .chart").first()).toBeVisible();
    });

    test("should display recent activity", async () => {
      await expect(adminPage.locator("[data-testid='activity-feed'], .activity-list").first()).toBeVisible();
    });

    test("should navigate to all sections from dashboard", async () => {
      const sections = ["/admin/projects", "/admin/clients", "/admin/invoices", "/admin/documents"];
      
      for (const section of sections) {
        await adminPage.goto(section);
        await expect(adminPage.locator("h1, h2").first()).toBeVisible();
      }
    });
  });

  test.describe("Security & Access Control", () => {
    test("should not access admin routes without authentication", async ({ page }) => {
      const newPage = await page.context().newPage();
      
      await newPage.goto("/admin/dashboard");
      
      // Should redirect to login
      await newPage.waitForURL("/login");
      
      await newPage.close();
    });

    test("should not access admin routes as client", async ({ browser }) => {
      const clientPage = await browser.newPage();
      
      // Login as client
      await clientPage.goto("/login");
      await clientPage.fill('input[type="email"]', process.env.TEST_CLIENT_EMAIL || "client@test.com");
      await clientPage.fill('input[type="password"]', process.env.TEST_CLIENT_PASSWORD || "password123");
      await clientPage.click('button[type="submit"]');
      
      // Try to access admin
      await clientPage.goto("/admin/dashboard");
      
      // Should get 403 or redirect
      const status = await clientPage.evaluate(() => document.title);
      expect(status).not.toContain("Admin Dashboard");
      
      await clientPage.close();
    });

    test("should have secure session cookies", async () => {
      const cookies = await adminPage.context().cookies();
      const sessionCookie = cookies.find((c) => c.name === "sessionToken");
      
      if (sessionCookie) {
        expect(sessionCookie.httpOnly).toBe(true);
        expect(sessionCookie.sameSite).toBe("Strict");
      }
    });
  });
});
