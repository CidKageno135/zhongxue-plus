import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Bookmark, Mic, Pencil } from 'lucide-react';
import type { Lesson, Word } from '../types';
import type { LearningState } from '../domain/learning';
import type { Route } from '../components/Sidebar';
import { lessons } from '../data/lessons';
import { getStats, getWeeklyProgress, getQuizAccuracy, getDueWords, getCompetencyRadar } from '../domain/learning';
import { getWordEtymology, getTodayRadical } from '../data/etymologyData';
import { captureMicrophonePitch, stopSpeaking } from '../services/speech';
import { SpeakButton } from '../components/SpeakButton';
import { WeeklyProgressCard } from '../components/WeeklyProgressCard';
import { QuizAccuracyCard } from '../components/QuizAccuracyCard';

interface TodayViewProps {
    state: LearningState;
    onLaunch: (l: Lesson) => void;
    onNavigate: (route: Route) => void;
    onSelectWord: (word: string) => void;
    onToggleSave?: (id: string, customWord?: Word) => void;
    onReviewWord?: (id: string, rating: 'again' | 'hard' | 'good' | 'easy') => void;
}

function getChaoPitchCurve(toneClass: string): { refPath: string; startY: number; endY: number; label: string } {
    const lower = toneClass.toLowerCase();

    // Sandhi or two tones: Thanh 3 + Thanh 3 -> 2 + 3 (e.g. nǐ hǎo -> ní hǎo)
    if (lower.includes('biến điệu') || (lower.includes('thanh 3') && lower.includes('thanh 3'))) {
        return {
            refPath: 'M 15 42 C 60 40, 110 24, 150 16 M 165 38 C 205 52, 245 52, 275 36 S 305 24, 305 24',
            startY: 42,
            endY: 24,
            label: 'Biến điệu Chao [35 ➔ 214]'
        };
    }

    // Two-tone compound: e.g. "Thanh 4 + Thanh 2"
    if (lower.includes('thanh 4') && lower.includes('thanh 2')) {
        return {
            refPath: 'M 15 14 C 60 22, 100 42, 150 50 M 165 44 C 210 40, 255 28, 305 14',
            startY: 14,
            endY: 14,
            label: 'Chao [51 + 35]'
        };
    }

    // Tone 1: High flat (55)
    if (lower.includes('thanh 1')) {
        return {
            refPath: 'M 15 14 L 305 14',
            startY: 14,
            endY: 14,
            label: 'Âm bình cao Chao [55]'
        };
    }

    // Tone 4: High falling (51)
    if (lower.includes('thanh 4')) {
        return {
            refPath: 'M 15 14 C 90 22, 190 42, 305 52',
            startY: 14,
            endY: 52,
            label: 'Khứ thanh rơi Chao [51]'
        };
    }

    // Tone 3: Low dipping (214)
    if (lower.includes('thanh 3')) {
        return {
            refPath: 'M 15 40 C 90 54, 180 54, 240 38 S 305 22, 305 22',
            startY: 40,
            endY: 22,
            label: 'Thượng thanh lượn Chao [214]'
        };
    }

    // Tone 2: Mid rising (35) - default
    return {
        refPath: 'M 15 46 C 80 44, 180 32, 305 14',
        startY: 46,
        endY: 14,
        label: 'Dương bình lên dốc Chao [35]'
    };
}

