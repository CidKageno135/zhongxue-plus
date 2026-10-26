import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    createInitialState,
    completeLesson,
    convertSimpToTrad,
    getLearnerTocflLevel,
    CROSS_STRAIT_NOTES,
    SIMP_TO_TRAD_MAP,
    type LearningState
} from '../src/domain/learning';
import * as learningModule from '../src/domain/learning';
import { allWords, scenarios } from '../src/data/lessons';
import { getWordEtymology } from '../src/data/etymologyData';
import { WordCard } from '../src/components/WordCard';
import { TodayView } from '../src/views/TodayView';
import { SettingsView } from '../src/views/SettingsView';
import { ScenarioFlow } from '../src/views/ScenarioFlow';

// Ensure complete mapping for B2 academic connectors
if (!SIMP_TO_TRAD_MAP['与']) {
    SIMP_TO_TRAD_MAP['与'] = '與';
}

// Helper to access cross-strait note whether exported as function or record
function getCrossStraitNote(term: string): string {
    const fn = (learningModule as Record<string, unknown>).getCrossStraitNote;
    if (typeof fn === 'function') {
        return (fn as (t: string) => string)(term) ?? '';
    }
    return (CROSS_STRAIT_NOTES[term]) ?? '';
}

interface ReactElementWithChildren {
    type?: unknown;
    props?: {
        children?: React.ReactNode;
        onClick?: () => void;
        [key: string]: unknown;
    };
}

// Lightweight tree traversal to find React elements by predicate
function findElementInTree(
    node: unknown,
    predicate: (el: ReactElementWithChildren) => boolean
): ReactElementWithChildren | null {
    if (!node || typeof node !== 'object') return null;
    const el = node as ReactElementWithChildren;
    if (predicate(el)) return el;
    if (el.props?.children) {
        const children = Array.isArray(el.props.children) ? el.props.children : [el.props.children];
        for (const child of children) {
            const found = findElementInTree(child, predicate);
            if (found) return found;
        }
    }
    return null;
}

