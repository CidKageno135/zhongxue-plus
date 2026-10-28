import { test, expect } from '@playwright/test';
import { navigate } from './helpers';

test.describe('Chat Lifecycle & Invariant G4 Suite (Subagent T12)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await navigate(page, 'Hội thoại');
    await expect(page.getByText('Trợ lý Đối thoại AI (Hán ngữ Đài Loan)')).toBeVisible();
  });

  /**
   * Invariant G4.1: Role & History Persistence Across Tab Navigation
   * Select role -> send -> switch tab (to Dictionary) -> return to Chat -> send next:
   * Both the selected role and conversation history MUST be preserved in the subsequent POST payload.
   * (Must NOT reset roleId to 'free').
   */
  test('G4.1: active role and conversation history are preserved across tab navigation', async ({ page }) => {
    const interceptedRequests: Array<{ roleId?: string; messages?: Array<{ role: string; content: string }> }> = [];

    await page.route('**/api/conversation', async route => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = req.postDataJSON();
        if (body?.action === 'chat') {
          interceptedRequests.push(body);
          const turnIndex = interceptedRequests.length;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              mode: 'ai',
              content: turnIndex === 1
                ? '中文：歡迎光臨50嵐！珍珠奶茶半糖少冰一杯，一共五十元。\nPinyin: Huānyíng guānglín 50 Lán!...\nTiếng Việt: Chào mừng đến 50 Lan!...'
                : '中文：好的，為您加一份波霸，一共六十元。\nPinyin: Hǎo de, wèi nín jiā yí fèn bōbà...\nTiếng Việt: Vâng, thêm một phần trân châu lớn cho bạn...',
              model: 'gpt-6.1-sol',
              provider: 'AgentRouter (gpt-6.1-sol)',
              thread: { id: 2001, messages: [] },
              meta: { latencyMs: 120 }
            })
          });
          return;
        }
      }
      await route.continue();
    });

    // 1. Select role "Trà sữa (50嵐)" (roleId: 'tea')
    const teaRoleBtn = page.getByRole('button', { name: '🧋 Trà sữa (50嵐)' });
    await expect(teaRoleBtn).toBeVisible();
    await teaRoleBtn.click();

    // Verify role header badge updates to role 'tea'
    await expect(page.getByText('🎭 🧋 Trà sữa (50嵐)')).toBeVisible();

    // 2. Send Turn 1
    const chatInput = page.getByPlaceholder(/Gõ câu tiếng Trung hoặc tiếng Việt/);
    const turn1Text = '老闆，我要一杯珍珠奶茶，半糖少冰。';
    await chatInput.fill(turn1Text);
    await page.getByRole('button', { name: 'Gửi', exact: true }).click();

    // Verify turn 1 response renders
    await expect(page.getByText('珍珠奶茶半糖少冰一杯，一共五十元。')).toBeVisible();
    expect(interceptedRequests.length).toBe(1);
    expect(interceptedRequests[0].roleId).toBe('tea');

    // 3. Switch tab to "Từ điển" and then return to "Hội thoại"
    await navigate(page, 'Từ điển');
    await expect(page.getByPlaceholder(/Nhập Hán tự/)).toBeVisible();

    await navigate(page, 'Hội thoại');
    await expect(page.getByText('Trợ lý Đối thoại AI (Hán ngữ Đài Loan)')).toBeVisible();

    // Verify previous conversation turn is restored from storage
    await expect(page.getByText(turn1Text)).toBeVisible();
    await expect(page.getByText('珍珠奶茶半糖少冰一杯，一共五十元。')).toBeVisible();

    // 4. Send Turn 2
    const turn2Text = '我還要再加一份波霸。';
    await chatInput.fill(turn2Text);
    await page.getByRole('button', { name: 'Gửi', exact: true }).click();

    // Verify turn 2 response renders
    await expect(page.getByText('為您加一份波霸，一共六十元。')).toBeVisible();

    // 5. Invariant G4.1 Assertions on Turn 2 payload
    expect(interceptedRequests.length).toBe(2);
    const secondPayload = interceptedRequests[1];

    // CRITICAL ACCEPTANCE ASSERTION: roleId must NOT be reset to 'free' after tab navigation
    expect(secondPayload.roleId).toBe('tea');

    // History must contain user turn 1, assistant reply 1, and user turn 2
    expect(secondPayload.messages).toBeDefined();
    const userMessages = secondPayload.messages?.filter(m => m.role === 'user');
    expect(userMessages?.some(m => m.content === turn1Text)).toBe(true);
    expect(userMessages?.some(m => m.content === turn2Text)).toBe(true);
  });

  /**
   * Invariant G4.2: Generation Guard on Role Switch with In-Flight Request
   * Send Request A (pending) -> switch role -> send Request B:
   * Request A must NOT overwrite conversation B, restore draft into B, or clear B's loading state.
   */
  test('G4.2: generation guard prevents in-flight request A from polluting role B', async ({ page }) => {
    let resolveRequestA: (() => void) | undefined;
    let requestACalled = false;
    let requestBCalled = false;

    await page.route('**/api/conversation', async route => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = req.postDataJSON();
        if (body?.roleId === 'tea') {
          requestACalled = true;
          // Hold request A in-flight until signaled
          await new Promise<void>(resolve => {
            resolveRequestA = resolve;
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              mode: 'ai',
              content: '中文：[ROLE_TEA_REPLY] 好的，一杯四季春茶。\nPinyin: ...\nTiếng Việt: ...',
              model: 'gpt-6.1-sol',
              provider: 'AgentRouter'
            })
          });
          return;
        }

        if (body?.roleId === 'nightmarket') {
          requestBCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              mode: 'ai',
              content: '中文：[ROLE_NIGHTMARKET_REPLY] 帥哥，你的大碗牛肉麵來了！\nPinyin: ...\nTiếng Việt: ...',
              model: 'gpt-6.1-sol',
              provider: 'AgentRouter'
            })
          });
          return;
        }
      }
      await route.continue();
    });

    // 1. Select role "Trà sữa" (tea) and send request A
    await page.getByRole('button', { name: '🧋 Trà sữa (50嵐)' }).click();
    const chatInput = page.getByPlaceholder(/Gõ câu tiếng Trung hoặc tiếng Việt/);
    const messageA = '老闆，我要一杯四季春，微糖去冰。';
    await chatInput.fill(messageA);
    await page.getByRole('button', { name: 'Gửi', exact: true }).click();

    // Verify request A is in-flight with loading indicator
    const typingIndicator = page.getByRole('status').filter({ hasText: /AI đối thoại đang soạn câu trả lời/ });
    await expect(typingIndicator).toBeVisible();
    expect(requestACalled).toBe(true);

    // 2. While request A is in-flight, switch role to "Chợ đêm & Mì bò" (nightmarket)
    await page.getByRole('button', { name: '🍜 Chợ đêm & Mì bò' }).click();

    // 3. Immediately enter and send Request B for role "nightmarket"
    const messageB = '老闆，我要一碗大碗紅燒牛肉麵，不要酸菜。';
    await chatInput.fill(messageB);
    await page.getByRole('button', { name: 'Gửi', exact: true }).click();

    // 4. Now release Request A (either delayed response arrives or abort cleans up)
    resolveRequestA?.();

    // 5. Verify Request B response arrives successfully
    await expect(page.getByText('[ROLE_NIGHTMARKET_REPLY] 帥哥，你的大碗牛肉麵來了！')).toBeVisible();
    expect(requestBCalled).toBe(true);

    // 6. GENERATION GUARD ASSERTIONS:
    // a. Role B view must NOT contain role A's response
    await expect(page.getByText('[ROLE_TEA_REPLY]')).not.toBeVisible();

    // b. Role B view must NOT contain role A's cancellation bubble
    await expect(page.getByText('⚠️ Yêu cầu đối thoại đã được hủy theo lệnh của bạn')).not.toBeVisible();

    // c. Request A's draft must NOT be restored into the active input box
    await expect(chatInput).toHaveValue('');
  });

  /**
   * Invariant G4.3: Cancel and Retry Lifecycle
   * User cancels in-flight request -> edits question -> retries:
   * The next POST payload MUST NOT include duplicate user turns or the UI cancellation banner.
   */
  test('G4.3: cancel and retry does not send duplicate turns or UI cancellation strings to AI model', async ({ page }) => {
    let cancelRoute: (() => void) | undefined;
    const postPayloads: Array<{ messages?: Array<{ role: string; content: string }> }> = [];

    await page.route('**/api/conversation', async route => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = req.postDataJSON();
        postPayloads.push(body);
        if (postPayloads.length === 1) {
          // First request is held in flight until canceled
          await new Promise<void>(resolve => {
            cancelRoute = resolve;
          });
          await route.abort('cancelled').catch(() => {});
          return;
        }
        // Second request (retry/resend) succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            mode: 'ai',
            content: '中文：搭乘捷運淡水信義線到「台北101/世貿站」4號出口即可到達。\nPinyin: ...\nTiếng Việt: ...',
            model: 'gpt-6.1-sol',
            provider: 'AgentRouter'
          })
        });
        return;
      }
      await route.continue();
    });

    const chatInput = page.getByPlaceholder(/Gõ câu tiếng Trung hoặc tiếng Việt/);
    const initialText = '請問去台北101要在哪一站下車？';
    await chatInput.fill(initialText);
    await page.getByRole('button', { name: 'Gửi', exact: true }).click();

    // Verify loading indicator is active
    const typingIndicator = page.getByRole('status').filter({ hasText: /AI đối thoại đang soạn câu trả lời/ });
    await expect(typingIndicator).toBeVisible();

    // Click "Hủy yêu cầu" (using scoped selector without .first())
    const cancelBtn = page.getByRole('status').getByRole('button', { name: 'Hủy yêu cầu' });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    cancelRoute?.();

    // Wait for cancellation feedback
    await expect(typingIndicator).not.toBeVisible();
    await expect(page.getByText(/Đã hủy yêu cầu đối thoại/)).toBeVisible();

    // Draft text is preserved in input
    await expect(chatInput).toHaveValue(initialText);

    // Edit the question
    const editedText = '請問搭乘紅線去台北101要在哪一站下車？';
    await chatInput.fill(editedText);

    // Send the edited question
    await page.getByRole('button', { name: 'Gửi', exact: true }).click();

    // Verify AI response arrives
    await expect(page.getByText('搭乘捷運淡水信義線到「台北101/世貿站」4號出口即可到達。')).toBeVisible();

    // Assertions on the second request payload
    expect(postPayloads.length).toBe(2);
    const retryPayload = postPayloads[1];
    expect(retryPayload.messages).toBeDefined();

    // CRITICAL ACCEPTANCE ASSERTION: UI cancellation message MUST NOT be sent to model
    const cancellationTextInMessages = retryPayload.messages?.some(m =>
      m.content.includes('⚠️ Yêu cầu đối thoại đã được hủy') ||
      m.content.includes('hủy theo lệnh của bạn')
    );
    expect(cancellationTextInMessages).toBe(false);

    // CRITICAL ACCEPTANCE ASSERTION: No duplicate user turn for the canceled query
    const canceledUserTurns = retryPayload.messages?.filter(m =>
      m.role === 'user' && m.content === initialText
    );
    expect(canceledUserTurns?.length || 0).toBeLessThanOrEqual(1);
  });
});
