import { describe, it, expect } from 'vitest';
import { allWords, scenarios } from '../src/data/lessons';
import { getWordEtymology, STARTER_DECKS, etymologyMap } from '../src/data/etymologyData';

describe('Sinology Etymology B1-B2 & Curriculum 80 Suite', () => {
    describe('Curriculum Words Etymology Completeness', () => {
        it('has 80 curriculum words across lessons 1 to 16', () => {
            expect(allWords).toHaveLength(80);
            const wordIds = allWords.map(w => w.id);
            expect(new Set(wordIds).size).toBe(80);
            for (let l = 1; l <= 16; l++) {
                for (let w = 1; w <= 5; w++) {
                    expect(wordIds).toContain(`lesson-${l}-word-${w}`);
                }
            }
        });

        it('provides authentic, non-placeholder Sinology etymology entries for all 80 curriculum words', () => {
            for (const w of allWords) {
                const ety = getWordEtymology(w.id, w.hanzi);
                expect(ety, `Etymology for ${w.id} (${w.hanzi}) must be defined`).toBeDefined();
                expect(ety.wordId).toBe(w.id);

                // sinoViet is non-empty and NEVER falls back to generic placeholders
                expect(ety.sinoViet, `${w.id} sinoViet must be non-empty`).toBeTruthy();
                expect(ety.sinoViet.length).toBeGreaterThan(0);
                expect(ety.sinoViet).not.toBe('TỪ VỰNG MỞ RỘNG');
                expect(ety.sinoViet).not.toBe('Hán-Việt');
                expect(ety.sinoViet).not.toContain('TỪ VỰNG MỞ RỘNG');

                // radicalName NEVER falls back to generic placeholder
                expect(ety.radicalName, `${w.id} radicalName must be non-empty`).toBeTruthy();
                expect(ety.radicalName).not.toBe('Bộ Hán tự Phồn thể');
                expect(ety.radicalName).not.toContain('Bộ Hán tự Phồn thể');

                // decomposition has at least 1 character decomposition entry with valid fields
                expect(ety.decomposition.length, `${w.id} must have decomposition entries`).toBeGreaterThan(0);
                for (const charDecomp of ety.decomposition) {
                    expect(charDecomp.char, `${w.id} charDecomp.char`).toBeTruthy();
                    expect(charDecomp.sinoViet, `${w.id} charDecomp.sinoViet`).toBeTruthy();
                    expect(charDecomp.sinoViet).not.toBe('Hán-Việt');
                    expect(charDecomp.meaning, `${w.id} charDecomp.meaning`).toBeTruthy();
                    
                    if (charDecomp.strokes !== undefined) {
                        expect(charDecomp.strokes).toBeGreaterThan(0);
                    }
                    if (charDecomp.radical !== undefined) {
                        expect(charDecomp.radical).toBeTruthy();
                    }
                }
            }
        });

        it('verifies all 80 curriculum word IDs exist directly in etymologyMap', () => {
            for (const w of allWords) {
                expect(etymologyMap[w.id], `Word ${w.id} must be registered in etymologyMap`).toBeDefined();
            }
        });
    });

    describe('Dedicated B1 & B2 Target Words Verification', () => {
        const targetWords = [
            { id: 'lesson-9-word-1', hanzi: '銀行', expectedSinoViet: 'NGÂN HÀNG', level: 'B1' },
            { id: 'lesson-9-word-2', hanzi: '開戶', expectedSinoViet: 'KHAI HỘ', level: 'B1' },
            { id: 'lesson-10-word-1', hanzi: '機車', expectedSinoViet: 'CƠ XA', level: 'B1' },
            { id: 'lesson-12-word-3', hanzi: '鳳梨酥', expectedSinoViet: 'PHƯỢNG LÊ TÔ', level: 'B1' },
            { id: 'lesson-13-word-1', hanzi: '合約', expectedSinoViet: 'HỢP ƯỚC', level: 'B2' },
            { id: 'lesson-14-word-2', hanzi: '半導體', expectedSinoViet: ['BÁN ĐẠO THỂ', 'BÁN ĐẢO THỂ'], level: 'B2' },
            { id: 'lesson-15-word-1', hanzi: '報稅', expectedSinoViet: 'BÁO THUẾ', level: 'B2' },
            { id: 'lesson-16-word-1', hanzi: '演講', expectedSinoViet: 'DIỄN GIẢNG', level: 'B2' },
            { id: 'lesson-16-word-5', hanzi: '總結', expectedSinoViet: 'TỔNG KẾT', level: 'B2' }
        ];

        it.each(targetWords)(
            'verifies $level word $hanzi ($id) matches $expectedSinoViet',
            ({ id, hanzi, expectedSinoViet }) => {
                const word = allWords.find(w => w.id === id);
                expect(word).toBeDefined();
                expect(word?.hanzi).toBe(hanzi);

                const ety = getWordEtymology(id, hanzi);
                if (Array.isArray(expectedSinoViet)) {
                    expect(expectedSinoViet).toContain(ety.sinoViet);
                } else {
                    expect(ety.sinoViet).toBe(expectedSinoViet);
                }
                expect(ety.radical).toBeTruthy();
                expect(ety.radicalName).toBeTruthy();
                expect(ety.radicalName).not.toContain('Bộ Hán tự Phồn thể');
                expect(ety.strokes).toBeGreaterThan(0);
                expect(ety.cognateTip.length).toBeGreaterThan(0);

                expect(ety.decomposition.length).toBeGreaterThanOrEqual(1);
                for (const d of ety.decomposition) {
                    expect(d.char).toBeTruthy();
                    expect(d.meaning).toBeTruthy();
                    expect(d.sinoViet).toBeTruthy();
                    expect(d.sinoViet).not.toBe('Hán-Việt');
                    if (d.strokes !== undefined) {
                        expect(d.strokes).toBeGreaterThan(0);
                    }
                }
            }
        );
    });

    describe('Starter Decks Integrity', () => {
        it('has exactly 6 starter decks with non-empty wordIds existing in allWords', () => {
            expect(STARTER_DECKS).toHaveLength(6);
            const allWordIdSet = new Set(allWords.map(w => w.id));

            for (const deck of STARTER_DECKS) {
                expect(deck.id).toBeTruthy();
                expect(deck.wordIds.length).toBeGreaterThan(0);
                for (const wordId of deck.wordIds) {
                    expect(
                        allWordIdSet.has(wordId),
                        `Word ${wordId} in deck ${deck.id} must exist in allWords`
                    ).toBe(true);
                }
            }
        });

        it('includes TOCFL B1 and B2 starter decks with 20 words each', () => {
            const b1Deck = STARTER_DECKS.find(d => d.id === 'deck-tocfl-b1');
            const b2Deck = STARTER_DECKS.find(d => d.id === 'deck-tocfl-b2');

            expect(b1Deck).toBeDefined();
            expect(b1Deck?.wordIds).toHaveLength(20);
            expect(b1Deck?.wordIds[0]).toBe('lesson-9-word-1');
            expect(b1Deck?.wordIds[19]).toBe('lesson-12-word-5');

            expect(b2Deck).toBeDefined();
            expect(b2Deck?.wordIds).toHaveLength(20);
            expect(b2Deck?.wordIds[0]).toBe('lesson-13-word-1');
            expect(b2Deck?.wordIds[19]).toBe('lesson-16-word-5');
        });
    });

    describe('Branching Scenarios Integrity', () => {
        it('has 6 scenarios including real-world Taiwan situations', () => {
            expect(scenarios).toHaveLength(6);
            const expectedIds = ['tea', 'mrt', 'store', 'bank', 'clinic', 'interview'];
            const scenarioIds = scenarios.map(s => s.id);
            expect(scenarioIds).toEqual(expectedIds);
        });

        it('verifies all 6 scenarios have valid start nodes, choice transitions, and reachable end nodes', () => {
            for (const s of scenarios) {
                // start node exists
                expect(s.nodes[s.start], `Scenario ${s.id} start node '${s.start}' must exist`).toBeDefined();

                // all choices point to valid nodes
                let hasEndNode = false;
                for (const [nodeId, node] of Object.entries(s.nodes)) {
                    if (node.end) {
                        hasEndNode = true;
                        expect(node.choices).toHaveLength(0);
                    }
                    for (const choice of node.choices) {
                        expect(
                            s.nodes[choice.next],
                            `In scenario ${s.id}, node ${nodeId} choice next '${choice.next}' must exist`
                        ).toBeDefined();
                    }
                }
                expect(hasEndNode, `Scenario ${s.id} must have at least one terminal node with end: true`).toBe(true);
            }
        });

        it('specifically validates B1-B2 scenarios bank, clinic, and interview reach done node', () => {
            for (const scenarioId of ['bank', 'clinic', 'interview']) {
                const s = scenarios.find(item => item.id === scenarioId);
                expect(s).toBeDefined();
                expect(s?.nodes['start']).toBeDefined();
                expect(s?.nodes['clarify']).toBeDefined();
                expect(s?.nodes['follow']).toBeDefined();
                expect(s?.nodes['done']).toBeDefined();
                expect(s?.nodes['done'].end).toBe(true);
                expect(s?.nodes['done'].choices).toHaveLength(0);

                // Validate start node has choices
                expect(s?.nodes['start'].choices.length).toBeGreaterThanOrEqual(2);
            }
        });
    });
});
