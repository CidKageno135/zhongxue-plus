import { ArrowRight, Bot, Sparkles } from 'lucide-react';
import type { Scenario } from '../types';
import { scenarios } from '../data/lessons';
import { Button } from '../components/Button';
import { AiChatView } from './AiChatView';

interface ConversationListViewProps {
    onSelectScenario: (s: Scenario) => void;
}

export function ConversationListView({ onSelectScenario }: ConversationListViewProps) {
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <p className="eyebrow" style={{ margin: 0 }}>ĐỐI THOẠI AI THỰC CHIẾN · PHỒN THỂ ĐÀI LOAN</p>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    color: 'var(--jade-emerald)',
                    border: '1px solid rgba(5, 150, 105, 0.25)'
                }}>
                    <Bot size={13} />
                    <span>OpenRouter AI Partner</span>
                </div>
            </div>

            <h1>Một câu nói, một kết nối.</h1>
            <p className="muted">
                Luyện trò chuyện trực tiếp cùng trợ lý AI Hán ngữ chuẩn Đài Loan hoặc theo các kịch bản tình huống đời sống.
            </p>

            {/* Section 1: Live Interactive AI Conversational Partner */}
            <div style={{ margin: '20px 0 36px' }}>
                <AiChatView />
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
                        Luyện các cuộc trò chuyện theo kịch bản. Chọn câu trả lời và nhận giải thích chi tiết ngay lập tức.
                    </p>
                </div>

                <div className="scenario-grid">
                    {scenarios.map(s => (
                        <article className="panel scenario-card" key={s.id}>
                            <span className="scenario-icon">{s.icon}</span>
                            <span className="tag">{s.level} · CÓ HƯỚNG DẪN</span>
                            <h2>{s.title}</h2>
                            <p>{s.description}</p>
                            <Button onClick={() => onSelectScenario(s)}>
                                Bắt đầu hội thoại <ArrowRight size={17} />
                            </Button>
                        </article>
                    ))}
                </div>

                <p className="privacy-note" style={{ marginTop: '20px' }}>
                    <Sparkles size={16} color="var(--vermilion-cinnabar)" /> Các lựa chọn được biên soạn sẵn theo tình huống thực tế tại Đài Loan giúp bạn củng cố phản xạ trước khi trò chuyện tự do.
                </p>
            </div>
        </>
    );
}
