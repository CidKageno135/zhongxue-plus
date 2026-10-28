import { test, expect } from '@playwright/test';
import { scenarios } from '../../src/data/lessons';
import { navigate } from './helpers';

test.describe('Settings View & AI Configuration Suite (Subagent A18)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await navigate(page, 'Tiến độ & Cài đặt');
    await expect(page.getByRole('heading', { name: 'Cài đặt hồ sơ & Nhịp học' })).toBeVisible();
  });

  test('server-key mode is selected by default with privacy isolation, no key in localStorage or request', async ({ page }) => {
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
              latencyMs: 95
            })
          });
          return;
        }
      }
      await route.continue();
    });

    // Verify Server-Key Mode is displayed and checked by default
    await expect(page.getByText('Sử dụng khóa máy chủ (Mặc định - An toàn)')).toBeVisible();
    const serverRadio = page.locator('input[type="radio"][value="server"]');
    await expect(serverRadio).toBeChecked();

    // Verify explanation that API key is not stored in browser
    await expect(page.getByText(/Không lưu API Key trên trình duyệt/)).toBeVisible();

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

    // Verify roundtrip latency in status notification without strict mode conflict
    await expect(page.getByRole('status').filter({ hasText: /Kết nối AI thành công!/ })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /95ms/ })).toBeVisible();

    // Assert that NO client apiKey was sent in the request body
    expect(interceptedApiKey).toBeUndefined();
  });

  test('ping probe button displays roundtrip latency and green check badge on successful mock response', async ({ page }) => {
    await page.route('**/api/conversation', async route => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = req.postDataJSON();
        if (body?.action === 'ping') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              provider: 'AgentRouter (gpt-6.1-sol)',
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

    const pingBtn = page.getByRole('button', { name: /Kiểm tra kết nối AI \(Ping\)/ });
    await expect(pingBtn).toBeVisible();
    await pingBtn.click();

    // Verify green success badge and latency in the provider result container without strict mode conflict
    const resultCard = page.locator('.bento-card', { hasText: 'Nhà cung cấp & Điểm cuối' });
    await expect(resultCard.getByText('✅ Kết nối AI thành công!')).toBeVisible();
    await expect(resultCard.locator('strong', { hasText: '95ms' })).toBeVisible();
    await expect(resultCard.getByText('AgentRouter (gpt-6.1-sol)')).toBeVisible();
  });

  test('client-key mode allows entering personal API key, persists to localStorage, and can be cleared cleanly', async ({ page }) => {
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
              latencyMs: 88
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
    await expect(page.getByRole('status').filter({ hasText: /Kết nối AI thành công!/ })).toBeVisible();
    expect(interceptedKey).toBe('sk-personal-user-test-key-999');

    // Click "Xóa khóa"
    await page.getByRole('button', { name: 'Xóa khóa' }).click();
    await expect(page.getByRole('status')).toContainText('Đã xóa khóa cá nhân.');

    // Verify mode reverts to server-key mode cleanly
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

  test('custom untrusted baseUrl displays A03 security warning that server keys are not forwarded', async ({ page }) => {
    const baseUrlInput = page.getByLabel('API Base URL:');
    await baseUrlInput.fill('https://attacker.evil.com/v1');

    // Verify A03 Security Warning banner appears
    await expect(page.getByText('Cảnh báo an ninh Upstream (Chính sách A03)')).toBeVisible();
    await expect(page.getByText(/máy chủ sẽ KHÔNG chuyển tiếp khóa hệ thống/)).toBeVisible();

    // Revert to trusted host preset and verify warning disappears
    await page.getByRole('button', { name: '🌟 AgentRouter (Khuyên dùng)' }).click();
    await expect(page.getByText('Cảnh báo an ninh Upstream (Chính sách A03)')).not.toBeVisible();
  });

  test('profile export/import preserves progress, invalid import is rejected, reset requires confirmation', async ({ page }) => {
    await page.getByLabel('Tên của bạn').fill('An Nguyễn');
    await page.getByLabel('Mục tiêu mỗi ngày').selectOption('30');
    await page.getByRole('button', { name: 'Lưu cài đặt', exact: true }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất dữ liệu', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('zhongxue-tien-do.json');
    const exported = await download.path();
    expect(exported).toBeTruthy();

    await page.getByLabel('Chọn tệp dữ liệu JSON').setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"version":1,"profile":{"name":"Bad"}}')
    });
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
    const goals = await page.getByLabel('Mục tiêu mỗi ngày').locator('option').evaluateAll(options =>
      options.map(option => (option as HTMLOptionElement).value)
    );
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
});

test.describe('Branching Conversation Scenarios', () => {
  test('conversation explains an unsuitable answer, supports clarification and completion', async ({ page }) => {
    await page.goto('/');
    await navigate(page, 'Hội thoại');
    const scenario = scenarios[0];
    const scenarioCard = page.locator('article.scenario-card', { hasText: scenario.title });
    await scenarioCard.getByRole('button', { name: 'Bắt đầu hội thoại' }).click();
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
});
