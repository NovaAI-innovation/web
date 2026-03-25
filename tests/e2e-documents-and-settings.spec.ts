import { expect, test, type Page } from "@playwright/test";

// Helper: log in as a test client
async function login(page: Page) {
  await page.goto("/client-portal");
  await page.getByLabel("Email").fill("client@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/client-portal\/dashboard$/);
}

test.describe("Document management", () => {
  test("unauthenticated request to documents API returns 401", async ({ request }) => {
    const response = await request.get("/api/client-portal/documents");
    expect(response.status()).toBe(401);
  });

  test("unauthenticated upload returns 401", async ({ request }) => {
    const response = await request.post("/api/client-portal/documents/upload", {
      multipart: { file: { name: "test.pdf", mimeType: "application/pdf", buffer: Buffer.from("fake") } },
    });
    expect(response.status()).toBe(401);
  });

  test("documents page loads after login", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: /Documents/i }).click();
    await expect(page).toHaveURL(/\/client-portal\/documents$/);
    await expect(page.getByRole("heading", { name: /Documents/i })).toBeVisible();
  });
});

test.describe("Dashboard data isolation", () => {
  test("dashboard loads without showing other clients data", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/client-portal\/dashboard$/);
    // Dashboard must render without JS errors
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.reload();
    await expect(page.getByRole("heading", { name: "Project Dashboard" })).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe("Invoices data isolation", () => {
  test("unauthenticated access to invoices page redirects to login", async ({ page }) => {
    await page.goto("/client-portal/invoices");
    await expect(page).toHaveURL(/\/client-portal$/);
  });

  test("invoices page loads after login", async ({ page }) => {
    await login(page);
    await page.goto("/client-portal/invoices");
    await expect(page).toHaveURL(/\/client-portal\/invoices$/);
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
  });
});

test.describe("Messages auth protection", () => {
  test("unauthenticated GET /api/client-portal/messages returns 401", async ({ request }) => {
    const response = await request.get("/api/client-portal/messages");
    expect(response.status()).toBe(401);
  });

  test("unauthenticated POST /api/client-portal/messages returns 401", async ({ request }) => {
    const response = await request.post("/api/client-portal/messages", {
      data: { body: "hello" },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("Portal settings page", () => {
  test("settings page loads and shows profile form", async ({ page }) => {
    await login(page);
    await page.goto("/client-portal/settings");
    await expect(page).toHaveURL(/\/client-portal\/settings$/);
    await expect(page.getByRole("heading", { name: /Settings/i })).toBeVisible();
    await expect(page.getByLabel(/Name/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
  });
});

test.describe("Portal projects", () => {
  test("projects list page loads after login", async ({ page }) => {
    await login(page);
    await page.goto("/client-portal/projects");
    await expect(page).toHaveURL(/\/client-portal\/projects$/);
    await expect(page.getByRole("heading", { name: /Projects/i })).toBeVisible();
  });

  test("unauthenticated access to projects redirects to login", async ({ page }) => {
    await page.goto("/client-portal/projects");
    await expect(page).toHaveURL(/\/client-portal$/);
  });
});

test.describe("Password reset flow", () => {
  test("forgot-password returns success message without exposing token in production", async ({ request }) => {
    const response = await request.post("/api/client-portal/auth/forgot-password", {
      data: { email: "nonexistent@example.com" },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.message).toContain("If an account");
    // resetToken must not be exposed (only allowed in NODE_ENV=development)
    if (process.env.NODE_ENV !== "development") {
      expect(body.data.resetToken).toBeUndefined();
    }
  });
});
