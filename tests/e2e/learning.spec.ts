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

test('dictionary finds unaccented Vietnamese and pinyin, handles no results', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Từ điển');
  const search = page.getByLabel('Tìm từ vựng');
  for (const query of ['xin chao', 'ni hao', 'nihao', '你好']) {
    await search.fill(query);
    await expect(page.getByRole('main')).toContainText('你好');
  }
  await search.fill('zzzznonexistent');
  await expect(page.getByRole('main')).toContainText(/Không tìm thấy từ phù hợp/i);
  await page.getByRole('button', { name: 'Xóa tìm kiếm' }).click();
  await expect(page.getByRole('main')).toContainText('你好');
});

test('saving a dictionary word creates a review and rating schedules it after reload', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Từ điển');
  await page.getByLabel('Tìm từ vựng').fill('你好');
  await page.getByRole('button', { name: 'Lưu 你好', exact: true }).click();
  await page.reload();
  await navigate(page, 'Ôn tập');
  await expect(page.getByRole('main')).toContainText('1 từ đến lịch ôn');
  await page.getByRole('button', { name: 'Hiện đáp án' }).click();
  await expect(page.getByRole('heading', { name: 'Xin chào', exact: true })).toBeVisible();
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
