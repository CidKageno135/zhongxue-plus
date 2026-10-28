import { test, expect } from '@playwright/test';
import { navigate } from './helpers';

test('handwriting search modal opens, recognizes strokes offline, and closes via Escape', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Từ điển');

  // Open handwriting pad using the explicit dictionary toolbar button
  const openBtn = page.getByRole('button', { name: 'Viết tay (手寫)', exact: true });
  await expect(openBtn).toBeVisible();
  await openBtn.click();

  // Verify modal elements are visible
  const dialog = page.getByRole('dialog', { name: 'Tra bằng chữ viết tay' });
  await expect(dialog).toBeVisible();
  await expect(page.getByText('Tra bằng chữ viết tay (手寫輸入)')).toBeVisible();
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xóa hết' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lùi 1 nét' })).toBeVisible();

  // Draw a horizontal stroke on the canvas and verify offline candidate recognition
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 40, box.y + 120);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 120, { steps: 5 });
    await page.mouse.up();
    await expect(dialog.getByRole('button', { name: '一' })).toBeVisible({ timeout: 5000 });
  }

  // Close modal via Escape key
  await page.keyboard.press('Escape');
  await expect(page.getByText('Tra bằng chữ viết tay (手寫輸入)')).not.toBeVisible();
});

test('AI chat handles live AI reply with Traditional Chinese, Pinyin, Vietnamese translation, and practice tips', async ({ page }) => {
  // Hermetic mock fixture for upstream AI response with unique response text
  await page.route('**/api/conversation', async route => {
    const req = route.request();
    if (req.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mode: 'ai',
          content: '中文：你好！我是你的華語 AI 學習夥伴。很高興與你一起練習！\nPinyin: Nǐ hǎo! Wǒ shì nǐ de huáyǔ AI xuéxí huǒbàn. Hěn gāoxìng yǔ nǐ yìqǐ liànxí!\nTiếng Việt: Xin chào! Tôi là bạn đồng hành học tiếng Trung AI của bạn. Rất vui được cùng bạn luyện tập!\n練習：Gợi ý phản xạ: Hãy thử trả lời bằng "我想練習搭捷運" (Tôi muốn luyện tập đi MRT).',
          model: 'gpt-6.1-sol',
          provider: 'AgentRouter (gpt-6.1-sol)',
          thread: { id: 1001, messages: [] },
          meta: { latencyMs: 240 }
        })
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/');
  await navigate(page, 'Hội thoại');

  await expect(page.getByText('Trợ lý Đối thoại AI (Hán ngữ Đài Loan)')).toBeVisible();

  // Click quick starter prompt chip
  const promptChip = page.getByRole('button', { name: '👋 Chào hỏi' });
  await expect(promptChip).toBeVisible();
  await promptChip.click();

  // Loading indicator resolves promptly with mock
  await expect(page.getByText('AI đối thoại đang soạn câu trả lời')).not.toBeVisible();

  // Verify online AI status badge
  await expect(page.getByText('[Trực tuyến - gpt-6.1-sol]')).toBeVisible();

  // Verify response fields: Traditional Chinese, Pinyin, Vietnamese translation, and practice tips
  await expect(page.getByText('你好！我是你的華語 AI 學習夥伴。很高興與你一起練習！')).toBeVisible();
  await expect(page.getByText(/Hěn gāoxìng yǔ nǐ yìqǐ liànxí/)).toBeVisible();
  await expect(page.getByText(/Rất vui được cùng bạn luyện tập/)).toBeVisible();
  await expect(page.getByText(/Gợi ý phản xạ: Hãy thử trả lời bằng "我想練習搭捷運"/)).toBeVisible();

  // Verify pronunciation audio action buttons inside the AI response bubble without .first()
  const responseRow = page.getByRole('heading', { name: '你好！我是你的華語 AI 學習夥伴。很高興與你一起練習！' }).locator('xpath=..');
  await expect(responseRow.getByRole('button', { name: 'Chuẩn', exact: true })).toBeVisible();
  await expect(responseRow.getByRole('button', { name: '🐢 Chậm', exact: true })).toBeVisible();
  await expect(responseRow.getByRole('button', { name: 'Luyện đọc', exact: true })).toBeVisible();
});

test('AI chat handles guided local fallback transparently with badge and guidance note', async ({ page }) => {
  // Hermetic mock fixture for guided local fallback response
  await page.route('**/api/conversation', async route => {
    const req = route.request();
    if (req.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mode: 'guided',
          content: '中文：組長，這台機台剛才亮紅燈警報了，需要通知技術員維修。\nPinyin: Zǔzhǎng, zhè tái jītái gāngcái liàng hóngdēng jǐngbào le, xūyào tōngzhī jìshùyuán wéixiū.\nTiếng Việt: Thưa tổ trưởng, máy này vừa báo đèn đỏ cảnh báo, cần báo kỹ thuật viên sửa chữa.\n練習：Gợi ý phản xạ: 組長，我今天可以配合加班兩個小時。(Thưa tổ trưởng, hôm nay em có thể tăng ca 2 tiếng).',
          model: 'Sinology Local NLP',
          provider: 'Sinology Local NLP',
          source: 'local-fallback',
          thread: { id: 1002, messages: [] },
          meta: {
            fallbackReason: 'upstream_error',
            guidanceNote: 'Đã tự động kích hoạt Gia sư Cục bộ chuẩn TOCFL Đài Loan để bạn không bị ngắt quãng bài học.'
          }
        })
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/');
  await navigate(page, 'Hội thoại');

  // Trigger conversation via prompt chip
  const promptChip = page.getByRole('button', { name: '👋 Chào hỏi' });
  await promptChip.click();

  // Loading indicator resolves promptly
  await expect(page.getByText('AI đối thoại đang soạn câu trả lời')).not.toBeVisible();

  // Transparent guided badge and note verification within the fallback bubble without strict mode conflict
  const guidanceNote = page.getByText('Đã tự động kích hoạt Gia sư Cục bộ chuẩn TOCFL Đài Loan để bạn không bị ngắt quãng bài học.');
  await expect(guidanceNote).toBeVisible();
  await expect(guidanceNote.locator('xpath=../..').getByText('[Gia sư hướng dẫn cục bộ]')).toBeVisible();

  // Content rendered properly
  await expect(page.getByText('組長，這台機台剛才亮紅燈警報了，需要通知技術員維修。')).toBeVisible();
  await expect(page.getByText(/Zǔzhǎng, zhè tái jītái gāngcái liàng hóngdēng jǐngbào le/)).toBeVisible();
  await expect(page.getByText(/Thưa tổ trưởng, máy này vừa báo đèn đỏ cảnh báo/)).toBeVisible();
});

test('AI chat supports request cancellation, restoring input into draft so user does not lose text', async ({ page }) => {
  let cancelRoute: (() => void) | undefined;
  await page.route('**/api/conversation', async route => {
    // Hold request in flight until cancel is triggered
    await new Promise<void>(resolve => {
      cancelRoute = resolve;
    });
    await route.abort('cancelled').catch(() => {});
  });

  await page.goto('/');
  await navigate(page, 'Hội thoại');

  const input = page.getByPlaceholder(/Gõ câu tiếng Trung hoặc tiếng Việt/);
  await expect(input).toBeVisible();
  const testMessage = '老闆，我要一杯珍珠奶茶，半糖少冰，外帶。';
  await input.fill(testMessage);

  // Send message
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();

  // Verify loading state is active with Cancel button
  const typingIndicator = page.getByText(/AI đối thoại đang soạn câu trả lời/);
  await expect(typingIndicator).toBeVisible();

  // Cancel request in flight via status indicator action button (scoped, no .first())
  const cancelBtn = page.getByRole('status').getByRole('button', { name: 'Hủy yêu cầu' });
  await expect(cancelBtn).toBeVisible();
  await cancelBtn.click();
  cancelRoute?.();

  // Loading state terminates immediately
  await expect(typingIndicator).not.toBeVisible();

  // Draft text preservation: input field has restored the typed message
  await expect(input).toHaveValue(testMessage);

  // Status notice confirms cancellation and draft preservation
  await expect(page.getByText(/Đã hủy yêu cầu đối thoại. Nội dung câu hỏi đã được/)).toBeVisible();

  // Canceled stream bubble is present with Retry button
  await expect(page.getByText(/Yêu cầu đối thoại đã được hủy theo lệnh của bạn/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thử lại câu vừa hủy' })).toBeVisible();
});

test('AI chat persists conversation history across tab navigation', async ({ page }) => {
  await page.route('**/api/conversation', async route => {
    const req = route.request();
    if (req.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mode: 'ai',
          content: '中文：你好！我是你的華語 AI 學習夥伴。請多指教！\nPinyin: Nǐ hǎo! Wǒ shì nǐ de huáyǔ AI xuéxí huǒbàn. Qǐng duō zhǐjiào!\nTiếng Việt: Xin chào! Tôi là bạn đồng hành học tiếng Trung AI của bạn.\n練習：Gợi ý phản xạ: Chào lại nhé!',
          model: 'gpt-6.1-sol',
          provider: 'AgentRouter (gpt-6.1-sol)',
          thread: { id: 1003, messages: [] },
          meta: { latencyMs: 120 }
        })
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/');
  await navigate(page, 'Hội thoại');

  const promptChip = page.getByRole('button', { name: '👋 Chào hỏi' });
  await promptChip.click();

  // Verify user message and assistant reply are visible
  const userText = '你好！我正在學習繁體中文，請多指教。';
  await expect(page.getByText(userText)).toBeVisible();
  await expect(page.getByText('你好！我是你的華語 AI 學習夥伴。請多指教！')).toBeVisible();

  // Switch to Dictionary tab and back to Conversation tab
  await navigate(page, 'Từ điển');
  await navigate(page, 'Hội thoại');

  // Verify message persisted through sessionStorage
  await expect(page.getByText(userText)).toBeVisible();
  await expect(page.getByText('你好！我是你的華語 AI 學習夥伴。請多指教！')).toBeVisible();
});

test('live AI responds when E2E_LIVE_AI is explicitly enabled', async ({ page }) => {
  test.skip(!process.env.E2E_LIVE_AI, 'Live AI test disabled by default (run with E2E_LIVE_AI=1 for live upstream)');

  await page.goto('/');
  await navigate(page, 'Hội thoại');

  const promptChip = page.getByRole('button', { name: '👋 Chào hỏi' });
  await promptChip.click();

  // Allow up to 15s when running against real live upstream AI
  await expect(page.getByText('AI đối thoại đang soạn câu trả lời')).not.toBeVisible({ timeout: 15000 });
  await expect(page.getByText('你好！我正在學習繁體中文，請多指教。')).toBeVisible();
});

test('review view supports keyboard shortcuts (Space to reveal, 2 for Hard) and starter decks', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Ôn tập');

  // Load a Taiwan starter deck into SRS (unambiguous selector by deck title without .first())
  const starterDeck = page.locator('.bento-card', { hasText: 'Sống sót Chợ đêm Đài Loan' });
  const deckButton = starterDeck.getByRole('button', { name: /Nạp bộ thẻ/ });
  await expect(deckButton).toBeVisible();
  await deckButton.click();

  await expect(page.getByRole('button', { name: 'Hiện đáp án' })).toBeVisible();

  // Press Space to reveal the flashcard back
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: /Khó khăn/ })).toBeVisible();

  // Press '2' to rate Hard
  await page.keyboard.press('2');
  await expect(page.getByText(/Tiến độ phiên học: Thẻ 2/)).toBeVisible();
});
