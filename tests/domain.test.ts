import { describe, it, expect } from 'vitest';
import {
    createInitialState,
    completeLesson,
    reviewWord,
    getStats,
    importState,
    exportState,
    toggleSavedWord,
    loadState,
    saveState,
    getDueWords,
    searchWords,
    updateProfile,
    localDate,
    computeEaseFactor,
    saveLessonWords,
    getSrsBreakdown,
    getCompetencyRadar,
    getActivityHeatmap,
    getWeeklyProgress,
    getQuizAccuracy,
    saveLessonDraft,
    loadLessonDraft,
    saveScenarioDraft,
    loadScenarioDraft,
    clearDrafts,
    findWord,
    convertSimpToTrad
} from '../src/domain/learning';
import { lessons, allWords, scenarios } from '../src/data/lessons';
import { getWordEtymology, STARTER_DECKS, getTodayRadical } from '../src/data/etymologyData';
import { fallbackClientHandwriting, simulateLocalAiReply } from '../src/services/api';

describe('learning progress', () => {
    it('starts honestly empty', () => expect(getStats(createInitialState()).xp).toBe(0));
    it('awards lesson XP once and never mutates state', () => {
        const s = createInitialState();
        const next = completeLesson(s, lessons[0].id, new Date(2026, 9, 17));
        expect(getStats(next).xp).toBe(30);
        expect(getStats(completeLesson(next, lessons[0].id)).xp).toBe(30);
        expect(s.completedLessonIds).toEqual([]);
    });
    it('counts consecutive local learning days', () => {
        let s = createInitialState();
        s = completeLesson(s, lessons[0].id, new Date(2026, 9, 16));
        s = completeLesson(s, lessons[1].id, new Date(2026, 9, 17));
        expect(getStats(s, new Date(2026, 9, 17)).streak).toBe(2);
        expect(getStats(s, new Date(2026, 9, 20)).streak).toBe(0);
    });
    it('schedules review and prevents same-day XP farming', () => {
        let s = toggleSavedWord(createInitialState(), allWords[0].id);
        expect(getDueWords(s)).toHaveLength(1);
        s = reviewWord(s, allWords[0].id, true, new Date(2026, 9, 17));
        expect(getStats(s).xp).toBe(5);
        expect(getDueWords(s, new Date(2026, 9, 17))).toHaveLength(0);
        expect(getStats(reviewWord(s, allWords[0].id, true, new Date(2026, 9, 17))).xp).toBe(5);
    });
    it('rejects unknown IDs', () => expect(() => completeLesson(createInitialState(), 'fake')).toThrow());
    it('roundtrips and rejects corrupted nested imports', () => {
        const s = createInitialState();
        expect(importState(exportState(s))).toEqual(s);
        expect(() => importState(JSON.stringify({ ...s, activity: { bad: { xp: 100, lessons: 1, reviews: 0 } } }))).toThrow();
        expect(() => importState(JSON.stringify({ ...s, reviews: { fake: { dueDate: '2026-10-17', interval: 1, repetitions: 1 } } }))).toThrow();
    });
    it('recovers corrupted storage and reports quota errors', () => {
        expect(loadState({ getItem: () => '{' }).error).toBeTruthy();
        expect(saveState(createInitialState(), { setItem: () => { throw Error('quota'); } })).toBeTruthy();
    });
    it('ships sixteen complete lessons with valid answer indices', () => {
        expect(lessons).toHaveLength(16);
        for (const l of lessons) {
            expect(l.words.length).toBeGreaterThanOrEqual(4);
            expect(l.dialogue.length).toBeGreaterThanOrEqual(3);
            expect(l.quiz.length).toBeGreaterThanOrEqual(3);
            for (const q of l.quiz)
                expect(q.options[q.answer]).toBeTruthy();
        }
    });
});

