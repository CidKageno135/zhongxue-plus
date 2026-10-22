import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Layers, PlusCircle, CheckCircle2, RotateCcw, Sparkles, BookOpen, ArrowRight, X } from 'lucide-react';
import type { LearningState } from '../domain/learning';
import { getDueWords, getSavedWords, getSrsItems, getSrsBreakdown, computeEaseFactor } from '../domain/learning';
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
    const [isReviewAhead, setIsReviewAhead] = useState(false);
    const [sessionBreakdown, setSessionBreakdown] = useState({
        again: 0,
        hard: 0,
        good: 0,
        easy: 0
    });

    const isSubmittingRef = useRef(false);

    // SRS queues from domain logic
    const remainingDue = getDueWords(state);
    const savedWords = getSavedWords(state);
    const srsItems = getSrsItems(state);
    const srsStats = getSrsBreakdown(state);

    // Active review queue depending on mode (regular due vs review ahead)
    const activeDueWords = isReviewAhead
        ? savedWords.filter(w => !sessionDone.includes(w.id))
        : remainingDue.filter(w => !sessionDone.includes(w.id));

    const word = activeDueWords[0];

    const [initialDueCount] = useState(() => Math.max(activeDueWords.length, 1));
    const totalInSession = Math.max(initialDueCount, sessionDone.length + activeDueWords.length, reviewed + activeDueWords.length, 1);
    const currentCardIndex = Math.min(reviewed + 1, totalInSession);

    const characters = word ? Array.from(word.hanzi) : [];
    const etymology = word ? getWordEtymology(word.id, word.hanzi) : null;
    const currentReview = word ? state.reviews[word.id] : undefined;
    const currentEase = word ? computeEaseFactor(currentReview) : 2.5;

    // Projected intervals matching SM-2 in learning.ts
    const oldInterval = currentReview?.interval ?? 0;
    const nextHard = oldInterval ? Math.max(2, Math.ceil(oldInterval * 1.2)) : 1;
    const nextGood = Math.max(1, oldInterval * 2);
    const nextEasy = Math.max(4, (oldInterval || 1) * 3);

    const isCustomWord = word
        ? word.lessonId === 'custom-dictionary' ||
          word.id.startsWith('dict-') ||
          word.id.startsWith('cv_') ||
          word.id.startsWith('custom-')
        : false;

    const handleRate = useCallback(
        (rating: 'again' | 'hard' | 'good' | 'easy') => {
            if (!word || isSubmittingRef.current) return;
            isSubmittingRef.current = true;
            try {
                onReview(word.id, rating);
                setSessionDone(ids => [...ids, word.id]);
                setSessionBreakdown(prev => ({
                    ...prev,
                    [rating]: prev[rating] + 1
                }));
                setRevealed(false);
                setReviewed(n => n + 1);
            } finally {
                // Short lock to prevent accidental double-submitting from rapid keystrokes or key repeat
                setTimeout(() => {
                    isSubmittingRef.current = false;
                }, 180);
            }
        },
        [word, onReview]
    );

    // Robust Keyboard Shortcuts with multi-layer safeguards
    useEffect(() => {
        if (!word) return;

        const onKeyDown = (e: KeyboardEvent) => {
            // Guard 1: Prevent duplicate triggering from holding down a key (key repeat)
            if (e.repeat) return;

            // Guard 2: Never trigger keyboard shortcuts when user is typing in inputs or editable elements
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable ||
                    Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"], [role="searchbox"]')))
            ) {
                return;
            }

            const active = document.activeElement as HTMLElement | null;
            if (
                active &&
                (active.tagName === 'INPUT' ||
                    active.tagName === 'TEXTAREA' ||
                    active.tagName === 'SELECT' ||
                    active.isContentEditable ||
                    Boolean(active.closest('input, textarea, select, [contenteditable="true"], [role="textbox"], [role="searchbox"]')))
            ) {
                return;
            }

            // Guard 3: Never trigger keyboard shortcuts when any modal dialog is open (e.g. HandwritingPad)
            const hasOpenModal = Boolean(
                document.querySelector('dialog[open], [role="dialog"], [aria-modal="true"], .modal-backdrop')
            );
            if (hasOpenModal || Boolean(target?.closest('dialog, [role="dialog"], [aria-modal="true"]'))) {
                return;
            }

            // Audio pronunciation shortcut: R / r
            if ((e.key === 'r' || e.key === 'R') && word) {
                e.preventDefault();
                speakChinese(word.hanzi, { rate: 0.9 });
                return;
            }

            // Space: Flip card if unrevealed; grade 'good' if revealed
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                if (!revealed) {
                    setRevealed(true);
                } else {
                    handleRate('good');
                }
                return;
            }

            // Number keys 1, 2, 3, 4: ONLY active after the card is flipped!
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '100%', boxSizing: 'border-box' }}>
            {/* Top Academic Context Ribbon */}
            <div className="bento-card" style={{ padding: '16px 20px', background: 'var(--ivory-surface)', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: '1 1 280px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="badge-pill badge-vermilion">生詞複習</span>
                            {isReviewAhead && (
                                <span className="badge-pill badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Sparkles size={12} />
                                    Chế độ ôn trước lịch
                                </span>
                            )}
                            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Thuật toán SuperMemo SM-2 & Âm vị học Đài ngữ
                            </span>
                        </div>
                        <h1 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 26px)', lineHeight: 1.25 }}>
                            Thẻ Ghi Nhớ SRS • Spaced Repetition <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--on-surface-variant)' }}>· Lặp lại ngắt quãng thông minh</span>
                        </h1>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>
                            Tối ưu hóa khả năng ghi nhớ chữ Hán Phồn thể trọn đời bằng thuật toán SM-2 kết hợp cầu nối quy luật chuyển âm Pinyin ➔ Hán-Việt.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '10px', background: 'var(--surface-container-low)', border: '1px solid var(--border-strong)', fontSize: '12px' }}>
                            <Layers size={16} color="var(--primary)" />
                            <span style={{ color: 'var(--on-surface-variant)' }}>Bộ thẻ hiện tại:</span>
                            <strong style={{ color: 'var(--on-surface)' }}>{activeDueWords.length} từ đến lịch ôn</strong>
                        </div>
                        {isReviewAhead && (
                            <button
                                type="button"
                                className="button secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', height: '32px' }}
                                onClick={() => {
                                    setIsReviewAhead(false);
                                    setSessionDone([]);
                                    setRevealed(false);
                                }}
                            >
                                <X size={14} />
                                <span>Thoát ôn trước</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main 2-Column Bento Workspace */}
            <div className="bento-grid" style={{ width: '100%', boxSizing: 'border-box' }}>
                {/* LEFT COLUMN (8 cols): Core Flashcard Flip View & SM-2 Rating Bar */}
                <section className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
                    {/* Study Session Progress Bar */}
                    <div className="bento-card" style={{ padding: '14px 18px', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary-container)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700 }}>
                                    {currentCardIndex}
                                </span>
                                <strong>Tiến độ phiên học: Thẻ {currentCardIndex} / {totalInSession}</strong>
                                <span className="badge-pill badge-jade">{activeDueWords.length} từ đến lịch ôn</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--on-surface-variant)', fontSize: '12px' }}>
                                <Clock size={14} />
                                <span>Thời gian ước tính: ~{Math.max(1, Math.ceil(activeDueWords.length * 0.5))} phút</span>
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
                        <div className="bento-card review-card" style={{ padding: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
                            {/* Card Utility Strip with Accurate SRS Interval & Due Date info */}
                            <div style={{ padding: '12px 18px', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span className="badge-pill badge-vermilion">
                                        SRS Stage: {!currentReview ? 'Thẻ mới' : currentReview.repetitions >= 3 ? 'Đã vững' : 'Đang củng cố'}
                                    </span>
                                    <span className="badge-pill badge-gold">
                                        {isCustomWord ? (word.category || 'Sổ tay từ điển') : 'TOCFL A1-A2'}
                                    </span>
                                    {currentReview ? (
                                        <span className="badge-pill badge-neutral" title={`Lần ôn trước: ${currentReview.lastReviewed}`}>
                                            Chu kỳ: {currentReview.interval} ngày
                                        </span>
                                    ) : (
                                        <span className="badge-pill badge-neutral">Chưa ôn lần nào</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--on-surface-variant)', flexWrap: 'wrap' }}>
                                    {currentReview?.dueDate && (
                                        <span>Hạn ôn: <strong style={{ color: 'var(--on-surface)' }}>{currentReview.dueDate}</strong></span>
                                    )}
                                    <span>Lần ôn thứ {(currentReview?.repetitions ?? 0) + 1}</span>
                                </div>
                            </div>

                            {/* Flashcard Body */}
                            <div style={{ padding: '28px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '18px', boxSizing: 'border-box', width: '100%' }}>
                                {/* Front Face: Hanzi in Tianzige */}
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '100%' }}>
                                    {characters.map((char, idx) => (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                            <div
                                                className="tianzige-box"
                                                style={{
                                                    width: 'clamp(88px, 24vw, 120px)',
                                                    height: 'clamp(88px, 24vw, 120px)'
                                                }}
                                            >
                                                <div className="tianzige-crosshair-h" />
                                                <div className="tianzige-crosshair-v" />
                                                <svg className="tianzige-diagonals" viewBox="0 0 100 100">
                                                    <line x1="0" y1="0" x2="100" y2="100" strokeWidth="1" strokeDasharray="2,2" />
                                                    <line x1="100" y1="0" x2="0" y2="100" strokeWidth="1" strokeDasharray="2,2" />
                                                </svg>
                                                <span
                                                    className="tianzige-glyph"
                                                    style={{ fontSize: 'clamp(44px, 12vw, 64px)' }}
                                                >
                                                    {char}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                                                {idx === 0 && etymology ? `Bộ ${etymology.radical} (${etymology.strokes} nét)` : 'Chữ Phồn thể'}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <h2
                                    lang="zh-TW"
                                    className="review-hanzi"
                                    style={{ margin: '4px 0 0', fontSize: 'clamp(24px, 6vw, 32px)', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em', wordBreak: 'break-word' }}
                                >
                                    {word.hanzi}
                                </h2>

                                {/* Audio Trigger */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-container)', padding: '6px 14px', borderRadius: '9999px', fontSize: '13px' }}>
                                        <SpeakButton text={word.hanzi} />
                                        <span style={{ fontWeight: 600 }}>Phát âm chuẩn Đài Loan</span>
                                    </div>
                                </div>

                                {/* Back Face Details (Revealed) */}
                                {revealed ? (
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--surface-container-low)', padding: '16px', borderRadius: '12px', textAlign: 'left', marginTop: '8px', boxSizing: 'border-box' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                                                <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--tone-1)' }}>{word.pinyin || '—'}</span>
                                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', margin: 0, wordBreak: 'break-word' }}>{word.meaning}</h3>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                {etymology && (
                                                    <span className="badge-pill badge-gold">Hán-Việt: {etymology.sinoViet}</span>
                                                )}
                                                <span className="badge-pill badge-neutral">Phồn thể</span>
                                            </div>
                                        </div>

                                        {/* Bilingual Context Example */}
                                        {word.example ? (
                                            <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#ffffff', border: '1px solid var(--border-strong)', boxSizing: 'border-box' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', margin: 0, fontWeight: 600, wordBreak: 'break-word' }}>
                                                        {word.example}
                                                    </p>
                                                    <SpeakButton text={word.example} />
                                                </div>
                                                {word.examplePinyin && (
                                                    <div style={{ fontSize: '13px', color: 'var(--tone-1)', marginTop: '4px', wordBreak: 'break-word' }}>
                                                        {word.examplePinyin}
                                                    </div>
                                                )}
                                                {word.exampleMeaning && (
                                                    <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '2px', wordBreak: 'break-word' }}>
                                                        {word.exampleMeaning}
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}

                                        {/* Cultural / Sino-Vietnamese Tip */}
                                        <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--gold-tint)', border: '1px solid rgba(217, 119, 6, 0.25)', fontSize: '12px', color: 'var(--on-surface)', lineHeight: 1.45 }}>
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
                            <div style={{ padding: '8px 18px', background: 'var(--surface-container-low)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--on-surface-variant)', flexWrap: 'wrap', gap: '6px' }}>
                                <span>Nhấp Hiện đáp án hoặc nhấn Space (sau đó phím 1-4)</span>
                                <span>Hệ số dễ dàng (E-Factor): {currentEase.toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        /* Empty State / Session Completion Summary View */
                        <div className="bento-card" style={{ padding: '36px 20px', textAlign: 'center', alignItems: 'center', boxSizing: 'border-box' }}>
                            <div style={{ fontSize: '48px', marginBottom: '14px' }}>🎉</div>
                            <h2>
                                {remainingDue.length > 0 && !isReviewAhead
                                    ? `${remainingDue.length} từ cần ôn lại hôm nay`
                                    : reviewed > 0
                                    ? 'Bạn đã ôn xong hôm nay!'
                                    : 'Chưa có từ đến lịch ôn'}
                            </h2>

                            {/* Session Completion Summary Screen */}
                            {reviewed > 0 && remainingDue.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '480px', margin: '0 auto 20px' }}>
                                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '13px', margin: 0 }}>
                                        Tuyệt vời! Bạn đã hoàn thành toàn bộ các thẻ ôn tập đến lịch. Lịch trình SM-2 đã được cập nhật tự động.
                                    </p>

                                    {/* XP Gain Banner */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', background: 'var(--gold-tint)', border: '1px solid rgba(217, 119, 6, 0.3)', color: 'var(--cognate-gold)', fontWeight: 700, fontSize: '14px' }}>
                                        <Sparkles size={18} />
                                        <span>+{reviewed * 5} XP kiếm được trong phiên này!</span>
                                    </div>

                                    {/* Rating Breakdown Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                                        <div style={{ padding: '8px 4px', borderRadius: '8px', background: 'var(--vermilion-tint)' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--vermilion-cinnabar)' }}>{sessionBreakdown.again}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Lại</div>
                                        </div>
                                        <div style={{ padding: '8px 4px', borderRadius: '8px', background: 'var(--gold-tint)' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--cognate-gold)' }}>{sessionBreakdown.hard}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Khó</div>
                                        </div>
                                        <div style={{ padding: '8px 4px', borderRadius: '8px', background: 'var(--surface-container-high)' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--on-surface)' }}>{sessionBreakdown.good}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Tốt</div>
                                        </div>
                                        <div style={{ padding: '8px 4px', borderRadius: '8px', background: 'var(--jade-tint)' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--jade-emerald)' }}>{sessionBreakdown.easy}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Dễ</div>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                        Tổng số: <strong>{reviewed}</strong> thẻ đã được đánh giá SM-2
                                    </div>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--on-surface-variant)', fontSize: '13px', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                                    {remainingDue.length > 0 && !isReviewAhead
                                        ? `${remainingDue.length} từ cần ôn lại hôm nay. Hãy tiếp tục củng cố nhé.`
                                        : savedWords.length > 0
                                        ? `Tất cả ${savedWords.length} từ vựng đã lưu đều chưa đến hạn ôn. Bạn có thể ôn tập trước lịch để rèn luyện phản xạ hoặc khám phá thêm từ mới.`
                                        : 'Bạn chưa lưu từ vựng nào. Hãy nạp một bộ thẻ Starter Deck bên dưới hoặc lưu từ mới từ các bài học và từ điển.'}
                                </p>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {remainingDue.length > 0 && !isReviewAhead && (
                                    <button
                                        type="button"
                                        className="bento-btn-primary"
                                        onClick={() => {
                                            setSessionDone([]);
                                            setRevealed(false);
                                        }}
                                    >
                                        <RotateCcw size={16} />
                                        <span>Ôn lại các từ chưa nhớ</span>
                                    </button>
                                )}

                                {savedWords.length > 0 && (remainingDue.length === 0 || isReviewAhead) && (
                                    <button
                                        type="button"
                                        className="button secondary"
                                        onClick={() => {
                                            setIsReviewAhead(true);
                                            setSessionDone([]);
                                            setRevealed(false);
                                        }}
                                    >
                                        <Sparkles size={16} color="var(--cognate-gold)" />
                                        <span>Ôn tập trước lịch ({savedWords.length} từ đã lưu)</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="bento-btn-secondary"
                                    onClick={onDictionary}
                                >
                                    <BookOpen size={16} />
                                    <span>Khám phá từ điển</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SM-2 Algorithm 4-Option Evaluation Control Bar */}
                    {word && revealed && (
                        <div className="bento-card" style={{ padding: '16px 18px', boxSizing: 'border-box' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                                <strong style={{ fontSize: '13px' }}>Đánh giá mức độ ghi nhớ theo thuật toán SM-2:</strong>
                                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Chọn mức độ hoặc nhấn phím [1] – [4]</span>
                            </div>
                            <div className="sm2-rating-grid" style={{ width: '100%', boxSizing: 'border-box' }}>
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
                                    <span>+{nextHard} ngày</span>
                                </button>
                                <button
                                    type="button"
                                    className="sm2-btn sm2-btn-good"
                                    onClick={() => handleRate('good')}
                                >
                                    <strong>Nhớ được (Tốt [3] / Space)</strong>
                                    <span>+{nextGood} ngày</span>
                                </button>
                                <button
                                    type="button"
                                    className="sm2-btn sm2-btn-easy"
                                    onClick={() => handleRate('easy')}
                                >
                                    <strong>Rất dễ (Dễ [4])</strong>
                                    <span>+{nextEasy} ngày</span>
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* RIGHT COLUMN (4 cols): Supporting Widgets */}
                <aside className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
                    {/* Widget 1: Daily SRS Queue Stats */}
                    <div className="bento-card" style={{ boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>donut_large</span>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>Thống kê SRS hôm nay</h3>
                            </div>
                            <span className="badge-pill badge-neutral">{srsStats.total} Thẻ</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                            <div style={{ padding: '10px 6px', borderRadius: '8px', background: 'var(--vermilion-tint)' }}>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--vermilion-cinnabar)' }}>{remainingDue.length}</div>
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

                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                            <span>Tổng từ đã lưu: <strong>{savedWords.length}</strong></span>
                            <span>Đã xếp lịch: <strong>{srsItems.filter(i => Boolean(i.review)).length}</strong></span>
                        </div>
                    </div>

                    {/* Widget 2: Ebbinghaus Forgetting Curve Interactive Forecast Chart */}
                    <div className="bento-card" style={{ boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-symbols-outlined" style={{ color: 'var(--cognate-gold)', fontSize: '20px' }}>trending_up</span>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>Đường cong Quên lãng</h3>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>H. Ebbinghaus</span>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', margin: '0 0 10px', lineHeight: 1.4 }}>
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
                    <div className="bento-card" style={{ background: 'var(--surface-container-low)', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '12px' }}>Phím tắt ôn nhanh</strong>
                            <span className="badge-pill badge-neutral">Pro Mode</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                            <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#fff', border: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Lật thẻ</span>
                                <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'var(--surface-container)', fontSize: '10px' }}>Space</kbd>
                            </div>
                            <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#fff', border: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Đánh giá</span>
                                <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'var(--surface-container)', fontSize: '10px' }}>1 – 4</kbd>
                            </div>
                            <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#fff', border: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Phát âm</span>
                                <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'var(--surface-container)', fontSize: '10px' }}>R</kbd>
                            </div>
                            <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#fff', border: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Nhớ tốt</span>
                                <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'var(--surface-container)', fontSize: '10px' }}>Space / 3</kbd>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Bottom Starter Decks Collection */}
            <div style={{ marginTop: '16px', boxSizing: 'border-box' }}>
                <div style={{ marginBottom: '14px' }}>
                    <span className="badge-pill badge-vermilion" style={{ marginBottom: '6px' }}>Kho ngữ liệu Phồn thể</span>
                    <h2 style={{ margin: '4px 0', fontSize: 'clamp(18px, 4vw, 24px)' }}>Bộ Sưu Tập Thẻ Starter Decks Đài Loan</h2>
                </div>

                <div className="bento-grid" style={{ width: '100%', boxSizing: 'border-box' }}>
                    {STARTER_DECKS.map(deck => {
                        const savedCount = deck.wordIds.filter(id => state.savedWordIds.includes(id)).length;
                        const isFullyAdded = savedCount === deck.wordIds.length;
                        const masteryPct = Math.round((savedCount / deck.wordIds.length) * 100);
                        return (
                            <div key={deck.id} className="col-span-3 bento-card" style={{ justifyContent: 'space-between', boxSizing: 'border-box', minWidth: 0 }}>
                                <div>
                                    <span className={`badge-pill ${deck.badgeClass}`} style={{ alignSelf: 'flex-start', marginBottom: '8px' }}>
                                        {deck.badge}
                                    </span>
                                    <h4 style={{ margin: 0, fontSize: '16px' }}>{deck.titleZh}</h4>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '4px' }}>
                                        {deck.titleVi}
                                    </div>
                                    <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', margin: '0 0 12px', lineHeight: 1.4 }}>
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
