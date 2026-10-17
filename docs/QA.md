# Browser verification

Playwright runs Chromium at 1440×1000 and an iPhone 13 viewport. Each test starts in a fresh browser context; persistence checks reload within that context. Vite is served on port 4173 independently of the user preview on 5173.

Run `npm run test:e2e`. The HTML report is `playwright-report/index.html`; traces and screenshots are under `test-results/`.

## Coverage

- All eight curriculum lessons open with their own vocabulary.
- Quiz is gated until an answer, explains a wrong answer, completes and retains the score after reload.
- Dictionary searches unaccented Vietnamese, spaced/compact pinyin and Hanzi; empty results and clear action work.
- Saved vocabulary survives reload, appears in review, reveals meaning and schedules after rating.
- Conversation handles unsuitable responses, clarification, completion and restart.
- Profile and all offered daily goals save; export downloads JSON; invalid import preserves data; reset requires exact confirmation and supports cancellation; valid import restores the profile after reload.
- Every navigation destination works on desktop/mobile with no horizontal overflow. Dashboard navigation and goal changes produce no uncaught browser errors.

## Execution

Initial red run on 2026-10-17: App.tsx absent, then styles.css absent while implementation was in progress.

First complete run: 11/16 passed. Two failures reflected changed empty-state copy, two exposed the cleared conversation feedback, and one was a test helper checking mobile menu visibility before React had rendered. The helper now waits for main content before inspecting navigation.

Second run: 16/16 passed in 17.5 seconds with branch assertions. A stronger correct-choice feedback regression was restored following review. Final expanded run: **24/24 passed in 19.2 seconds**, covering preserved correct-choice feedback, explicit same-day retry after Again, completed-curriculum hero state, featured lesson title consistency, and whitespace profile validation.

Desktop and mobile dashboard screenshots were visually inspected: readable headings, working narrow layout and no clipping or horizontal scroll. Screenshot paths:

- `test-results/learning-new-learner-has-u-833ea-without-horizontal-overflow-desktop/dashboard.png`
- `test-results/learning-new-learner-has-u-833ea-without-horizontal-overflow-mobile/dashboard.png`

Browser speech depends on installed Chinese voices and was not asserted acoustically. These tests cover local learning persistence, not cross-device synchronization.
