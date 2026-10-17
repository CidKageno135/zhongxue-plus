import { test, expect } from "@playwright/test";

test.describe("Security & Infrastructure Verification", () => {
  test("serves production-grade security headers on responses", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const headers = response.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("microphone=(self)");
    expect(headers["strict-transport-security"]).toContain("max-age=63072000");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  });
});

test.describe("Learner Core Interaction Flows", () => {
  test("loads Dashboard with stats, recommendation, and feature cards", async ({ page }) => {
    await page.goto("/dashboard");

    // Title and eyebrow
    await expect(page.locator("body")).toContainText("ZHONGXUE+");
    await expect(page.locator("body")).toContainText("每天一點，慢慢說得更好");

    // Stats section
    await expect(page.locator(".zx-stats")).toBeVisible();
    await expect(page.locator(".zx-stats")).toContainText("完成單元");
    await expect(page.locator(".zx-stats")).toContainText("/ 20");

    // Recommendation card
    await expect(page.locator(".zx-recommend")).toBeVisible();
    await expect(page.locator(".zx-recommend")).toContainText("Bước tiếp theo");

    // Feature cards (Vocabulary, Speaking, AI Conversation, Progress)
    const featureLinks = page.locator(".zx-feature-links a");
    await expect(featureLinks).toHaveCount(4);
  });

  test("searches dictionary and returns Vietnamese definitions", async ({ page }) => {
    await page.goto("/dictionary");

    await expect(page.locator("h1")).toContainText("華越詞典");

    // Search input
    const input = page.locator('input[aria-label="Tra từ / 查詞"]');
    await expect(input).toBeVisible();
    await input.fill("學生");

    // Click search
    await page.locator('button[type="submit"]:has-text("Tra từ")').click();

    // Verify results count and entries
    await expect(page.locator(".zx-dict-count")).toContainText("kết quả");
    await expect(page.locator(".zx-dict-results")).toBeVisible();

    // Details panel should render with Pinyin and Vietnamese translation
    const detailPanel = page.locator(".zx-dict-detail");
    await expect(detailPanel).toBeVisible();
    await expect(detailPanel).toContainText("xué sheng");
  });

  test("browses 20 A1-A2 curriculum units in vocabulary module", async ({ page }) => {
    await page.goto("/vocabulary");

    // Check title and eyebrow
    await expect(page.locator("h1")).toContainText("從生活情境開始");
    await expect(page.locator("body")).toContainText("20 bài mẫu A1–A2");

    // Check unit list exists and has 20 units
    const unitButtons = page.locator(".zx-unit-list button");
    await expect(unitButtons).toHaveCount(20);

    // Verify first unit details
    await expect(unitButtons.first()).toContainText("打招呼與自我介紹");
    await expect(unitButtons.first()).toContainText("A1");
  });

  test("loads flashcard review shelf", async ({ page }) => {
    await page.goto("/flashcards");

    await expect(page.locator("h1")).toContainText("把查過的詞，變成會用的詞");
    await expect(page.locator("body")).toContainText("生詞複習 · Ôn từ đã lưu");
  });

  test("toggles Dark Mode, verifies computed colors, persists on reload, and tests mobile header", async ({ page }) => {
    await page.goto("/dashboard");

    // Initially light mode
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 248, 243)");

    const card = page.locator(".zx-feature-links a").first();
    await expect(card).toBeVisible();
    await expect(card).toHaveCSS("background-color", "rgb(255, 255, 255)");

    // Click theme toggle button
    const toggleBtn = page.locator('button[aria-label="Đổi giao diện sáng/tối"]').first();
    await toggleBtn.click();

    // Verify dark mode applied on html, body, and card
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(11, 17, 32)");
    await expect(card).toHaveCSS("background-color", "rgb(22, 32, 50)");

    // Verify persistence on reload without white flash
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(11, 17, 32)");

    // Test mobile viewport and mobile header theme toggle
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileHeader = page.locator(".zx-mobile-header");
    await expect(mobileHeader).toBeVisible();
    await expect(mobileHeader).toHaveCSS("background-color", "rgb(22, 32, 50)");

    // Toggle back to light via mobile header button
    const mobileToggleBtn = page.locator('.zx-mobile-header button[aria-label="Đổi giao diện sáng/tối"]');
    await mobileToggleBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(mobileHeader).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 248, 243)");
  });

  test("opens interactive Hanzi stroke order writer in lesson vocabulary", async ({ page }) => {
    await page.goto("/vocabulary");

    // Click the stroke writing button on the first word
    const writeBtn = page.locator('button:has-text("Luyện viết / 筆順")').first();
    await expect(writeBtn).toBeVisible();
    await writeBtn.click();

    // Verify stroke card is rendered with controls
    const strokeCard = page.locator(".zx-stroke-card");
    await expect(strokeCard).toBeVisible();
    await expect(strokeCard).toContainText("Luyện viết chữ Hán");

    // Toggle theme to dark and verify stroke card adapts
    const toggleBtn = page.locator('button[aria-label="Đổi giao diện sáng/tối"]').first();
    await toggleBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(strokeCard).toHaveCSS("background-color", "rgb(22, 32, 50)");

    // Verify buttons: Xem mẫu, Tự viết, Xóa lại, và nút tốc độ mẫu
    await expect(strokeCard.locator('button:has-text("Xem mẫu")')).toBeVisible();
    await expect(strokeCard.locator('button:has-text("Tự viết")')).toBeVisible();
    await expect(strokeCard.locator('button:has-text("Xóa lại")')).toBeVisible();
    const speedBtn = strokeCard.locator('button:has-text("Tốc độ mẫu")');
    await expect(speedBtn).toBeVisible();
    await expect(speedBtn).toContainText("1.2x");
    await speedBtn.click();
    await expect(speedBtn).toContainText("0.6x");

    // Close writer
    await strokeCard.locator('button[aria-label="Đóng bảng luyện viết"]').click();
    await expect(strokeCard).not.toBeVisible();

    // Toggle back to light for clean state
    await toggleBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("loads Speaking Practice module with native audio and voice recording controls", async ({ page }) => {
    await page.goto("/speaking");

    await expect(page.locator("h1")).toContainText("聽一句，說一句");
    await expect(page.locator("body")).toContainText("Luyện nói");

    // Example sentence container with normal and slow audio buttons
    const example = page.locator(".zx-example");
    await expect(example).toBeVisible();
    await expect(example.locator('button:has-text("朗讀")').first()).toBeVisible();
    await expect(example.locator('button:has-text("慢速朗讀")')).toBeVisible();

    // Voice button
    const speakBtn = page.locator('button:has-text("開始口說")');
    await expect(speakBtn).toBeVisible();
  });

  test("renders custom branded 404 page for nonexistent routes and returns to dashboard", async ({ page }) => {
    await page.goto("/non-existent-page");

    await expect(page.locator("h1")).toContainText("Không tìm thấy trang");
    await expect(page.locator("body")).toContainText("404 · 找不到頁面");

    const returnBtn = page.locator('a:has-text("Về trang chủ")');
    await expect(returnBtn).toBeVisible();
    await returnBtn.click();
    await page.waitForURL("**/dashboard");
    await expect(page.locator("body")).toContainText("ZHONGXUE+");
  });

  test("renders skip-to-content accessibility link targeting #zx-main", async ({ page }) => {
    await page.goto("/dashboard");

    const skipLink = page.locator(".zx-skip-link");
    await expect(skipLink).toHaveAttribute("href", "#zx-main");
    await expect(page.locator("#zx-main")).toBeVisible();
  });

  test("adapts layout on tablet viewport (768px)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/dashboard");

    const stats = page.locator(".zx-stats");
    await expect(stats).toBeVisible();
    await expect(stats).toHaveCSS("display", "grid");
  });
});

