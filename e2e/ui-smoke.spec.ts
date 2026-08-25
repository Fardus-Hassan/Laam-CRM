import { expect, test, type Page } from '@playwright/test';

const WEB = process.env.E2E_WEB_URL ?? 'http://laam.localhost:3000';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e.admin@laam.test';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'e2e.admin2026';
const DEVICE_ID = process.env.E2E_DEVICE_ID ?? 'e2e-device';

async function login(page: Page) {
  await page.addInitScript((deviceId) => {
    window.localStorage.setItem('laam_device_id', deviceId);
  }, DEVICE_ID);

  await page.goto(`${WEB}/login`);
  await page.getByPlaceholder('you@company.com').fill(EMAIL);
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /^Sign in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
}

async function expectTopBarRefresh(page: Page) {
  await expect(page.getByRole('button', { name: 'Refresh current page' })).toBeVisible();
}

async function expectTextGone(page: Page, text: string | RegExp) {
  await expect(page.getByText(text).first()).toHaveCount(0);
}

async function expectOrdersPageChrome(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\/orders(\?|$)/);
  await expect(page.getByRole('button', { name: 'Group by Status' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.getByText('Total Orders')).not.toBeVisible();

  const filtersButton = page.getByRole('button', { name: /^Filters$/ });
  const searchInput = page.getByRole('textbox', { name: 'Search orders' });
  await expect(filtersButton).toBeVisible();
  await expect(searchInput).toBeVisible();

  const filterBox = await filtersButton.boundingBox();
  const searchBox = await searchInput.boundingBox();
  expect(filterBox).not.toBeNull();
  expect(searchBox).not.toBeNull();
  expect((filterBox as NonNullable<typeof filterBox>).x).toBeLessThan(
    (searchBox as NonNullable<typeof searchBox>).x,
  );

  await expectTextGone(page, 'Manage orders, queues, and fulfillment workflows.');
}

async function expectCustomersPageChrome(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\/customers(\?|$)/);
  await expect(page.getByText('System segments')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search customers' })).toBeVisible();
  await expectTextGone(page, 'Customer workspace');
  await expectTextGone(page, /Everyday modhu & khejur buyers/i);
}

async function expectLeadsPageChrome(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\/leads(\?|$)/);
  await expect(page.getByText('Source:')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Filters$/ })).toBeVisible();
  await expect(page.getByPlaceholder('Search lead ID, name, phone, campaign, agent…')).toBeVisible();
  await expectTextGone(
    page,
    'Facebook ads, campaigns, website & landing pages — call center confirms and converts to orders.',
  );
}

async function expectInventoryPageChrome(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\/inventory\/products(\?|$)/);
  await expect(page.getByPlaceholder('Search name, SKU, supplier, tag…')).toBeVisible();
  await expect(page.getByText('Stock value')).toBeVisible();
  await expectTextGone(page, 'Product catalog');
  await expectTextGone(page, /Products, stock, suppliers, and purchases for your shop\./i);
}

async function expectContactsPageChrome(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\/contacts(\?|$)/);
  await expect(page.getByPlaceholder('Search name, mobile, ID, organization…')).toBeVisible();
  await expect(page.getByText('Suppliers', { exact: true }).first()).toBeVisible();
}

async function expectFollowupsPageChrome(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\/followups(\?|$)/);
  await expect(page.getByPlaceholder('Search name, mobile, address, product…')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Follow-ups \d+$/ }).first()).toBeVisible();
}

async function expectTasksPageChrome(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\/tasks(\?|$)/);
  await expect(page.getByPlaceholder('Search task, customer, mobile, order…')).toBeVisible();
  await expect(page.getByRole('link', { name: 'My tasks' })).toBeVisible();
}

async function visitAndAssert(
  page: Page,
  path: string,
  checker: (page: Page) => Promise<void>,
) {
  await page.goto(`${WEB}${path}`);
  await expectTopBarRefresh(page);
  await checker(page);
}

test.describe('Recent UI smoke', () => {
  test('login works', async ({ page }) => {
    await login(page);
    await expectTopBarRefresh(page);
  });

  test('orders page renders expected chrome', async ({ page }) => {
    await login(page);
    await visitAndAssert(page, '/dashboard/orders?page=1&pageSize=10', expectOrdersPageChrome);
  });

  test('customers page renders expected chrome', async ({ page }) => {
    await login(page);
    await visitAndAssert(page, '/dashboard/customers', expectCustomersPageChrome);
  });

  test('leads page renders expected chrome', async ({ page }) => {
    await login(page);
    await visitAndAssert(page, '/dashboard/leads?page=1&pageSize=10', expectLeadsPageChrome);
  });

  test('inventory products page renders expected chrome', async ({ page }) => {
    await login(page);
    await visitAndAssert(
      page,
      '/dashboard/inventory/products',
      expectInventoryPageChrome,
    );
  });

  test('contacts page renders expected chrome', async ({ page }) => {
    await login(page);
    await visitAndAssert(page, '/dashboard/contacts', expectContactsPageChrome);
  });

  test('contacts supplier view renders expected chrome', async ({ page }) => {
    await login(page);
    await visitAndAssert(page, '/dashboard/contacts?source=supplier', expectContactsPageChrome);
  });

  test('followups page renders expected chrome', async ({ page }) => {
    await login(page);
    await visitAndAssert(page, '/dashboard/followups?queue=1', expectFollowupsPageChrome);
  });

  test('tasks page renders expected chrome', async ({ page }) => {
    await login(page);
    await visitAndAssert(page, '/dashboard/tasks', expectTasksPageChrome);
  });
});