describe('learning integrity and curriculum', () => {
    it('saves real quiz scores without repeated XP', () => {
        const s = completeLesson(createInitialState(), lessons[0].id, new Date(), { correct: 2, total: 4 });
        expect(s.quizScores[lessons[0].id]).toEqual({ correct: 2, total: 4 });
        expect(getStats(completeLesson(s, lessons[0].id, new Date(), { correct: 4, total: 4 })).xp).toBe(30);
        expect(() => completeLesson(s, lessons[0].id, new Date(), { correct: 5, total: 4 })).toThrow();
    });
    it('uses local calendar dates and schedules ratings differently', () => {
        const date = new Date(2026, 9, 17, 0, 1);
        expect(localDate(date)).toBe('2026-10-17');
        const s = toggleSavedWord(createInitialState(), allWords[0].id);
        const again = reviewWord(s, allWords[0].id, 'again', date);
        expect(getDueWords(again, date)).toHaveLength(1);
        const good = reviewWord(again, allWords[0].id, 'good', date);
        expect(getStats(good).xp).toBe(5);
        expect(good.reviews[allWords[0].id].dueDate).toBe('2026-10-18');
        expect(reviewWord(s, allWords[0].id, 'easy', date).reviews[allWords[0].id].interval).toBe(4);
        expect(() => reviewWord(createInitialState(), allWords[0].id, true)).toThrow();
    });
    it('searches Hanzi, pinyin and unaccented Vietnamese', () => {
        expect(searchWords('nǐ hǎo')[0].hanzi).toBe('你好');
        expect(searchWords('ni hao')[0].hanzi).toBe('你好');
        expect(searchWords('tra sua')[0].hanzi).toBe('珍珠奶茶');
        expect(searchWords('捷運').length).toBeGreaterThan(0);
    });
    it('validates profiles immutably', () => {
        const s = createInitialState();
        expect(updateProfile(s, { name: ' An ', dailyGoal: 50 }).profile).toEqual({ name: 'An', dailyGoal: 50 });
        expect(s.profile.name).toBe('Bạn');
        expect(() => updateProfile(s, { name: '' })).toThrow();
        expect(() => updateProfile(s, { dailyGoal: -2 })).toThrow();
    });
    it('rejects future activity, duplicate IDs, unknown score IDs and oversized imports', () => {
        const s = completeLesson(createInitialState(), lessons[0].id, new Date(2026, 9, 17));
        const read = (v: unknown) => importState(JSON.stringify(v), new Date(2026, 9, 17));
        expect(() => read({ ...s, activity: { '2099-01-01': { xp: 30, lessons: 1, reviews: 0 } } })).toThrow();
        expect(() => read({ ...s, completedLessonIds: [lessons[0].id, lessons[0].id] })).toThrow();
        expect(() => read({ ...s, quizScores: { fake: { correct: 1, total: 4 } } })).toThrow();
        expect(() => importState(' '.repeat(200001))).toThrow();
    });
    it('roundtrips complete state and storage', () => {
        let s = completeLesson(createInitialState(), lessons[0].id, new Date(), { correct: 3, total: 4 });
        s = reviewWord(toggleSavedWord(s, allWords[0].id), allWords[0].id, 'easy');
        expect(importState(exportState(s))).toEqual(s);
        let raw = '';
        expect(saveState(s, { setItem: (_k, v) => { raw = v; } })).toBeNull();
        expect(loadState({ getItem: () => raw }).state).toEqual(s);
        expect(loadState({ getItem: () => null }).error).toBeNull();
    });
    it('has 80 contextual words and valid branching scenarios', () => {
        expect(allWords).toHaveLength(80);
        expect(scenarios).toHaveLength(3);
        for (const l of lessons) {
            expect(l.words.length).toBeGreaterThanOrEqual(5);
            expect(l.grammar.length).toBeGreaterThan(0);
            expect(l.dialogue.length).toBeGreaterThanOrEqual(4);
            expect(l.quiz.length).toBeGreaterThanOrEqual(4);
        }
        for (const s of scenarios) {
            expect(s.nodes[s.start]).toBeTruthy();
            for (const n of Object.values(s.nodes))
                for (const c of n.choices)
                    expect(s.nodes[c.next]).toBeTruthy();
        }
    });
});

