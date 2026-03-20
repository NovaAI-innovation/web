import { expect, test } from "@playwright/test";

test.describe("Portal and Contact E2E", () => {
  test("enforces portal auth and allows login + logout flow", async ({ page }) => {
    await page.goto("/client-portal/dashboard");
    await expect(page).toHaveURL(/\/client-portal$/);

    await page.getByLabel("Email").fill("client@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/client-portal\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Project Dashboard" })).toBeVisible();

    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/client-portal$/);
  });

  test("submits contact form successfully", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Full Name").fill("Casey Sprint");
    await page.getByLabel("Email").fill("casey@example.com");
    await page.getByLabel("Phone").fill("+17805551234");
    await page.getByLabel("Project Type").selectOption("kitchen");
    await page.getByLabel("Timeline").selectOption("1-3-months");
    await page.getByLabel("Budget").selectOption("75k-150k");
    await page
      .getByLabel("Project Details")
      .fill("Need a full kitchen renovation with timeline support and permit guidance.");

    await page.getByRole("button", { name: "Submit Request" }).click();
    await expect(
      page.getByText("Thanks. Your request was received with ID:", { exact: false }),
    ).toBeVisible();
  });

  test("supports portal messaging and unread indicator", async ({ page }) => {
    await page.goto("/client-portal");
    await page.getByLabel("Email").fill("client@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.getByRole("link", { name: /Messages/ }).click();
    await expect(page).toHaveURL(/\/client-portal\/messages$/);

    const message = `E2E ping ${Date.now()}`;
    await page.getByLabel("Send a message").fill(message);
    await page.getByRole("button", { name: "Send Message" }).click();

    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByText("Project Manager", { exact: false })).toBeVisible();
  });
});
