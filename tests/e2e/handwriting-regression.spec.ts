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
    await expect(dialog.getByRole('button', { name: '一', exact: true })).toBeVisible({ timeout: 5000 });
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
    await expect(dialog.getByRole('button', { name: '二', exact: true })).toBeVisible({ timeout: 5000 });

    // Test Undo last stroke: should revert back to 1 stroke and '一'
    await undoBtn.click();
    await expect(dialog.getByText('1 nét đã vẽ')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '一', exact: true })).toBeVisible({ timeout: 5000 });

    // Test Clear canvas: should revert to 0 strokes and empty candidates
    await clearBtn.click();
    await expect(dialog.getByText('0 nét đã vẽ')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '一', exact: true })).not.toBeVisible();
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
    await expect(dialog.getByRole('button', { name: '一', exact: true })).toBeVisible({ timeout: 6000 });
    // Verify offline transparency notice is presented with exact label
    await expect(dialog.getByText(/Chế độ ngoại tuyến: Nhận diện theo hình học nét/)).toBeVisible({ timeout: 6000 });

    // Selecting candidate populates dictionary query and closes modal cleanly
    const candidateBtn = dialog.getByRole('button', { name: '一', exact: true });
    await candidateBtn.click();
    await expect(dialog).not.toBeVisible();

    // Verify query input received the character
    const searchInput = page.getByRole('textbox', { name: 'Tìm từ vựng', exact: true });
    await expect(searchInput).toHaveValue('一');
  });

  test('clearing canvas (Clear / Xóa hết) aborts in-flight recognition and prevents stale results from appearing', async ({ page }) => {
    await page.route('**/api/handwriting', async route => {
      // Simulate delayed recognition request (1200ms)
      await new Promise(r => setTimeout(r, 1200));
      try {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ candidates: ['一', '二'] })
        });
      } catch {
        // Aborted by client AbortSignal
      }
    });

    const triggerBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
    await triggerBtn.click();

    const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
    await expect(dialog).toBeVisible();

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 40, box.y + 120);
      await page.mouse.down();
      await page.mouse.move(box.x + 220, box.y + 120, { steps: 5 });
      await page.mouse.up();
    }

    const clearBtn = page.getByRole('button', { name: 'Xóa hết' });
    await expect(clearBtn).toBeEnabled();

    // Click Clear while recognition is still in-flight
    await clearBtn.click();
    await expect(dialog.getByText('0 nét đã vẽ')).toBeVisible();

    // Wait longer than the 1200ms API response to verify stale response does not populate candidates
    await page.waitForTimeout(1600);

    // Invariant: Canvas must remain cleared and candidate buttons must NOT appear
    await expect(dialog.getByRole('button', { name: '一', exact: true })).not.toBeVisible();
    await expect(dialog.getByText('0 nét đã vẽ')).toBeVisible();
    await expect(clearBtn).toBeDisabled();

    await page.keyboard.press('Escape');
  });

  test('undoing stroke (Undo / Lùi 1 nét) aborts in-flight recognition request and maintains accurate stroke state', async ({ page }) => {
    await page.route('**/api/handwriting', async route => {
      const req = route.request();
      const postData = req.postDataJSON();
      const strokeCount = postData?.strokes?.length || 1;

      if (strokeCount >= 2) {
        // Second stroke recognition delayed to test cancellation
        await new Promise(r => setTimeout(r, 1200));
        try {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ candidates: ['二', '三'] })
          });
        } catch {
          // Aborted by client
        }
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ candidates: ['一'] })
        });
      }
    });

    const triggerBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
    await triggerBtn.click();

    const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
    await expect(dialog).toBeVisible();

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      // Draw stroke 1
      await page.mouse.move(box.x + 40, box.y + 100);
      await page.mouse.down();
      await page.mouse.move(box.x + 220, box.y + 100, { steps: 5 });
      await page.mouse.up();
    }

    await expect(dialog.getByRole('button', { name: '一', exact: true })).toBeVisible({ timeout: 5000 });

    const secondRequest = page.waitForRequest(request =>
      request.url().endsWith('/api/handwriting') && request.postDataJSON()?.strokes?.length === 2
    );
    if (box) {
      // Draw stroke 2
      await page.mouse.move(box.x + 40, box.y + 180);
      await page.mouse.down();
      await page.mouse.move(box.x + 220, box.y + 180, { steps: 5 });
      await page.mouse.up();
    }

    await secondRequest;
    await expect(dialog.getByText('2 nét đã vẽ')).toBeVisible();
    const abortedRequest = page.waitForEvent('requestfailed', {
      predicate: request => request.url().endsWith('/api/handwriting') && request.postDataJSON()?.strokes?.length === 2
    });
    // Click Undo while the second request is actually in flight.
    const undoBtn = page.getByRole('button', { name: 'Lùi 1 nét' });
    await undoBtn.click();
    await abortedRequest;

    // Wait past the delay
    await page.waitForTimeout(1600);

    // Invariant: Stale candidate '二' from stroke 2 must NOT appear; '1 nét đã vẽ' must remain
    await expect(dialog.getByText('1 nét đã vẽ')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '二', exact: true })).not.toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('closing handwriting modal aborts in-flight recognition request', async ({ page }) => {
    await page.route('**/api/handwriting', async route => {
      await new Promise(r => setTimeout(r, 1500));
      try {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ candidates: ['一'] })
        });
      } catch {
        // Aborted by client
      }
    });

    const triggerBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
    await triggerBtn.click();

    const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
    await expect(dialog).toBeVisible();

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 40, box.y + 120);
      await page.mouse.down();
      await page.mouse.move(box.x + 220, box.y + 120, { steps: 5 });
      await page.mouse.up();
    }

    // Immediately close modal via close button
    await page.getByRole('button', { name: 'Đóng bảng viết tay' }).click();
    await expect(dialog).not.toBeVisible();

    // Reopen modal: verify it opens cleanly in idle state without stale previous results
    await triggerBtn.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('0 nét đã vẽ')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '一', exact: true })).not.toBeVisible();

    await page.keyboard.press('Escape');
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

    await expect(dialog.getByRole('button', { name: '一', exact: true })).toBeVisible({ timeout: 5000 });

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
