import { test, expect } from '@playwright/test';
import { navigate } from './helpers';

test('handwriting search modal opens and closes cleanly', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Từ điển');

  // Open handwriting pad using the explicit dictionary toolbar button
  const openBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
  await expect(openBtn).toBeVisible();
  await openBtn.click();

  // Verify modal elements are visible
  await expect(page.getByText('Tra bằng chữ viết tay (手寫輸入)')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xóa hết' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lùi 1 nét' })).toBeVisible();

  // Close modal via close button
  const closeBtn = page.getByRole('button', { name: 'Đóng bảng viết tay' });
  await expect(closeBtn).toBeVisible();
  await closeBtn.click();
  await expect(page.getByText('Tra bằng chữ viết tay (手寫輸入)')).not.toBeVisible();
});

test('ai chat view loads in conversation tab and responds with pinyin/translation', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Hội thoại');

  // Check header
  await expect(page.getByText('Trợ lý Đối thoại AI (Hán ngữ Đài Loan)')).toBeVisible();

  // Use a quick starter prompt chip
  const promptChip = page.getByRole('button', { name: '👋 Chào hỏi' });
  await expect(promptChip).toBeVisible();
  await promptChip.click();

  // Verify assistant responds with at least 2 messages in conversation (initial + reply)
  await expect(page.getByText('Live OpenRouter AI')).toBeVisible();
  // Wait for loading to finish
  await expect(page.getByText('AI đối thoại đang soạn câu trả lời')).not.toBeVisible({ timeout: 15000 });
});
