import { test, expect } from '@playwright/test';
import { navigate } from './helpers';

test.describe('HandwritingPad Regression Suite (Subagent A13)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await navigate(page, 'Từ điển');
  });

  test('dialog structure, accessible roles, and focus trapping inside modal', async ({ page }) => {
    const triggerBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
    await expect(triggerBtn).toBeVisible();
    await triggerBtn.focus();
    await triggerBtn.click();

    // Verify dialog accessibility attributes
    const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'handwriting-pad-title');
    await expect(dialog).toHaveAttribute('aria-describedby', 'handwriting-pad-desc');

    const closeBtn = page.getByRole('button', { name: 'Đóng bảng viết tay' });
    await expect(closeBtn).toBeVisible();
    // Verify initial focus moves to close button
    await expect(closeBtn).toBeFocused({ timeout: 3000 });

    // When no strokes drawn, Undo and Clear buttons are disabled
    const undoBtn = page.getByRole('button', { name: 'Lùi 1 nét' });
    const clearBtn = page.getByRole('button', { name: 'Xóa hết' });
    await expect(undoBtn).toBeDisabled();
    await expect(clearBtn).toBeDisabled();

    // Tab key focus trap: with Undo and Clear disabled, Tab remains trapped on close button
    await page.keyboard.press('Tab');
    await expect(closeBtn).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(closeBtn).toBeFocused();

    // Close via Escape key and verify focus returns cleanly to trigger button
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(triggerBtn).toBeFocused();
  });

  test('closing modal by clicking outside backdrop returns focus to trigger', async ({ page }) => {
    const triggerBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
    await triggerBtn.focus();
    await triggerBtn.click();

    const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
    await expect(dialog).toBeVisible();

    // Click outside modal card on top-left padding of backdrop
    await page.mouse.click(10, 10);
    await expect(dialog).not.toBeVisible();
    await expect(triggerBtn).toBeFocused();
  });

  test('stroke drawing, undo, clear, and stroke count updates', async ({ page }) => {
    const triggerBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
    await triggerBtn.click();

    const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
    await expect(dialog).toBeVisible();
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const undoBtn = page.getByRole('button', { name: 'Lùi 1 nét' });
    const clearBtn = page.getByRole('button', { name: 'Xóa hết' });

    // Draw first horizontal stroke
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 120);
      await page.mouse.down();
      await page.mouse.move(box.x + 220, box.y + 120, { steps: 5 });
      await page.mouse.up();
    }

    // Verify 1 stroke drawn and candidate '一' appears
    await expect(dialog.getByText('1 nét đã vẽ')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '一' })).toBeVisible({ timeout: 5000 });
    await expect(undoBtn).toBeEnabled();
    await expect(clearBtn).toBeEnabled();

    // Draw second horizontal stroke below the first
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 180);
      await page.mouse.down();
      await page.mouse.move(box.x + 220, box.y + 180, { steps: 5 });
      await page.mouse.up();
    }

    // Verify 2 strokes drawn and candidate '二' appears
    await expect(dialog.getByText('2 nét đã vẽ')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '二' })).toBeVisible({ timeout: 5000 });

    // Test Undo last stroke: should revert back to 1 stroke and '一'
    await undoBtn.click();
    await expect(dialog.getByText('1 nét đã vẽ')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '一' })).toBeVisible({ timeout: 5000 });

    // Test Clear canvas: should revert to 0 strokes and empty candidates
    await clearBtn.click();
    await expect(dialog.getByText('0 nét đã vẽ')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '一' })).not.toBeVisible();
    await expect(undoBtn).toBeDisabled();
    await expect(clearBtn).toBeDisabled();

    // Close dialog
    await page.getByRole('button', { name: 'Đóng bảng viết tay' }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('offline recognition fallback when backend API fails or is unreachable', async ({ page }) => {
    // Intercept /api/handwriting and simulate 502 Bad Gateway / upstream unreachable
    await page.route('**/api/handwriting', route => {
      return route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'UPSTREAM_ERROR',
            message: 'Upstream handwriting service unavailable'
          }
        })
      });
    });

    const triggerBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
    await triggerBtn.click();

    const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
    await expect(dialog).toBeVisible();

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    if (box) {
      await page.mouse.move(box.x + 40, box.y + 130);
      await page.mouse.down();
      await page.mouse.move(box.x + 220, box.y + 130, { steps: 5 });
      await page.mouse.up();
    }

    // Verify client fallback recognizer seamlessly delivers '一' despite backend failure
    await expect(dialog.getByRole('button', { name: '一' })).toBeVisible({ timeout: 6000 });
    // Verify offline transparency notice is presented
    await expect(dialog.getByText(/Chế độ ngoại tuyến/)).toBeVisible();

    // Selecting candidate populates dictionary query and closes modal cleanly
    const candidateBtn = dialog.getByRole('button', { name: '一' });
    await candidateBtn.click();
    await expect(dialog).not.toBeVisible();

    // Verify query input received the character
    const searchInput = page.getByPlaceholder(/Tra cứu Hán tự, Pinyin, hoặc Tiếng Việt/);
    await expect(searchInput).toHaveValue('一');
  });

  test('tab loop focus trap when candidates and control buttons are active', async ({ page }) => {
    const triggerBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
    await triggerBtn.click();

    const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 140);
      await page.mouse.down();
      await page.mouse.move(box.x + 200, box.y + 140, { steps: 5 });
      await page.mouse.up();
    }

    await expect(dialog.getByRole('button', { name: '一' })).toBeVisible({ timeout: 5000 });

    const closeBtn = page.getByRole('button', { name: 'Đóng bảng viết tay' });
    const clearBtn = page.getByRole('button', { name: 'Xóa hết' });

    // Focus close button, then shift-tab to wrap to the last element (Clear button)
    await closeBtn.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(clearBtn).toBeFocused();

    // Tab from clear button should wrap back to close button
    await page.keyboard.press('Tab');
    await expect(closeBtn).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
