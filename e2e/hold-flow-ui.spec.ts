import { expect, test, type Page } from '@playwright/test';

const WEB = process.env.E2E_WEB_URL ?? 'http://laam.localhost:3000';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e.admin@laam.test';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'e2e.admin2026';
const DEVICE_ID = process.env.E2E_DEVICE_ID ?? 'e2e-device';
const STAMP = Date.now();

async function pickComboboxOption(page: Page, triggerId: string, label: RegExp) {
  await page.locator(`#${triggerId}`).click();
  const menu = page.locator('[data-radix-popper-content-wrapper]').last();
  await menu.locator('button').filter({ hasText: label }).first().click();
}

async function login(page: Page) {
  await page.goto(`${WEB}/login`);
  await page.evaluate((deviceId) => {
    localStorage.setItem('laam_device_id', deviceId);
  }, DEVICE_ID);

  await page.getByPlaceholder('you@company.com').fill(EMAIL);
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /^Sign in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
}

test.describe('Hold workflow — browser UI', () => {
  test('login → create Hold order → follow-up queue → cancel closes follow-up', async ({ page }) => {
    const phone = `017${String(STAMP).slice(-8)}`;
    const customerName = `UI Hold ${STAMP}`;

    await login(page);

    await page.goto(`${WEB}/dashboard/orders/new`);
    await expect(page.locator('#mobile')).toBeVisible({ timeout: 45_000 });

    await page.locator('#mobile').fill(phone);
    await page.locator('#name').fill(customerName);
    await page.locator('#address').fill('UI test address, Dhaka');

    await page.waitForTimeout(1200);

    const addProduct = page.getByRole('button', { name: /^Add /i }).first();
    await expect(addProduct).toBeVisible({ timeout: 45_000 });
    await addProduct.click();
    await expect(page.getByText('No products added')).not.toBeVisible({ timeout: 15_000 });

    await pickComboboxOption(page, 'orderSource', /phone|website|facebook|manual/i);
    await pickComboboxOption(page, 'orderStatus', /^On Hold$/i);
    await expect(page.getByText('Hold follow-up date')).toBeVisible();

    const paymentLabel = (await page.locator('#paymentMethod').textContent())?.trim() ?? '';
    if (!paymentLabel || paymentLabel.toLowerCase().includes('select')) {
      await pickComboboxOption(page, 'paymentMethod', /cod|cash on delivery/i);
    }

    await page.getByRole('button', { name: /^Submit$/i }).click();

    const createdToast = page.getByText(/Order .+ created/i);
    await expect(createdToast).toBeVisible({ timeout: 60_000 });
    const toastText = (await createdToast.textContent()) ?? '';
    const orderNumber = toastText.match(/Order ([^\s]+) created/)?.[1];
    expect(orderNumber).toBeTruthy();

    const orderUrl = `${WEB}/dashboard/orders/${orderNumber}`;

    await page.goto(`${WEB}/dashboard/orders/queues/followups`);
    await page.getByPlaceholder(/search by order id, customer, phone/i).fill(phone);
    await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 30_000 });

    await page.goto(orderUrl);
    await page.getByRole('button', { name: /^Status$/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('button').filter({ hasText: /hold|pending|confirmed|search/i }).first().click();
    await dialog.getByPlaceholder(/search or create/i).fill('cancel');
    await dialog.getByRole('button', { name: 'Canceled', exact: true }).click();
    await dialog.getByRole('button', { name: 'Update status' }).click();

    await expect(page.getByText(/cancel/i).first()).toBeVisible({ timeout: 30_000 });

    await page.goto(`${WEB}/dashboard/orders/queues/followups`);
    await page.getByPlaceholder(/search by order id, customer, phone/i).fill(phone);
    await expect(page.getByText(customerName)).toHaveCount(0, { timeout: 30_000 });
  });
});
