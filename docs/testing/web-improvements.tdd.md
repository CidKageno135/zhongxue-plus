# Web learning improvements — 2026-10-12

Journeys came from the user's authorization to implement the previous web review. No source plan file was supplied. This extracted app is not a Git repository; source and data backups provide checkpoints instead of commits. The separate my_project/chinese_learning_app remains untouched.

## RED → GREEN

| Behavior | RED evidence | GREEN evidence / guarantee |
|---|---|---|
| Lesson questions, server grading, speech alignment, tutor text and review choices | improvements.test.ts referenced missing practice module; intended MODULE_NOT_FOUND. | Seven new tests pass, including all20 lessons,score spoof rejection,partial67% result,script equivalence and duplicate review meanings. |
| Isolated persistent DB tests | Test DB reopened at the new intended location but request_counters did not exist; override path had not been implemented. | Database tests pass with an explicit directory guard before fixture writes;quota and dialogues survive reopening. Initial fixtures were identified and removed from the live DB;no learner account was deleted. Subsequent tests use temporary databases. |
| Login/register page accessibility | New HTTP assertion:login expected200,got307. Demo fallback caused auth layout to redirect every visitor. | Auth layout permits account switching;both GET pages200. CUA login via a generated QA account succeeded. |
| Database restore | ZIP restore failed because empty PostgreSQL folders such as pg_notify were absent. | Revised ZIP preserves directories;restored copy opened with17 original activities. Copy-based backup script also preserves empty directories. Earlier incomplete data archives are explicitly named EMPTY_INCOMPLETE/MISSING_EMPTY_DIRS. |

## Verification executed

- Unit/database:node --import tsx --experimental-test-coverage --test-coverage-include=src/lib/{learning,conversation,curriculum,dictionary,practice,practice-feedback,request-policy,api-security,conversation-store,learning-store}.ts --test-coverage-lines=80 --test-coverage-branches=80 --test-coverage-functions=80 --test tests/*.test.ts.
- Result:26/26 pass;business-library coverage99.71% lines,95.86% branches,98.39% functions. The metric excludes UI/routes/auth legacy code;not a whole-app percentage.
- TypeScript,ESLint and production build were run after code changes. Final rerun/deployment details belong in PROGRESS.md.
- HTTP integration:npm run qa:start then npm run test:improvements-api. Isolatedlocalhost3002,temp database,AI disabled. PASS:grading cannot use submitted score;persisted dialogue,owner isolation,concurrent writes,new thread preserves old,bookmarks isolated,pagination totals unchanged,foreign Origin403,login429+Retry-After,logout invalidates session,auth pages accessible. Early live API fixture accounts were removed;the final API suite uses the isolated server.
- Direct database transaction tests prove exactly2 of3 concurrent quota requests can succeed at limit2,and a rejected combined policy rolls back other quota increments. Stale dialogue update409 leaves the stored response and activity count intact.
- Browser CUA at375px:closed menuTab goes to a visible link,not offscreen sidebar;menu navigation/login,lesson67→100%,dictionary linkprefill,three saves,flashcard flip,quickquiz2/3 and reset,speech text75% withmissing越/南,liveAI pinyin/Vietnamese reply,chat autoscroll and reload/new/old history selection verified. No microphone permission requested.
- One live OpenRouter request through the app used the exact selected free model;other conversation integration tests used guided practice. No API key printed,shown in UI,stored in tests or copied to source backup.

## Boundaries

Preserve existing learning records;new dialogue storage cannot recover previously unsaved transcripts. Threads retain8 turns and selector shows10recent threads. Flashcards use100recent saved words and show results for the current review session. There is no long-term SRS scheduler,teacher content sign-off,tone/acoustic grading,native app release,password email recovery,public hosting,load test or complete WCAG certification. Physical microphone and audible quality remain unverified. The exposed key still needs private rotation by its owner.

Public operation also needsHTTPS,APP_ORIGIN/trusted-proxy setup and an appropriate provider quota. Default local network grouping is intentionally shared;forwarded headers are ignored unless explicitly trusted. Persistent quota counts attempts,including provider errors. No automatic paid-model fallback.
