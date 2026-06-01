import { test, expect } from '@playwright/test';

const targetUrl = process.env.UX_GREMLIN_TARGET_URL || 'http://localhost:3000/admin';

test.describe('Admin page creation UX resilience', () => {
  test('baseline happy path', async ({ page }) => {
    await page.goto(targetUrl);
    await test.step('Open Pages tab', async () => {
      await page.getByRole('tab', { name: /pages/i }).click();
    });
    await test.step('Start Page creation', async () => {
      await page.getByRole('button', { name: /add new/i }).click();
      await page.getByRole('menuitem', { name: /^page$/i }).click();
    });
    await test.step('Fill required fields and confirm', async () => {
      await page.getByLabel(/title/i).fill('ux-gremlin-page-example');
      await page.getByRole('button', { name: /next/i }).click();
      await page.getByRole('button', { name: /confirm|create/i }).click();
    });
    await expect(page.getByText(/ux-gremlin-page-example/i)).toBeVisible();
  });

  test('double-submit-confirm: double-submit final confirmation', async ({ page }) => {
    await page.goto(targetUrl);
    // TODO: reach the confirm step using the baseline flow.
    const confirm = page.getByRole('button', { name: /confirm|create/i });
    await confirm.click();
    await confirm.click();
    // Assertion: exactly one matching page appears.
    // Recovery check: user remains in a clear success or validation state.
  });

  test('keyboard-only-create: keyboard-only page creation', async ({ page }) => {
    await page.goto(targetUrl);
    await page.keyboard.press('Tab');
    // TODO: continue with keyboard operations and assert visible focus.
    // Prefer role-based locators and accessible names once app controls are known.
  });
});
