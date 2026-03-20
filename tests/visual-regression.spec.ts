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
});
