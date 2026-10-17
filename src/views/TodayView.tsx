import { useState } from 'react';
import { ArrowRight, Bookmark, Mic, Pencil } from 'lucide-react';
import type { Lesson } from '../types';
import type { LearningState } from '../domain/learning';
import type { Route } from '../components/Sidebar';
import { lessons } from '../data/lessons';
import { getStats, getWeeklyProgress, getQuizAccuracy } from '../domain/learning';
import { SpeakButton } from '../components/SpeakButton';
import { WeeklyProgressCard } from '../components/WeeklyProgressCard';
import { QuizAccuracyCard } from '../components/QuizAccuracyCard';

interface TodayViewProps {
    state: LearningState;
    onLaunch: (l: Lesson) => void;
    onNavigate: (route: Route) => void;
    onSelectWord: (word: string) => void;
}

export function TodayView({
    state,
    onLaunch,
    onNavigate,
    onSelectWord
}: TodayViewProps) {
    const [bannerVisible, setBannerVisible] = useState(true);
    const [savedHero, setSavedHero] = useState(false);
    const [micRecording, setMicRecording] = useState(false);

    const stats = getStats(state);
    const weeklyProgress = getWeeklyProgress(state);
    const quizAccuracy = getQuizAccuracy(state);
    const nextLesson = lessons.find(l => !state.completedLessonIds.includes(l.id)) ?? lessons[0];
    const isCurriculumFinished = stats.completedLessons === lessons.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Banner: Guest State Notification */}
            {bannerVisible && (
                <div className="bento-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="bento-pulse-dot" />
                        <div style={{ fontSize: '13px' }}>
                            <strong style={{ color: 'var(--on-surface)' }}>Tài khoản Mẫu (Khách trải nghiệm)</strong>
                            <span style={{ color: 'var(--on-surface-variant)', marginLeft: '6px' }}>
                                — Tiến độ ôn tập SM-2 sẽ được lưu tạm thời trên trình duyệt này.
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
                            style={{ padding: '4px', color: 'var(--on-surface-variant)' }}
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
                            Tuần 6 / 12
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
                            onSelectWord('融');
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
                        <span>Ôn tập 20 thẻ SRS (Khởi động)</span>
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
                        融
                    </div>

                    <div>
                        {/* Flashcard Metadata Ribbon */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="badge-pill badge-neutral" style={{ color: 'var(--primary)' }}>
                                    Thẻ #042 · SM-2 Lần 3
                                </span>
                                <span className="badge-pill badge-gold">Tần suất cao</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSavedHero(!savedHero)}
                                title={savedHero ? 'Đã lưu thẻ' : 'Lưu thẻ'}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: savedHero ? 'var(--gold-tint)' : 'var(--surface-container-low)',
                                    color: savedHero ? 'var(--cognate-gold)' : 'var(--on-surface-variant)',
                                    display: 'grid',
                                    placeItems: 'center'
                                }}
                            >
                                <Bookmark size={16} fill={savedHero ? 'currentColor' : 'none'} />
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
                                <span className="tianzige-glyph">融</span>
                                <span className="tianzige-sub">16 nét</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 600 }}>róng</span>
                                    <SpeakButton text="融" />
                                    <span className="badge-pill badge-jade" style={{ fontSize: '10px' }}>Thanh 2 ↗</span>
                                </div>

                                <div style={{ marginTop: '2px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Âm Hán Việt
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--vermilion-cinnabar)' }}>DUNG</span>
                                        <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                                            (Hòa tan, dung nạp, tài chính)
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '12px' }}>
                                    <span style={{ color: 'var(--on-surface-variant)' }}>Bộ thủ:</span>
                                    <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '16px' }}>鬲</span>
                                    <span style={{ color: 'var(--on-surface-variant)' }}>(Bộ Cách #193 · 10 nét)</span>
                                </div>
                            </div>
                        </div>

                        {/* Bilingual Context Sentence */}
                        <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'var(--surface-container-low)', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', margin: 0, fontWeight: 600 }}>
                                    金融市場正在迅速發展。
                                </p>
                                <SpeakButton text="金融市場正在迅速發展。" />
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--tone-1)', marginTop: '4px', fontWeight: 500 }}>
                                Jīnróng shìchǎng zhèngzài xùnsù fāzhǎn.
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                                Thị trường tài chính đang phát triển nhanh chóng.
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
                                onClick={() => onNavigate('review')}
                            >
                                <strong>Quên [1]</strong>
                                <span>&lt; 10 phút</span>
                            </button>
                            <button
                                type="button"
                                className="sm2-btn sm2-btn-hard"
                                onClick={() => onNavigate('review')}
                            >
                                <strong>Khó [2]</strong>
                                <span>1 ngày</span>
                            </button>
                            <button
                                type="button"
                                className="sm2-btn sm2-btn-good"
                                onClick={() => onNavigate('review')}
                            >
                                <strong>Tốt [3]</strong>
                                <span>3 ngày</span>
                            </button>
                            <button
                                type="button"
                                className="sm2-btn sm2-btn-easy"
                                onClick={() => onNavigate('review')}
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
                                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--jade-emerald)' }} />
                                <h3 style={{ margin: 0, fontSize: '17px' }}>Khớp Âm điệu AI (Pitch Contour)</h3>
                            </div>
                            <span className="badge-pill badge-jade">96.2% Trùng khớp</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', margin: '0 0 10px' }}>
                            Mô hình so sánh cao độ Thanh 2 (Dương Bình ↗) chuẩn ngữ âm Đài Bắc đối chiếu với luồng âm thanh bạn phát âm.
                        </p>

                        {/* Vector Pitch Visualizer SVG Box */}
                        <div className="pitch-curve-box">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>
                                <span>500 Hz (Âm vực cao)</span>
                                <span style={{ display: 'flex', gap: '10px' }}>
                                    <span style={{ color: 'var(--tone-5)' }}>● Chuẩn Đài Bắc</span>
                                    <span style={{ color: 'var(--primary-container)' }}>● Giọng của bạn</span>
                                </span>
                            </div>

                            <svg className="w-full" style={{ width: '100%', height: '70px', overflow: 'visible' }} viewBox="0 0 320 60" fill="none">
                                <line x1="0" y1="15" x2="320" y2="15" stroke="var(--border-strong)" strokeDasharray="3,3" strokeWidth="1" />
                                <line x1="0" y1="35" x2="320" y2="35" stroke="var(--border-strong)" strokeDasharray="3,3" strokeWidth="1" />
                                <line x1="0" y1="50" x2="320" y2="50" stroke="var(--border-strong)" strokeDasharray="3,3" strokeWidth="1" />
                                {/* Reference curve */}
                                <path d="M 15 48 C 80 46, 170 36, 305 14" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
                                {/* User recorded contour */}
                                <path d="M 15 50 C 75 48, 165 33, 305 17" stroke="#C8322B" strokeWidth="2.5" strokeLinecap="round" />
                                <circle cx="15" cy="48" r="3.5" fill="#64748B" />
                                <circle cx="305" cy="14" r="3.5" fill="#64748B" />
                                <circle cx="305" cy="17" r="3.5" fill="#C8322B" />
                            </svg>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                                <span>Bắt đầu (Tone 3)</span>
                                <span>Kết thúc (Tone 5)</span>
                            </div>
                        </div>

                        {/* Interactive Mic Record CTA */}
                        <button
                            type="button"
                            className="bento-btn-secondary"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => setMicRecording(!micRecording)}
                        >
                            <Mic size={17} color="var(--vermilion-cinnabar)" className={micRecording ? 'animate-pulse' : ''} />
                            <span>{micRecording ? 'Đang lắng nghe phát âm...' : 'Nhấn để thu âm lại & kiểm tra âm điệu'}</span>
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

                        <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--surface-container-low)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 700 }}>金融</span>
                            <span style={{ fontSize: '13px', color: 'var(--tone-1)' }}>Jīnróng</span>
                            <span style={{ color: 'var(--on-surface-variant)' }}>➔</span>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--vermilion-cinnabar)' }}>Tài chính</span>
                        </div>

                        {/* Decomposition Matrix */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', background: 'var(--surface-container)', fontSize: '12px' }}>
                                <span><strong style={{ fontFamily: 'var(--font-serif)' }}>金</strong> (jīn / Kim)</span>
                                <span>Vàng, Tiền tệ <strong style={{ color: 'var(--jade-emerald)' }}>(100% Khớp)</strong></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', background: 'var(--surface-container)', fontSize: '12px' }}>
                                <span><strong style={{ fontFamily: 'var(--font-serif)' }}>融</strong> (róng / Dung)</span>
                                <span>Lưu thông <strong style={{ color: 'var(--cognate-gold)' }}>(Quy luật R ↔ D)</strong></span>
                            </div>
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', margin: 0 }}>
                            Mẹo nhớ: Phụ âm Pinyin <strong>R-</strong> hầu hết chuyển hóa thành âm Hán Việt <strong>D-</strong> hoặc <strong>NH-</strong> (róng ➔ dung; rén ➔ nhân; rì ➔ nhật).
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
                                {stats.streak > 0 ? `${stats.streak} Ngày` : '14 Ngày'}
                            </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '14px' }}>
                            Duy trì nhịp phản xạ âm điệu & trí nhớ thẻ SRS không ngắt quãng.
                        </p>

                        {/* 7-Day Visual Progress Trackers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '14px', textAlign: 'center' }}>
                            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                                <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', color: i === 6 ? 'var(--vermilion-cinnabar)' : 'var(--on-surface-variant)', fontWeight: 600 }}>{d}</span>
                                    <div
                                        style={{
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '50%',
                                            background: i < 6 ? 'var(--jade-emerald)' : 'var(--vermilion-tint)',
                                            color: i < 6 ? '#ffffff' : 'var(--vermilion-cinnabar)',
                                            border: i === 6 ? '1px solid var(--vermilion-cinnabar)' : 'none',
                                            display: 'grid',
                                            placeItems: 'center',
                                            fontSize: '12px',
                                            fontWeight: 700
                                        }}
                                    >
                                        {i < 6 ? '✓' : '▶'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--surface-container-low)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--on-surface-variant)' }}>Mục tiêu hôm nay:</span>
                        <strong style={{ color: 'var(--on-surface)' }}>Còn 20 từ cần ôn</strong>
                    </div>
                </div>

                {/* CARD E: Radar Năng lực TOCFL A2 (5 cols) */}
                <div className="col-span-5 bento-card" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ color: 'var(--tone-1)', fontSize: '20px' }}>radar</span>
                            <h3 style={{ margin: 0, fontSize: '17px' }}>Radar Năng Lực TOCFL A2</h3>
                        </div>
                        <span className="badge-pill badge-jade">Chuẩn bị thi: Tốt</span>
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
                                    points="0,-79.2 63.9,-36.9 59.3,34.2 0,63 -50.7,29.3 -62.4,-36"
                                />
                                <circle cx="0" cy="-79.2" r="3" fill="var(--jade-emerald)" />
                                <circle cx="63.9" cy="-36.9" r="3" fill="var(--jade-emerald)" />
                                <circle cx="59.3" cy="34.2" r="3" fill="var(--jade-emerald)" />
                                <circle cx="0" cy="63" r="3" fill="var(--jade-emerald)" />
                                <circle cx="-50.7" cy="29.3" r="3" fill="var(--jade-emerald)" />
                                <circle cx="-62.4" cy="-36" r="3" fill="var(--jade-emerald)" />
                            </svg>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', minWidth: '150px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--on-surface-variant)' }}>Từ vựng (詞彙)</span>
                                <strong>88 / 100</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--on-surface-variant)' }}>Đọc hiểu (閱讀)</span>
                                <strong>82 / 100</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--on-surface-variant)' }}>Nghe hiểu (聽力)</span>
                                <strong>76 / 100</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--on-surface-variant)' }}>Nói & Âm điệu</span>
                                <strong>92 / 100</strong>
                            </div>
                        </div>
                    </div>

                    {/* Core Progress Meter */}
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                            <span>Độ phủ từ vựng cốt lõi A2</span>
                            <strong style={{ color: 'var(--jade-emerald)' }}>420 / 600 từ (70%)</strong>
                        </div>
                        <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'var(--surface-container)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: '70%', background: 'var(--jade-emerald)', borderRadius: '9999px' }} />
                        </div>
                    </div>
                </div>

                {/* CARD F: Bộ thủ của ngày (3 cols) */}
                <div className="col-span-3 bento-card" style={{ justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span className="badge-pill badge-neutral">Bộ #193</span>
                            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Chiết tự học</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: 'var(--surface-container-low)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 600 }}>
                                鬲
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '18px' }}>Cách</h4>
                                <span style={{ fontSize: '11px', color: 'var(--tone-1)' }}>lì / gé · 10 nét</span>
                            </div>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', margin: '0 0 10px', lineHeight: 1.5 }}>
                            Tượng hình: Chiếc vạc/nồi đất cổ ba chân rỗng để nấu thức ăn thời Thương - Chu.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-container-low)' }}>
                                <strong style={{ fontFamily: 'var(--font-serif)' }}>融</strong>
                                <span>róng · Dung (Hòa tan)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-container-low)' }}>
                                <strong style={{ fontFamily: 'var(--font-serif)' }}>鬹</strong>
                                <span>guī · Quy (Bình gốm)</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="bento-btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '12px', fontSize: '12px', padding: '6px' }}
                        onClick={() => onNavigate('dictionary')}
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
                            12 <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>lượt</span>
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
                            3 <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>kịch bản</span>
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
                            {state.savedWordIds.length || 35} <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>từ</span>
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

            {/* Footer */}
            <footer className="bento-footer">
                <div className="bento-footer-inner">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="bento-brand-icon" style={{ width: '24px', height: '24px', fontSize: '13px' }}>中</div>
                            <span style={{ fontWeight: 700, fontSize: '14px' }}>ZhongXue+ (中學+)</span>
                            <span className="badge-pill badge-jade" style={{ fontSize: '10px' }}>TOCFL Standard</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                            Hệ thống số hóa phương pháp học Hán ngữ Phồn thể chuyên sâu qua lăng kính Chiết tự & Từ nguyên Hán-Việt.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--on-surface-variant)', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => onNavigate('dictionary')}>Tra cứu bộ thủ</button>
                        <button type="button" onClick={() => onNavigate('conversation')}>Âm vị học Đài ngữ</button>
                        <button type="button" onClick={() => onNavigate('review')}>Thuật toán SM-2 SRS</button>
                        <button type="button" onClick={() => onNavigate('settings')}>Hồ sơ học thuật</button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
