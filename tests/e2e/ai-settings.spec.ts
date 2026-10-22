import { test, expect } from '@playwright/test';
import { navigate } from './helpers';

test.describe('Settings & AI Provider Configuration (Subagent A15)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await navigate(page, 'Tiến độ & Cài đặt');
    await expect(page.getByRole('heading', { name: 'Cài đặt hồ sơ & Nhịp học' })).toBeVisible();
  });

  test('server-key mode is selected by default with privacy isolation, no key sent in request', async ({ page }) => {
    // Intercept ping request to inspect request payload
    let interceptedApiKey: string | undefined = 'INITIAL_SENTINEL';
    await page.route('**/api/conversation', async route => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = req.postDataJSON();
        if (body?.action === 'ping') {
          interceptedApiKey = body.apiKey;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              provider: 'AgentRouter (gpt-6.1-sol)',
              model: 'gpt-6.1-sol',
              baseUrl: 'https://agentrouter.org/v1',
              latencyMs: 128
            })
          });
          return;
        }
      }
      await route.continue();
    });

    // Verify Server-Key Mode radio is checked by default
    const serverRadio = page.locator('input[type="radio"][value="server"]');
    await expect(serverRadio).toBeChecked();

    // Verify privacy explanation banner is present
    await expect(page.getByText(/Trình duyệt không lưu trữ và không gửi bất kỳ khóa API nào/)).toBeVisible();

    // Verify localStorage has no apiKey stored
    const storedConfig = await page.evaluate(() => {
      return window.localStorage.getItem('zhongxue.ai.config');
    });
    if (storedConfig) {
      const parsed = JSON.parse(storedConfig);
      expect(parsed.apiKey).toBeUndefined();
    }

    // Click "Kiểm tra kết nối AI (Ping)"
    await page.getByRole('button', { name: /Kiểm tra kết nối AI \(Ping\)/ }).click();

    // Verify success banner with latency is displayed
    await expect(page.getByText(/Kết nối AI thành công!/)).toBeVisible();
    await expect(page.getByText(/128ms/)).toBeVisible();

    // Assert that NO client apiKey was sent in the request body
    expect(interceptedApiKey).toBeUndefined();
  });

  test('custom key mode allows entering personal API key, persists to localStorage, and can be cleared', async ({ page }) => {
    let interceptedKey: string | undefined;
    await page.route('**/api/conversation', async route => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = req.postDataJSON();
        if (body?.action === 'ping') {
          interceptedKey = body.apiKey;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              provider: 'AgentRouter (Custom Key)',
              model: 'gpt-6.1-sol',
              baseUrl: 'https://agentrouter.org/v1',
              latencyMs: 95
            })
          });
          return;
        }
      }
      await route.continue();
    });

    // Select Client-Key Mode radio
    const clientRadio = page.locator('input[type="radio"][value="client"]');
    await clientRadio.check();
    await expect(clientRadio).toBeChecked();

    // Input personal key
    const keyInput = page.getByLabel('Khóa API AI cá nhân');
    await expect(keyInput).toBeVisible();
    await keyInput.fill('sk-personal-user-test-key-999');

    // Click "Lưu cấu hình AI"
    await page.getByRole('button', { name: 'Lưu cấu hình AI' }).click();
    await expect(page.getByRole('status')).toContainText('Đã lưu cấu hình AI thành công.');

    // Check localStorage contains the personal key
    const stored = await page.evaluate(() => {
      const raw = window.localStorage.getItem('zhongxue.ai.config');
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored?.authMode).toBe('client');
    expect(stored?.apiKey).toBe('sk-personal-user-test-key-999');

    // Trigger AI Ping probe and verify client key is forwarded
    await page.getByRole('button', { name: /Kiểm tra kết nối AI \(Ping\)/ }).click();
    await expect(page.getByText(/Kết nối AI thành công!/)).toBeVisible();
    expect(interceptedKey).toBe('sk-personal-user-test-key-999');

    // Click "Xóa khóa"
    await page.getByRole('button', { name: 'Xóa khóa' }).click();
    await expect(page.getByRole('status')).toContainText('Đã xóa khóa cá nhân.');

    // Verify mode reverts to server-key mode
    const serverRadio = page.locator('input[type="radio"][value="server"]');
    await expect(serverRadio).toBeChecked();
    await expect(page.getByLabel('Khóa API AI cá nhân')).not.toBeVisible();

    // Verify localStorage no longer contains apiKey
    const storedAfterClear = await page.evaluate(() => {
      const raw = window.localStorage.getItem('zhongxue.ai.config');
      return raw ? JSON.parse(raw) : null;
    });
    expect(storedAfterClear?.apiKey).toBeUndefined();
    expect(storedAfterClear?.authMode).toBe('server');
  });

  test('custom/untrusted baseUrl displays A03 security boundary alert', async ({ page }) => {
    const baseUrlInput = page.getByLabel('API Base URL:');
    await baseUrlInput.fill('https://attacker.evil.com/v1');

    // Verify A03 Security Warning banner appears
    await expect(page.getByText('Cảnh báo an ninh Upstream (Chính sách A03)')).toBeVisible();
    await expect(page.getByText(/máy chủ sẽ KHÔNG chuyển tiếp khóa hệ thống/)).toBeVisible();

    // Revert to trusted host and verify warning disappears
    await page.getByRole('button', { name: '🌟 AgentRouter (Khuyên dùng)' }).click();
    await expect(page.getByText('Cảnh báo an ninh Upstream (Chính sách A03)')).not.toBeVisible();
  });

  test('system health probe checks /api/health with application/json validation', async ({ page }) => {
    await page.route('**/api/health', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          status: 'ok',
          uptime: 360,
          timestamp: new Date().toISOString(),
          dictionary: {
            loaded: true,
            totalEntries: 122596,
            loadTimeMs: 250
          },
          ai: {
            configured: true,
            provider: 'agentrouter',
            model: 'gpt-6.1-sol'
          },
          version: '2.0.0'
        })
      });
    });

    // Click "Kiểm tra hệ thống"
    await page.getByRole('button', { name: 'Kiểm tra hệ thống' }).click();

    // Verify UI reflects real dictionary loaded entries
    await expect(page.getByText('122.596 mục từ')).toBeVisible();
    await expect(page.getByText('application/json')).toBeVisible();
    await expect(page.getByText('Sẵn sàng (200 OK)')).toBeVisible();
  });

  test('learning profile name and daily goal update with export/import roundtrip', async ({ page }) => {
    // 1. Update Profile & Daily Goal
    await page.getByLabel('Tên của bạn').fill('Hoàng Long');
    await page.getByLabel('Mục tiêu mỗi ngày').selectOption('50');
    await page.getByRole('button', { name: 'Lưu cài đặt' }).click();
    await expect(page.getByRole('status')).toContainText('Đã lưu cài đặt.');

    // 2. Export Progress to JSON
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất dữ liệu' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('zhongxue-tien-do.json');
    const exportedPath = await download.path();
    expect(exportedPath).toBeTruthy();

    // 3. Reset progress with confirmation
    await page.getByRole('button', { name: 'Xóa toàn bộ tiến độ' }).click();
    await page.getByLabel('Nhập XÓA để xác nhận').fill('XÓA');
    await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
    await expect(page.getByRole('status')).toContainText('Đã xóa tiến độ.');
    await expect(page.getByLabel('Tên của bạn')).not.toHaveValue('Hoàng Long');

    // 4. Re-import progress from exported file
    await page.getByLabel('Chọn tệp dữ liệu JSON').setInputFiles(exportedPath!);
    await expect(page.getByRole('status')).toContainText('Đã nhập dữ liệu học tập.');
    await expect(page.getByLabel('Tên của bạn')).toHaveValue('Hoàng Long');
    await expect(page.getByLabel('Mục tiêu mỗi ngày')).toHaveValue('50');
  });
});
