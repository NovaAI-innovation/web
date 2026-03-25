import { chromium, type FullConfig } from "@playwright/test";

/**
 * Registers the canonical E2E test client before any tests run.
 * Idempotent — safe to run even if the user already exists.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:3000";

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const request = context.request;

  await request.post("/api/client-portal/auth/register", {
    data: {
      name: "E2E Test Client",
      email: "client@example.com",
      phone: "+17805550123",
      password: "password123",
    },
  });

  await context.close();
  await browser.close();
}
