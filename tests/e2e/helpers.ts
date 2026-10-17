import { expect, type Page } from '@playwright/test';
export async function navigate(page: Page, name: string) {
  await expect(page.getByRole('main')).toBeVisible();
  const menu = page.getByRole('button', { name: 'Mở menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByRole('main')).toBeVisible();
}
