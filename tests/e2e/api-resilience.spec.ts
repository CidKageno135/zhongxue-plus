import { test, expect } from '@playwright/test';
import { navigate } from './helpers';

test.describe('API Resilience & Fault Tolerance Suite (Subagent A17)', () => {
  test('server-side timeout simulation (>12s) triggers resilient guided fallback without hanging UI', async ({ page }) => {
    // Intercept /api/conversation and simulate server-side timeout fallback
    await page.route('**/api/conversation', async route => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = req.postDataJSON();
        if (body?.action === 'chat') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              mode: 'guided',
              content: '中文：不好意思，伺服器連線超時，我先由在地教學助教為您說明。請問今天想練習哪種情境？\nPinyin: Bù hǎoyìsi, sìfúqì liánxiàn chāoshí, wǒ xiān yóu zàidì jiàoxué zhùjiào wèi nín shuōmíng. Qǐngwèn jīntiān xiǎng liànxí nǎ zhǒng qíngjìng?\nTiếng Việt: Xin lỗi, kết nối máy chủ quá thời gian quy định, gia sư cục bộ sẽ hướng dẫn bạn trước. Hôm nay bạn muốn luyện tập tình huống nào?\n練習：Gợi ý phản xạ: Hãy thử hỏi "我想練習租機車" (Tôi muốn luyện tập thuê xe máy).',
              model: 'Sinology Local NLP',
              provider: 'Sinology Local NLP',
              source: 'local-fallback',
              thread: { id: 2001, messages: [] },
              meta: {
                fallbackReason: 'timeout',
                guidanceNote: 'Yêu cầu AI trực tuyến quá thời gian quy định (12000ms). Đã kích hoạt gia sư hướng dẫn cục bộ.',
                latencyMs: 12050
              }
            })
          });
          return;
        }
      }
      await route.continue();
    });

    await page.goto('/');
    await navigate(page, 'Hội thoại');

    const input = page.getByPlaceholder(/Gõ câu tiếng Trung hoặc tiếng Việt/);
    await input.fill('請問這附近有便利商店嗎？');
    await page.getByRole('button', { name: 'Gửi', exact: true }).click();

    // Verify loading indicator resolves and does NOT hang the UI
    await expect(page.getByText('AI đối thoại đang soạn câu trả lời')).not.toBeVisible();

    // Verify transparent guided fallback badge
    await expect(page.getByText('[Gia sư hướng dẫn cục bộ]')).toBeVisible();

    // Verify pedagogical timeout notice
    await expect(page.getByText(/Yêu cầu AI trực tuyến quá thời gian quy định \(12000ms\)/)).toBeVisible();

    // Verify Traditional Chinese content and practice suggestion
    await expect(page.getByText(/不好意思，伺服器連線超時，我先由在地教學助教為您說明/)).toBeVisible();
    await expect(page.getByText(/Bù hǎoyìsi, sìfúqì liánxiàn chāoshí/)).toBeVisible();
    await expect(page.getByText(/Xin lỗi, kết nối máy chủ quá thời gian/)).toBeVisible();
  });

  test('upstream server error (500/503/429) triggers graceful guided fallback with badge and no UI freeze', async ({ page }) => {
    // Intercept /api/conversation and simulate upstream HTTP 503 Service Unavailable
    await page.route('**/api/conversation', async route => {
      const req = route.request();
      if (req.method() === 'POST') {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'UPSTREAM_UNAVAILABLE',
              message: 'Upstream AI model provider is experiencing heavy traffic (HTTP 503)'
            }
          })
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/');
    await navigate(page, 'Hội thoại');

    const input = page.getByPlaceholder(/Gõ câu tiếng Trung hoặc tiếng Việt/);
    await input.fill('我要一杯珍珠奶茶，半糖少冰。');
    await page.getByRole('button', { name: 'Gửi', exact: true }).click();

    // Verify UI terminates loading without freezing or infinite spinner
    await expect(page.getByText('AI đối thoại đang soạn câu trả lời')).not.toBeVisible();

    // Client resilience catches HTTP error and activates local tutor with guided badge
    await expect(page.getByText('[Gia sư hướng dẫn cục bộ]')).toBeVisible();

    // Verify guidance banner explaining offline / interrupted connection fallback
    await expect(page.getByText(/Đã tự động kích hoạt Gia sư Cục bộ chuẩn TOCFL Đài Loan/)).toBeVisible();

    // Verify chat UI renders structured fallback with audio controls
    await expect(page.getByRole('button', { name: 'Chuẩn', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '🐢 Chậm', exact: true }).first()).toBeVisible();
  });

  test('offline handwriting fallback activates seamlessly when backend handwriting API fails', async ({ page }) => {
    // Intercept /api/handwriting and simulate backend / Google Input Tools failure
    await page.route('**/api/handwriting', async route => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'UPSTREAM_ERROR',
            message: 'Google Input Tools handwriting service is currently unreachable'
          }
        })
      });
    });

    await page.goto('/');
    await navigate(page, 'Từ điển');

    // Open handwriting modal
    const openBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
    await openBtn.click();

    const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
    await expect(dialog).toBeVisible();

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // Draw single horizontal stroke representing '一'
      await page.mouse.move(box.x + 40, box.y + 120);
      await page.mouse.down();
      await page.mouse.move(box.x + 220, box.y + 120, { steps: 5 });
      await page.mouse.up();
    }

    // Verify offline recognition fallback displays candidate '一'
    const candidateBtn = dialog.getByRole('button', { name: '一' });
    await expect(candidateBtn).toBeVisible({ timeout: 6000 });

    // Verify offline transparency badge / notice
    await expect(dialog.getByText(/Chế độ ngoại tuyến: Nhận diện theo hình học nét/)).toBeVisible();

    // Select candidate and verify dictionary search receives it
    await candidateBtn.click();
    await expect(dialog).not.toBeVisible();

    const searchInput = page.getByLabel('Tìm từ vựng');
    await expect(searchInput).toHaveValue('一');
    await expect(page.getByRole('main')).toContainText('一');
  });
});
