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

test.describe('Incentive hub — real user UI', () => {
  test('hub tabs, salary, ops, and structure metrics visible', async ({ page }) => {
    await login(page);

    await page.goto(`${WEB}/dashboard/incentive`);
    await expect(page.getByRole('button', { name: 'Teams', exact: true })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole('button', { name: 'Structure', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Performance', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ops & payroll', exact: true })).toBeVisible();

    // Structure — metric cards present (at least order / cross-sell / return)
    await page.getByRole('button', { name: 'Structure', exact: true }).click();
    await expect(page.getByText(/Order count|Cross-sell|Return ratio/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Pay more if they beat the top slab/i)).toHaveCount(0);

    // Salary payout day
    await page.getByRole('button', { name: 'Salary template', exact: true }).click();
    await expect(page.getByRole('heading', { name: /salary reference/i })).toBeVisible();
    await page.getByPlaceholder('e.g. 5').fill('7');
    await page.getByRole('button', { name: /^Save salary$/i }).click();
    await expect(page.getByText(/Salary reference saved/i)).toBeVisible({ timeout: 20_000 });

    // Performance
    await page.locator('div.flex.flex-wrap.gap-1.border-b button', { hasText: /^Performance$/ }).click();
    await expect(page.getByText(/Members ·/i).first()).toBeVisible({ timeout: 30_000 });

    // Ops survey
    await page.locator('div.flex.flex-wrap.gap-1.border-b button', { hasText: /^Ops & payroll$/ }).click();
    await expect(page.getByText(/Ops entry/i)).toBeVisible({ timeout: 20_000 });
    const agentPlaceholder = page.getByText('Pick assigned agent (required)');
    if (await agentPlaceholder.isVisible().catch(() => false)) {
      await agentPlaceholder.click();
    } else {
      await page.getByText('Ops entry', { exact: false }).locator('..').getByRole('button').first().click();
    }
    const menu = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(menu.locator('button').first()).toBeVisible({ timeout: 10_000 });
    await menu.locator('button').first().click();
    await page.getByPlaceholder('Count').first().fill('4');
    await page.getByRole('button', { name: /^Save survey$/i }).click();
    await expect(page.getByText(/Survey log saved/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Surveys', { exact: true }).first()).toBeVisible();
  });
});
