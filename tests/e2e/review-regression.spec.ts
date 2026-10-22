import { test, expect } from '@playwright/test';
import { navigate } from './helpers';

test.describe('ReviewView & SRS Regression Suite (Subagent A12)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each run to ensure clean state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('flashcard flip, SM-2 rating flow, and accurate interval progress', async ({ page }) => {
    await navigate(page, 'Ôn tập');

    // Load Taiwan Starter Deck 1 into SRS
    const deckButtons = page.getByRole('button', { name: /Nạp bộ thẻ/ });
    await expect(deckButtons.first()).toBeVisible();
    await deckButtons.first().click();

    // Verify initial flashcard front view
    const revealBtn = page.getByRole('button', { name: 'Hiện đáp án' });
    await expect(revealBtn).toBeVisible();

    // Verify progress indicator reads Card 1
    await expect(page.getByText(/Tiến độ phiên học: Thẻ 1/)).toBeVisible();

    // Verify rating buttons are NOT visible before card is flipped
    await expect(page.getByRole('button', { name: /Cần học lại/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Nhớ được/ })).not.toBeVisible();

    // Flip card via "Hiện đáp án" button
    await revealBtn.click();

    // Back face is revealed with SM-2 buttons and intervals
    const againBtn = page.getByRole('button', { name: /Cần học lại/ });
    const hardBtn = page.getByRole('button', { name: /Khó khăn/ });
    const goodBtn = page.getByRole('button', { name: /Nhớ được/ });
    const easyBtn = page.getByRole('button', { name: /Rất dễ/ });

    await expect(againBtn).toBeVisible();
    await expect(hardBtn).toBeVisible();
    await expect(goodBtn).toBeVisible();
    await expect(easyBtn).toBeVisible();

    // Rate "Good" (Nhớ được)
    await goodBtn.click();

    // Card should advance to Card 2, card flipped back to front
    await expect(page.getByText(/Tiến độ phiên học: Thẻ 2/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nhớ được/ })).not.toBeVisible();
  });

  test('custom saved words from dictionary appear in review queue with proper metadata', async ({ page }) => {
    // 1. Navigate to Dictionary and search for a vocabulary word
    await navigate(page, 'Từ điển');
    const searchInput = page.getByLabel('Tìm từ vựng');
    await searchInput.fill('你好');

    // Save the word into SRS notebook
    const saveBtn = page.getByRole('button', { name: /Lưu 你好/ });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 2. Navigate to Review View
    await navigate(page, 'Ôn tập');

    // Verify queue displays 1 word due
    await expect(page.getByRole('main')).toContainText('1 từ đến lịch ôn');
    await expect(page.getByText('你好')).toBeVisible();

    // Flip card
    await page.getByRole('button', { name: 'Hiện đáp án' }).click();

    // Verify meaning and Pinyin are present
    await expect(page.getByRole('heading', { name: 'Xin chào', exact: true })).toBeVisible();
    await expect(page.locator('.review-card').getByText('nǐ hǎo', { exact: true })).toBeVisible();

    // Rate Good to complete
    await page.getByRole('button', { name: /Nhớ được/ }).click();

    // Session completion screen
    await expect(page.getByRole('main')).toContainText('Bạn đã ôn xong hôm nay!');
  });

  test('keyboard shortcuts: Space flips card, 1-4 grades ONLY when flipped, inputs never trigger shortcuts', async ({ page }) => {
    await navigate(page, 'Ôn tập');

    // Load starter deck
    const deckButtons = page.getByRole('button', { name: /Nạp bộ thẻ/ });
    await deckButtons.first().click();
    await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();

    // Test Guard: Pressing 1, 2, 3, 4 before flip does NOT rate or advance the card
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await page.keyboard.press('4');
    await expect(page.getByText(/Tiến độ phiên học: Thẻ 1/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();

    // Press Space to flip the card
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: /Khó khăn/ })).toBeVisible();

    // Press '2' to rate "Hard"
    await page.keyboard.press('2');

    // Advances to Card 2
    await expect(page.getByText(/Tiến độ phiên học: Thẻ 2/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();

    // Test Input Guard: Focus an input field and type Space and numbers
    // Create a temporary input inside main to verify shortcut safeguard
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.id = 'test-typing-input';
      input.type = 'text';
      document.body.appendChild(input);
      input.focus();
    });

    // Type Space and number keys while inside the input
    await page.keyboard.type(' Hello 1 2 3 4 ');

    // Flashcard must NOT flip or advance while focused on an input
    await expect(page.getByText(/Tiến độ phiên học: Thẻ 2/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Khó khăn/ })).not.toBeVisible();

    // Clean up temporary test input
    await page.evaluate(() => {
      document.getElementById('test-typing-input')?.remove();
    });
  });

  test('modal dialog guard: open handwriting dialog blocks review keyboard shortcuts', async ({ page }) => {
    await navigate(page, 'Ôn tập');

    // Load starter deck
    const deckButtons = page.getByRole('button', { name: /Nạp bộ thẻ/ });
    await deckButtons.first().click();
    await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();

    // Simulate an open modal dialog in the DOM (like HandwritingPad)
    await page.evaluate(() => {
      const dialog = document.createElement('div');
      dialog.id = 'test-modal-guard';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.innerHTML = '<button id="modal-dummy-btn">Modal Button</button>';
      document.body.appendChild(dialog);
      document.getElementById('modal-dummy-btn')?.focus();
    });

    // Press Space while dialog is open
    await page.keyboard.press('Space');
    await page.keyboard.press('1');
    await page.keyboard.press('2');

    // Flashcard must remain on front face (not flipped)
    await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Khó khăn/ })).not.toBeVisible();
    await expect(page.getByText(/Tiến độ phiên học: Thẻ 1/)).toBeVisible();

    // Remove simulated dialog
    await page.evaluate(() => {
      document.getElementById('test-modal-guard')?.remove();
    });

    // After dialog is closed, Space now successfully flips card
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: /Khó khăn/ })).toBeVisible();
  });

  test('session completion summary screen displays XP gain, reviewed count, and breakdown', async ({ page }) => {
    // 1. Save single word
    await navigate(page, 'Từ điển');
    await page.getByLabel('Tìm từ vựng').fill('你好');
    await page.getByRole('button', { name: /Lưu 你好/ }).click();

    // 2. Go to review and complete it
    await navigate(page, 'Ôn tập');
    await page.getByRole('button', { name: 'Hiện đáp án' }).click();
    await page.getByRole('button', { name: /Nhớ được/ }).click();

    // 3. Verify Session completion screen elements
    await expect(page.getByRole('main')).toContainText('Bạn đã ôn xong hôm nay!');
    await expect(page.getByText(/\+5 XP kiếm được/)).toBeVisible();
    await expect(page.getByText(/1 thẻ đã được đánh giá SM-2/)).toBeVisible();

    // 4. Verify Review Ahead option is accessible
    const reviewAheadBtn = page.getByRole('button', { name: /Ôn tập trước lịch/ });
    await expect(reviewAheadBtn).toBeVisible();
    await reviewAheadBtn.click();

    // In Review Ahead mode, card re-opens with ahead badge
    await expect(page.getByText('Chế độ ôn trước lịch')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();

    // Rate the card in Review Ahead mode (second review on the same day)
    await page.getByRole('button', { name: 'Hiện đáp án' }).click();
    await page.getByRole('button', { name: /Nhớ được/ }).click();

    // Verify completion screen
    await expect(page.getByRole('main')).toContainText('Bạn đã ôn xong hôm nay!');

    // INVARIANT: Second review must actually update repetitions in saved storage
    // On baseline: line 337 in learning.ts discarded the review because lastReviewed === today
    const rawStorage = await page.evaluate(() => localStorage.getItem('zhongxue.learning.v1'));
    expect(rawStorage).not.toBeNull();
    const parsedStorage = JSON.parse(rawStorage!);
    const savedId = parsedStorage.savedWordIds[0];
    const reviewRecord = parsedStorage.reviews[savedId];
    expect(reviewRecord).toBeDefined();
    expect(reviewRecord.repetitions).toBeGreaterThanOrEqual(2);
  });

  test('responsive layout on 375px mobile viewport has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigate(page, 'Ôn tập');

    // Check horizontal overflow on empty state
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Load starter deck and test active card layout on 375px
    const deckButtons = page.getByRole('button', { name: /Nạp bộ thẻ/ });
    await deckButtons.first().click();

    await page.getByRole('button', { name: 'Hiện đáp án' }).click();
    await expect(page.getByRole('button', { name: /Nhớ được/ })).toBeVisible();

    const hasCardOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasCardOverflow).toBe(false);
  });
});
