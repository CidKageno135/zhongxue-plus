import { test, expect } from '@playwright/test';
import { lessons } from '../../src/data/lessons';
import { navigate } from './helpers';

test('all sixteen lessons can be opened from the curriculum', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Lộ trình');
  for (const lesson of lessons) {
    await page.locator('.path-card').filter({ has: page.getByRole('heading', { name: lesson.title, exact: true }) }).getByRole('button', { name: 'Học bài này' }).click();
    await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible();
    await expect(page.locator('.word-card')).toHaveCount(lesson.words.length);
    await page.getByRole('button', { name: 'Về lộ trình', exact: true }).click();
  }
});

test('quiz explains wrong answers and persists completed lesson score', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bắt đầu học', exact: true }).first().click();
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
  await page.goto('/');
  const title = await page.locator('.hero h2').innerText();
  await page.locator('.hero').getByRole('button', { name: 'Bắt đầu học', exact: true }).click();
  await expect(page.locator('.lesson-view h1')).toHaveText(title);
});

test('completed curriculum dashboard offers review rather than a fictitious next lesson', async ({ page }) => {
  const { completeLesson, createInitialState, STORAGE_KEY } = await import('../../src/domain/learning');
  const state = lessons.reduce((current, lesson) => completeLesson(current, lesson.id), createInitialState());
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: STORAGE_KEY, value: JSON.stringify(state) });
  await page.goto('/');
  await expect(page.locator('.hero')).not.toContainText('BÀI HỌC TIẾP THEO');
  await expect(page.locator('.hero')).toContainText(/hoàn thành|ôn lại|học lại/i);
  await expect(page.locator('.hero').getByRole('button', { name: /ôn|học lại/i })).toBeVisible();
});
