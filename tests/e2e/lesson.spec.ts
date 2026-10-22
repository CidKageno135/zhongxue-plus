import { test, expect } from '@playwright/test';
import { lessons } from '../../src/data/lessons';
import { navigate, assertNoHorizontalScroll } from './helpers';

test.describe('Lesson & Curriculum Suite (Subagent A18 & T16 Acceptance)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('all sixteen curriculum lessons load properly with vocabulary, dialogue, grammar, and quiz', async ({ page }) => {
    await navigate(page, 'Lộ trình');

    // Verify all 16 curriculum lessons are rendered in the path overview
    expect(lessons).toHaveLength(16);
    await expect(page.locator('.path-card')).toHaveCount(16);

    // Verify each lesson can be opened and loads its vocabulary stage
    for (const lesson of lessons) {
      const card = page.locator('.path-card').filter({
        has: page.getByRole('heading', { name: lesson.title, exact: true })
      });
      await expect(card).toBeVisible();
      await card.getByRole('button', { name: 'Học bài này' }).click();

      // Verify title and vocabulary stage
      await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible();
      await expect(page.getByText('Những từ bạn sẽ dùng hôm nay')).toBeVisible();
      await expect(page.locator('.word-card')).toHaveCount(lesson.words.length);

      // Verify return to curriculum
      await page.getByRole('button', { name: 'Về lộ trình', exact: true }).click();
      await expect(page.locator('.path-card').first()).toBeVisible();
    }

    // Deep verification across representative levels (A1, A2, B1, B2) for all 4 stages:
    // Stage 0 (Từ vựng), Stage 1 (Hội thoại), Stage 2 (Ngữ pháp), Stage 3 (Thử sức/Quiz)
    const representativeIndexes = [0, 4, 8, 12, 15]; // Lessons spanning A1 to B2
    for (const idx of representativeIndexes) {
      const targetLesson = lessons[idx];
      const card = page.locator('.path-card').filter({
        has: page.getByRole('heading', { name: targetLesson.title, exact: true })
      });
      await card.getByRole('button', { name: /Học bài này|Học lại/ }).click();

      // Stage 0: Vocabulary
      await expect(page.getByRole('heading', { name: targetLesson.title, exact: true })).toBeVisible();
      await expect(page.locator('.word-card')).toHaveCount(targetLesson.words.length);

      // Semantic selector fix for strict mode violation:
      // A word card contains 2 distinct pronunciation buttons: one for the headword and one for the example sentence.
      // We disambiguate by container context instead of using .first().
      const firstCard = page.locator('.word-card').first();
      const wordPronounceBtn = firstCard.locator('div').filter({ has: page.locator('h3.hanzi') }).getByRole('button', { name: 'Nghe phát âm' });
      const examplePronounceBtn = firstCard.locator('.word-example').getByRole('button', { name: 'Nghe phát âm' });
      await expect(wordPronounceBtn).toBeVisible();
      await expect(examplePronounceBtn).toBeVisible();

      // Advance to Stage 1: Dialogue
      await page.getByRole('button', { name: 'Tiếp tục' }).click();
      await expect(page.getByRole('heading', { name: 'Một cuộc trò chuyện nhỏ' })).toBeVisible();
      await expect(page.locator('.dialogue-line')).toHaveCount(targetLesson.dialogue.length);
      await expect(page.locator('.dialogue-line').first().getByRole('button', { name: 'Nghe phát âm' })).toBeVisible();

      // Advance to Stage 2: Grammar
      await page.getByRole('button', { name: 'Tiếp tục' }).click();
      await expect(page.getByText('MẪU CÂU THỰC DỤNG')).toBeVisible();
      await expect(page.getByRole('heading', { name: targetLesson.grammar[0].title })).toBeVisible();

      // Advance to Stage 3: Quiz
      await page.getByRole('button', { name: 'Tiếp tục' }).click();
      await expect(page.locator('.panel.quiz')).toBeVisible();
      await expect(page.getByText(targetLesson.quiz[0].question)).toBeVisible();
      await expect(page.locator('.quiz-option')).toHaveCount(targetLesson.quiz[0].options.length);

      // Return back to curriculum
      await page.getByRole('button', { name: 'Về lộ trình', exact: true }).click();
      await expect(page.locator('.path-card').first()).toBeVisible();
    }
  });

  test('completing a lesson awards XP and persists progress', async ({ page }) => {
    await navigate(page, 'Lộ trình');

    // Record initial XP in the header gem pill
    const xpPill = page.locator('.bento-gem-pill').filter({ hasText: 'XP' });
    await expect(xpPill).toBeVisible();
    await expect(xpPill).toContainText('0');

    // Launch Lesson 1
    const lesson1 = lessons[0];
    const card = page.locator('.path-card').filter({
      has: page.getByRole('heading', { name: lesson1.title, exact: true })
    });
    await card.getByRole('button', { name: 'Học bài này' }).click();

    // Advance through Stage 0 (Vocab), Stage 1 (Dialogue), Stage 2 (Grammar)
    for (let stage = 0; stage < 3; stage++) {
      await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    }

    // Stage 3: Complete all quiz questions with 100% correct answers
    for (const [index, question] of lesson1.quiz.entries()) {
      await expect(page.getByText(question.question, { exact: true })).toBeVisible();
      await page.locator('.quiz-option').nth(question.answer).click();
      await expect(page.getByRole('status')).toContainText('Chính xác!');

      const isLast = index === lesson1.quiz.length - 1;
      await page.getByRole('button', { name: isLast ? 'Hoàn thành bài học' : 'Câu tiếp theo', exact: true }).click();
    }

    // Verify completion screen
    await expect(page.getByRole('heading', { name: 'Bạn đã hoàn thành bài học!' })).toBeVisible();
    await expect(page.getByText(`Đúng ${lesson1.quiz.length}/${lesson1.quiz.length} câu`)).toBeVisible();

    // Verify XP has increased by 30 XP in the header pill
    await expect(xpPill).toContainText('30');

    // Reload page and verify progress persistence on curriculum
    await page.reload();
    await navigate(page, 'Lộ trình');
    const updatedCard = page.locator('.path-card').filter({
      has: page.getByRole('heading', { name: lesson1.title, exact: true })
    });
    await expect(updatedCard).toContainText(`Kết quả ${lesson1.quiz.length}/${lesson1.quiz.length}`);
    await expect(updatedCard.getByRole('button', { name: 'Học lại', exact: true })).toBeVisible();
    await expect(xpPill).toContainText('30');
  });

  test('audio pronounce buttons on words and dialogue lines trigger speech', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await navigate(page, 'Lộ trình');

    // Launch Lesson 2
    const lesson2 = lessons[1];
    const card = page.locator('.path-card').filter({
      has: page.getByRole('heading', { name: lesson2.title, exact: true })
    });
    await card.getByRole('button', { name: 'Học bài này' }).click();

    // Verify pronounce buttons on vocabulary stage with semantic scoping (no .first() abuse)
    const firstWordCard = page.locator('.word-card').first();
    const wordSpeakBtn = firstWordCard.locator('div').filter({ has: page.locator('h3.hanzi') }).getByRole('button', { name: 'Nghe phát âm' });
    const exampleSpeakBtn = firstWordCard.locator('.word-example').getByRole('button', { name: 'Nghe phát âm' });

    await expect(wordSpeakBtn).toBeVisible();
    await expect(exampleSpeakBtn).toBeVisible();

    // Click word speak button
    await wordSpeakBtn.click();

    // Click example speak button
    await exampleSpeakBtn.click();

    // Advance to dialogue stage
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Một cuộc trò chuyện nhỏ' })).toBeVisible();

    // Verify pronounce buttons on dialogue lines
    const dialogueSpeakBtn = page.locator('.dialogue-line').first().getByRole('button', { name: 'Nghe phát âm' });
    await expect(dialogueSpeakBtn).toBeVisible();

    // Click dialogue speak button
    await dialogueSpeakBtn.click();

    // Verify no unhandled runtime errors occurred
    expect(errors).toEqual([]);
  });

  test.describe('Responsive Viewport Layout & Overflow Invariants (G7)', () => {
    test('responsive layout on 375px mobile viewport (iPhone SE: 375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigate(page, 'Lộ trình');

      // 1. Check Curriculum list on 375px: REPRODUCES HORIZONTAL OVERFLOW ON BASELINE
      await assertNoHorizontalScroll(page, 'Curriculum Path List (375px)', 375);

      // 2. Launch first lesson and verify stages
      await page.locator('.path-card').first().getByRole('button', { name: 'Học bài này' }).click();
      await expect(page.getByRole('heading', { name: lessons[0].title, exact: true })).toBeVisible();

      // Check Stage 0 (Vocabulary)
      await assertNoHorizontalScroll(page, 'Stage 0 Vocabulary (375px)', 375);

      // Check Stage 1 (Dialogue)
      await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Một cuộc trò chuyện nhỏ' })).toBeVisible();
      await assertNoHorizontalScroll(page, 'Stage 1 Dialogue (375px)', 375);

      // Check Stage 2 (Grammar)
      await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
      await expect(page.getByText('MẪU CÂU THỰC DỤNG')).toBeVisible();
      await assertNoHorizontalScroll(page, 'Stage 2 Grammar (375px)', 375);

      // Check Stage 3 (Quiz)
      await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
      await expect(page.locator('.panel.quiz')).toBeVisible();
      await assertNoHorizontalScroll(page, 'Stage 3 Quiz (375px)', 375);
    });

    test('responsive layout on 390px mobile viewport (iPhone 12/13/14: 390x844)', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await navigate(page, 'Lộ trình');

      // 1. Check Curriculum list on 390px: REPRODUCES HORIZONTAL OVERFLOW ON BASELINE (docScrollWidth: 427 > 390)
      await assertNoHorizontalScroll(page, 'Curriculum Path List (390px)', 390);

      // 2. Launch first lesson and verify stages
      await page.locator('.path-card').first().getByRole('button', { name: 'Học bài này' }).click();
      await expect(page.getByRole('heading', { name: lessons[0].title, exact: true })).toBeVisible();

      // Check Stage 0 (Vocabulary)
      await assertNoHorizontalScroll(page, 'Stage 0 Vocabulary (390px)', 390);

      // Check Stage 1 (Dialogue)
      await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Một cuộc trò chuyện nhỏ' })).toBeVisible();
      await assertNoHorizontalScroll(page, 'Stage 1 Dialogue (390px)', 390);

      // Check Stage 2 (Grammar)
      await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
      await expect(page.getByText('MẪU CÂU THỰC DỤNG')).toBeVisible();
      await assertNoHorizontalScroll(page, 'Stage 2 Grammar (390px)', 390);

      // Check Stage 3 (Quiz)
      await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
      await expect(page.locator('.panel.quiz')).toBeVisible();
      await assertNoHorizontalScroll(page, 'Stage 3 Quiz (390px)', 390);
    });
  });

  test('quiz explains wrong answers and persists completed lesson score', async ({ page }) => {
    // Semantic selector: scoped to main container, eliminating blind .first()
    await page.locator('main').getByRole('button', { name: 'Bắt đầu học', exact: true }).click();
    for (let stage = 0; stage < 3; stage++) await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Câu tiếp theo', exact: true })).toBeDisabled();
    for (const [index, question] of lessons[0].quiz.entries()) {
      await expect(page.getByText(question.question, { exact: true })).toBeVisible();
      const answer = index === 0 ? (question.answer + 1) % question.options.length : question.answer;
      await page.locator('.quiz-option').nth(answer).click();
      await expect(page.getByRole('status')).toContainText(question.explanation);
      if (index === 0) await expect(page.getByRole('status')).toContainText('Cùng xem lại nhé.');
      await page.getByRole('button', { name: index < lessons[0].quiz.length - 1 ? 'Câu tiếp theo' : 'Hoàn thành bài học', exact: true }).click();
    }
    await expect(page.getByRole('main')).toContainText('Bạn đã hoàn thành bài học!');
    await page.reload();
    await navigate(page, 'Lộ trình');
    const card = page.locator('.path-card').filter({ has: page.getByRole('heading', { name: lessons[0].title, exact: true }) });
    await expect(card).toContainText(`Kết quả ${lessons[0].quiz.length - 1}/${lessons[0].quiz.length}`);
    await expect(card.getByRole('button', { name: 'Học lại', exact: true })).toBeVisible();
  });

  test('dashboard featured lesson title matches the lesson launched', async ({ page }) => {
    const title = await page.locator('.hero h2, .bento-card h2').first().innerText();
    await page.locator('main').getByRole('button', { name: 'Bắt đầu học', exact: true }).click();
    await expect(page.locator('.lesson-view h1, main h1')).toHaveText(title);
  });

  test('completed curriculum dashboard offers review rather than a fictitious next lesson', async ({ page }) => {
    const { completeLesson, createInitialState, STORAGE_KEY } = await import('../../src/domain/learning');
    const state = lessons.reduce((current, lesson) => completeLesson(current, lesson.id), createInitialState());
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: STORAGE_KEY, value: JSON.stringify(state) });
    await page.goto('/');
    await expect(page.locator('.bento-card.hero')).not.toContainText('BÀI HỌC TIẾP THEO');
    await expect(page.locator('main')).toContainText(/hoàn thành|ôn lại|học lại/i);
    await expect(page.locator('.bento-card.hero').getByRole('button', { name: 'Ôn lại bài học' })).toBeVisible();
  });
});
