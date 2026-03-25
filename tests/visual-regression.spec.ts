import { expect, test } from "@playwright/test";

test.describe("Visual Regression", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Visual baselines are maintained in Chromium.");

  test("home hero remains visually stable", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "CRAFT THAT LASTS" })).toBeVisible();
    await expect(page.locator("main > section").first()).toHaveScreenshot("home-hero.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("contact page layout remains visually stable", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "Get in touch" })).toBeVisible();
    await expect(page.locator("main")).toHaveScreenshot("contact-layout.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("services page hero remains visually stable", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: /SERVICES THAT/i })).toBeVisible();
    await expect(page.locator("main > section").first()).toHaveScreenshot("services-hero.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("projects page remains visually stable", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Featured Projects" })).toBeVisible();
    await expect(page.locator("main > section").first()).toHaveScreenshot("projects-hero.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("client portal login page remains visually stable", async ({ page }) => {
    await page.goto("/client-portal");
    await expect(page.getByRole("heading", { name: "Client Portal" })).toBeVisible();
    await expect(page.locator("main")).toHaveScreenshot("portal-login.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });
});