it('varies correct quiz positions and rejects forged review totals', () => {
    expect(new Set(lessons[0].quiz.map(q => q.answer)).size).toBeGreaterThan(1);
    const s = toggleSavedWord(createInitialState(), allWords[0].id);
    const forged = { ...s, activity: { [localDate()]: { xp: 5, lessons: 0, reviews: 1 } } };
    expect(() => importState(JSON.stringify(forged))).toThrow();
});
it('searches joined pinyin and avoids repeatedly growing same-day intervals', () => {
    expect(searchWords('nihao')[0]?.hanzi).toBe('你好');
    const s = toggleSavedWord(createInitialState(), allWords[0].id);
    const once = reviewWord(s, allWords[0].id, 'good');
    expect(reviewWord(once, allWords[0].id, 'easy')).toEqual(once);
});
it('quiz options always match correct meaning and vary across lessons', () => {
    for (const l of lessons)
        l.quiz.forEach((q, j) => expect(q.options[q.answer]).toBe(j % 2 === 0 ? l.words[j].meaning : l.words[j].hanzi));
    expect(lessons[0].quiz.map(q => q.answer)).not.toEqual(lessons[1].quiz.map(q => q.answer));
});

describe('SM-2 hard rating, custom dictionary words, analytics and offline handwriting', () => {
    it('supports SM-2 hard rating and computes ease factor accurately', () => {
        const d1 = new Date(2026, 9, 17);
        const d2 = new Date(2026, 9, 18);
        let s = toggleSavedWord(createInitialState(), allWords[0].id);
        s = reviewWord(s, allWords[0].id, 'hard', d1);
        expect(s.reviews[allWords[0].id].interval).toBe(1);
        expect(s.reviews[allWords[0].id].repetitions).toBe(1);
        expect(getStats(s).xp).toBe(5);
        expect(computeEaseFactor(s.reviews[allWords[0].id])).toBeGreaterThanOrEqual(1.3);

        s = reviewWord(s, allWords[0].id, 'hard', d2);
        expect(s.reviews[allWords[0].id].interval).toBe(2);
        expect(s.reviews[allWords[0].id].repetitions).toBe(2);
    });

    it('supports saving, reviewing and roundtripping custom PGlite dictionary words', () => {
        const customWord = {
            id: 'dict-9988',
            hanzi: '鳳梨酥',
            pinyin: 'fènglísū',
            meaning: 'Bánh dứa Đài Loan',
            example: '鳳梨酥（臺灣繁體詞彙）',
            examplePinyin: 'fènglísū',
            exampleMeaning: 'Bánh dứa Đài Loan',
            category: 'Từ điển mở rộng',
            lessonId: 'custom-dictionary'
        };
        let s = toggleSavedWord(createInitialState(), customWord.id, customWord);
        expect(s.savedWordIds).toContain('dict-9988');
        const due = getDueWords(s);
        expect(due[0]?.hanzi).toBe('鳳梨酥');

        s = reviewWord(s, customWord.id, 'good', new Date(2026, 9, 17));
        expect(importState(exportState(s))).toEqual(s);
    });

    it('computes SRS breakdown, 6-axis radar, 84-day heatmap and batch lesson saves', () => {
        let s = saveLessonWords(createInitialState(), lessons[0].id);
        expect(s.savedWordIds).toHaveLength(lessons[0].words.length);
        s = completeLesson(s, lessons[0].id, new Date(2026, 9, 17), { correct: 4, total: 4 });
        const srs = getSrsBreakdown(s, new Date(2026, 9, 17));
        expect(srs.total).toBe(lessons[0].words.length);
        expect(srs.newCount).toBe(lessons[0].words.length);

        const radar = getCompetencyRadar(s);
        expect(radar.axes).toHaveLength(6);
        expect(radar.overallScore).toBeGreaterThan(0);

        const heatmap = getActivityHeatmap(s, new Date(2026, 9, 17));
        expect(heatmap.days).toHaveLength(84);
        expect(heatmap.days[83].xp).toBe(30);
        expect(heatmap.days[83].level).toBeGreaterThan(0);
    });

    it('provides Sinology etymology for all 40 words and offline handwriting stroke recognition', () => {
        for (const w of allWords) {
            const ety = getWordEtymology(w.id, w.hanzi);
            expect(ety.sinoViet.length).toBeGreaterThan(0);
            expect(ety.decomposition.length).toBeGreaterThan(0);
        }
        expect(STARTER_DECKS).toHaveLength(4);
        expect(getTodayRadical().radical).toBeTruthy();

        const oneStrokeHorizontal = fallbackClientHandwriting([[[20, 120, 220], [120, 120, 120], [0, 50, 100]]]);
        expect(oneStrokeHorizontal[0]).toBe('一');
        const twoStrokes = fallbackClientHandwriting([
            [[40, 200], [90, 90], [0, 50]],
            [[30, 210], [160, 160], [60, 110]]
        ]);
        expect(twoStrokes).toContain('二');
    });

    it('covers weekly progress, quiz accuracy, draft storage and dict fallback', () => {
        let s = createInitialState();
        expect(getQuizAccuracy(s).percentage).toBeNull();
        s = completeLesson(s, lessons[0].id, new Date(2026, 9, 17), { correct: 3, total: 4 });
        expect(getQuizAccuracy(s).percentage).toBe(75);
        const weekly = getWeeklyProgress(s, new Date(2026, 9, 17));
        expect(weekly.days).toHaveLength(7);
        expect(weekly.totalXp).toBe(30);

        expect(findWord('dict-101')?.hanzi).toBe('101');
        expect(computeEaseFactor(undefined)).toBe(2.5);
        expect(computeEaseFactor({ dueDate: '2026-10-17', interval: 0, repetitions: 0, lastReviewed: '2026-10-17' })).toBe(1.3);
        expect(computeEaseFactor({ dueDate: '2026-10-21', interval: 4, repetitions: 1, lastReviewed: '2026-10-17' })).toBe(2.8);

        const mem = new Map<string, string>();
        const mockStorage = {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => { mem.set(k, v); },
            removeItem: (k: string) => { mem.delete(k); }
        };
        saveLessonDraft({ lessonId: lessons[0].id, stage: 1, question: 0, selected: null, correct: 0 }, mockStorage);
        expect(loadLessonDraft(mockStorage)?.stage).toBe(1);
        saveScenarioDraft({ scenarioId: scenarios[0].id, nodeId: 'start', feedback: 'ok', history: [{ text: 'a', meaning: 'b' }] }, mockStorage);
        expect(loadScenarioDraft(mockStorage)?.nodeId).toBe('start');
        clearDrafts(mockStorage);
        expect(loadLessonDraft(mockStorage)).toBeNull();
    });

    it('converts simplified characters and cross-strait synonyms for seamless search', () => {
        expect(convertSimpToTrad('学中文')).toBe('學中文');
        expect(convertSimpToTrad('坐地铁')).toBe('坐捷運');
        expect(convertSimpToTrad('叫出租车')).toBe('叫計程車');

        const searchRes = searchWords('车');
        expect(searchRes.some(w => w.hanzi.includes('車'))).toBe(true);

        const mrtRes = searchWords('地铁');
        expect(mrtRes.some(w => w.hanzi.includes('捷運'))).toBe(true);
    });

    it('generates role-specific and scenario-aligned Sinology AI tutor replies', () => {
        const factoryReply = simulateLocalAiReply('Tôi muốn hỏi về tăng ca', 'factory');
        expect(factoryReply.content).toContain('加班');
        expect(factoryReply.content).toContain('打卡');

        const taxReply = simulateLocalAiReply('Quy định 183 ngày là sao?', 'tax');
        expect(taxReply.content).toContain('183');
        expect(taxReply.content).toContain('所得稅');

        const techReply = simulateLocalAiReply('Bán dẫn và wafer', 'tech');
        expect(techReply.content).toContain('晶圓');
        expect(techReply.content).toContain('無塵室');

        // Verify "ẩm thực đường phố" does not falsely trigger bubble tea!
        const streetFood = simulateLocalAiReply('Khám phá ẩm thực đường phố Đài Loan');
        expect(streetFood.content).not.toContain('珍珠奶茶');
    });
});
