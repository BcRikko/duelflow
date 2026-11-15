import { test, expect } from '@playwright/test';
import { clearTestData, seedTestData } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearTestData(page);
  await page.reload();
});

test('empty deck announcement', async ({ page }) => {
  await expect(page.getByText('まずは「デッキを追加」しましょう')).toBeVisible();
  await expect(page).toHaveScreenshot('empty-deck.png');
});

test('loaded deck with node', async ({ page }) => {
  await seedTestData(page);
  await page.reload();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await expect(page).toHaveScreenshot('loaded-deck.png');
});

test('help dialog', async ({ page }) => {
  await page.getByRole('button', { name: '使い方' }).click();
  await expect(page.getByRole('heading', { name: 'DuelFlow' })).toBeVisible();
  await expect(page).toHaveScreenshot('help-dialog.png');
});

test('node edit form', async ({ page }) => {
  await seedTestData(page);
  await page.reload();
  const node = page.locator('.react-flow__node').first();
  await node.dblclick();
  await expect(page.locator('textarea')).toBeVisible();
  await expect(page).toHaveScreenshot('node-edit-form.png');
});

test('card form', async ({ page }) => {
  await seedTestData(page);
  await page.reload();
  await page.getByText('+ 追加').click();
  await expect(page.getByRole('heading', { name: 'カードを追加' })).toBeVisible();
  await expect(page).toHaveScreenshot('card-form.png');
});

test('import deck dialog', async ({ page }) => {
  await page.getByRole('main').getByRole('button', { name: 'デッキを追加' }).click();
  await expect(page.getByRole('heading', { name: 'デッキを追加' })).toBeVisible();
  await expect(page).toHaveScreenshot('import-deck-dialog.png');
});
