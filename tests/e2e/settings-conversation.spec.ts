import { test, expect } from '@playwright/test';
import { scenarios } from '../../src/data/lessons';
import { navigate } from './helpers';

test('conversation explains an unsuitable answer, supports clarification and completion', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Hội thoại');
  await page.getByRole('button', { name: 'Bắt đầu hội thoại', exact: true }).first().click();
  const scenario = scenarios[0];
  await page.locator('.conversation-choices button').filter({ hasText: scenario.nodes.start.choices[2].text }).click();
  await expect(page.getByRole('status')).toContainText('chưa trả lời câu hỏi');
  await expect(page.getByRole('heading', { name: scenario.nodes.start.hanzi, exact: true })).toBeVisible();
  await page.locator('.conversation-choices button').filter({ hasText: scenario.nodes.start.choices[1].text }).click();
  await expect(page.locator('.conversation-choices button')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('nhờ nhắc lại');
  await page.locator('.conversation-choices button').filter({ hasText: scenario.nodes.clarify.choices[0].text }).click();
  await page.locator('.conversation-choices button').filter({ hasText: scenario.nodes.follow.choices[0].text }).click();
  await expect(page.getByRole('heading', { name: 'Bạn đã hoàn thành tình huống!' })).toBeVisible();
  await page.getByRole('button', { name: 'Luyện lại', exact: true }).click();
  await expect(page.getByRole('heading', { name: scenario.nodes.start.hanzi, exact: true })).toBeVisible();
});

test('profile export/import preserves progress, invalid import is rejected, reset requires confirmation', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Tiến độ & Cài đặt');
  await page.getByLabel('Tên của bạn').fill('An Nguyễn');
  await page.getByLabel('Mục tiêu mỗi ngày').selectOption('30');
  await page.getByRole('button', { name: 'Lưu cài đặt', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất dữ liệu', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('zhongxue-tien-do.json');
  const exported = await download.path();
  expect(exported).toBeTruthy();
  await page.getByLabel('Chọn tệp dữ liệu JSON').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"profile":{"name":"Bad"}}') });
  await expect(page.getByRole('status')).toContainText('Cấu trúc dữ liệu không hợp lệ.');
  await expect(page.getByLabel('Tên của bạn')).toHaveValue('An Nguyễn');
  await page.getByRole('button', { name: 'Xóa toàn bộ tiến độ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận xóa', exact: true })).toBeDisabled();
  await page.getByLabel('Nhập XÓA để xác nhận').fill('xóa');
  await expect(page.getByRole('button', { name: 'Xác nhận xóa', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(page.getByLabel('Tên của bạn')).toHaveValue('An Nguyễn');
  await page.getByRole('button', { name: 'Xóa toàn bộ tiến độ', exact: true }).click();
  await page.getByLabel('Nhập XÓA để xác nhận').fill('XÓA');
  await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click();
  await expect(page.getByLabel('Tên của bạn')).not.toHaveValue('An Nguyễn');
  await page.getByLabel('Chọn tệp dữ liệu JSON').setInputFiles(exported!);
  await expect(page.getByRole('status')).toContainText('Đã nhập dữ liệu học tập.');
  await expect(page.getByLabel('Tên của bạn')).toHaveValue('An Nguyễn');
  await page.reload();
  await navigate(page, 'Tiến độ & Cài đặt');
  await expect(page.getByLabel('Tên của bạn')).toHaveValue('An Nguyễn');
  await expect(page.getByLabel('Mục tiêu mỗi ngày')).toHaveValue('30');
});


test('every offered daily goal can be saved without a runtime error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await navigate(page, 'Tiến độ & Cài đặt');
  const goals = await page.getByLabel('Mục tiêu mỗi ngày').locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
  for (const goal of goals) {
    await page.getByLabel('Mục tiêu mỗi ngày').selectOption(goal);
    await page.getByRole('button', { name: 'Lưu cài đặt', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Đã lưu cài đặt.');
  }
  expect(errors).toEqual([]);
  await page.reload();
  await navigate(page, 'Tiến độ & Cài đặt');
  await expect(page.getByLabel('Mục tiêu mỗi ngày')).toHaveValue(goals.at(-1)!);
});



test('blank profile name shows validation without discarding the saved name', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await navigate(page, 'Tiến độ & Cài đặt');
  await page.getByLabel('Tên của bạn').fill('An');
  await page.getByRole('button', { name: 'Lưu cài đặt', exact: true }).click();
  await page.getByLabel('Tên của bạn').fill('   ');
  await page.getByRole('button', { name: 'Lưu cài đặt', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(/không hợp lệ|nhập tên/i);
  expect(errors).toEqual([]);
  await page.reload();
  await navigate(page, 'Tiến độ & Cài đặt');
  await expect(page.getByLabel('Tên của bạn')).toHaveValue('An');
});
