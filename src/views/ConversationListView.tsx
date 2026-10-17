import { ArrowRight, MessageCircle } from 'lucide-react';
import type { Scenario } from '../types';
import { scenarios } from '../data/lessons';
import { Button } from '../components/Button';

interface ConversationListViewProps {
    onSelectScenario: (s: Scenario) => void;
}

export function ConversationListView({ onSelectScenario }: ConversationListViewProps) {
    return (
        <>
            <p className="eyebrow">THỬ NÓI, THỬ TỰ TIN</p>
            <h1>Một câu nói, một kết nối.</h1>
            <p className="muted">
                Luyện các cuộc trò chuyện theo kịch bản. Chọn câu trả lời và nhận giải thích ngay.
            </p>

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

            <p className="privacy-note">
                <MessageCircle size={16} /> Các lựa chọn được biên soạn sẵn để bạn luyện trong tình huống cụ thể. Không có trò chuyện AI hoặc ghi âm giọng nói.
            </p>
        </>
    );
}
