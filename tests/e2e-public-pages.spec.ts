import { expect, test } from "@playwright/test";

test.describe("Health check", () => {
  test("GET /api/health returns 200 with ok status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json() as { data: { status: string } };
    expect(body.data).toMatchObject({ status: "ok" });
  });
});

test.describe("Public page navigation", () => {
  test("home page loads with hero heading and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "CRAFT THAT LASTS" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start Your Project" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Speak With Us" })).toBeVisible();
  });

  test("services page loads with correct heading and tier cards", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: /SERVICES THAT/i })).toBeVisible();
    await expect(page.getByText("Luxury", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Quality", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Smart", { exact: true }).first()).toBeVisible();
  });

  test("projects page loads with featured project cards", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Featured Projects" })).toBeVisible();
    await expect(page.getByText("Modern Kitchen Renovation")).toBeVisible();
    await expect(page.getByText("Luxury Bathroom Upgrade")).toBeVisible();
  });

  test("project planning page loads and wizard first step is visible", async ({ page }) => {
    await page.goto("/project-planning");
    await expect(page.getByText("Scope", { exact: false })).toBeVisible();
  });

  test("project planning wizard — Other scope requires description before continuing", async ({ page }) => {
    await page.goto("/project-planning");

    // Select Other — Continue should be blocked until description is typed
    await page.getByRole("button", { name: "Other" }).click();
    const continueBtn = page.getByRole("button", { name: "Continue" });
    await expect(continueBtn).toBeDisabled();
    await expect(page.getByLabel("Tell us what you'd like to renovate")).toBeVisible();

    await page.getByLabel("Tell us what you'd like to renovate").fill("Garage and workshop");
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();
    await expect(page.getByText("When do you want this completed?")).toBeVisible();
  });

  test("project planning wizard advances through all steps", async ({ page }) => {
    await page.goto("/project-planning");

    // Step 1: Scope
    await page.getByRole("button", { name: "Kitchen" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Timeline
    await page.getByRole("button", { name: "Next 3 months" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Budget
    await page.getByRole("button", { name: "Under $50k" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 4: Contact details (inputs use placeholder, not label)
    await expect(page.getByPlaceholder("Your name")).toBeVisible();
    await expect(page.getByPlaceholder("Email address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit Project Brief" })).toBeVisible();
  });

  test("nav header is visible on all public pages", async ({ page }) => {
    for (const path of ["/", "/services", "/projects", "/contact"]) {
      await page.goto(path);
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("link", { name: "Chimera Enterprise" })).toBeVisible();
    }
  });
});
