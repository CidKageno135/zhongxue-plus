import { useState } from 'react';
import { ArrowRight, Sparkles, MessageSquare } from 'lucide-react';
import type { Scenario } from '../types';
import { scenarios } from '../data/lessons';
import { Button } from '../components/Button';
import { AiChatView } from './AiChatView';

interface ConversationListViewProps {
    onSelectScenario: (s: Scenario) => void;
}

const SCENARIO_AI_PROMPTS: Record<string, string> = {
    tea: '老闆你好！我想點一杯珍珠奶茶，請問甜度和冰塊可以怎麼選？',
    mrt: '不好意思，請問最近的捷運站在哪裡？可以用悠遊卡搭乘嗎？',
    store: '你好！我買這些東西，不用袋子，請問可以刷卡嗎？'
};

export function ConversationListView({ onSelectScenario }: ConversationListViewProps) {
    const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);

    function startAiPractice(s: Scenario) {
        const prompt = SCENARIO_AI_PROMPTS[s.id] || `你好！我想練習「${s.title}」的情境對話。`;
        setActivePrompt(prompt);
        if (typeof document !== 'undefined') {
            document.querySelector('.ai-chat-container')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <p className="eyebrow" style={{ margin: 0 }}>ĐỐI THOẠI AI THỰC CHIẾN · PHỒN THỂ ĐÀI LOAN</p>
            </div>

            <h1>Một câu nói, một kết nối.</h1>
            <p className="muted">
                Luyện trò chuyện trực tiếp cùng trợ lý AI Hán ngữ chuẩn Đài Loan hoặc theo các kịch bản tình huống đời sống.
            </p>

            {/* Section 1: Live Interactive AI Conversational Partner */}
            <div style={{ margin: '20px 0 36px' }}>
                <AiChatView initialPrompt={activePrompt} onResetPrompt={() => setActivePrompt(undefined)} />
            </div>

            {/* Section 2: Structured Life Scenarios */}
            <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--vermilion-cinnabar)', fontSize: '20px' }}>theater_comedy</span>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>
                            Kịch bản tình huống mẫu ({scenarios.length} chủ đề)
                        </h2>
                    </div>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>
                        Luyện các cuộc trò chuyện theo kịch bản hoặc bấm "Luyện cùng AI" để đối thoại tự do theo tình huống.
                    </p>
                </div>

                <div className="scenario-grid">
                    {scenarios.map(s => (
                        <article className="panel scenario-card" key={s.id}>
                            <span className="scenario-icon">{s.icon}</span>
                            <span className="tag">{s.level} · CÓ HƯỚNG DẪN</span>
                            <h2>{s.title}</h2>
                            <p>{s.description}</p>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                                <Button onClick={() => onSelectScenario(s)}>
                                    Bắt đầu hội thoại <ArrowRight size={17} />
                                </Button>
                                <Button secondary onClick={() => startAiPractice(s)}>
                                    <MessageSquare size={16} /> Luyện cùng AI
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>

                <p className="privacy-note" style={{ marginTop: '20px' }}>
                    <Sparkles size={16} color="var(--vermilion-cinnabar)" /> Bạn có thể chọn luyện theo kịch bản có giải thích ngữ pháp hoặc trò chuyện trực tiếp không giới hạn với AI.
                </p>
            </div>
        </>
    );
}
