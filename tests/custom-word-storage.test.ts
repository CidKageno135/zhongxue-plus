import { describe, it, expect, beforeEach } from 'vitest';
import {
    createInitialState,
    toggleSavedWord,
    saveWordsBatch,
    reviewWord,
    getDueWords,
    getSavedWords,
    getSrsItems,
    getSrsBreakdown,
    getStats,
    exportState,
    importState,
    loadState,
    saveState,
    findWord,
    isValidWordId,
    registerCustomWord,
    clearCustomWordRegistry,
    getCustomWordRegistry,
    searchWords,
    localDate,
    computeEaseFactor
} from '../src/domain/learning';
import type { Word } from '../src/types';

describe('A11: Custom Dictionary Word Storage, SRS Progression & Backup Compatibility', () => {
    beforeEach(() => {
        clearCustomWordRegistry();
    });

    const sampleCustomWord1: Word = {
        id: 'dict-9988',
        hanzi: '滷肉飯',
        pinyin: 'lǔròufàn',
        meaning: 'Cơm thịt kho Đài Loan',
        example: '滷肉飯是臺灣代表性美食。',
        examplePinyin: 'lǔròufàn shì Táiwān dàibiǎoxìng měishí.',
        exampleMeaning: 'Cơm thịt kho là món ăn tiêu biểu của Đài Loan.',
        category: 'Ẩm thực Đài Loan',
        lessonId: 'custom-dictionary'
    };

    const sampleCustomWord2: Word = {
        id: 'cv_10023',
        hanzi: '高鐵',
        pinyin: 'gāotiě',
        meaning: 'Đường sắt cao tốc (THSR)',
        example: '我搭高鐵去高雄。',
        examplePinyin: 'wǒ dā gāotiě qù Gāoxióng.',
        exampleMeaning: 'Tôi đi đường sắt cao tốc đến Cao Hùng.',
        category: 'Giao thông Đài Loan',
        lessonId: 'custom-dictionary'
    };

    const sampleCustomWord3: Word = {
        id: 'custom-bubble-tea',
        hanzi: '珍珠奶茶',
        pinyin: 'zhēnzhū nǎichá',
        meaning: 'Trà sữa trân châu Đài Loan',
        example: '一杯半糖去冰珍珠奶茶。',
        examplePinyin: 'yī bēi bàn táng qù bīng zhēnzhū nǎichá.',
        exampleMeaning: 'Một ly trà sữa trân châu nửa đường không đá.',
        category: 'Đồ uống Đài Loan',
        lessonId: 'custom-dictionary'
    };

    describe('1. Non-curriculum word saving and identification', () => {
        it('validates word IDs correctly for dict-..., cv_..., and custom-... prefixes', () => {
            expect(isValidWordId('dict-12345')).toBe(true);
            expect(isValidWordId('dict-cv_1')).toBe(true);
            expect(isValidWordId('cv_1')).toBe(true);
            expect(isValidWordId('cv_122595')).toBe(true);
            expect(isValidWordId('custom-apple')).toBe(true);

            // Rejects empty, non-string, or invalid formats
            expect(isValidWordId('')).toBe(false);
            expect(isValidWordId('   ')).toBe(false);
            expect(isValidWordId('fake-prefix-word')).toBe(false);
            expect(isValidWordId('unknown_12345')).toBe(false);
        });

        it('saves a non-curriculum dictionary word with dict-... prefix', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);

            expect(state.savedWordIds).toContain('dict-9988');
            expect(state.customWords).toBeDefined();
            expect(state.customWords).toHaveLength(1);
            expect(state.customWords![0].hanzi).toBe('滷肉飯');

            const found = findWord('dict-9988');
            expect(found).toBeDefined();
            expect(found?.hanzi).toBe('滷肉飯');
            expect(found?.pinyin).toBe('lǔròufàn');
            expect(found?.meaning).toBe('Cơm thịt kho Đài Loan');
        });

        it('saves a non-curriculum dictionary word with cv_... prefix', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord2.id, sampleCustomWord2);

            expect(state.savedWordIds).toContain('cv_10023');
            expect(state.customWords).toBeDefined();
            expect(state.customWords).toHaveLength(1);
            expect(state.customWords![0].hanzi).toBe('高鐵');

            const found = findWord('cv_10023');
            expect(found).toBeDefined();
            expect(found?.hanzi).toBe('高鐵');
            expect(found?.pinyin).toBe('gāotiě');
            expect(found?.meaning).toBe('Đường sắt cao tốc (THSR)');
        });

        it('toggles (un-saves) a custom word and cleans up savedWordIds and customWords', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);
            expect(state.savedWordIds).toContain('dict-9988');
            expect(state.customWords).toHaveLength(1);

            // Toggle again to remove
            state = toggleSavedWord(state, sampleCustomWord1.id);
            expect(state.savedWordIds).not.toContain('dict-9988');
            expect(state.customWords).toHaveLength(0);
        });

        it('supports batch saving of registered custom words via saveWordsBatch', () => {
            registerCustomWord(sampleCustomWord1);
            registerCustomWord(sampleCustomWord2);

            let state = createInitialState();
            state = saveWordsBatch(state, [sampleCustomWord1.id, sampleCustomWord2.id]);

            expect(state.savedWordIds).toHaveLength(2);
            expect(state.savedWordIds).toContain('dict-9988');
            expect(state.savedWordIds).toContain('cv_10023');
            expect(state.customWords).toBeDefined();
            expect(state.customWords).toHaveLength(2);

            const savedWords = getSavedWords(state);
            expect(savedWords).toHaveLength(2);
            expect(savedWords.map(w => w.hanzi)).toEqual(['滷肉飯', '高鐵']);
        });

        it('makes saved custom words searchable via searchWords in Hanzi, Pinyin, and Vietnamese', () => {
            registerCustomWord(sampleCustomWord1);
            registerCustomWord(sampleCustomWord2);

            // Search by Hanzi
            const byHanzi = searchWords('滷肉飯');
            expect(byHanzi.some(w => w.id === 'dict-9988')).toBe(true);

            // Search by Pinyin (toneless or with spaces)
            const byPinyin = searchWords('luroufan');
            expect(byPinyin.some(w => w.id === 'dict-9988')).toBe(true);
            const byPinyinSpace = searchWords('lu rou fan');
            expect(byPinyinSpace.some(w => w.id === 'dict-9988')).toBe(true);

            // Search by Vietnamese meaning
            const byVi = searchWords('duong sat cao toc');
            expect(byVi.some(w => w.id === 'cv_10023')).toBe(true);
        });

        it('provides graceful fallback for unregistered dict-... and cv_... IDs', () => {
            const fallbackDict = findWord('dict-unknown_term');
            expect(fallbackDict).toBeDefined();
            expect(fallbackDict?.id).toBe('dict-unknown_term');
            expect(fallbackDict?.hanzi).toBe('unknown_term');

            const fallbackCv = findWord('cv_999999');
            expect(fallbackCv).toBeDefined();
            expect(fallbackCv?.id).toBe('cv_999999');
            expect(fallbackCv?.hanzi).toBe('999999');
        });
    });

    describe('2. SRS review queue scheduling & SM-2 progression for custom words', () => {
        const refDate = new Date(2026, 9, 21); // 2026-10-21

        it('enqueues custom words in getDueWords upon saving', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);

            const due = getDueWords(state, refDate);
            expect(due).toHaveLength(1);
            expect(due[0].id).toBe('dict-9988');
            expect(due[0].hanzi).toBe('滷肉飯');

            const srsItems = getSrsItems(state, refDate);
            expect(srsItems).toHaveLength(1);
            expect(srsItems[0].isDue).toBe(true);
            expect(srsItems[0].dueDate).toBe('2026-10-21');
        });

        it('handles rating "again" (interval resets to 0, due same day for re-review)', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);

            state = reviewWord(state, sampleCustomWord1.id, 'again', refDate);
            const review = state.reviews[sampleCustomWord1.id];
            expect(review.interval).toBe(0);
            expect(review.repetitions).toBe(0);
            expect(review.dueDate).toBe('2026-10-21');
            expect(review.lastReviewed).toBe('2026-10-21');

            // Word remains due on the same day for re-study
            const due = getDueWords(state, refDate);
            expect(due).toHaveLength(1);
            expect(due[0].id).toBe('dict-9988');

            // XP awarded for the first review
            expect(getStats(state, refDate).xp).toBe(5);
        });

        it('allows same-day re-review of "again" card with "good" without duplicate XP farming', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);

            // First attempt: again
            state = reviewWord(state, sampleCustomWord1.id, 'again', refDate);
            expect(getStats(state, refDate).xp).toBe(5);

            // Re-study attempt later same day: good
            state = reviewWord(state, sampleCustomWord1.id, 'good', refDate);
            const review = state.reviews[sampleCustomWord1.id];
            expect(review.interval).toBe(1);
            expect(review.repetitions).toBe(1);
            expect(review.dueDate).toBe('2026-10-22');

            // XP is NOT duplicated on same day
            expect(getStats(state, refDate).xp).toBe(5);
            // Word is no longer due today
            expect(getDueWords(state, refDate)).toHaveLength(0);
        });

        it('prevents XP farming when rating already-scheduled card on same day', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);

            state = reviewWord(state, sampleCustomWord1.id, 'good', refDate);
            expect(getStats(state, refDate).xp).toBe(5);
            expect(state.reviews[sampleCustomWord1.id].interval).toBe(1);

            // Repeated call on same day
            const repeatedState = reviewWord(state, sampleCustomWord1.id, 'easy', refDate);
            expect(repeatedState).toEqual(state);
            expect(getStats(repeatedState, refDate).xp).toBe(5);
        });

        it('progresses SM-2 "hard" rating interval: 1 -> 2 days and calculates ease factor', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);

            // Day 1
            const day1 = new Date(2026, 9, 21);
            state = reviewWord(state, sampleCustomWord1.id, 'hard', day1);
            expect(state.reviews[sampleCustomWord1.id].interval).toBe(1);
            expect(state.reviews[sampleCustomWord1.id].repetitions).toBe(1);

            // Day 2
            const day2 = new Date(2026, 9, 22);
            state = reviewWord(state, sampleCustomWord1.id, 'hard', day2);
            expect(state.reviews[sampleCustomWord1.id].interval).toBe(2);
            expect(state.reviews[sampleCustomWord1.id].repetitions).toBe(2);

            const ef = computeEaseFactor(state.reviews[sampleCustomWord1.id]);
            expect(ef).toBeGreaterThanOrEqual(1.3);
            expect(ef).toBeLessThanOrEqual(3.0);
        });

        it('progresses SM-2 "good" rating interval: 1 -> 2 -> 4 -> 8 days', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord2.id, sampleCustomWord2);

            // Review 1 (Day 1)
            state = reviewWord(state, sampleCustomWord2.id, 'good', new Date(2026, 9, 21));
            expect(state.reviews[sampleCustomWord2.id].interval).toBe(1);
            expect(state.reviews[sampleCustomWord2.id].dueDate).toBe('2026-10-22');

            // Review 2 (Day 2)
            state = reviewWord(state, sampleCustomWord2.id, 'good', new Date(2026, 9, 22));
            expect(state.reviews[sampleCustomWord2.id].interval).toBe(2);
            expect(state.reviews[sampleCustomWord2.id].dueDate).toBe('2026-10-24');

            // Review 3 (Day 4)
            state = reviewWord(state, sampleCustomWord2.id, 'good', new Date(2026, 9, 24));
            expect(state.reviews[sampleCustomWord2.id].interval).toBe(4);
            expect(state.reviews[sampleCustomWord2.id].dueDate).toBe('2026-10-28');

            // Review 4 (Day 8)
            state = reviewWord(state, sampleCustomWord2.id, 'good', new Date(2026, 9, 28));
            expect(state.reviews[sampleCustomWord2.id].interval).toBe(8);
            expect(state.reviews[sampleCustomWord2.id].dueDate).toBe('2026-11-05');
        });

        it('progresses SM-2 "easy" rating interval: 4 -> 12 -> 36 days', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord3.id, sampleCustomWord3);

            // Review 1 (Day 1)
            state = reviewWord(state, sampleCustomWord3.id, 'easy', new Date(2026, 9, 21));
            expect(state.reviews[sampleCustomWord3.id].interval).toBe(4);
            expect(state.reviews[sampleCustomWord3.id].dueDate).toBe('2026-10-25');

            // Review 2 (Day 5)
            state = reviewWord(state, sampleCustomWord3.id, 'easy', new Date(2026, 9, 25));
            expect(state.reviews[sampleCustomWord3.id].interval).toBe(12);
            expect(state.reviews[sampleCustomWord3.id].dueDate).toBe('2026-11-06');
        });

        it('correctly maps boolean ratings (true = good, false = again)', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);

            const stateGood = reviewWord(state, sampleCustomWord1.id, true, refDate);
            expect(stateGood.reviews[sampleCustomWord1.id].interval).toBe(1);

            const stateAgain = reviewWord(state, sampleCustomWord1.id, false, refDate);
            expect(stateAgain.reviews[sampleCustomWord1.id].interval).toBe(0);
        });

        it('computes SRS breakdown accurately with custom words', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);
            state = toggleSavedWord(state, sampleCustomWord2.id, sampleCustomWord2);

            // Initially both are new and due today
            let srs = getSrsBreakdown(state, refDate);
            expect(srs.total).toBe(2);
            expect(srs.newCount).toBe(2);
            expect(srs.dueToday).toBe(2);

            // Review word 1 with good (interval 1 => learning)
            state = reviewWord(state, sampleCustomWord1.id, 'good', refDate);
            srs = getSrsBreakdown(state, refDate);
            expect(srs.learning).toBe(1);
            expect(srs.newCount).toBe(1);

            // Review word 2 with easy (interval 4 => review)
            state = reviewWord(state, sampleCustomWord2.id, 'easy', refDate);
            srs = getSrsBreakdown(state, refDate);
            expect(srs.learning).toBe(1);
            expect(srs.review).toBe(1);
            expect(srs.dueToday).toBe(0);
        });

        it('throws error when reviewing an unsaved word or with invalid rating', () => {
            const state = createInitialState();
            expect(() => reviewWord(state, sampleCustomWord1.id, 'good', refDate)).toThrow('Hãy lưu từ trước khi ôn tập.');
            const savedState = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);
            // @ts-expect-error invalid rating test
            expect(() => reviewWord(savedState, sampleCustomWord1.id, 'invalid_rating', refDate)).toThrow('Mức ôn tập không hợp lệ.');
        });
    });

    describe('3. Complete Export -> Clean Context -> Import Roundtrip', () => {
        it('preserves all custom words, Hanzi, pinyin, meaning, and review history across export and fresh import', () => {
            const d1 = new Date(2026, 9, 20); // 2026-10-20
            const d2 = new Date(2026, 9, 21); // 2026-10-21

            // 1. Create and populate state with custom words
            let originalState = createInitialState();
            originalState = toggleSavedWord(originalState, sampleCustomWord1.id, sampleCustomWord1);
            originalState = toggleSavedWord(originalState, sampleCustomWord2.id, sampleCustomWord2);
            originalState = toggleSavedWord(originalState, sampleCustomWord3.id, sampleCustomWord3);

            // 2. Perform reviews across two dates
            originalState = reviewWord(originalState, sampleCustomWord1.id, 'good', d1); // interval 1, due 2026-10-21
            originalState = reviewWord(originalState, sampleCustomWord2.id, 'easy', d1); // interval 4, due 2026-10-24

            // Advance to d2
            originalState = reviewWord(originalState, sampleCustomWord1.id, 'good', d2); // interval 2, due 2026-10-23
            originalState = reviewWord(originalState, sampleCustomWord3.id, 'again', d2); // interval 0, due 2026-10-21

            const originalStats = getStats(originalState, d2);
            expect(originalStats.xp).toBe(20); // 4 reviews * 5 XP

            // 3. Export state to JSON string
            const exportedJson = exportState(originalState);
            expect(typeof exportedJson).toBe('string');
            expect(exportedJson.length).toBeGreaterThan(100);

            // Verify exported JSON contains customWords payload
            const parsedExport = JSON.parse(exportedJson);
            expect(parsedExport.customWords).toBeDefined();
            expect(parsedExport.customWords).toHaveLength(3);

            // 4. Wipe in-memory registries completely to simulate a fresh browser context / another machine
            clearCustomWordRegistry();
            expect(getCustomWordRegistry().size).toBe(0);

            // In clean context, findWord should NOT have custom word definitions yet
            const foundBeforeImport = findWord(sampleCustomWord1.id);
            expect(foundBeforeImport?.meaning).not.toBe('Cơm thịt kho Đài Loan');

            // 5. Import into the fresh context
            const restoredState = importState(exportedJson, d2);

            // 6. Verify 100% state equality
            expect(restoredState).toEqual(originalState);

            // 7. Verify all custom words are fully restored in registry with exact metadata
            const restoredWord1 = findWord(sampleCustomWord1.id);
            expect(restoredWord1).toBeDefined();
            expect(restoredWord1?.hanzi).toBe('滷肉飯');
            expect(restoredWord1?.pinyin).toBe('lǔròufàn');
            expect(restoredWord1?.meaning).toBe('Cơm thịt kho Đài Loan');
            expect(restoredWord1?.example).toBe('滷肉飯是臺灣代表性美食。');

            const restoredWord2 = findWord(sampleCustomWord2.id);
            expect(restoredWord2).toBeDefined();
            expect(restoredWord2?.hanzi).toBe('高鐵');
            expect(restoredWord2?.pinyin).toBe('gāotiě');
            expect(restoredWord2?.meaning).toBe('Đường sắt cao tốc (THSR)');

            const restoredWord3 = findWord(sampleCustomWord3.id);
            expect(restoredWord3).toBeDefined();
            expect(restoredWord3?.hanzi).toBe('珍珠奶茶');

            // 8. Verify due words and schedule are 100% intact
            const dueWords = getDueWords(restoredState, d2);
            // Word 3 was rated again today so it is due; Word 1 due 2026-10-23; Word 2 due 2026-10-24
            expect(dueWords).toHaveLength(1);
            expect(dueWords[0].id).toBe(sampleCustomWord3.id);
            expect(dueWords[0].hanzi).toBe('珍珠奶茶');

            // 9. Verify stats match perfectly
            const restoredStats = getStats(restoredState, d2);
            expect(restoredStats.xp).toBe(20);
            expect(restoredStats.reviewCount).toBe(4);
        });

        it('saves and loads cleanly via localStorage helper (loadState & saveState)', () => {
            const memoryStorage: Record<string, string> = {};
            const fakeStorage = {
                getItem: (k: string) => memoryStorage[k] ?? null,
                setItem: (k: string, v: string) => {
                    memoryStorage[k] = v;
                }
            };

            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);
            state = reviewWord(state, sampleCustomWord1.id, 'good', new Date(2026, 9, 21));

            // Save to storage
            const saveError = saveState(state, fakeStorage);
            expect(saveError).toBeNull();

            // Clear registry
            clearCustomWordRegistry();

            // Load back from storage
            const { state: loadedState, error: loadError } = loadState(fakeStorage);
            expect(loadError).toBeNull();
            expect(loadedState).toEqual(state);

            const word = findWord(sampleCustomWord1.id);
            expect(word?.hanzi).toBe('滷肉飯');
        });
    });

    describe('4. Strict validation and atomic safety on importState', () => {
        const today = new Date(2026, 9, 21);

        it('rejects non-string or malformed JSON without modifying state', () => {
            // @ts-expect-error non string test
            expect(() => importState(12345, today)).toThrow('Dữ liệu không hợp lệ.');
            expect(() => importState('{ malformed json ...', today)).toThrow('Tệp JSON không hợp lệ.');
            expect(() => importState('   ', today)).toThrow('Tệp JSON không hợp lệ.');
        });

        it('rejects oversized JSON payloads (> 200,000 characters)', () => {
            expect(() => importState(' '.repeat(200001), today)).toThrow('Tệp dữ liệu quá lớn.');
        });

        it('rejects payloads with missing or extra top-level fields', () => {
            const valid = createInitialState();

            // Extra rogue field
            const withExtra = { ...valid, hackerField: 'malicious' };
            expect(() => importState(JSON.stringify(withExtra), today)).toThrow('Cấu trúc dữ liệu không hợp lệ.');

            // Missing required field
            const missingField = { ...valid };
            // @ts-expect-error test missing field
            delete missingField.profile;
            expect(() => importState(JSON.stringify(missingField), today)).toThrow('Cấu trúc dữ liệu không hợp lệ.');
        });

        it('rejects unsupported schema version', () => {
            const badVersion = { ...createInitialState(), version: 2 };
            expect(() => importState(JSON.stringify(badVersion), today)).toThrow('Phiên bản dữ liệu chưa được hỗ trợ.');
        });

        it('rejects negative XP or invalid activity math', () => {
            const valid = createInitialState();

            // Negative XP
            const negXp = {
                ...valid,
                activity: {
                    '2026-10-21': { xp: -30, lessons: 1, reviews: 0 }
                }
            };
            expect(() => importState(JSON.stringify(negXp), today)).toThrow('Hoạt động không hợp lệ.');

            // Zero XP
            const zeroXp = {
                ...valid,
                activity: {
                    '2026-10-21': { xp: 0, lessons: 0, reviews: 0 }
                }
            };
            expect(() => importState(JSON.stringify(zeroXp), today)).toThrow('Hoạt động không hợp lệ.');

            // Math mismatch: lessons = 1, reviews = 0, but xp = 40 (should be 30)
            const mathMismatch = {
                ...valid,
                activity: {
                    '2026-10-21': { xp: 40, lessons: 1, reviews: 0 }
                }
            };
            expect(() => importState(JSON.stringify(mathMismatch), today)).toThrow('Hoạt động không hợp lệ.');
        });

        it('rejects future activity dates and invalid calendar dates', () => {
            const valid = createInitialState();

            // Future date
            const futureDate = {
                ...valid,
                activity: {
                    '2099-01-01': { xp: 30, lessons: 1, reviews: 0 }
                }
            };
            expect(() => importState(JSON.stringify(futureDate), today)).toThrow('Hoạt động không hợp lệ.');

            // Non-existent calendar date: 2026-02-31
            const badCalendarDate = {
                ...valid,
                activity: {
                    '2026-02-31': { xp: 30, lessons: 1, reviews: 0 }
                }
            };
            expect(() => importState(JSON.stringify(badCalendarDate), today)).toThrow('Hoạt động không hợp lệ.');
        });

        it('rejects invalid review intervals, negative repetitions, or mismatched due dates', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);
            state = reviewWord(state, sampleCustomWord1.id, 'good', today);

            // Negative interval
            const negInterval = {
                ...state,
                reviews: {
                    [sampleCustomWord1.id]: {
                        ...state.reviews[sampleCustomWord1.id],
                        interval: -1
                    }
                }
            };
            expect(() => importState(JSON.stringify(negInterval), today)).toThrow('Lịch ôn tập không hợp lệ.');

            // Tampered due date that does not match shift(lastReviewed, interval)
            const tamperedDueDate = {
                ...state,
                reviews: {
                    [sampleCustomWord1.id]: {
                        ...state.reviews[sampleCustomWord1.id],
                        dueDate: '2026-12-31' // should be 2026-10-22
                    }
                }
            };
            expect(() => importState(JSON.stringify(tamperedDueDate), today)).toThrow('Lịch ôn tập không hợp lệ.');
        });

        it('rejects corrupted custom words payload atomically without writing partial data', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);

            // Wipe registry to test atomic safety on import
            clearCustomWordRegistry();
            expect(getCustomWordRegistry().size).toBe(0);

            // Payload contains 1 valid custom word and 1 corrupted custom word (missing hanzi)
            const corruptedCustomWordsState = {
                ...state,
                savedWordIds: [sampleCustomWord1.id, 'cv_9999'],
                customWords: [
                    sampleCustomWord1, // valid
                    {
                        ...sampleCustomWord2,
                        id: 'cv_9999',
                        hanzi: '' // corrupted: empty hanzi!
                    }
                ]
            };

            expect(() => importState(JSON.stringify(corruptedCustomWordsState), today)).toThrow(
                'Dữ liệu từ vựng mở rộng không hợp lệ.'
            );

            // Verify registry remains 100% empty (word 1 was NOT partially committed)
            expect(getCustomWordRegistry().size).toBe(0);
            expect(findWord(sampleCustomWord1.id)?.meaning).not.toBe('Cơm thịt kho Đài Loan');
        });

        it('rejects duplicate custom word IDs in customWords', () => {
            let state = createInitialState();
            state = toggleSavedWord(state, sampleCustomWord1.id, sampleCustomWord1);

            const duplicateCustomWordsState = {
                ...state,
                customWords: [sampleCustomWord1, sampleCustomWord1]
            };

            expect(() => importState(JSON.stringify(duplicateCustomWordsState), today)).toThrow(
                'Dữ liệu từ vựng mở rộng không hợp lệ.'
            );
        });
    });

    describe('5. Backward compatibility with v1 format', () => {
        it('seamlessly imports legacy v1 JSON exports that lack the customWords field', () => {
            const legacyV1Payload = {
                version: 1,
                profile: { name: 'Người học cũ', dailyGoal: 30 },
                completedLessonIds: [],
                savedWordIds: ['dict-legacy_word'],
                reviews: {},
                activity: {},
                quizScores: {}
            };

            const imported = importState(JSON.stringify(legacyV1Payload));
            expect(imported.version).toBe(1);
            expect(imported.profile.name).toBe('Người học cũ');
            expect(imported.savedWordIds).toContain('dict-legacy_word');

            // Legacy word has graceful fallback definition
            const word = findWord('dict-legacy_word');
            expect(word).toBeDefined();
            expect(word?.id).toBe('dict-legacy_word');
            expect(word?.hanzi).toBe('legacy_word');
        });
    });

    describe('6. Local date arithmetic & storage error handling', () => {
        it('throws descriptive error on invalid Date objects passed to localDate', () => {
            expect(() => localDate(new Date('invalid-date-string'))).toThrow('Ngày không hợp lệ.');
            // @ts-expect-error invalid type
            expect(() => localDate('2026-10-21')).toThrow('Ngày không hợp lệ.');
        });

        it('properly handles local timezone year, month, and day padding', () => {
            const date = new Date(2026, 0, 5); // Jan 5, 2026
            expect(localDate(date)).toBe('2026-01-05');
        });

        it('reports quota exhaustion error on saveState without throwing', () => {
            const quotaStorage = {
                setItem: () => {
                    throw new Error('QuotaExceededError');
                }
            };
            const error = saveState(createInitialState(), quotaStorage);
            expect(error).toBe('Không thể lưu tiến độ trên thiết bị. Hãy xuất bản sao dữ liệu.');
        });

        it('reports storage read errors on loadState safely', () => {
            const brokenStorage = {
                getItem: () => {
                    throw new Error('SecurityError: access denied');
                }
            };
            const { state, error } = loadState(brokenStorage);
            expect(state).toBeDefined();
            expect(error).toBe('Không thể đọc tiến độ đã lưu. Dữ liệu trong phiên này vẫn sử dụng được.');
        });
    });
});
