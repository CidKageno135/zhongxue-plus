import { test, expect } from '@playwright/test';
import { navigate } from './helpers';

test.describe('API Resilience & Fault Tolerance Suite (Subagent A17)', () => {
  test('server timeout fallback response renders a guided reply without hanging UI', async ({ page }) => {
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

    // Scope to the reply carrying this timeout notice, excluding the initial greeting.
    const reply = page.getByText(/Yêu cầu AI trực tuyến quá thời gian quy định \(12000ms\)/).locator('..').locator('..');
    await expect(reply.getByText('[Gia sư hướng dẫn cục bộ]', { exact: true })).toBeVisible();

    // Verify pedagogical timeout notice
    await expect(page.getByText(/Yêu cầu AI trực tuyến quá thời gian quy định \(12000ms\)/)).toBeVisible();

    // Verify Traditional Chinese content and practice suggestion
    await expect(reply.getByText(/不好意思，伺服器連線超時，我先由在地教學助教為您說明/)).toBeVisible();
    await expect(reply.getByText(/Bù hǎoyìsi, sìfúqì liánxiàn chāoshí/)).toBeVisible();
    await expect(reply.getByText(/Xin lỗi, kết nối máy chủ quá thời gian/)).toBeVisible();
  });

  test('upstream HTTP 503 triggers graceful guided fallback with badge and no UI freeze', async ({ page }) => {
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
    const reply = page.getByText(/Đã tự động kích hoạt Gia sư Cục bộ chuẩn TOCFL Đài Loan/).locator('..').locator('..');
    await expect(reply.getByText('[Gia sư hướng dẫn cục bộ]', { exact: true })).toBeVisible();

    // Verify guidance banner explaining offline / interrupted connection fallback
    await expect(page.getByText(/Đã tự động kích hoạt Gia sư Cục bộ chuẩn TOCFL Đài Loan/)).toBeVisible();

    // Verify chat UI renders structured fallback with audio controls
    await expect(reply.getByRole('button', { name: 'Chuẩn', exact: true })).toBeVisible();
    await expect(reply.getByRole('button', { name: '🐢 Chậm', exact: true })).toBeVisible();
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

    const canvas = dialog.locator('canvas');
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
    const candidateBtn = dialog.getByRole('button', { name: '一', exact: true });
    await expect(candidateBtn).toBeVisible({ timeout: 6000 });

    // Verify offline transparency badge / notice
    await expect(dialog.getByText(/Chế độ ngoại tuyến: Nhận diện theo hình học nét/)).toBeVisible({ timeout: 6000 });

    // Select candidate and verify dictionary search receives it
    await candidateBtn.click();
    await expect(dialog).not.toBeVisible();

    const searchInput = page.getByLabel('Tìm từ vựng');
    await expect(searchInput).toHaveValue('一');
    await expect(page.getByRole('main')).toContainText('一');
  });

  test('speech synthesis cancels previous playback and synchronizes UI state when switching between pronunciation buttons', async ({ page }) => {
    // A controlled browser speech device keeps playback active until canceled.
    // It intentionally emits no cancel event: the application must reset old UI itself.
    await page.addInitScript(() => {
      const calls: string[] = [];
      Object.defineProperty(window, '__speechCalls', { value: calls });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          paused: false,
          getVoices: () => [],
          cancel: () => calls.push('cancel'),
          resume: () => {},
          speak: (utterance: SpeechSynthesisUtterance) => calls.push(`speak:${utterance.text}`)
        }
      });
    });
    await page.goto('/');
    await navigate(page, 'Hôm nay');

    // Today's hero word has two audio controls: word, then example sentence.
    const speakButtons = page.locator('.speech-control button.icon-button');
    await expect(speakButtons).toHaveCount(2);
    const wordBtn = speakButtons.nth(0);
    const sentenceBtn = speakButtons.nth(1);
    await wordBtn.click();
    await expect(wordBtn).toHaveAttribute('aria-pressed', 'true');
    await sentenceBtn.click();
    await expect(sentenceBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(wordBtn).toHaveAttribute('aria-pressed', 'false');

    const calls = await page.evaluate(() => (window as unknown as { __speechCalls: string[] }).__speechCalls);
    const utterances = calls.filter(call => call.startsWith('speak:'));
    expect(utterances).toHaveLength(2);
    expect(utterances[0]).not.toBe(utterances[1]);
    const firstSpeak = calls.indexOf(utterances[0]);
    const secondSpeak = calls.indexOf(utterances[1]);
    expect(calls.slice(firstSpeak + 1, secondSpeak)).toContain('cancel');

    await sentenceBtn.click();
    await expect(sentenceBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('tone visualization clearly distinguishes simulated model curve from verified acoustic measurement', async ({ page }) => {
    await page.goto('/');
    await navigate(page, 'Hôm nay');

    const pitchBox = page.locator('.pitch-curve-box');
    await expect(pitchBox).toBeVisible();

    // Invariant: Before microphone recording or in simulation mode, the label must state "Đường mô phỏng mẫu"
    await expect(page.locator('.badge-pill').filter({ hasText: /^Đường cao độ mẫu \(Mô phỏng thanh điệu\)$/ })).toBeVisible();
    await expect(pitchBox.getByText('● Đường cao độ mẫu (Mô phỏng thanh điệu)', { exact: true })).toBeVisible();
    // Invariant: Must NOT claim to be real voice pitch
    await expect(page.getByText(/Giọng bạn \(\d+ Hz\)/)).not.toBeVisible();
    // Descriptive text must clearly state it is a simulation of standard Taipei pitch contour
    await expect(page.getByText(/chuẩn ngữ âm Đài Bắc.*cấp quyền micro và đo cao độ thực tế/)).toBeVisible();
  });

  test('one measured F0 value never becomes a fabricated voice contour or tone-match claim', async ({ page }) => {
    // Feed a known signal through the browser-facing capture path, with no physical mic.
    await page.addInitScript(() => {
      const resources = { stopped: false, closed: false };
      Object.defineProperty(window, '__audioResources', { value: resources });
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => ({
            getTracks: () => [{ stop: () => { resources.stopped = true; } }]
          })
        }
      });
      class ControlledAudioContext {
        sampleRate = 48000;
        createMediaStreamSource() { return { connect: () => {} }; }
        createAnalyser() {
          return {
            fftSize: 1024,
            getFloatTimeDomainData(buffer: Float32Array) {
              for (let index = 0; index < buffer.length; index++) {
                buffer[index] = 0.5 * Math.sin(2 * Math.PI * 220 * index / 48000);
              }
            }
          };
        }
        close() { resources.closed = true; return Promise.resolve(); }
      }
      Object.defineProperty(window, 'AudioContext', { configurable: true, value: ControlledAudioContext });
    });
    await page.goto('/');
    await navigate(page, 'Hôm nay');
    const plot = page.locator('.pitch-curve-box');
    await expect(plot).toBeVisible();
    const referencePaths = await plot.locator('svg path').evaluateAll(paths => paths.map(path => path.getAttribute('d')));
    expect(referencePaths.length).toBeGreaterThan(0);
    await page.getByRole('button', { name: /Nhấn để thu âm/ }).click();

    const measurement = page.locator('.badge-pill').filter({ hasText: /^Đo thực tế: [\d.]+ Hz$/ });
    await expect(measurement).toBeVisible();
    const hz = Number((await measurement.innerText()).match(/[\d.]+/)?.[0]);
    expect(hz).toBeGreaterThan(200);
    expect(hz).toBeLessThan(240);
    await expect(plot.getByText(/Giọng bạn/)).toHaveCount(0);
    await expect(plot.getByText('● Đường cao độ mẫu (Mô phỏng thanh điệu)', { exact: true })).toBeVisible();
    expect(await plot.locator('svg path').evaluateAll(paths => paths.map(path => path.getAttribute('d')))).toEqual(referencePaths);
    await expect(page.getByText(/chưa đánh giá độ khớp thanh điệu/i)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __audioResources: { stopped: boolean; closed: boolean } }).__audioResources)).toEqual({ stopped: true, closed: true });
  });

});
