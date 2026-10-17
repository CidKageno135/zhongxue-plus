import { useState, useRef, useEffect } from 'react';
import { Send, Volume2, Mic, MicOff, RefreshCw, Bot } from 'lucide-react';
import { sendAiMessage, type ConversationTurn } from '../services/api';

export function AiChatView() {
    const [messages, setMessages] = useState<ConversationTurn[]>([
        {
            role: 'assistant',
            content: `中文：你好！我是你的華語 AI 學習夥伴。今天想在臺灣練習什麼情境？比如點奶茶、搭捷運或問路？\nPinyin: Nǐ hǎo! Wǒ shì nǐ de huáyǔ AI xuéxí huǒbàn. Jīntiān xiǎng zài Táiwān liànxí shénme qíngjìng? Bǐrú diǎn nǎichá, dā jiéyùn huò wènlù?\nTiếng Việt: Xin chào! Tôi là bạn đồng hành học tiếng Trung AI của bạn. Hôm nay bạn muốn luyện tập tình huống nào ở Đài Loan? Ví dụ: gọi trà sữa, đi MRT hay hỏi đường?\n練習：Gợi ý: Hãy thử chào lại bằng "你好！" hoặc chọn một câu gợi ý bên dưới để bắt đầu hội thoại nhé!`
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    function speakText(text: string) {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        
        // Extract Chinese line if formatted
        const lines = text.split('\n');
        const zhLine = lines.find(l => l.startsWith('中文：') || l.startsWith('中文:'))?.replace(/^中文[：:]\s*/, '') || lines[0];

        const u = new SpeechSynthesisUtterance(zhLine);
        u.lang = 'zh-TW';
        u.rate = 0.88;
        window.speechSynthesis.speak(u);
    }

    async function handleSend(customText?: string) {
        const textToSend = (customText || input).trim();
        if (!textToSend || loading) return;

        const newHistory: ConversationTurn[] = [...messages, { role: 'user', content: textToSend }];
        setMessages(newHistory);
        setInput('');
        setLoading(true);

        try {
            const reply = await sendAiMessage(textToSend, 1, messages);
            setMessages(prev => [...prev, { role: 'assistant', content: reply.content }]);
            speakText(reply.content);
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: '中文：不好意思，連線稍微延遲。請再試一次！\nPinyin: Bù hǎoyìsi, liánxiàn shāowéi yánchí. Qǐng zài shì yīcì!\nTiếng Việt: Rất tiếc, kết nối hơi chậm. Vui lòng thử lại câu vừa rồi nhé!'
                }
            ]);
        } finally {
            setLoading(false);
        }
    }

    function toggleVoiceInput() {
        if (typeof window === 'undefined') return;
        interface SpeechResult {
            transcript: string;
        }
        interface SpeechEvent {
            results: Array<Array<SpeechResult>>;
        }
        interface SpeechInstance {
            lang: string;
            continuous: boolean;
            interimResults: boolean;
            onstart: () => void;
            onend: () => void;
            onerror: () => void;
            onresult: (event: SpeechEvent) => void;
            start: () => void;
        }
        type SpeechCtor = new () => SpeechInstance;
        const win = window as unknown as {
            SpeechRecognition?: SpeechCtor;
            webkitSpeechRecognition?: SpeechCtor;
        };
        const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

        if (!SpeechRec) {
            alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói trực tiếp. Hãy nhập văn bản bằng bàn phím nhé!');
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRec();
            recognition.lang = 'zh-TW';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = () => setIsListening(false);
            recognition.onresult = (event: SpeechEvent) => {
                const transcript = event.results[0]?.[0]?.transcript;
                if (transcript) {
                    setInput(transcript);
                }
            };
            recognition.start();
        } catch {
            setIsListening(false);
        }
    }

    const PROMPT_SUGGESTIONS = [
        { label: '🧋 Gọi trà sữa', text: '你好！我要一杯珍珠奶茶，半糖微冰。' },
        { label: '🚇 Hỏi ga MRT', text: '請問最近的捷運站在哪裡？' },
        { label: '💰 Hỏi giá tiền', text: '老闆，這個多少錢？可以刷悠遊卡嗎？' },
        { label: '🥢 Chợ đêm', text: '請問這附近有推薦的夜市小吃嗎？' },
        { label: '👋 Chào hỏi', text: '你好！我正在學習繁體中文，請多指教。' }
    ];

    return (
        <section className="ai-chat-container panel" style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 220px)',
            minHeight: '520px',
            padding: 0,
            overflow: 'hidden',
            borderRadius: '16px',
            border: '1px solid var(--border-strong)',
            background: 'var(--ivory-surface)'
        }}>
            {/* Chat Header Bar */}
            <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'rgba(250, 250, 247, 0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--vermilion-cinnabar), #e11d48)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(200, 50, 43, 0.25)'
                    }}>
                        <Bot size={20} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>
                            Trợ lý Đối thoại AI (Hán ngữ Đài Loan)
                        </h2>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                            Tự động phản hồi bằng Phồn thể ‧ Phiên âm Pinyin ‧ Dịch nghĩa tiếng Việt ‧ Sửa lỗi ngữ pháp
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setMessages([messages[0]])}
                    className="filter-button"
                    style={{ fontSize: '12px', padding: '5px 10px', height: 'auto' }}
                    title="Bắt đầu hội thoại mới"
                >
                    <RefreshCw size={13} />
                    <span>Làm mới</span>
                </button>
            </div>

            {/* Chat Message Scroll Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                {messages.map((m, idx) => {
                    const isUser = m.role === 'user';
                    return (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                justifyContent: isUser ? 'flex-end' : 'flex-start',
                                gap: '10px',
                                maxWidth: '100%'
                            }}
                        >
                            {!isUser && (
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'var(--vermilion-cinnabar)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    flexShrink: 0
                                }}>
                                    中
                                </div>
                            )}

                            <div style={{
                                maxWidth: '82%',
                                padding: '14px 18px',
                                borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                                background: isUser
                                    ? 'var(--vermilion-cinnabar)'
                                    : 'var(--surface-container-low)',
                                color: isUser ? '#ffffff' : 'var(--on-surface)',
                                border: isUser ? 'none' : '1px solid var(--border-subtle)',
                                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                                fontSize: '14px',
                                lineHeight: '1.6'
                            }}>
                                {isUser ? (
                                    <p style={{ margin: 0, fontWeight: 500 }}>{m.content}</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {m.content.split('\n').filter(Boolean).map((line, lIdx) => {
                                            if (line.startsWith('中文：') || line.startsWith('中文:')) {
                                                const zh = line.replace(/^中文[：:]\s*/, '');
                                                return (
                                                    <div key={lIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                                        <h3 lang="zh-TW" style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--vermilion-cinnabar)' }}>
                                                            {zh}
                                                        </h3>
                                                        <button
                                                            type="button"
                                                            className="icon-button"
                                                            onClick={() => speakText(zh)}
                                                            title="Nghe phát âm chuẩn Đài Bắc"
                                                            style={{ padding: '4px' }}
                                                        >
                                                            <Volume2 size={16} />
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            if (line.startsWith('Pinyin:') || line.startsWith('Pinyin：')) {
                                                return (
                                                    <p key={lIdx} style={{ margin: 0, fontSize: '13px', color: 'var(--tone-1)', fontWeight: 500, fontFamily: 'monospace' }}>
                                                        {line}
                                                    </p>
                                                );
                                            }
                                            if (line.startsWith('Tiếng Việt:') || line.startsWith('Tiếng Việt：')) {
                                                return (
                                                    <p key={lIdx} style={{ margin: 0, fontSize: '13px', color: 'var(--on-surface)', fontWeight: 600 }}>
                                                        {line}
                                                    </p>
                                                );
                                            }
                                            if (line.startsWith('練習：') || line.startsWith('練習:') || line.startsWith('Gợi ý:')) {
                                                return (
                                                    <div key={lIdx} style={{
                                                        margin: '4px 0 0',
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(217, 119, 6, 0.08)',
                                                        border: '1px solid rgba(217, 119, 6, 0.2)',
                                                        fontSize: '12px',
                                                        color: 'var(--tone-3)'
                                                    }}>
                                                        💡 {line}
                                                    </div>
                                                );
                                            }
                                            return <p key={lIdx} style={{ margin: 0 }}>{line}</p>;
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {loading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--on-surface-variant)', fontSize: '13px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--vermilion-cinnabar)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                            中
                        </div>
                        <span style={{ fontStyle: 'italic' }}>AI đối thoại đang soạn câu trả lời chuẩn Phồn thể... ⏳</span>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div style={{
                padding: '8px 16px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'rgba(250, 250, 247, 0.5)',
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
            }}>
                {PROMPT_SUGGESTIONS.map((p, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(p.text)}
                        disabled={loading}
                        style={{
                            padding: '4px 12px',
                            borderRadius: '999px',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--ivory-surface)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--on-surface)',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Message Input Box */}
            <form
                onSubmit={e => {
                    e.preventDefault();
                    handleSend();
                }}
                style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--ivory-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}
            >
                <button
                    type="button"
                    onClick={toggleVoiceInput}
                    aria-label={isListening ? 'Dừng ghi âm' : 'Nói tiếng Trung bằng micro'}
                    title={isListening ? 'Đang lắng nghe... bấm để dừng' : 'Bấm để nói tiếng Trung'}
                    style={{
                        padding: '10px',
                        borderRadius: '50%',
                        border: 'none',
                        background: isListening ? '#e11d48' : 'var(--surface-container-low)',
                        color: isListening ? '#ffffff' : 'var(--on-surface-variant)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Gõ câu tiếng Trung hoặc tiếng Việt (vd: 請問捷運站在哪裡？)..."
                    disabled={loading}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '999px',
                        border: '1px solid var(--border-strong)',
                        background: 'var(--surface-container-low)',
                        fontSize: '14px',
                        color: 'var(--on-surface)',
                        outline: 'none'
                    }}
                />

                <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="button button-primary"
                    style={{
                        padding: '10px 18px',
                        borderRadius: '999px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px'
                    }}
                >
                    <span>Gửi</span>
                    <Send size={15} />
                </button>
            </form>
        </section>
    );
}