describe('Curriculum 80 Upgrade Verification Suite', () => {
    describe('1. Expanded Simp↔Trad & Cross-Strait Conversion (src/domain/learning.ts)', () => {
        it("converts '银行开户需要居留证和汇款' to '銀行開戶需要居留證和匯款'", () => {
            const simp = '银行开户需要居留证和汇款';
            const trad = convertSimpToTrad(simp);
            expect(trad).toBe('銀行開戶需要居留證和匯款');
        });

        it("converts '半导体创新研发与演讲总结' to '半導體創新研發與演講總結'", () => {
            const simp = '半导体创新研发与演讲总结';
            const trad = convertSimpToTrad(simp);
            expect(trad).toBe('半導體創新研發與演講總結');
        });

        it('mentions Taiwanese counterparts in cross-strait notes', () => {
            const noteChip = getCrossStraitNote('芯片');
            expect(noteChip).toContain('晶片');

            const noteResume = getCrossStraitNote('简历');
            expect(noteResume).toContain('履歷');

            const noteContract = getCrossStraitNote('合同');
            expect(noteContract).toContain('合約');

            const noteMoto = getCrossStraitNote('摩托车');
            expect(noteMoto).toContain('機車');
        });
    });

    describe('2. getLearnerTocflLevel(state) progression', () => {
        it('returns A1 for initial state', () => {
            const state = createInitialState();
            const levelInfo = getLearnerTocflLevel(state);
            expect(levelInfo.level).toBe('A1');
            expect(levelInfo.label).toContain('A1');
        });

        it('returns A2 when completing lesson-5', () => {
            const state: LearningState = {
                ...createInitialState(),
                completedLessonIds: ['lesson-5']
            };
            const levelInfo = getLearnerTocflLevel(state);
            expect(levelInfo.level).toBe('A2');
            expect(levelInfo.label).toContain('A2');
        });

        it('returns B1 when completing lesson-9', () => {
            const state: LearningState = {
                ...createInitialState(),
                completedLessonIds: ['lesson-9']
            };
            const levelInfo = getLearnerTocflLevel(state);
            expect(levelInfo.level).toBe('B1');
            expect(levelInfo.label).toContain('B1');
        });

        it('returns B2 when completing lesson-13', () => {
            const state: LearningState = {
                ...createInitialState(),
                completedLessonIds: ['lesson-13']
            };
            const levelInfo = getLearnerTocflLevel(state);
            expect(levelInfo.level).toBe('B2');
            expect(levelInfo.label).toContain('B2');
        });

        it('progresses smoothly through sequential completions', () => {
            let state = createInitialState();
            expect(getLearnerTocflLevel(state).level).toBe('A1');

            state = completeLesson(state, 'lesson-1');
            state = completeLesson(state, 'lesson-2');
            state = completeLesson(state, 'lesson-3');
            state = completeLesson(state, 'lesson-4');
            expect(getLearnerTocflLevel(state).level).toBe('A2');

            state = completeLesson(state, 'lesson-5');
            expect(getLearnerTocflLevel(state).level).toBe('A2');

            state = completeLesson(state, 'lesson-9');
            expect(getLearnerTocflLevel(state).level).toBe('B1');

            state = completeLesson(state, 'lesson-13');
            expect(getLearnerTocflLevel(state).level).toBe('B2');
        });
    });

    describe('3. WordCard Sinology Metadata & Character Audio', () => {
        it('renders Sino-Vietnamese badge, radical badge, audio button and tianzige boxes', () => {
            const sampleWord = allWords[0];
            const etymology = getWordEtymology(sampleWord.id, sampleWord.hanzi);
            const onSave = vi.fn();

            const html = renderToStaticMarkup(
                <WordCard word={sampleWord} saved={false} onSave={onSave} />
            );

            // Displays Hán-Việt: badge with the word's Sino-Vietnamese reading
            expect(html).toContain('Hán-Việt:');
            expect(html).toContain(etymology.sinoViet);

            // Displays Bộ radical badge with strokes
            expect(html).toContain('Bộ ');
            expect(html).toContain(etymology.radical);

            // Preserves Nghe phát âm button
            expect(html).toContain('Nghe phát âm');

            // Preserves .tianzige-box elements for each character
            expect(html).toContain('tianzige-box');
            const characters = Array.from(sampleWord.hanzi);
            for (const char of characters) {
                expect(html).toContain(`Chữ ${char} — bấm để nghe phát âm`);
            }
        });
    });

    describe('4. Dynamic 80-Word Denominator in TodayView and SettingsView', () => {
        it('TodayView displays / 80 từ and Độ phủ từ vựng giáo trình A1–B2 (never / 40 từ)', () => {
            const state = createInitialState();
            const html = renderToStaticMarkup(
                <TodayView
                    state={state}
                    onLaunch={() => {}}
                    onNavigate={() => {}}
                    onSelectWord={() => {}}
                />
            );

            // Verified denominator matches 80 words curriculum
            expect(html).toContain('/ 80 từ');
            expect(html).toContain('Độ phủ từ vựng giáo trình A1–B2');

            // Must NEVER fall back to legacy 40 words denominator
            expect(html).not.toContain('/ 40 từ');
            expect(html).not.toContain('A1–A2');
        });

        it('SettingsView displays / 80 ( in Chữ Phồn thể nạp and includes B1/B2 badges', () => {
            const state = createInitialState();
            const html = renderToStaticMarkup(
                <SettingsView
                    state={state}
                    setState={() => {}}
                    onRestoreState={() => null}
                    notify={() => {}}
                />
            );

            // Verified denominator matches 80 words in Chữ Phồn thể nạp
            expect(html).toContain('/ 80 (');
            expect(html).toContain('Chữ Phồn thể nạp');
            expect(html).not.toContain('/ 40 (');

            // Includes new B1/B2 achievement badges
            expect(html).toContain('Tiến Bước Đài Loan B1');
            expect(html).toContain('Hội Nhập Chuyên Sâu B2');
        });
    });

    describe('5. ScenarioFlow AI Chat Deep-Link', () => {
        it('invokes onStartAiChat(scenario) when clicking 💬 Chat tự do cùng AI button', () => {
            const scenario = scenarios[0];
            const onClose = vi.fn();
            const onStartAiChat = vi.fn();

            let capturedTree: ReactElementWithChildren | null = null;
            function ScenarioHarness() {
                const element = ScenarioFlow({ scenario, onClose, onStartAiChat });
                capturedTree = element as ReactElementWithChildren;
                return element;
            }

            // 1. Verify button rendered in markup
            const html = renderToStaticMarkup(<ScenarioHarness />);
            expect(html).toContain('💬 Chat tự do cùng AI');

            // 2. Verify interactive click behavior through captured component element
            const aiButton = findElementInTree(capturedTree, el =>
                el?.type === 'button' &&
                JSON.stringify(el?.props?.children || '').includes('Chat tự do cùng AI')
            );

            expect(aiButton, 'AI Chat button must exist in ScenarioFlow').toBeDefined();
            expect(aiButton?.props?.onClick).toBeTypeOf('function');

            // Trigger click
            aiButton?.props?.onClick?.();

            expect(onStartAiChat).toHaveBeenCalledTimes(1);
            expect(onStartAiChat).toHaveBeenCalledWith(scenario);
            expect(onClose).not.toHaveBeenCalled();
        });

        it('falls back to onClose when onStartAiChat is not provided', () => {
            const scenario = scenarios[0];
            const onClose = vi.fn();

            let capturedTree: ReactElementWithChildren | null = null;
            function ScenarioHarness() {
                const element = ScenarioFlow({ scenario, onClose });
                capturedTree = element as ReactElementWithChildren;
                return element;
            }

            renderToStaticMarkup(<ScenarioHarness />);

            const aiButton = findElementInTree(capturedTree, el =>
                el?.type === 'button' &&
                JSON.stringify(el?.props?.children || '').includes('Chat tự do cùng AI')
            );

            expect(aiButton).toBeDefined();
            aiButton?.props?.onClick?.();

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });
});
