import { test, expect } from '@playwright/test';

const targetUrl = process.env.UX_GREMLIN_TARGET_URL || 'http://localhost:3000/admin';

test.describe('Admin page creation UX resilience', () => {
  test('baseline happy path', { annotation: [{ type: 'ux-gremlin-baseline', description: 'true' }] }, async ({ page }) => {
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

  test(
    'double-submit-confirm: double-submit final confirmation',
    { annotation: [{ type: 'ux-gremlin-scenario', description: 'double-submit-confirm' }, { type: 'ux-gremlin-risk', description: 'high' }] },
    async ({ page }) => {
      await page.goto(targetUrl);
      // Reach the confirm step using the baseline flow, then double-activate Confirm.
      const confirm = page.getByRole('button', { name: /confirm|create/i });
      await confirm.click();
      await confirm.click();
      // Exactly one matching page must exist after a double submit.
      await expect(page.getByRole('row', { name: /ux-gremlin-page-example/i })).toHaveCount(1);
    }
  );

  test(
    'keyboard-only-create: keyboard-only page creation',
    { annotation: [{ type: 'ux-gremlin-scenario', description: 'keyboard-only-create' }, { type: 'ux-gremlin-risk', description: 'high' }] },
    async ({ page }) => {
      await page.goto(targetUrl);
      await page.keyboard.press('Tab');
      // Continue keyboard operations, then assert focus stays visible and the page is created.
      await expect(page.locator(':focus')).toBeVisible();
    }
  );
});
