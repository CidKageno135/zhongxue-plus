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

    await page.getByRole('button', { name: 'Từ điển', exact: true }).click();
    await page.getByRole('button', { name: 'Đã lưu (600)', exact: true }).click();
    const firstWord = page.locator('.word-card').filter({ hasText: '單詞1' }).first();
    await expect(firstWord).toContainText(words[0].meaning);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zhongxue.learning.v1')!));
    expect(stored.savedWordIds).toEqual(largePayload.savedWordIds);
    expect(stored.customWords).toEqual(words);
    await page.getByRole('button', { name: 'Mở hồ sơ & cài đặt' }).click();
    await expect(page.locator('#profile-name')).toHaveValue('Người học Đài Loan 600');
  });

  for (const quotaFailure of [false, true]) {
    test(`corrupt data pauses autosave until explicit recovery (backup quota failure: ${quotaFailure})`, async ({ page }) => {
      const brokenRaw = '{"valuable-history": [TRUNCATED...';
      await page.goto('/');
      await page.evaluate(raw => {
        localStorage.removeItem('zhongxue.learning.v1.corrupt_backup');
        localStorage.setItem('zhongxue.learning.v1', raw);
      }, brokenRaw);
      if (quotaFailure) {
        await page.addInitScript(() => {
          const setItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key: string, value: string) {
            if (key === 'zhongxue.learning.v1.corrupt_backup') {
              throw new DOMException('Simulated full storage', 'QuotaExceededError');
            }
            return setItem.call(this, key, value);
          };
        });
      }
      await page.reload();
      const recovery = page.getByRole('alert', { name: 'Khôi phục tiến độ' });
      await expect(recovery).toBeVisible();
      // A real state change must remain in memory while original raw is protected.
      await page.getByRole('button', { name: 'Mở hồ sơ & cài đặt' }).click();
      await page.locator('#profile-name').fill('Khôi phục có xác nhận');
      await page.getByRole('button', { name: 'Lưu cài đặt', exact: true }).click();
      await expect(page.locator('#profile-name')).toHaveValue('Khôi phục có xác nhận');
      expect(await page.evaluate(() => localStorage.getItem('zhongxue.learning.v1'))).toBe(brokenRaw);
      await recovery.getByRole('button', { name: 'Giữ bản sao gốc và tiếp tục lưu' }).click();
      if (quotaFailure) {
        await expect(recovery).toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem('zhongxue.learning.v1'))).toBe(brokenRaw);
        expect(await page.evaluate(() => localStorage.getItem('zhongxue.learning.v1.corrupt_backup'))).toBeNull();
      } else {
        await expect(recovery).not.toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem('zhongxue.learning.v1.corrupt_backup'))).toBe(brokenRaw);
        await page.reload();
        await page.getByRole('button', { name: 'Mở hồ sơ & cài đặt' }).click();
        await expect(page.locator('#profile-name')).toHaveValue('Khôi phục có xác nhận');
      }
    });
  }
});
