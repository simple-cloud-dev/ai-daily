import { expect, test } from '@playwright/test';

test.describe('Dashboard smoke', () => {
  test('renders health status and summaries section', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'AI Daily Dashboard' })).toBeVisible();
    await expect(page.getByTestId('api-status')).toContainText('API: ok');
    await expect(page.getByRole('heading', { name: 'Daily Summaries' })).toBeVisible();
    await expect(page.getByText('No summaries yet.')).toBeVisible();
  });
});
