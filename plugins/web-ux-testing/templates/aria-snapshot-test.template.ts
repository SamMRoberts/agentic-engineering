import { test, expect } from '@playwright/test';

test.describe('<AREA_NAME> ARIA snapshots', () => {
  test('<SCENARIO_ID> <SCENARIO_TITLE>', async ({ page }) => {
    await page.goto('<BASE_URL_OR_ROUTE>');

    // Prefer role/label/test-id locators. Avoid CSS unless the component has no accessible locator yet.
    const target = page.getByRole('<ROLE>', { name: '<ACCESSIBLE_NAME>' });
    await expect(target).toBeVisible();

    // Keep snapshots scoped and stable. Use page-level snapshots only for stable app shells.
    await expect(target).toMatchAriaSnapshot({ name: '<BASELINE_NAME>.aria.yml' });
  });
});
