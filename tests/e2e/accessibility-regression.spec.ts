import { test, expect, type Page } from '@playwright/test';
import { navigate } from './helpers';

test.describe('Accessibility & UI Regression Suite (Subagent A18)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test.describe('Modal Dialog Accessibility & Focus Trap (HandwritingPad)', () => {
    test('dialog has role="dialog", aria-modal="true", traps focus, and closes via Escape with focus restored', async ({ page }) => {
      await navigate(page, 'Từ điển');

      const triggerBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
      await expect(triggerBtn).toBeVisible();
      await triggerBtn.focus();
      await triggerBtn.click();

      // Verify dialog element and WAI-ARIA attributes
      const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await expect(dialog).toHaveAttribute('aria-labelledby', 'handwriting-pad-title');
      await expect(dialog).toHaveAttribute('aria-describedby', 'handwriting-pad-desc');

      // Verify focus is automatically moved to the close button inside modal
      const closeBtn = page.getByRole('button', { name: 'Đóng bảng viết tay' });
      await expect(closeBtn).toBeVisible();
      await expect(closeBtn).toBeFocused({ timeout: 3000 });

      // Tab key focus trap: when canvas is empty (Undo and Clear are disabled), Tab cycles within the modal
      await page.keyboard.press('Tab');
      await expect(closeBtn).toBeFocused();

      await page.keyboard.press('Shift+Tab');
      await expect(closeBtn).toBeFocused();

      // Close modal via Escape key
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();

      // Verify focus is cleanly restored to the trigger button
      await expect(triggerBtn).toBeFocused();
    });

    test('backdrop click closes modal dialog and restores focus to trigger button', async ({ page }) => {
      await navigate(page, 'Từ điển');

      const triggerBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
      await triggerBtn.focus();
      await triggerBtn.click();

      const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
      await expect(dialog).toBeVisible();

      // Click on backdrop outside the dialog card (top-left margin)
      await page.mouse.click(10, 10);

      // Verify dialog is closed
      await expect(dialog).not.toBeVisible();

      // Verify focus returns to trigger button
      await expect(triggerBtn).toBeFocused();
    });
  });

  test.describe('ReviewView Flashcard Keyboard Shortcuts Safeguards', () => {
    test('Space flips card, 1-4 rates only when flipped, never triggers when typing in inputs', async ({ page }) => {
      await navigate(page, 'Ôn tập');

      // Load Taiwan Starter Deck
      const deckBtn = page.getByRole('button', { name: /Nạp bộ thẻ/ }).first();
      await expect(deckBtn).toBeVisible();
      await deckBtn.click();

      // Verify initial front face of card 1 is displayed
      const revealBtn = page.getByRole('button', { name: 'Hiện đáp án' });
      await expect(revealBtn).toBeVisible();
      await expect(page.getByText(/Tiến độ phiên học: Thẻ 1/)).toBeVisible();

      // 1. Guard check: Pressing 1, 2, 3, 4 before card is revealed does NOT rate or advance the card
      await page.keyboard.press('1');
      await page.keyboard.press('2');
      await page.keyboard.press('3');
      await page.keyboard.press('4');
      await expect(page.getByText(/Tiến độ phiên học: Thẻ 1/)).toBeVisible();
      await expect(revealBtn).toBeVisible();
      await expect(page.getByRole('button', { name: /Khó khăn/ })).not.toBeVisible();

      // 2. Press Space to flip the card
      await page.keyboard.press('Space');
      await expect(page.getByRole('button', { name: /Khó khăn/ })).toBeVisible();
      await expect(revealBtn).not.toBeVisible();

      // 3. Press '2' to rate "Hard" (Khó khăn) on flipped card
      await page.keyboard.press('2');

      // Advances to Card 2, returned to front face
      await expect(page.getByText(/Tiến độ phiên học: Thẻ 2/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();

      // 4. Input Guard: Typing Space and numbers inside an <input> or <textarea> never triggers shortcuts
      await page.evaluate(() => {
        const input = document.createElement('input');
        input.id = 'test-a11y-typing-guard';
        input.type = 'text';
        input.setAttribute('aria-label', 'Ô kiểm tra phím tắt');
        document.body.appendChild(input);
        input.focus();
      });

      // Type spaces and numbers while focused on the input element
      await page.keyboard.type(' Typing test with Space and 1 2 3 4 keys ');

      // Verify the card did NOT flip or advance: still on Card 2, front face visible
      await expect(page.getByText(/Tiến độ phiên học: Thẻ 2/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Khó khăn/ })).not.toBeVisible();

      // Clean up injected input
      await page.evaluate(() => {
        document.getElementById('test-a11y-typing-guard')?.remove();
      });

      // 5. Modal Dialog Guard: Open modal suppresses flashcard shortcuts
      await page.evaluate(() => {
        const dummyModal = document.createElement('div');
        dummyModal.id = 'test-modal-dialog-guard';
        dummyModal.setAttribute('role', 'dialog');
        dummyModal.setAttribute('aria-modal', 'true');
        dummyModal.innerHTML = '<button id="dummy-modal-focus">Trong Modal</button>';
        document.body.appendChild(dummyModal);
        document.getElementById('dummy-modal-focus')?.focus();
      });

      // Press Space and 1-4 while modal is present in DOM
      await page.keyboard.press('Space');
      await page.keyboard.press('1');

      // Card must still be on Card 2, unflipped
      await expect(page.getByText(/Tiến độ phiên học: Thẻ 2/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();

      // Clean up dummy modal
      await page.evaluate(() => {
        document.getElementById('test-modal-dialog-guard')?.remove();
      });
    });
  });

  test.describe('375px Mobile Viewport Audit (Zero Horizontal Scroll Across All Views)', () => {
    async function assertNoHorizontalScroll(page: Page, viewName: string) {
      const isOverflowing = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const winWidth = window.innerWidth;
        return docEl.scrollWidth > winWidth || body.scrollWidth > winWidth;
      });
      expect(isOverflowing, `View "${viewName}" has horizontal scroll/overflow on 375px mobile viewport`).toBe(false);
    }

    test('all 6 core views plus lesson flow fit within 375px viewport without horizontal scroll', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // 1. Audit Today View
      await page.goto('/');
      await expect(page.getByRole('main')).toBeVisible();
      await assertNoHorizontalScroll(page, 'Today (Hôm nay)');

      // 2. Audit Lessons / Curriculum Path View
      await navigate(page, 'Lộ trình');
      await expect(page.locator('.path-card').first()).toBeVisible();
      await assertNoHorizontalScroll(page, 'Lessons Path (Lộ trình)');

      // 3. Audit Lesson Flow
      await page.locator('.path-card').first().getByRole('button', { name: 'Học bài này' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await assertNoHorizontalScroll(page, 'Lesson Flow (Chi tiết bài học)');

      // Return to path
      await page.getByRole('button', { name: 'Về lộ trình', exact: true }).click();
      await expect(page.locator('.path-card').first()).toBeVisible();

      // 4. Audit Dictionary View
      await navigate(page, 'Từ điển');
      await expect(page.getByLabel('Tìm từ vựng')).toBeVisible();
      await assertNoHorizontalScroll(page, 'Dictionary (Từ điển)');

      // 5. Audit Review View
      await navigate(page, 'Ôn tập');
      await expect(page.getByRole('main')).toBeVisible();
      await assertNoHorizontalScroll(page, 'Review (Ôn tập)');

      // 6. Audit AI Chat / Conversation View
      await navigate(page, 'Hội thoại');
      await expect(page.getByRole('main')).toBeVisible();
      await assertNoHorizontalScroll(page, 'Conversation & AI Chat (Hội thoại)');

      // 7. Audit Settings View
      await navigate(page, 'Tiến độ & Cài đặt');
      await expect(page.getByRole('heading', { name: 'Cài đặt hồ sơ & Nhịp học' })).toBeVisible();
      await assertNoHorizontalScroll(page, 'Settings (Tiến độ & Cài đặt)');
    });
  });
});