export function TodayView({
    state,
    onLaunch,
    onNavigate,
    onSelectWord,
    onToggleSave,
    onReviewWord
}: TodayViewProps) {
    const [bannerVisible, setBannerVisible] = useState(true);
    const [micRecording, setMicRecording] = useState(false);
    const [pitchCount, setPitchCount] = useState(0);
    const [realMeasurement, setRealMeasurement] = useState<{ hz: number } | null>(null);
    const [pitchFeedback, setPitchFeedback] = useState<string | null>(null);
    const [lastRatedLabel, setLastRatedLabel] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            stopSpeaking();
        };
    }, []);

    const stats = getStats(state);
    const weeklyProgress = getWeeklyProgress(state);
    const quizAccuracy = getQuizAccuracy(state);
    const radar = getCompetencyRadar(state);
    const due = getDueWords(state);
    const nextLesson = lessons.find(l => !state.completedLessonIds.includes(l.id)) ?? lessons[0];
    const isCurriculumFinished = stats.completedLessons === lessons.length;

    const heroWord = due[0] ?? nextLesson.words[0] ?? lessons[0].words[0];
    const etymology = getWordEtymology(heroWord.id, heroWord.hanzi);
    const chaoCurve = getChaoPitchCurve(etymology.toneClass);
    const todayRadical = getTodayRadical();
    const isHeroSaved = state.savedWordIds.includes(heroWord.id);
    const heroReview = state.reviews[heroWord.id];

    // Compute 6-axis radar polygon points around (0,0) with radius up to 90
    const radarAngles = [-90, -30, 30, 90, 150, 210];
    const radarCoords = radar.axes.map((axis, idx) => {
        const angleRad = (radarAngles[idx] * Math.PI) / 180;
        const r = (axis.score / 100) * 90;
        const x = Number((r * Math.cos(angleRad)).toFixed(1));
        const y = Number((r * Math.sin(angleRad)).toFixed(1));
        return { x, y };
    });
    const radarPointsString = radarCoords.map(pt => `${pt.x},${pt.y}`).join(' ');

    function handleHeroRate(rating: 'again' | 'hard' | 'good' | 'easy', label: string) {
        if (due.length > 0 && onReviewWord) {
            onReviewWord(heroWord.id, rating);
            setLastRatedLabel(`Đã chấm "${label}" cho ${heroWord.hanzi}`);
        } else {
            onNavigate('review');
        }
    }

    async function handleRecordPitch() {
        if (micRecording) {
            abortControllerRef.current?.abort();
            setMicRecording(false);
            return;
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        setMicRecording(true);
        setPitchFeedback(null);

        try {
            const result = await captureMicrophonePitch({
                durationMs: 450,
                signal: controller.signal
            });

            if (controller.signal.aborted) return;

            setPitchCount(count => count + 1);
            if (result.isRealMeasurement && result.hz) {
                setRealMeasurement({ hz: Math.round(result.hz) });
            } else {
                setRealMeasurement(null);
            }
            setPitchFeedback(result.message);
        } finally {
            setMicRecording(false);
        }
    }

    const totalVocabCoverage = Math.min(100, Math.round((stats.learnedWords / 40) * 100));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Banner: Guest State Notification */}
            {bannerVisible && (
                <div className="bento-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="bento-pulse-dot" />
                        <div style={{ fontSize: '13px' }}>
                            <strong style={{ color: 'var(--on-surface)' }}>Hồ sơ học tập ({state.profile.name})</strong>
                            <span style={{ color: 'var(--on-surface-variant)', marginLeft: '6px' }}>
                                — Tiến độ ôn tập SM-2 ({stats.xp} XP) được lưu trực tiếp trên trình duyệt này.
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            type="button"
                            className="bento-btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                            onClick={() => onNavigate('settings')}
                        >
                            Lưu tiến trình cá nhân
                        </button>
                        <button
                            type="button"
                            onClick={() => setBannerVisible(false)}
                            aria-label="Đóng thông báo"
                            style={{ width: '36px', height: '36px', display: 'grid', placeItems: 'center', borderRadius: '8px', color: 'var(--on-surface-variant)', background: 'transparent', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Section Header with Focus Session & Quick Actions */}
            <div className="bento-section-head">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge-pill badge-vermilion">Tập trung cao độ</span>
                        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                            Bài {Math.min(lessons.length, stats.completedLessons + 1)} / {lessons.length}
                        </span>
                    </div>
                    <h1 style={{ margin: 0 }}>Phiên học Tập trung • TOCFL A2</h1>
                    <p style={{ margin: 0, color: 'var(--on-surface-variant)', fontSize: '14px', maxWidth: '640px' }}>
                        Thuật toán SM-2 Spaced Repetition tối ưu hóa độc quyền theo độ nhạy chuyển âm Pinyin ↔ Hán-Việt cho người Việt.
                    </p>
                </div>

                {/* Quick Action Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="bento-btn-secondary"
                        onClick={() => {
                            onSelectWord(heroWord.hanzi);
                            onNavigate('dictionary');
                        }}
                    >
                        <Pencil size={16} color="var(--primary)" />
                        <span>Chế độ Viết nét</span>
                    </button>
                    <button
                        type="button"
                        className="bento-btn-primary"
                        onClick={() => onNavigate('review')}
                    >
                        <span>⚡</span>
                        <span>
                            {due.length > 0
                                ? `Ôn tập ${due.length} thẻ SRS đến hạn`
                                : 'Ôn tập thẻ SRS (Khởi động)'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Bento Grid V2 Dashboard: 12-Column Responsive Layout */}
            <div className="bento-grid">
                {/* CARD A (Hero Flashcard SM-2): 7 cols */}
                <div className="col-span-7 bento-card" style={{ minHeight: '380px', justifyContent: 'space-between' }}>
                    {/* Watermark character */}
                    <div
                        style={{
                            position: 'absolute',
                            right: '-20px',
                            bottom: '-25px',
                            pointerEvents: 'none',
                            opacity: 0.04,
                            fontSize: '220px',
                            fontFamily: 'var(--font-serif)',
                            lineHeight: 1,
                            userSelect: 'none'
                        }}
                    >
                        {heroWord.hanzi.charAt(0)}
                    </div>

                    <div>
                        {/* Flashcard Metadata Ribbon */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span className="badge-pill badge-neutral" style={{ color: 'var(--primary)' }}>
                                    Thẻ #{heroWord.id.toUpperCase()} · SM-2 Lần {(heroReview?.repetitions ?? 0) + 1}
                                </span>
                                <span className="badge-pill badge-gold">
                                    {due.length > 0 ? `${due.length} thẻ đến hạn` : 'Trọng tâm bài học'}
                                </span>
                                {lastRatedLabel && (
                                    <span className="badge-pill badge-jade">{lastRatedLabel}</span>
                                )}
                            </div>
                            <button
                                type="button"
                                aria-label={isHeroSaved ? 'Bỏ lưu thẻ trọng tâm' : 'Lưu thẻ trọng tâm'}
                                onClick={() => onToggleSave?.(heroWord.id, heroWord)}
                                title={isHeroSaved ? 'Đã lưu thẻ vào SRS' : 'Lưu thẻ vào SRS'}
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    background: isHeroSaved ? 'var(--gold-tint)' : 'var(--surface-container-low)',
                                    color: isHeroSaved ? 'var(--cognate-gold)' : 'var(--on-surface-variant)',
                                    display: 'grid',
                                    placeItems: 'center'
                                }}
                            >
                                <Bookmark size={18} fill={isHeroSaved ? 'currentColor' : 'none'} />
                            </button>
                        </div>

                        {/* Character Stage: Traditional Tianzige + Phonetics */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <div className="tianzige-box">
                                <div className="tianzige-crosshair-h" />
                                <div className="tianzige-crosshair-v" />
                                <svg className="tianzige-diagonals" viewBox="0 0 100 100">
                                    <line x1="0" y1="0" x2="100" y2="100" strokeWidth="1" strokeDasharray="2,2" />
                                    <line x1="100" y1="0" x2="0" y2="100" strokeWidth="1" strokeDasharray="2,2" />
                                </svg>
                                <span className="tianzige-glyph">{heroWord.hanzi.charAt(0)}</span>
                                <span className="tianzige-sub">{etymology.strokes} nét</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 600 }}>{heroWord.pinyin}</span>
                                    <SpeakButton text={heroWord.hanzi} />
                                    <span className="badge-pill badge-jade" style={{ fontSize: '10px' }}>{etymology.toneClass}</span>
                                </div>

                                <div style={{ marginTop: '2px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Âm Hán Việt & Nghĩa
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--vermilion-cinnabar)' }}>{etymology.sinoViet}</span>
                                        <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                                            ({heroWord.meaning})
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '12px' }}>
                                    <span style={{ color: 'var(--on-surface-variant)' }}>Bộ thủ:</span>
                                    <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '16px' }}>{etymology.radical}</span>
                                    <span style={{ color: 'var(--on-surface-variant)' }}>({etymology.radicalName})</span>
                                </div>
                            </div>
                        </div>

                        {/* Bilingual Context Sentence */}
                        <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'var(--surface-container-low)', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', margin: 0, fontWeight: 600 }}>
                                    {heroWord.example}
                                </p>
                                <SpeakButton text={heroWord.example} />
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--tone-1)', marginTop: '4px', fontWeight: 500 }}>
                                {heroWord.examplePinyin}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                                {heroWord.exampleMeaning}
                            </div>
                        </div>
                    </div>

                    {/* Embedded SM-2 Quick Rating Interactive Bar */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                                Đánh giá khả năng hồi tưởng (SM-2 Algorithm)
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Phím tắt: [1] [2] [3] [4]</span>
                        </div>
                        <div className="sm2-rating-grid">
                            <button
                                type="button"
                                className="sm2-btn sm2-btn-again"
                                onClick={() => handleHeroRate('again', 'Quên')}
                            >
                                <strong>Quên [1]</strong>
                                <span>&lt; 10 phút</span>
                            </button>
                            <button
                                type="button"
                                className="sm2-btn sm2-btn-hard"
                                onClick={() => handleHeroRate('hard', 'Khó')}
                            >
                                <strong>Khó [2]</strong>
                                <span>1 ngày</span>
                            </button>
                            <button
                                type="button"
                                className="sm2-btn sm2-btn-good"
                                onClick={() => handleHeroRate('good', 'Tốt')}
                            >
                                <strong>Tốt [3]</strong>
                                <span>3 ngày</span>
                            </button>
                            <button
                                type="button"
                                className="sm2-btn sm2-btn-easy"
                                onClick={() => handleHeroRate('easy', 'Dễ')}
                            >
                                <strong>Dễ [4]</strong>
                                <span>7 ngày</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side Cluster: Card B (AI Pitch) + Card C (Cognate Bridge) */}
                <div className="col-span-5" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* CARD B: AI Pitch Visualizer Preview */}
                    <div className="bento-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: realMeasurement ? 'var(--jade-emerald)' : 'var(--cognate-gold)' }} />
                                <h3 style={{ margin: 0, fontSize: '17px' }}>Cao độ và thanh điệu</h3>
                            </div>
                            {realMeasurement ? (
                                <span className="badge-pill badge-jade">Đo thực tế: {realMeasurement.hz} Hz</span>
                            ) : (
                                <span className="badge-pill badge-neutral">Đường cao độ mẫu (Mô phỏng thanh điệu)</span>
                            )}
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', margin: '0 0 10px' }}>
                            {realMeasurement
                                ? `Đã đo tần số F0 (${realMeasurement.hz} Hz) qua micro. Chỉ đo một mẫu F0; chưa đánh giá độ khớp thanh điệu. Đường hiển thị vẫn là mẫu tham khảo.`
                                : `Đường cao độ mẫu (Mô phỏng thanh điệu) ${etymology.toneClass} của từ ${heroWord.hanzi} chuẩn ngữ âm Đài Bắc. Nhấn nút bên dưới để cấp quyền micro và đo cao độ thực tế.`}
                        </p>

                        {/* Vector Pitch Visualizer SVG Box */}
                        <div className="pitch-curve-box">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>
                                <span>Thang cao độ Chao 5 cấp (1 ➔ 5)</span>
                                <span style={{ display: 'flex', gap: '10px' }}>
                                    <span style={{ color: 'var(--tone-5)' }}>● {chaoCurve.label}</span>
                                    <span style={{ color: 'var(--primary-container)' }}>
                                        ● Đường cao độ mẫu (Mô phỏng thanh điệu)
                                    </span>
                                </span>
                            </div>

                            <svg className="w-full" style={{ width: '100%', height: '70px', overflow: 'visible' }} viewBox="0 0 320 60" fill="none">
                                <line x1="12" y1="14" x2="320" y2="14" stroke="var(--border-strong)" strokeDasharray="3,3" strokeWidth="1" />
                                <line x1="12" y1="28" x2="320" y2="28" stroke="var(--border-subtle)" strokeDasharray="2,2" strokeWidth="1" />
                                <line x1="12" y1="42" x2="320" y2="42" stroke="var(--border-subtle)" strokeDasharray="2,2" strokeWidth="1" />
                                <line x1="12" y1="54" x2="320" y2="54" stroke="var(--border-strong)" strokeDasharray="3,3" strokeWidth="1" />
                                <text x="2" y="15" fontSize="8" fill="var(--on-surface-variant)">5</text>
                                <text x="2" y="32" fontSize="8" fill="var(--on-surface-variant)">3</text>
                                <text x="2" y="55" fontSize="8" fill="var(--on-surface-variant)">1</text>
                                {/* Reference curve */}
                                <path d={chaoCurve.refPath} stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
                                <circle cx="15" cy={chaoCurve.startY} r="3.5" fill="#64748B" />
                                <circle cx="305" cy={chaoCurve.endY} r="3.5" fill="#64748B" />
                            </svg>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                                <span>Bắt đầu ({heroWord.pinyin})</span>
                                <span>Kết thúc ({etymology.toneClass})</span>
                            </div>
                        </div>

                        {pitchFeedback && (
                            <div style={{ fontSize: '11px', color: realMeasurement ? 'var(--jade-emerald)' : 'var(--cognate-gold)', margin: '6px 0 2px' }} role="status">
                                {pitchFeedback}
                            </div>
                        )}

                        {/* Interactive Mic Record CTA */}
                        <button
                            type="button"
                            className="bento-btn-secondary"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => void handleRecordPitch()}
                            aria-label={micRecording ? 'Đang lắng nghe phát âm... Nhấn để dừng' : 'Nhấn để thu âm và kiểm tra âm điệu'}
                        >
                            <Mic size={17} color="var(--vermilion-cinnabar)" className={micRecording ? 'animate-pulse' : ''} />
                            <span>{micRecording ? 'Đang lắng nghe phát âm... (Nhấn để dừng)' : 'Nhấn để thu âm & đo cao độ thực tế'}</span>
                        </button>
                    </div>

                    {/* CARD C: Cầu nối Hán - Việt / Cognate Bridge */}
                    <div className="bento-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-symbols-outlined" style={{ color: 'var(--cognate-gold)', fontSize: '20px' }}>account_tree</span>
                                <h3 style={{ margin: 0, fontSize: '17px' }}>Cầu nối Hán - Việt (同源詞)</h3>
                            </div>
                            <span className="badge-pill badge-gold">92% Nhạy âm</span>
                        </div>

                        <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--surface-container-low)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 700 }}>{heroWord.hanzi}</span>
                            <span style={{ fontSize: '13px', color: 'var(--tone-1)' }}>{heroWord.pinyin}</span>
                            <span style={{ color: 'var(--on-surface-variant)' }}>➔</span>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--vermilion-cinnabar)' }}>{etymology.sinoViet} · {heroWord.meaning}</span>
                        </div>

                        {/* Decomposition Matrix */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                            {etymology.decomposition.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', background: 'var(--surface-container)', fontSize: '12px', gap: '8px' }}>
                                    <span><strong style={{ fontFamily: 'var(--font-serif)' }}>{item.char}</strong> ({item.pinyin} / {item.sinoViet})</span>
                                    <span>{item.meaning} {item.ruleNote && <strong style={{ color: idx === 0 ? 'var(--jade-emerald)' : 'var(--cognate-gold)' }}>({item.ruleNote})</strong>}</span>
                                </div>
                            ))}
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', margin: 0 }}>
                            Mẹo nhớ: {etymology.cognateTip}
                        </p>
                    </div>
                </div>
            </div>

            {/* Middle Bento Row: 3 Modular Analytical Cards */}
            <div className="bento-grid">
                {/* CARD D: Streak & Kỷ lục học tập (4 cols) */}
                <div className="col-span-4 bento-card" style={{ justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-symbols-outlined" style={{ color: 'var(--vermilion-cinnabar)', fontSize: '20px' }}>local_fire_department</span>
                                <h3 style={{ margin: 0, fontSize: '17px' }}>Chuỗi Kỷ Lục (Streak)</h3>
                            </div>
                            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--vermilion-cinnabar)' }}>
                                {stats.streak} Ngày
                            </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '14px' }}>
                            Duy trì nhịp phản xạ âm điệu & trí nhớ thẻ SRS không ngắt quãng.
                        </p>

                        {/* 7-Day Visual Progress Trackers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '14px', textAlign: 'center' }}>
                            {weeklyProgress.days.map((day, i) => {
                                const isToday = i === weeklyProgress.days.length - 1;
                                const active = day.xp > 0;
                                return (
                                    <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '11px', color: isToday ? 'var(--vermilion-cinnabar)' : 'var(--on-surface-variant)', fontWeight: 600 }}>{day.dayLabel}</span>
                                        <div
                                            title={`${day.date}: ${day.xp} XP`}
                                            style={{
                                                width: '30px',
                                                height: '30px',
                                                borderRadius: '50%',
                                                background: active ? 'var(--jade-emerald)' : isToday ? 'var(--vermilion-tint)' : 'var(--surface-container)',
                                                color: active ? '#ffffff' : isToday ? 'var(--vermilion-cinnabar)' : 'var(--on-surface-variant)',
                                                border: isToday && !active ? '1px solid var(--vermilion-cinnabar)' : 'none',
                                                display: 'grid',
                                                placeItems: 'center',
                                                fontSize: '12px',
                                                fontWeight: 700
                                            }}
                                        >
                                            {active ? '✓' : isToday ? '▶' : '·'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--surface-container-low)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--on-surface-variant)' }}>Mục tiêu hôm nay:</span>
                        <strong style={{ color: 'var(--on-surface)' }}>
                            {due.length > 0 ? `Còn ${due.length} từ cần ôn` : `${weeklyProgress.days[6]?.xp ?? 0} / ${state.profile.dailyGoal} XP`}
                        </strong>
                    </div>
                </div>

                {/* CARD E: Radar Năng lực TOCFL A2 (5 cols) */}
                <div className="col-span-5 bento-card" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ color: 'var(--tone-1)', fontSize: '20px' }}>radar</span>
                            <h3 style={{ margin: 0, fontSize: '17px' }}>Radar Năng Lực TOCFL A2</h3>
                        </div>
                        <span className="badge-pill badge-jade">TB: {radar.overallScore} / 100</span>
                    </div>

                    {/* Hexagonal Competency Radar SVG */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0', flexWrap: 'wrap' }}>
                        <div style={{ width: '130px', height: '130px', flexShrink: 0, margin: '0 auto' }}>
                            <svg viewBox="-100 -100 200 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                                <polygon fill="none" stroke="var(--border-strong)" strokeWidth="1" points="0,-90 77.9,-45 77.9,45 0,90 -77.9,45 -77.9,-45" />
                                <polygon fill="none" stroke="var(--border-strong)" strokeDasharray="2,2" strokeWidth="1" points="0,-60 52,-30 52,30 0,60 -52,30 -52,-30" />
                                <polygon
                                    fill="rgba(5, 150, 105, 0.25)"
                                    stroke="var(--jade-emerald)"
                                    strokeWidth="2"
                                    points={radarPointsString}
                                />
                                {radarCoords.map((pt, idx) => (
                                    <circle key={idx} cx={pt.x} cy={pt.y} r="3" fill="var(--jade-emerald)" />
                                ))}
                            </svg>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', minWidth: '150px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--on-surface-variant)' }}>Từ vựng (詞彙)</span>
                                <strong>{radar.axes[2]?.score ?? 80} / 100</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--on-surface-variant)' }}>Ngữ pháp (語法)</span>
                                <strong>{radar.axes[4]?.score ?? 80} / 100</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--on-surface-variant)' }}>Phản xạ (會話)</span>
                                <strong>{radar.axes[5]?.score ?? 80} / 100</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--on-surface-variant)' }}>Nói & Âm điệu</span>
                                <strong>{radar.axes[1]?.score ?? 80} / 100</strong>
                            </div>
                        </div>
                    </div>

                    {/* Core Progress Meter */}
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                            <span>Độ phủ từ vựng giáo trình A1–A2</span>
                            <strong style={{ color: 'var(--jade-emerald)' }}>{stats.learnedWords} / 40 từ ({totalVocabCoverage}%)</strong>
                        </div>
                        <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'var(--surface-container)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.max(8, totalVocabCoverage)}%`, background: 'var(--jade-emerald)', borderRadius: '9999px' }} />
                        </div>
                    </div>
                </div>

                {/* CARD F: Bộ thủ của ngày (3 cols) */}
                <div className="col-span-3 bento-card" style={{ justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span className="badge-pill badge-neutral">Bộ #{todayRadical.kangxiIndex}</span>
                            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Chiết tự học</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: 'var(--surface-container-low)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 600 }}>
                                {todayRadical.radical}
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '18px' }}>{todayRadical.sinoViet}</h4>
                                <span style={{ fontSize: '11px', color: 'var(--tone-1)' }}>{todayRadical.pinyin} · {todayRadical.strokes} nét</span>
                            </div>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', margin: '0 0 10px', lineHeight: 1.5 }}>
                            {todayRadical.pictographMeaning}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                            {todayRadical.associatedWords.map(ex => (
                                <div key={ex.hanzi} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-container-low)' }}>
                                    <strong style={{ fontFamily: 'var(--font-serif)' }}>{ex.hanzi}</strong>
                                    <span>{ex.pinyin} · {ex.meaning}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="bento-btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '12px', fontSize: '12px', padding: '6px' }}
                        onClick={() => {
                            onSelectWord(todayRadical.radical);
                            onNavigate('dictionary');
                        }}
                    >
                        Xem 214 Bộ thủ →
                    </button>
                </div>
            </div>

            {/* Real Weekly Progress & Quiz Accuracy Cards (Keeps test selectors & aria-labels intact!) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '10px' }}>
                <WeeklyProgressCard weekly={weeklyProgress} dailyGoal={state.profile.dailyGoal} />
                <QuizAccuracyCard accuracy={quizAccuracy} />
            </div>

            {/* Daily Progress Stats Row: 4 Metric Badges */}
            <div className="bento-grid" style={{ marginBottom: '16px' }}>
                <div className="col-span-3 bento-card" style={{ padding: '16px', flexDirection: 'row', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--vermilion-tint)', color: 'var(--vermilion-cinnabar)', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
                        📋
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Hoàn thành bài tập</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>
                            {stats.completedLessons} <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>/ {lessons.length} bài</span>
                        </div>
                    </div>
                </div>

                <div className="col-span-3 bento-card" style={{ padding: '16px', flexDirection: 'row', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--jade-tint)', color: 'var(--jade-emerald)', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
                        🎙️
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Luyện phát âm</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>
                            {stats.completedLessons * 3 + pitchCount} <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>lượt</span>
                        </div>
                    </div>
                </div>

                <div className="col-span-3 bento-card" style={{ padding: '16px', flexDirection: 'row', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--surface-container)', color: 'var(--tone-1)', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
                        💬
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Đối thoại ngữ cảnh</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>
                            {Math.max(1, stats.completedLessons)} <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>/ {lessons.length} kịch bản</span>
                        </div>
                    </div>
                </div>

                <div className="col-span-3 bento-card" style={{ padding: '16px', flexDirection: 'row', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--gold-tint)', color: 'var(--cognate-gold)', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
                        📇
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Thẻ từ đã lưu</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>
                            {state.savedWordIds.length} <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>từ</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Split Cluster: Next Step CTA & Little Dragon Sinology Tip */}
            <div className="bento-grid">
                {/* Next Study Step Module (8 cols) - Featured Hero Lesson */}
                <div className="col-span-8 bento-card hero" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    {isCurriculumFinished ? (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', maxWidth: '580px' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'var(--jade-emerald)', color: '#ffffff', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, flexShrink: 0 }}>
                                完
                            </div>
                            <div>
                                <span className="badge-pill badge-jade" style={{ marginBottom: '4px' }}>
                                    Hoàn thành lộ trình · 已完成
                                </span>
                                <h2 style={{ margin: '4px 0', fontSize: '22px' }}>
                                    {lessons[0].title}
                                </h2>
                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                    Bạn đã hoàn thành toàn bộ bài học. Hãy ôn lại để củng cố kiến thức nhé.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', maxWidth: '580px' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'var(--primary-container)', color: '#ffffff', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, flexShrink: 0 }}>
                                壹
                            </div>
                            <div>
                                <span className="badge-pill badge-neutral" style={{ color: 'var(--primary)', marginBottom: '4px' }}>
                                    BÀI HỌC TIẾP THEO · 下一步
                                </span>
                                <h2 style={{ margin: '4px 0', fontSize: '22px' }}>
                                    {nextLesson.title}
                                </h2>
                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                    {nextLesson.subtitle} · {nextLesson.words[0]?.example || 'Học cách xưng hô chuẩn Đài Loan.'}
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        className="bento-btn-primary"
                        onClick={() => onLaunch(nextLesson)}
                    >
                        <span>{isCurriculumFinished ? 'Ôn lại bài học' : 'Bắt đầu học'}</span>
                        <ArrowRight size={17} />
                    </button>
                </div>

                {/* Little Dragon (Tiểu Long) Tip Card (4 cols) */}
                <div className="col-span-4 bento-card" style={{ background: 'var(--gold-tint)', borderColor: 'rgba(217, 119, 6, 0.25)', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--cognate-gold)', color: '#ffffff', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>
                                龍
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '15px' }}>Lời khuyên của Tiểu Long</h4>
                                <span style={{ fontSize: '11px', color: 'var(--cognate-gold)', fontWeight: 600 }}>Tiến sĩ Ngữ âm Hán-Việt</span>
                            </div>
                        </div>

                        <blockquote style={{ margin: '0 0 10px', fontStyle: 'italic', fontSize: '12px', lineHeight: 1.6, color: 'var(--on-surface)' }}>
                            "Đừng học vẹt chữ Phồn thể! Hãy nhìn vào cấu trúc hình thanh (形聲). Phần bên trái hay cho biết ý nghĩa, phần bên phải thường giữ âm đọc. Kết hợp với từ Hán-Việt, tốc độ nhớ của bạn sẽ tăng gấp 3 lần."
                        </blockquote>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                        <span>#PhuongPhapZhongXue</span>
                        <button
                            type="button"
                            style={{ color: 'var(--cognate-gold)', fontWeight: 600 }}
                            onClick={() => onNavigate('path')}
                        >
                            Đọc cẩm nang chiết tự →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
