import { describe, it, expect } from 'vitest';
import { createInitialState, completeLesson, reviewWord, getStats, importState, exportState, toggleSavedWord, loadState, saveState, getDueWords } from '../src/domain/learning';
import { lessons, allWords } from '../src/data/lessons';
describe('learning progress', () => {
    it('starts honestly empty', () => expect(getStats(createInitialState()).xp).toBe(0));
    it('awards lesson XP once and never mutates state', () => { const s = createInitialState(); const next = completeLesson(s, lessons[0].id, new Date(2026, 9, 17)); expect(getStats(next).xp).toBe(30); expect(getStats(completeLesson(next, lessons[0].id)).xp).toBe(30); expect(s.completedLessonIds).toEqual([]); });
    it('counts consecutive local learning days', () => { let s = createInitialState(); s = completeLesson(s, lessons[0].id, new Date(2026, 9, 16)); s = completeLesson(s, lessons[1].id, new Date(2026, 9, 17)); expect(getStats(s, new Date(2026, 9, 17)).streak).toBe(2); expect(getStats(s, new Date(2026, 9, 20)).streak).toBe(0); });
    it('schedules review and prevents same-day XP farming', () => { let s = toggleSavedWord(createInitialState(), allWords[0].id); expect(getDueWords(s)).toHaveLength(1); s = reviewWord(s, allWords[0].id, true, new Date(2026, 9, 17)); expect(getStats(s).xp).toBe(5); expect(getDueWords(s, new Date(2026, 9, 17))).toHaveLength(0); expect(getStats(reviewWord(s, allWords[0].id, true, new Date(2026, 9, 17))).xp).toBe(5); });
    it('rejects unknown IDs', () => expect(() => completeLesson(createInitialState(), 'fake')).toThrow());
    it('roundtrips and rejects corrupted nested imports', () => { const s = createInitialState(); expect(importState(exportState(s))).toEqual(s); expect(() => importState(JSON.stringify({ ...s, activity: { 'bad': { xp: 100, lessons: 1, reviews: 0 } } }))).toThrow(); expect(() => importState(JSON.stringify({ ...s, reviews: { fake: { dueDate: '2026-10-17', interval: 1, repetitions: 1 } } }))).toThrow(); });
    it('recovers corrupted storage and reports quota errors', () => { expect(loadState({ getItem: () => '{' }).error).toBeTruthy(); expect(saveState(createInitialState(), { setItem: () => { throw Error('quota'); } })).toBeTruthy(); });
    it('ships eight complete lessons with valid answer indices', () => { expect(lessons).toHaveLength(8); for (const l of lessons) {
        expect(l.words.length).toBeGreaterThanOrEqual(4);
        expect(l.dialogue.length).toBeGreaterThanOrEqual(3);
        expect(l.quiz.length).toBeGreaterThanOrEqual(3);
        for (const q of l.quiz)
            expect(q.options[q.answer]).toBeTruthy();
    } });
});
import { searchWords, updateProfile, localDate } from '../src/domain/learning';
import { scenarios } from '../src/data/lessons';
describe('learning integrity and curriculum', () => {
    it('saves real quiz scores without repeated XP', () => { const s = completeLesson(createInitialState(), lessons[0].id, new Date(), { correct: 2, total: 4 }); expect(s.quizScores[lessons[0].id]).toEqual({ correct: 2, total: 4 }); expect(getStats(completeLesson(s, lessons[0].id, new Date(), { correct: 4, total: 4 })).xp).toBe(30); expect(() => completeLesson(s, lessons[0].id, new Date(), { correct: 5, total: 4 })).toThrow(); });
    it('uses local calendar dates and schedules ratings differently', () => { const date = new Date(2026, 9, 17, 0, 1); expect(localDate(date)).toBe('2026-10-17'); const s = toggleSavedWord(createInitialState(), allWords[0].id); const again = reviewWord(s, allWords[0].id, 'again', date); expect(getDueWords(again, date)).toHaveLength(1); const good = reviewWord(again, allWords[0].id, 'good', date); expect(getStats(good).xp).toBe(5); expect(good.reviews[allWords[0].id].dueDate).toBe('2026-10-18'); expect(reviewWord(s, allWords[0].id, 'easy', date).reviews[allWords[0].id].interval).toBe(4); expect(() => reviewWord(createInitialState(), allWords[0].id, true)).toThrow(); });
    it('searches Hanzi, pinyin and unaccented Vietnamese', () => { expect(searchWords('nǐ hǎo')[0].hanzi).toBe('你好'); expect(searchWords('ni hao')[0].hanzi).toBe('你好'); expect(searchWords('tra sua')[0].hanzi).toBe('珍珠奶茶'); expect(searchWords('捷運').length).toBeGreaterThan(0); });
    it('validates profiles immutably', () => { const s = createInitialState(); expect(updateProfile(s, { name: ' An ', dailyGoal: 50 }).profile).toEqual({ name: 'An', dailyGoal: 50 }); expect(s.profile.name).toBe('Bạn'); expect(() => updateProfile(s, { name: '' })).toThrow(); expect(() => updateProfile(s, { dailyGoal: -2 })).toThrow(); });
    it('rejects future activity, duplicate IDs, unknown score IDs and oversized imports', () => { const s = completeLesson(createInitialState(), lessons[0].id, new Date(2026, 9, 17)); const read = (v: unknown) => importState(JSON.stringify(v), new Date(2026, 9, 17)); expect(() => read({ ...s, activity: { '2099-01-01': { xp: 30, lessons: 1, reviews: 0 } } })).toThrow(); expect(() => read({ ...s, completedLessonIds: [lessons[0].id, lessons[0].id] })).toThrow(); expect(() => read({ ...s, quizScores: { fake: { correct: 1, total: 4 } } })).toThrow(); expect(() => importState(' '.repeat(200001))).toThrow(); });
    it('roundtrips complete state and storage', () => { let s = completeLesson(createInitialState(), lessons[0].id, new Date(), { correct: 3, total: 4 }); s = reviewWord(toggleSavedWord(s, allWords[0].id), allWords[0].id, 'easy'); expect(importState(exportState(s))).toEqual(s); let raw = ''; expect(saveState(s, { setItem: (_k, v) => { raw = v; } })).toBeNull(); expect(loadState({ getItem: () => raw }).state).toEqual(s); expect(loadState({ getItem: () => null }).error).toBeNull(); });
    it('has 40 contextual words and valid branching scenarios', () => { expect(allWords).toHaveLength(40); expect(scenarios).toHaveLength(3); for (const l of lessons) {
        expect(l.words.length).toBeGreaterThanOrEqual(5);
        expect(l.grammar.length).toBeGreaterThan(0);
        expect(l.dialogue.length).toBeGreaterThanOrEqual(4);
        expect(l.quiz.length).toBeGreaterThanOrEqual(4);
    } for (const s of scenarios) {
        expect(s.nodes[s.start]).toBeTruthy();
        for (const n of Object.values(s.nodes))
            for (const c of n.choices)
                expect(s.nodes[c.next]).toBeTruthy();
    } });
});
it('varies correct quiz positions and rejects forged review totals', () => { expect(new Set(lessons[0].quiz.map(q => q.answer)).size).toBeGreaterThan(1); const s = toggleSavedWord(createInitialState(), allWords[0].id); const forged = { ...s, activity: { [localDate()]: { xp: 5, lessons: 0, reviews: 1 } } }; expect(() => importState(JSON.stringify(forged))).toThrow(); });
it('searches joined pinyin and avoids repeatedly growing same-day intervals', () => { expect(searchWords('nihao')[0]?.hanzi).toBe('你好'); const s = toggleSavedWord(createInitialState(), allWords[0].id); const once = reviewWord(s, allWords[0].id, 'good'); expect(reviewWord(once, allWords[0].id, 'easy')).toEqual(once); });
it('quiz options always match correct meaning and vary across lessons', () => { for (const l of lessons)
    l.quiz.forEach((q, j) => expect(q.options[q.answer]).toBe(j % 2 === 0 ? l.words[j].meaning : l.words[j].hanzi)); expect(lessons[0].quiz.map(q => q.answer)).not.toEqual(lessons[1].quiz.map(q => q.answer)); });
