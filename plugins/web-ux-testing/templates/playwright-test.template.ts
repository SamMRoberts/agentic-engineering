import { test, expect } from '@playwright/test';

test.describe('web UX regression', () => {
  test('SCENARIO_ID: scenario title', async ({ page }) => {
    await page.goto('/');

    // Prefer role, label, text, and test-id locators.
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
