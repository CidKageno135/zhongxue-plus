import { useState } from 'react';
import { ArrowRight, Sparkles, MessageSquare, Bot } from 'lucide-react';
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

interface ExtendedRoleplayCard {
    id: string;
    icon: string;
    title: string;
    level: string;
    category: string;
    description: string;
    samplePrompt: string;
}

const EXTENDED_ROLEPLAYS: ExtendedRoleplayCard[] = [
    {
        id: 'factory',
        icon: '🏭',
        title: 'Công xưởng & Báo hỏng máy',
        level: 'TOCFL A2/B1',
        category: 'Công xưởng TSMC',
        description: 'Báo cáo sự cố đèn đỏ máy dập với Tổ trưởng, trao đổi lịch tăng ca và quẹt thẻ chấm công.',
        samplePrompt: '組長，這台機台剛才亮紅燈警報了，請問今天晚上需要配合加班嗎？'
    },
    {
        id: 'tax',
        icon: '💰',
        title: 'Cục thuế & Cư trú 183 ngày',
        level: 'TOCFL B1',
        category: 'Thủ tục hành chính',
        description: 'Kê khai thuế thu nhập cá nhân tháng 5, kiểm tra điều kiện cư trú 183 ngày và chứng từ khấu trừ.',
        samplePrompt: '您好！我想詢問五月份綜合所得稅申報，去年在臺灣居留超過183天如何辦理退稅？'
    },
    {
        id: 'tech',
        icon: '💻',
        title: 'Bán dẫn & Phòng sạch',
        level: 'TOCFL B1/B2',
        category: 'Công nghệ cao',
        description: 'Trao đổi về wafer 3nm, quy trình quang khắc EUV, kiểm soát tỷ lệ thành phẩm (yield rate) trong vô trần thất.',
        samplePrompt: '工程師您好！這批3奈米晶圓在無塵室曝光後的良率指標如何？'
    },
    {
        id: 'scooter',
        icon: '🛵',
        title: 'Thuê xe máy & Đổ xăng 95',
        level: 'TOCFL A2',
        category: 'Giao thông',
        description: 'Thuê xe máy 600 NTD/ngày, kiểm tra bằng lái quốc tế, đổ xăng 95 tại cây xăng Trung Dầu CPC.',
        samplePrompt: '你好！我想租機車一天，我有國際駕照，請問前面有台灣中油加油站嗎？'
    },
    {
        id: 'clinic',
        icon: '🏥',
        title: 'Phòng khám & Thẻ BHYT',
        level: 'TOCFL A2',
        category: 'Y tế sức khỏe',
        description: 'Xuất trình thẻ Bảo hiểm Y tế (健保卡), miêu tả triệu chứng sốt đau họng, lấy số khám lần đầu.',
        samplePrompt: '您好，請幫我掛號，我有健保卡，從昨天開始發燒和喉嚨痛。'
    },
    {
        id: 'house',
        icon: '🏠',
        title: 'Thuê phòng trọ khép kín',
        level: 'TOCFL A2',
        category: 'Đời sống',
        description: 'Hỏi tiền thuê phòng trọ (套房), tiền cọc 2 tháng, tiền điện theo giá Đài Điện và hẹn giờ xem phòng.',
        samplePrompt: '你好！請問這間獨立套房一個月房租多少錢？離捷運站近嗎？'
    }
];

export function ConversationListView({ onSelectScenario }: ConversationListViewProps) {
    const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);

    function startAiPractice(s: Scenario) {
        const prompt = SCENARIO_AI_PROMPTS[s.id] || `你好！我想練習「${s.title}」的情境對話。`;
        setActivePrompt(prompt);
        if (typeof document !== 'undefined') {
            document.querySelector('.ai-chat-container')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function startRoleplayPractice(rp: ExtendedRoleplayCard) {
        setActivePrompt(rp.samplePrompt);
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--vermilion-cinnabar)', fontSize: '20px' }}>theater_comedy</span>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>
                            Kịch bản tình huống mẫu ({scenarios.length} chủ đề cơ bản)
                        </h2>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: 'var(--jade-tint)',
                            color: 'var(--jade-emerald)'
                        }}>
                            🟢 Sẵn sàng luyện tập
                        </span>
                    </div>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>
                        Luyện các cuộc trò chuyện phân nhánh theo kịch bản có giải thích hoặc bấm &quot;Luyện cùng AI&quot; để đối thoại tự do theo tình huống.
                    </p>
                </div>

                <div className="scenario-grid">
                    {scenarios.map(s => (
                        <article className="panel scenario-card" key={s.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                                    <span className="scenario-icon">{s.icon}</span>
                                    <span className="tag">{s.level} · CÓ HƯỚNG DẪN</span>
                                </div>
                                <h2 style={{ fontSize: '17px', margin: '4px 0 8px' }}>{s.title}</h2>
                                <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: '1.5' }}>{s.description}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
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
            </div>

            {/* Section 3: Extended Real-World Taiwan Scenarios */}
            <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Bot size={20} color="var(--vermilion-cinnabar)" />
                        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>
                            Tình huống thực tế mở rộng ({EXTENDED_ROLEPLAYS.length} chủ đề công xưởng & đời sống)
                        </h2>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: 'var(--gold-tint)',
                            color: 'var(--gold-dark, #b45309)'
                        }}>
                            ⚡ Chuẩn TOCFL Đài Loan
                        </span>
                    </div>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>
                        Các kịch bản chuyên biệt phục vụ làm việc tại khu công nghệ cao Tân Trúc, nhà máy, cơ quan thuế và đời sống tự lập tại Đài Loan.
                    </p>
                </div>

                <div className="scenario-grid">
                    {EXTENDED_ROLEPLAYS.map(rp => (
                        <article
                            className="panel scenario-card"
                            key={rp.id}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                background: 'var(--surface-container-low)',
                                border: '1px solid var(--border-subtle)'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                                    <span className="scenario-icon">{rp.icon}</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <span className="tag" style={{ background: 'var(--surface-container)' }}>{rp.level}</span>
                                        <span className="tag" style={{ background: 'var(--vermilion-tint)', color: 'var(--vermilion-cinnabar)' }}>{rp.category}</span>
                                    </div>
                                </div>
                                <h3 style={{ fontSize: '16px', margin: '4px 0 8px', fontWeight: 700, color: 'var(--on-surface)' }}>{rp.title}</h3>
                                <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: '1.5', margin: '0 0 10px' }}>{rp.description}</p>
                                <div style={{
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    background: 'var(--ivory-surface)',
                                    border: '1px dashed var(--border-strong)',
                                    fontSize: '11.5px',
                                    color: 'var(--on-surface)',
                                    fontFamily: 'var(--font-serif)',
                                    lineHeight: '1.4'
                                }}>
                                    💬 <em>&quot;{rp.samplePrompt}&quot;</em>
                                </div>
                            </div>
                            <div style={{ marginTop: '16px' }}>
                                <Button secondary onClick={() => startRoleplayPractice(rp)}>
                                    <MessageSquare size={16} /> Luyện phản xạ ngay
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
