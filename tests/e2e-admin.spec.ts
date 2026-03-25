import { test, expect, type Page } from '@playwright/test';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin.chimera';

test.describe('Admin portal', () => {
  test.setTimeout(30000);

  async function loginAsAdmin(page: Page) {
    await page.goto('/admin');
    await page.getByPlaceholder('Admin password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin\/dashboard/);
  }

  // --- Auth ---

  test('login page renders and rejects wrong password', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('Chimera')).toBeVisible();
    await expect(page.getByText('Admin')).toBeVisible();

    await page.getByPlaceholder('Admin password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText(/Invalid password/i)).toBeVisible();
  });

  test('middleware redirects unauthenticated requests to /admin', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForURL(/\/admin$/);
    await expect(page.getByPlaceholder('Admin password')).toBeVisible();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('sign out clears session', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.waitForURL(/\/admin$/);
    await expect(page.getByPlaceholder('Admin password')).toBeVisible();
  });

  // --- Dashboard ---

  test('dashboard shows stat cards', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText('Active Projects')).toBeVisible();
    await expect(page.getByText('Budget Allocated')).toBeVisible();
    await expect(page.getByText('Outstanding')).toBeVisible();
  });

  // --- Clients ---

  test('clients page lists registered clients', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Clients' }).click();
    await page.waitForURL(/\/admin\/clients$/);
    await expect(page.getByText('All Clients')).toBeVisible();
    // The E2E test user registered in global setup should be here
    await expect(page.getByText('E2E Test Client')).toBeVisible();
  });

  test('client detail page shows projects, invoices, memory', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/clients');
    await page.getByText('E2E Test Client').click();
    await page.waitForURL(/\/admin\/clients\/.+/);
    await expect(page.getByText('Projects')).toBeVisible();
    await expect(page.getByText('Invoices')).toBeVisible();
    await expect(page.getByText(/View Message Thread/i)).toBeVisible();
  });

  // --- Projects ---

  test('projects page loads and shows project list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Projects' }).click();
    await page.waitForURL(/\/admin\/projects$/);
    await expect(page.getByText('All Projects')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
  });

  test('can create a new project', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/projects');
    await page.getByRole('button', { name: 'New Project' }).click();

    await page.getByPlaceholder(/e.g. Master Bathroom/i).fill('E2E Test Project');
    await page.locator('input[type="date"]').fill('2026-12-31');
    await page.getByRole('button', { name: 'Create Project' }).click();

    await expect(page.getByText('E2E Test Project')).toBeVisible({ timeout: 5000 });
  });

  // --- Invoices ---

  test('invoices page shows summary and list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Invoices' }).click();
    await page.waitForURL(/\/admin\/invoices$/);
    await expect(page.getByText('Total Invoiced')).toBeVisible();
    await expect(page.getByText('All Invoices')).toBeVisible();
  });

  // --- Messages ---

  test('messages page shows threads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Messages' }).click();
    await page.waitForURL(/\/admin\/messages$/);
    await expect(page.getByText('All Threads')).toBeVisible();
  });

  test('can send a PM reply from admin message thread', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/messages');

    const threadLink = page.locator('a[href^="/admin/messages/"]').first();
    const count = await threadLink.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await threadLink.click();
    await page.waitForURL(/\/admin\/messages\/.+/);

    const textarea = page.getByPlaceholder(/Reply as Project Manager/i);
    await textarea.fill('This is a PM reply from the admin E2E test.');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('This is a PM reply from the admin E2E test.')).toBeVisible({ timeout: 5000 });
  });

  // --- Documents ---

  test('documents page renders upload zone', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Documents' }).click();
    await page.waitForURL(/\/admin\/documents$/);
    await expect(page.getByText(/Drop a contractor document/i)).toBeVisible();
  });
});
