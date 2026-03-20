import { expect, test } from "@playwright/test";

const pagesToAudit = ["/", "/contact", "/services", "/project-planning", "/client-portal"];

test.describe("Accessibility Audit", () => {
  for (const path of pagesToAudit) {
    test(`has core landmarks and a single h1 on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
    });
  }

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

  test("portal messaging has live status and readable controls", async ({ page }) => {
    await page.goto("/client-portal");
    await page.getByLabel("Email").fill("client@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.getByRole("link", { name: /Messages/ }).click();

    await expect(page.getByRole("button", { name: "Send Message" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark Read" })).toBeVisible();
    await expect(page.getByLabel("Send a message")).toBeVisible();
  });
});
