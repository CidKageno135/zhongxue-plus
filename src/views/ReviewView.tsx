import { useState, useEffect, useCallback } from 'react';
import { Clock, Layers, PlusCircle, CheckCircle2 } from 'lucide-react';
import type { LearningState } from '../domain/learning';
import { getDueWords, getSrsBreakdown, computeEaseFactor } from '../domain/learning';
import { getWordEtymology, STARTER_DECKS } from '../data/etymologyData';
import { SpeakButton } from '../components/SpeakButton';
import { speakChinese } from '../services/speech';

interface ReviewViewProps {
    state: LearningState;
    onReview: (id: string, rating: 'again' | 'hard' | 'good' | 'easy') => void;
    onDictionary: () => void;
    onSaveWords?: (ids: string[]) => void;
    onNotice?: (msg: string) => void;
}

export function ReviewView({ state, onReview, onDictionary, onSaveWords, onNotice }: ReviewViewProps) {
    const [revealed, setRevealed] = useState(false);
    const [reviewed, setReviewed] = useState(0);
    const [sessionDone, setSessionDone] = useState<string[]>([]);

    const remainingDue = getDueWords(state);
    const due = remainingDue.filter(w => !sessionDone.includes(w.id));
    const word = due[0];
    const srsStats = getSrsBreakdown(state);

    const [initialDueCount] = useState(() => Math.max(due.length, 1));
    const totalInSession = Math.max(initialDueCount, sessionDone.length + due.length, reviewed + due.length, 1);

    const characters = word ? Array.from(word.hanzi) : [];
    const etymology = word ? getWordEtymology(word.id, word.hanzi) : null;
    const currentEase = word ? computeEaseFactor(state.reviews[word.id]) : 2.5;

    const handleRate = useCallback(
        (rating: 'again' | 'hard' | 'good' | 'easy') => {
            if (!word) return;
            onReview(word.id, rating);
            setSessionDone(ids => [...ids, word.id]);
            setRevealed(false);
            setReviewed(n => n + 1);
        },
        [word, onReview]
    );

    useEffect(() => {
        if (!word) return;
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable)
            ) {
                return;
            }

            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                if (!revealed) {
                    setRevealed(true);
                } else {
                    handleRate('good');
                }
                return;
            }

            if ((e.key === 'r' || e.key === 'R') && word) {
                e.preventDefault();
                speakChinese(word.hanzi, { rate: 0.9 });
                return;
            }

            if (revealed) {
                if (e.key === '1') {
                    e.preventDefault();
                    handleRate('again');
                } else if (e.key === '2') {
                    e.preventDefault();
                    handleRate('hard');
                } else if (e.key === '3') {
                    e.preventDefault();
                    handleRate('good');
                } else if (e.key === '4') {
                    e.preventDefault();
                    handleRate('easy');
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [word, revealed, handleRate]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Academic Context Ribbon */}
            <div className="bento-card" style={{ padding: '20px 24px', background: 'var(--ivory-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="badge-pill badge-vermilion">生詞複習</span>
                            <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Thuật toán SuperMemo SM-2 & Âm vị học Đài ngữ
                            </span>
                        </div>
                        <h1 style={{ margin: 0 }}>
                            Thẻ Ghi Nhớ SRS • Spaced Repetition <span style={{ fontSize: '20px', fontWeight: 400, color: 'var(--on-surface-variant)' }}>· Lặp lại ngắt quãng thông minh</span>
                        </h1>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                            Tối ưu hóa khả năng ghi nhớ chữ Hán Phồn thể trọn đời bằng thuật toán SM-2 kết hợp cầu nối quy luật chuyển âm Pinyin ➔ Hán-Việt.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '10px', background: 'var(--surface-container-low)', border: '1px solid var(--border-strong)', fontSize: '12px' }}>
                            <Layers size={16} color="var(--primary)" />
                            <span style={{ color: 'var(--on-surface-variant)' }}>Bộ thẻ hiện tại:</span>
                            <strong style={{ color: 'var(--on-surface)' }}>{due.length} từ đến lịch ôn</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main 2-Column Bento Workspace */}
            <div className="bento-grid">
                {/* LEFT COLUMN (8 cols): Core Flashcard Flip View & SM-2 Rating Bar */}
                <section className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Study Session Progress Bar */}
                    <div className="bento-card" style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary-container)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700 }}>
                                    {reviewed + 1}
                                </span>
                                <strong>Tiến độ phiên học: Thẻ {Math.min(reviewed + 1, totalInSession)} / {totalInSession}</strong>
                                <span className="badge-pill badge-jade">{due.length} từ đến lịch ôn</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--on-surface-variant)', fontSize: '12px' }}>
                                <Clock size={14} />
                                <span>Thời gian ước tính: ~{Math.max(1, Math.ceil(due.length * 0.5))} phút</span>
                            </div>
                        </div>

                        <div style={{ width: '100%', height: '8px', borderRadius: '9999px', background: 'var(--surface-container)', overflow: 'hidden' }}>
                            <div
                                style={{
                                    height: '100%',
                                    width: `${Math.min(100, (reviewed / totalInSession) * 100)}%`,
                                    background: 'linear-gradient(90deg, var(--primary-container), var(--cognate-gold), var(--jade-emerald))',
                                    borderRadius: '9999px',
                                    transition: 'width 0.3s'
                                }}
                            />
                        </div>
                    </div>

                    {/* Interactive Flashcard Container */}
                    {word ? (
                        <div className="bento-card review-card" style={{ padding: 0 }}>
                            {/* Card Utility Strip */}
                            <div style={{ padding: '12px 20px', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="badge-pill badge-vermilion">
                                        SRS Stage: {(state.reviews[word.id]?.repetitions ?? 0) >= 3 ? 'Đã vững' : 'Đang củng cố'}
                                    </span>
                                    <span className="badge-pill badge-gold">TOCFL A1-A2</span>
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                                    Lần ôn thứ {(state.reviews[word.id]?.repetitions ?? 0) + 1}
                                </span>
                            </div>

                            {/* Flashcard Body */}
                            <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
                                {/* Front Face: Hanzi in Tianzige */}
                                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    {characters.map((char, idx) => (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                            <div className="tianzige-box" style={{ width: '120px', height: '120px' }}>
                                                <div className="tianzige-crosshair-h" />
                                                <div className="tianzige-crosshair-v" />
                                                <svg className="tianzige-diagonals" viewBox="0 0 100 100">
                                                    <line x1="0" y1="0" x2="100" y2="100" strokeWidth="1" strokeDasharray="2,2" />
                                                    <line x1="100" y1="0" x2="0" y2="100" strokeWidth="1" strokeDasharray="2,2" />
                                                </svg>
                                                <span className="tianzige-glyph" style={{ fontSize: '64px' }}>{char}</span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                                                {idx === 0 && etymology ? `Bộ ${etymology.radical} (${etymology.strokes} nét)` : 'Chữ Phồn thể'}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <h2 lang="zh-TW" className="review-hanzi" style={{ margin: '4px 0 0', fontSize: '32px', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em' }}>
                                    {word.hanzi}
                                </h2>

                                {/* Audio Trigger */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-container)', padding: '6px 14px', borderRadius: '9999px', fontSize: '13px' }}>
                                        <SpeakButton text={word.hanzi} />
                                        <span style={{ fontWeight: 600 }}>Phát âm chuẩn Đài Loan</span>
                                    </div>
                                </div>

                                {/* Back Face Details (Revealed) */}
                                {revealed ? (
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--surface-container-low)', padding: '20px', borderRadius: '12px', textAlign: 'left', marginTop: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--tone-1)' }}>{word.pinyin}</span>
                                                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 0 14px' }}>{word.meaning}</h3>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                {etymology && (
                                                    <span className="badge-pill badge-gold">Hán-Việt: {etymology.sinoViet}</span>
                                                )}
                                                <span className="badge-pill badge-neutral">Phồn thể</span>
                                            </div>
                                        </div>

                                        {/* Bilingual Context Example */}
                                        <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#ffffff', border: '1px solid var(--border-strong)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', margin: 0, fontWeight: 600 }}>
                                                    {word.example}
                                                </p>
                                                <SpeakButton text={word.example} />
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--tone-1)', marginTop: '4px' }}>
                                                {word.examplePinyin}
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                                                {word.exampleMeaning}
                                            </div>
                                        </div>

                                        {/* Cultural / Sino-Vietnamese Tip */}
                                        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--gold-tint)', border: '1px solid rgba(217, 119, 6, 0.25)', fontSize: '12px', color: 'var(--on-surface)' }}>
                                            <strong style={{ color: 'var(--cognate-gold)' }}>Mẹo ghi nhớ từ nguyên:</strong>{' '}
                                            {etymology ? etymology.cognateTip : 'Đối chiếu âm Pinyin với âm Hán-Việt tương ứng giúp bạn phản xạ từ vựng tự nhiên và nhớ lâu hơn gấp 3 lần.'}
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className="bento-btn-primary"
                                        style={{ padding: '12px 36px', fontSize: '15px' }}
                                        onClick={() => setRevealed(true)}
                                    >
                                        Hiện đáp án
                                    </button>
                                )}
                            </div>

                            {/* Flip Action Hint Strip */}
                            <div style={{ padding: '8px 20px', background: 'var(--surface-container-low)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                                <span>Nhấp Hiện đáp án hoặc nhấn Space (sau đó phím 1-4)</span>
                                <span>Hệ số dễ dàng (E-Factor): {currentEase.toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bento-card" style={{ padding: '40px 24px', textAlign: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                            <h2>
                                {remainingDue.length
                                    ? `${remainingDue.length} từ cần ôn lại hôm nay`
                                    : reviewed
                                    ? 'Bạn đã ôn xong hôm nay!'
                                    : 'Chưa có từ đến lịch ôn'}
                            </h2>
                            <p style={{ color: 'var(--on-surface-variant)', fontSize: '13px', maxWidth: '420px', margin: '0 0 20px' }}>
                                {remainingDue.length
                                    ? `${remainingDue.length} từ cần ôn lại hôm nay. Hãy tiếp tục củng cố nhé.`
                                    : 'Bạn đã ôn xong hôm nay! Lưu thêm từ trong các bài học hoặc chọn một bộ thẻ Starter Deck bên dưới để mở rộng bộ thẻ nhớ.'}
                            </p>
                            {remainingDue.length > 0 && (
                                <button
                                    type="button"
                                    className="bento-btn-primary"
                                    onClick={() => {
                                        setSessionDone([]);
                                        setRevealed(false);
                                    }}
                                    style={{ marginBottom: '12px' }}
                                >
                                    Ôn lại các từ chưa nhớ
                                </button>
                            )}
                            <button
                                type="button"
                                className="bento-btn-secondary"
                                onClick={onDictionary}
                            >
                                Khám phá từ điển →
                            </button>
                        </div>
                    )}

                    {/* SM-2 Algorithm 4-Option Evaluation Control Bar */}
                    {word && revealed && (
                        <div className="bento-card" style={{ padding: '18px 20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <strong style={{ fontSize: '13px' }}>Đánh giá mức độ ghi nhớ theo thuật toán SM-2:</strong>
                                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Chọn mức độ hoặc nhấn phím [1] – [4]</span>
                            </div>
                            <div className="sm2-rating-grid">
                                <button
                                    type="button"
                                    className="sm2-btn sm2-btn-again"
                                    onClick={() => handleRate('again')}
                                >
                                    <strong>Cần học lại (Quên [1])</strong>
                                    <span>&lt; 10 phút (Hôm nay)</span>
                                </button>
                                <button
                                    type="button"
                                    className="sm2-btn sm2-btn-hard"
                                    onClick={() => handleRate('hard')}
                                >
                                    <strong>Khó khăn (Khó [2])</strong>
                                    <span>~1-2 ngày</span>
                                </button>
                                <button
                                    type="button"
                                    className="sm2-btn sm2-btn-good"
                                    onClick={() => handleRate('good')}
                                >
                                    <strong>Nhớ được (Tốt [3] / Space)</strong>
                                    <span>~{Math.max(1, Math.round((state.reviews[word?.id || '']?.interval || 1) * currentEase))} ngày</span>
                                </button>
                                <button
                                    type="button"
                                    className="sm2-btn sm2-btn-easy"
                                    onClick={() => handleRate('easy')}
                                >
                                    <strong>Rất dễ (Dễ [4])</strong>
                                    <span>~{Math.max(4, Math.round((state.reviews[word?.id || '']?.interval || 1) * currentEase * 1.3))} ngày</span>
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* RIGHT COLUMN (4 cols): Supporting Widgets */}
                <aside className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Widget 1: Daily SRS Queue Stats */}
                    <div className="bento-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>donut_large</span>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>Thống kê SRS hôm nay</h3>
                            </div>
                            <span className="badge-pill badge-neutral">{srsStats.total} Thẻ</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                            <div style={{ padding: '10px 6px', borderRadius: '8px', background: 'var(--vermilion-tint)' }}>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--vermilion-cinnabar)' }}>{due.length}</div>
                                <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Cần ôn</div>
                            </div>
                            <div style={{ padding: '10px 6px', borderRadius: '8px', background: 'var(--jade-tint)' }}>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--jade-emerald)' }}>{srsStats.review}</div>
                                <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Đã vững</div>
                            </div>
                            <div style={{ padding: '10px 6px', borderRadius: '8px', background: 'var(--gold-tint)' }}>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--cognate-gold)' }}>{srsStats.learning + srsStats.newCount}</div>
                                <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Đang học</div>
                            </div>
                        </div>
                    </div>

                    {/* Widget 2: Ebbinghaus Forgetting Curve Interactive Forecast Chart */}
                    <div className="bento-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-symbols-outlined" style={{ color: 'var(--cognate-gold)', fontSize: '20px' }}>trending_up</span>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>Đường cong Quên lãng</h3>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>H. Ebbinghaus</span>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', margin: '0 0 10px' }}>
                            Mỗi lần ôn ngắt quãng SM-2 sẽ nâng đỉnh hồi tưởng lên 100%, kéo dài thời gian lưu giữ trong trí nhớ dài hạn.
                        </p>

                        <div style={{ background: 'var(--surface-container-low)', borderRadius: '10px', padding: '12px' }}>
                            <svg viewBox="0 0 280 80" style={{ width: '100%', height: '70px', overflow: 'visible' }}>
                                <line x1="0" y1="20" x2="280" y2="20" stroke="var(--border-strong)" strokeDasharray="2,2" strokeWidth="1" />
                                <line x1="0" y1="50" x2="280" y2="50" stroke="var(--border-strong)" strokeDasharray="2,2" strokeWidth="1" />
                                {/* Decay curve */}
                                <path d="M 10 20 Q 30 70, 270 75" fill="none" stroke="var(--vermilion-cinnabar)" strokeDasharray="3,3" strokeWidth="1.5" opacity="0.4" />
                                {/* Spaced repetition jumps */}
                                <path d="M 10 20 Q 30 40, 45 48 L 45 20 Q 75 38, 110 44 L 110 20 Q 160 32, 200 36 L 200 20 Q 240 24, 270 26" fill="none" stroke="var(--jade-emerald)" strokeWidth="2.5" strokeLinecap="round" />
                                <circle cx="10" cy="20" r="3" fill="var(--vermilion-cinnabar)" />
                                <circle cx="45" cy="20" r="3" fill="var(--jade-emerald)" />
                                <circle cx="110" cy="20" r="3" fill="var(--jade-emerald)" />
                                <circle cx="200" cy="20" r="3" fill="var(--jade-emerald)" />
                            </svg>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                                <span>1 ngày</span>
                                <span>3 ngày</span>
                                <span>7 ngày</span>
                                <span>Vĩnh viễn</span>
                            </div>
                        </div>
                    </div>

                    {/* Widget 3: Rapid Hotkeys */}
                    <div className="bento-card" style={{ background: 'var(--surface-container-low)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '12px' }}>Phím tắt ôn nhanh</strong>
                            <span className="badge-pill badge-neutral">Pro Mode</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                            <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#fff', border: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Lật thẻ</span>
                                <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'var(--surface-container)', fontSize: '10px' }}>Space</kbd>
                            </div>
                            <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#fff', border: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Đánh giá</span>
                                <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'var(--surface-container)', fontSize: '10px' }}>1-4</kbd>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Bottom Starter Decks Collection */}
            <div style={{ marginTop: '16px' }}>
                <div style={{ marginBottom: '14px' }}>
                    <span className="badge-pill badge-vermilion" style={{ marginBottom: '6px' }}>Kho ngữ liệu Phồn thể</span>
                    <h2 style={{ margin: '4px 0' }}>Bộ Sưu Tập Thẻ Starter Decks Đài Loan</h2>
                </div>

                <div className="bento-grid">
                    {STARTER_DECKS.map(deck => {
                        const savedCount = deck.wordIds.filter(id => state.savedWordIds.includes(id)).length;
                        const isFullyAdded = savedCount === deck.wordIds.length;
                        const masteryPct = Math.round((savedCount / deck.wordIds.length) * 100);
                        return (
                            <div key={deck.id} className="col-span-3 bento-card" style={{ justifyContent: 'space-between' }}>
                                <div>
                                    <span className={`badge-pill ${deck.badgeClass}`} style={{ alignSelf: 'flex-start', marginBottom: '8px' }}>
                                        {deck.badge}
                                    </span>
                                    <h4 style={{ margin: 0 }}>{deck.titleZh}</h4>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '4px' }}>
                                        {deck.titleVi}
                                    </div>
                                    <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', margin: '0 0 12px' }}>
                                        {deck.desc}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                                        {deck.wordIds.length} thẻ từ • Đã nạp {savedCount}/{deck.wordIds.length} ({masteryPct}%)
                                    </div>
                                    {onSaveWords && (
                                        <button
                                            type="button"
                                            className={isFullyAdded ? 'bento-btn-secondary' : 'bento-btn-primary'}
                                            style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '6px 10px' }}
                                            disabled={isFullyAdded}
                                            onClick={() => {
                                                onSaveWords(deck.wordIds);
                                                setSessionDone([]);
                                                onNotice?.(`Đã nạp bộ thẻ "${deck.titleVi}" (${deck.wordIds.length} từ) vào lộ trình SRS!`);
                                            }}
                                        >
                                            {isFullyAdded ? (
                                                <>
                                                    <CheckCircle2 size={14} />
                                                    <span>Đã nạp bộ thẻ</span>
                                                </>
                                            ) : (
                                                <>
                                                    <PlusCircle size={14} />
                                                    <span>Nạp bộ thẻ ({deck.wordIds.length} từ)</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
