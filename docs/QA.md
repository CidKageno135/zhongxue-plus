# Browser verification (Playwright E2E — V2 Bento Sinology)

Playwright runs Chromium at 1440×1000 (`desktop`) and an iPhone 13 viewport (`mobile`). Each test starts in a fresh browser context; persistence checks reload within that context. Vite is served on port 4173 independently of the user preview on 5173.

Run `npm.cmd run test:e2e`. The HTML report is `playwright-report/index.html`; traces and screenshots are under `test-results/`.

## Coverage (30 E2E Tests = 15 Desktop + 15 Mobile)

- **Curriculum & Lessons (`tests/e2e/lesson.spec.ts`):**
  - All eight curriculum lessons open with their own vocabulary and support bulk vocabulary saving (`Lưu toàn bộ từ bài học`).
  - Quiz is gated until an answer, explains a wrong answer, completes and retains the score after reload.
  - Featured lesson title on the Bento dashboard matches the lesson launched, and completed-curriculum state offers review rather than a fictitious next lesson.
- **Dictionary, SRS & Dashboard (`tests/e2e/learning.spec.ts`):**
  - New learner has usable responsive navigation across all destinations without horizontal overflow on desktop or mobile.
  - Dictionary searches unaccented Vietnamese, spaced/compact pinyin and Hanzi, filters by topic/level, and handles empty results and clear actions.
  - Saved vocabulary survives reload, appears in review, reveals meaning and schedules after SM-2 rating (`again`, `hard`, `good`, `easy`).
  - Explicit same-day retry works for `again`-rated words.
- **Handwriting, AI Tutor & Pro Hotkeys (`tests/e2e/handwriting-and-ai.spec.ts`):**
  - Handwriting modal opens with `role="dialog"`, recognizes drawn strokes offline (`一`) via `fallbackClientHandwriting` even when backend `:3001` is offline, and closes cleanly via `Escape` or close button.
  - AI Chat responds with Traditional Chinese, Pinyin, Vietnamese translation and practice tips across all 8 Taiwan topics, and persists conversation history across tab switches via `sessionStorage`.
  - Review view loads Taiwan Starter Decks into the SRS queue and supports keyboard shortcuts (`Space` to reveal answer, `1–4` to rate SM-2).
- **Analytics, Settings & Branching Conversation (`tests/e2e/settings-conversation.spec.ts`):**
  - Branching conversation handles unsuitable responses, clarification, completion and restart.
  - Profile name and all offered daily goals (`10, 20, 30, 50, 100`) save without error; blank/whitespace profile names show validation without discarding the saved name.
  - Export downloads JSON; invalid import preserves data; reset requires exact `XÓA` confirmation and supports cancellation; valid import restores the profile after reload.

## Execution Summary (2026-10-20)

- **Unit Tests (`vitest`):** `23/23 passed` in `tests/domain.test.ts` (91.7% statements/lines, 93.47% functions).
- **End-to-End Tests (`playwright`):** `30/30 passed` across Desktop Chrome and Mobile iPhone 13.
