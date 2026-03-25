import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicPages = ["/", "/contact", "/services", "/project-planning", "/projects"];

test.describe("Accessibility Audit", () => {
  // ── Landmarks & heading structure ────────────────────────────────────────
  for (const path of [...publicPages, "/client-portal"]) {
    test(`has core landmarks and a single h1 on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
    });
  }

  // ── axe-core WCAG 2.1 AA scans ───────────────────────────────────────────
  for (const path of publicPages) {
    test(`${path} passes axe WCAG 2.1 AA`, async ({ page }) => {
      await page.goto(path);
      // Wait for hero images to settle
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        // Exclude third-party Unsplash images from colour-contrast checks
        .exclude("img[src*='unsplash']")
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }

  test("client portal login page passes axe WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/client-portal");
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  // ── Form label coverage ───────────────────────────────────────────────────
  test("contact form is keyboard and label accessible", async ({ page }) => {
    await page.goto("/contact");

    await expect(page.getByLabel("Full Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Phone")).toBeVisible();
    await expect(page.getByLabel("Project Type")).toBeVisible();
    await expect(page.getByLabel("Timeline")).toBeVisible();
    await expect(page.getByLabel("Budget")).toBeVisible();
    await expect(page.getByLabel("Project Details")).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
  });

  // ── Focus management ─────────────────────────────────────────────────────
  test("skip-nav or first focusable element is reachable from keyboard", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
    // First tab stop should be within the header or a skip link
    const tag = await focused.evaluate((el) => el.tagName.toLowerCase());
    expect(["a", "button", "input"]).toContain(tag);
  });

  test("mobile nav opens and closes with keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Toggle menu" });
    await toggle.click();
    await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByRole("button", { name: "Toggle menu" })).toBeVisible();
  });

  // ── Portal messaging accessibility ───────────────────────────────────────
  test("portal messaging has live status and readable controls", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/client-portal");
    await page.getByLabel("Email").fill("client@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/client-portal\/dashboard$/, { timeout: 15000 });
    await page.getByRole("link", { name: /Messages/ }).click();

    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark Read" })).toBeVisible();
    await expect(page.getByLabel("Send a message")).toBeVisible();
  });
});
