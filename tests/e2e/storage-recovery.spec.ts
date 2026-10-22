import { test, expect } from '@playwright/test';

test.describe('E2E Storage Recovery & Large Dataset Invariants (T09)', () => {
  test('large dataset of 600 words (>200k chars) loads completely on page refresh without error notice (REPRODUCES F01)', async ({ page }) => {
    // Generate 600 words with rich metadata (> 205,000 characters)
    const words = Array.from({ length: 600 }, (_, i) => ({
      id: `cv_${i + 1}`,
      hanzi: `單詞${i + 1}`,
      pinyin: `dāncí ${i + 1}`,
      meaning: `Ý nghĩa chi tiết của mục từ số ${i + 1} trong kho từ điển tiếng Trung Đài Loan`,
      example: `這是一個關於單詞${i + 1}的真實例句，用於測試大容量資料存儲與恢復功能。`,
      examplePinyin: `zhè shì yīgè guānyú dāncí ${i + 1} de zhēnshí lìjù`,
      exampleMeaning: `Đây là một ví dụ thực tế cho từ vựng số ${i + 1} để kiểm tra lưu trữ.`,
      category: 'Từ điển mở rộng',
      lessonId: 'custom-dictionary'
    }));

    const largePayload = {
      version: 1,
      profile: { name: 'Người học Đài Loan 600', dailyGoal: 30 },
      completedLessonIds: [],
      savedWordIds: words.map(w => w.id),
      reviews: {},
      activity: {},
      quizScores: {},
      customWords: words
    };

    const jsonStr = JSON.stringify(largePayload);
    expect(jsonStr.length).toBeGreaterThan(200000);

    // Pre-populate localStorage before app boot
    await page.goto('/');
    await page.evaluate((payload) => {
      localStorage.setItem('zhongxue.learning.v1', payload);
    }, jsonStr);

    // Reload app to trigger loadState in browser context
    await page.reload();

    // INVARIANT: App must NOT show error notice "Không thể đọc tiến độ đã lưu"
    // On baseline: App triggers load error due to 200k limit and displays error notice
    await expect(page.getByText('Không thể đọc tiến độ đã lưu')).not.toBeVisible();

    // Navigate to Settings to verify user profile loaded correctly
    await page.getByRole('button', { name: 'Mở hồ sơ & cài đặt' }).click();
    await expect(page.locator('#profile-name')).toHaveValue('Người học Đài Loan 600');
  });

  test('corrupted raw data is preserved and not silently overwritten on subsequent state changes (REPRODUCES F01 recovery gap)', async ({ page }) => {
    const brokenRaw = '{"version": 1, "profile": {"name": "Corrupt Profile"}, "savedWordIds": [TRUNCATED_CONTENT_MALFORMED...';

    await page.goto('/');
    await page.evaluate((corrupted) => {
      localStorage.setItem('zhongxue.learning.v1', corrupted);
    }, brokenRaw);

    await page.reload();

    // App should report load notice
    await expect(page.getByText(/Không thể đọc tiến độ đã lưu/)).toBeVisible();

    // User performs an action that triggers state update and saveState
    // E.g. Click on dictionary and save a new word
    const dictNavBtn = page.getByRole('button', { name: 'Từ điển' }).or(page.getByText('Từ điển'));
    if (await dictNavBtn.first().isVisible()) {
      await dictNavBtn.first().click();
    }

    // Check storage: user's original raw data MUST NOT be permanently obliterated without backup
    const storageState = await page.evaluate(() => {
      const current = localStorage.getItem('zhongxue.learning.v1');
      const backupKeys = [
        'zhongxue.learning.v1.corrupt_backup',
        'zhongxue.learning.corrupt.backup',
        'zhongxue.learning.backup',
        'zhongxue.learning.v1.backup'
      ];
      let backup: string | null = null;
      for (const k of backupKeys) {
        const val = localStorage.getItem(k);
        if (val) {
          backup = val;
          break;
        }
      }
      return { current, backup };
    });

    // INVARIANT: The corrupted data MUST exist either in current key or in backup key
    // On baseline: current key was overwritten with empty state, backup is null => 100% data loss
    const preserved = storageState.current === brokenRaw || storageState.backup === brokenRaw;
    expect(preserved).toBe(true);
  });
});
