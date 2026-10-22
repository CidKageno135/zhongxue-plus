import { test, expect } from '@playwright/test';
import { navigate } from './helpers';

test('new learner has usable responsive navigation without horizontal overflow', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
  for (const name of ['Lộ trình', 'Ôn tập', 'Từ điển', 'Hội thoại', 'Tiến độ & Cài đặt', 'Hôm nay']) {
    await navigate(page, name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), name).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('dictionary finds accented and toneless Pinyin, unaccented Vietnamese, and handles helpful empty state', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Từ điển');
  const search = page.getByLabel('Tìm từ vựng');

  // 1. Verify Pinyin with tone marks returns 學生
  await search.fill('xuéshēng');
  await expect(page.getByRole('main')).toContainText('學生');

  // 2. Verify toneless Pinyin returns 學生
  await search.fill('xuesheng');
  await expect(page.getByRole('main')).toContainText('學生');

  // 3. Verify unaccented Vietnamese returns 學生
  await search.fill('hoc sinh');
  await expect(page.getByRole('main')).toContainText('學生');

  // 4. Verify search variations for 你好
  for (const query of ['xin chao', 'ni hao', 'nihao', '你好']) {
    await search.fill(query);
    await expect(page.getByRole('main')).toContainText('你好');
  }

  // 4b. Invariant G5: Search corpus-only word "乾杯" (not in default lessons)
  await search.fill('乾杯');
  await expect(page.getByRole('main')).toContainText('乾杯');
  await expect(page.getByRole('main')).toContainText(/cạn ly/i);

  // 4c. Invariant G5 / F06: Ensure CSDL badge does NOT collapse into 1 or page length
  const dbBadge = page.locator('span', { hasText: /CSDL 122k/i });
  await expect(dbBadge).toBeVisible();
  await expect(dbBadge).not.toContainText('1 mục từ');
  await expect(dbBadge).not.toContainText('20 mục từ');

  // 5. Verify helpful empty state when search finds no results
  await search.fill('zzzznonexistent');
  await expect(page.getByRole('main')).toContainText(/Không tìm thấy mục từ nào khớp/i);
  await expect(page.getByText(/Mẹo tra cứu hiệu quả/i)).toBeVisible();

  // 6. Reset search to restore full vocabulary list
  await page.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('你好');
});

test('saving a dictionary word creates a review and rating schedules it after reload', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Từ điển');
  await page.getByLabel('Tìm từ vựng').fill('學生');
  await page.getByRole('button', { name: 'Lưu 學生', exact: true }).click();
  await page.reload();
  await navigate(page, 'Ôn tập');
  await expect(page.getByRole('main')).toContainText('1 từ đến lịch ôn');
  await page.getByRole('button', { name: 'Hiện đáp án' }).click();
  await expect(page.getByRole('heading', { name: /Học sinh/i })).toBeVisible();
  await page.getByRole('button', { name: /Nhớ được/ }).click();
  await expect(page.getByRole('main')).toContainText('Bạn đã ôn xong hôm nay!');
  await page.reload();
  await navigate(page, 'Ôn tập');
  await expect(page.getByRole('main')).toContainText('0 từ đến lịch ôn');
});

test('again-rated word remains due today and can explicitly be retried', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Từ điển');
  await page.getByLabel('Tìm từ vựng').fill('你好');
  await page.getByRole('button', { name: 'Lưu 你好', exact: true }).click();
  await navigate(page, 'Ôn tập');
  await page.getByRole('button', { name: 'Hiện đáp án' }).click();
  await page.getByRole('button', { name: /Cần học lại/ }).click();
  await expect(page.getByRole('main')).toContainText('1 từ cần ôn lại hôm nay');
  await expect(page.getByRole('main')).not.toContainText('Bạn đã ôn xong hôm nay!');
  await page.getByRole('button', { name: 'Ôn lại các từ chưa nhớ', exact: true }).click();
  await expect(page.locator('.review-card')).toContainText('你好');
  await page.getByRole('button', { name: 'Hiện đáp án' }).click();
  await page.getByRole('button', { name: /Nhớ được/ }).click();
  await expect(page.getByRole('main')).toContainText('Bạn đã ôn xong hôm nay!');
});
