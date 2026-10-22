/**
 * tests/e2e/dictionary-pagination.spec.ts
 *
 * Acceptance E2E Test Suite for Dictionary Pagination & Contract Invariants.
 * Owned by Subagent T13 (Independent Dictionary Tester).
 *
 * Invariant G5 / F06 Enforcement:
 * 1. F06 Bug Reproduction: The database badge ("CSDL 122k: 122.596 mục từ") MUST NOT
 *    mutate into pageCount (e.g. "20 mục từ" or "40 mục từ") upon broad search or pagination.
 * 2. Search matches vs Database corpus total:
 *    UI cleanly separates:
 *    - dictionaryTotal ("CSDL 122k: 122.596 mục từ")
 *    - totalMatches ("Tìm thấy 10.622 kết quả khớp...")
 *    - pageCount (number of cards rendered in DOM)
 * 3. Pagination stability:
 *    Clicking "Tải thêm" appends the next page without collapsing the corpus total badge.
 * 4. Filtering "Đã lưu" across multiple pages:
 *    A word saved from page 2 (index > 20) remains visible when filtering by "Đã lưu".
 * 5. Corpus-only word retrieval:
 *    Searching "乾杯" (cv_3306) displays the entry from the 122k database with "database" source.
 */

import { test, expect } from '@playwright/test';
import { navigate } from './helpers';
import type { DbDictionaryResult } from '../../src/types';

test.describe('Acceptance G5 & F06: Dictionary Contract, Pagination & Saved Word Retention', () => {
  test('F06 Reproduction: UI database badge preserves "CSDL 122k: 122.596 mục từ" and does NOT mutate into page length (20) during broad search', async ({ page }) => {
    await page.goto('/');
    await navigate(page, 'Từ điển');

    // Verify initial database total badge
    const badge = page.locator('span', { hasText: /CSDL 122k/i });
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/122\.596/);

    // Perform broad search "de" that matches > 10,000 entries
    const searchInput = page.getByLabel('Tìm từ vựng');
    await searchInput.fill('de');

    // Wait for search result summary to appear
    await expect(page.getByRole('main')).toContainText(/kết quả khớp/i);

    // Invariant G5 / F06: The database badge MUST STILL DISPLAY the full corpus size (122.596 mục từ)
    // and MUST NOT mutate into the page length ("20 mục từ")!
    await expect(badge).not.toContainText(/20 mục từ/);
    await expect(badge).toContainText(/122\.596/);
  });

  test('F06 Reproduction: clicking "Tải thêm" appends results and does NOT mutate database total badge into loaded count', async ({ page }) => {
    await page.goto('/');
    await navigate(page, 'Từ điển');

    const badge = page.locator('span', { hasText: /CSDL 122k/i });
    await expect(badge).toContainText(/122\.596/);

    const searchInput = page.getByLabel('Tìm từ vựng');
    await searchInput.fill('de');

    // Page 1 loads 20 results
    await expect(page.locator('.word-card')).toHaveCount(20);

    // Click "Tải thêm" (Load more)
    const loadMoreBtn = page.getByRole('button', { name: /Tải thêm/i });
    await expect(loadMoreBtn).toBeVisible();
    await loadMoreBtn.click();

    // Page 2 appends another 20 results (total 40)
    await expect(page.locator('.word-card')).toHaveCount(40);

    // Invariant G5: Badge must remain 122.596 and NOT mutate into 40 or 20
    await expect(badge).toContainText(/122\.596/);
    await expect(badge).not.toContainText(/40 mục từ/);
    await expect(badge).not.toContainText(/20 mục từ/);
  });

  test('G5 Invariant: Words saved on page 2+ remain visible when filtering by "Đã lưu"', async ({ page }) => {
    await page.goto('/');
    await navigate(page, 'Từ điển');

    // Search query with multiple pages
    const searchInput = page.getByLabel('Tìm từ vựng');
    await searchInput.fill('de');

    // Wait for page 1 (20 items)
    await expect(page.locator('.word-card')).toHaveCount(20);

    // Load page 2 (40 items total)
    const loadMoreBtn = page.getByRole('button', { name: /Tải thêm/i });
    await expect(loadMoreBtn).toBeVisible();
    await loadMoreBtn.click();
    await expect(page.locator('.word-card')).toHaveCount(40);

    // Save a word from page 2 (e.g. index 25)
    const page2WordCard = page.locator('.word-card').nth(24);
    const wordTitle = await page2WordCard.locator('.hanzi-title').textContent();
    expect(wordTitle).toBeTruthy();

    const saveBtn = page2WordCard.getByRole('button', { name: /Lưu/i });
    await saveBtn.click();

    // Now filter by "Đã lưu"
    const savedFilter = page.getByRole('button', { name: /Đã lưu/i });
    await savedFilter.click();

    // The saved word from page 2 MUST be visible in the filtered results
    await expect(page.locator('.word-card', { hasText: wordTitle! })).toBeVisible();
  });

  test('G5 Invariant: Corpus-only word (乾杯) can be retrieved and saved into SRS review', async ({ page }) => {
    await page.goto('/');
    await navigate(page, 'Từ điển');

    const searchInput = page.getByLabel('Tìm từ vựng');
    const responsePromise = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === '/api/dictionary' && url.searchParams.get('q') === '乾杯';
    });
    await searchInput.fill('乾杯');
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    const result: { source: string; results: DbDictionaryResult[] } = await response.json();
    expect(result.source).toBe('database');
    const entry = result.results.find(word => word.id === 'cv_3306' && word.traditional === '乾杯');
    expect(entry, 'The corpus entry, rather than a curriculum fallback, must be returned').toBeDefined();
    if (!entry) throw new Error('Corpus entry cv_3306 is absent');
    expect(entry.definitions.join('; ')).toMatch(/cạn ly/i);

    const card = page.getByRole('article').filter({
      has: page.getByRole('heading', { name: '乾杯', exact: true })
    });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(entry.pinyin);
    await expect(card).toContainText(/cạn ly/i);
    await card.getByRole('button', { name: 'Lưu 乾杯', exact: true }).click();
    await expect(card.getByRole('button', { name: 'Bỏ lưu 乾杯', exact: true })).toBeVisible();

    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zhongxue.learning.v1') || '{}'))).toMatchObject({
      savedWordIds: ['cv_3306'],
      customWords: expect.arrayContaining([expect.objectContaining({
        id: entry.id,
        hanzi: entry.traditional,
        pinyin: entry.pinyin,
        meaning: entry.definitions.slice(0, 3).join('; '),
        lessonId: 'custom-dictionary'
      })])
    });

    // Restore from persisted metadata rather than merely retaining an in-memory word.
    await page.reload();
    await navigate(page, 'Ôn tập');
    await expect(page.getByRole('main')).toContainText('1 từ đến lịch ôn');
    const reviewCard = page.locator('.review-card');
    await expect(reviewCard.getByRole('heading', { name: '乾杯', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Hiện đáp án', exact: true }).click();
    await expect(reviewCard.getByRole('heading', { name: entry.definitions.slice(0, 3).join('; '), exact: true })).toBeVisible();
    await expect(reviewCard).toContainText(entry.pinyin);

  });
});
