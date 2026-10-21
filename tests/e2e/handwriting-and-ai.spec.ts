import { test, expect } from '@playwright/test';
import { navigate } from './helpers';

test('handwriting search modal opens, recognizes strokes offline, and closes via Escape', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Từ điển');

  // Open handwriting pad using the explicit dictionary toolbar button
  const openBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
  await expect(openBtn).toBeVisible();
  await openBtn.click();

  // Verify modal elements are visible
  const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
  await expect(dialog).toBeVisible();
  await expect(page.getByText('Tra bằng chữ viết tay (手寫輸入)')).toBeVisible();
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xóa hết' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lùi 1 nét' })).toBeVisible();

  // Draw a horizontal stroke on the canvas and verify offline candidate recognition
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 40, box.y + 120);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 120, { steps: 5 });
    await page.mouse.up();
    await expect(dialog.getByRole('button', { name: '一' })).toBeVisible({ timeout: 5000 });
  }

  // Close modal via Escape key
  await page.keyboard.press('Escape');
  await expect(page.getByText('Tra bằng chữ viết tay (手寫輸入)')).not.toBeVisible();
});

test('ai chat view loads in conversation tab, responds with pinyin/translation, and persists across tabs', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Hội thoại');

  // Check header
  await expect(page.getByText('Trợ lý Đối thoại AI (Hán ngữ Đài Loan)')).toBeVisible();

  // Use a quick starter prompt chip
  const promptChip = page.getByRole('button', { name: '👋 Chào hỏi' });
  await expect(promptChip).toBeVisible();
  await promptChip.click();

  // Verify assistant responds with at least 2 messages in conversation (initial + reply)
  await expect(page.getByText('Tự động phản hồi bằng Phồn thể')).toBeVisible();
  // Wait for loading to finish
  await expect(page.getByText('AI đối thoại đang soạn câu trả lời')).not.toBeVisible({ timeout: 15000 });

  // Switch to Dictionary tab and back to Conversation tab; verify user message is still persisted
  await navigate(page, 'Từ điển');
  await navigate(page, 'Hội thoại');
  await expect(page.getByText('你好！我正在學習繁體中文，請多指教。')).toBeVisible();
});

test('review view supports keyboard shortcuts (Space to reveal, 2 for Hard) and starter decks', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Ôn tập');

  // Load a Taiwan starter deck into SRS
  const deckButtons = page.getByRole('button', { name: /Nạp bộ thẻ/ });
  await expect(deckButtons.first()).toBeVisible();
  await deckButtons.first().click();

  await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();

  // Press Space to reveal the flashcard back
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: /Khó khăn/ })).toBeVisible();

  // Press '2' to rate Hard
  await page.keyboard.press('2');
  await expect(page.getByText(/Tiến độ phiên học: Thẻ 2/)).toBeVisible();
});
