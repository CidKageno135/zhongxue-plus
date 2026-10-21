import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, RotateCcw } from 'lucide-react';
import type { Scenario } from '../types';
import { SpeakButton } from '../components/SpeakButton';
import { Button } from '../components/Button';
import { loadScenarioDraft, saveScenarioDraft, type ScenarioDraft } from '../domain/learning';

interface ScenarioFlowProps {
    scenario: Scenario;
    onClose: () => void;
}

export function ScenarioFlow({ scenario, onClose }: ScenarioFlowProps) {
    const existingDraft = loadScenarioDraft();
    const isMatchingDraft = existingDraft && existingDraft.scenarioId === scenario.id;

    const [nodeId, setNodeId] = useState<string>(() => (isMatchingDraft ? existingDraft.nodeId : scenario.start));
    const [feedback, setFeedback] = useState<string>(() => (isMatchingDraft ? existingDraft.feedback : ''));
    const [history, setHistory] = useState<{ text: string; meaning: string }[]>(() => (isMatchingDraft ? existingDraft.history : []));

    const node = scenario.nodes[nodeId] ?? scenario.nodes[scenario.start];

    // Persist draft on state changes
    useEffect(() => {
        if (node.end) {
            saveScenarioDraft(null);
            return;
        }
        const draft: ScenarioDraft = {
            scenarioId: scenario.id,
            nodeId,
            feedback,
            history
        };
        saveScenarioDraft(draft);
    }, [scenario.id, nodeId, feedback, history, node.end]);

    function handleReset() {
        setNodeId(scenario.start);
        setHistory([]);
        setFeedback('');
        saveScenarioDraft(null);
    }

    return (
        <section className="scenario-view">
            <div className="row between">
                <button type="button" className="text-button" onClick={onClose}>
                    <ArrowLeft size={17} /> Các tình huống
                </button>
                {nodeId !== scenario.start && !node.end && (
                    <button
                        type="button"
                        className="text-button"
                        onClick={handleReset}
                        title="Bắt đầu lại hội thoại"
                        aria-label="Bắt đầu lại tình huống này"
                    >
                        <RotateCcw size={14} /> Bắt đầu lại
                    </button>
                )}
            </div>

            <h1>{scenario.title}</h1>
            <p className="muted">Hội thoại có hướng dẫn · Chọn câu phù hợp để tiếp tục</p>

            <div style={{
                margin: '10px 0 16px',
                padding: '10px 16px',
                borderRadius: '10px',
                background: 'var(--vermilion-tint)',
                border: '1px solid rgba(200, 50, 43, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--on-surface)' }}>
                    <span>🤖</span>
                    <span>Bạn muốn luyện nói tự do với AI theo chủ đề <strong>{scenario.title}</strong>?</span>
                </div>
                <button
                    type="button"
                    className="button button-primary"
                    style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '999px' }}
                    onClick={onClose}
                >
                    💬 Chat tự do cùng AI
                </button>
            </div>

            <div className="conversation-panel panel">
                {history.map((line, i) => (
                    <div className="chat-history" key={i}>
                        <p lang="zh-TW">{line.text}</p>
                        <small>{line.meaning}</small>
                    </div>
                ))}

                <span className="eyebrow">{node.speaker}</span>
                <div className="row">
                    <h2 lang="zh-TW">{node.hanzi}</h2>
                    <SpeakButton text={node.hanzi} />
                </div>
                <p className="pinyin">{node.pinyin}</p>
                <p>{node.meaning}</p>

                {feedback && (
                    <div className="answer-feedback" role="status">
                        <strong>Giải thích lựa chọn vừa rồi</strong>
                        <p>{feedback}</p>
                    </div>
                )}

                {node.end ? (
                    <div className="completion">
                        <h2>Bạn đã hoàn thành tình huống!</h2>
                        <Button onClick={handleReset}>Luyện lại</Button>
                    </div>
                ) : (
                    <div className="conversation-choices">
                        {node.choices.map((choice, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => {
                                    setFeedback(choice.feedback);
                                    if (choice.correct) {
                                        setHistory(h => [
                                            ...h,
                                            { text: node.hanzi, meaning: node.meaning },
                                            { text: choice.text, meaning: choice.meaning }
                                        ]);
                                        setNodeId(choice.next);
                                    }
                                }}
                            >
                                <span lang="zh-TW">{choice.text}</span>
                                <small>{choice.pinyin}</small>
                                <span>{choice.meaning}</span>
                                <ChevronRight size={18} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
