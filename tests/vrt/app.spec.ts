import { test, expect } from '@playwright/test';
import { clearTestData, seedTestData } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearTestData(page);
  await page.reload();
});

test('seeded deck is loaded and node is visible', async ({ page }) => {
  await seedTestData(page);
  await page.reload();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await expect(page.locator('.react-flow__node').getByText('VRT テストカード')).toBeVisible();
});

test('open and close help dialog with keyboard', async ({ page }) => {
  await page.getByRole('button', { name: '使い方' }).click();
  await expect(page.getByRole('heading', { name: 'DuelFlow' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'DuelFlow' })).not.toBeVisible();
});
