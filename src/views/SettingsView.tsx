import { useState, useRef, useEffect } from 'react';
import { Download, Upload } from 'lucide-react';
import type { LearningState } from '../domain/learning';
import {
    createInitialState,
    exportState,
    getStats,
    importState,
    updateProfile,
    getQuizAccuracy,
    getSrsBreakdown,
    getCompetencyRadar,
    getActivityHeatmap
} from '../domain/learning';
import { Button } from '../components/Button';
import { lessons } from '../data/lessons';
import { checkAiHealth, type AiConnectionStatus } from '../services/api';

interface SettingsViewProps {
    state: LearningState;
    setState: (s: LearningState) => void;
    notify: (s: string) => void;
}

export function SettingsView({ state, setState, notify }: SettingsViewProps) {
    const [name, setName] = useState(state.profile.name);
    const [goal, setGoal] = useState(state.profile.dailyGoal);
    const [reset, setReset] = useState(false);
    const [confirmation, setConfirmation] = useState('');
    const [aiApiKey, setAiApiKey] = useState(() => {
        if (typeof window === 'undefined') return '';
        try {
            const raw = window.localStorage.getItem('zhongxue.ai.config');
            if (raw) return JSON.parse(raw)?.apiKey || '';
        } catch {
            //
        }
        return '';
    });
    const [aiBaseUrl, setAiBaseUrl] = useState(() => {
        if (typeof window === 'undefined') return 'https://agentrouter.org/v1';
        try {
            const raw = window.localStorage.getItem('zhongxue.ai.config');
            if (raw) return JSON.parse(raw)?.baseUrl || 'https://agentrouter.org/v1';
        } catch {
            //
        }
        return 'https://agentrouter.org/v1';
    });
    const [aiModel, setAiModel] = useState(() => {
        if (typeof window === 'undefined') return 'gpt-6.1-sol';
        try {
            const raw = window.localStorage.getItem('zhongxue.ai.config');
            if (raw) return JSON.parse(raw)?.model || 'gpt-6.1-sol';
        } catch {
            //
        }
        return 'gpt-6.1-sol';
    });
    const [testingAi, setTestingAi] = useState(false);
    const [aiHealth, setAiHealth] = useState<AiConnectionStatus | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const confirmInputRef = useRef<HTMLInputElement>(null);
    const resetTriggerButtonRef = useRef<HTMLButtonElement>(null);

    const stats = getStats(state);
    const quizAccuracy = getQuizAccuracy(state);
    const srsStats = getSrsBreakdown(state);
    const radar = getCompetencyRadar(state);
    const heatmap = getActivityHeatmap(state);

    useEffect(() => {
        if (!reset) return;
        confirmInputRef.current?.focus();
        function onWindowKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                closeResetDialog();
            }
        }
        window.addEventListener('keydown', onWindowKeyDown);
        return () => window.removeEventListener('keydown', onWindowKeyDown);
    }, [reset]);

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Escape' && reset) {
            e.stopPropagation();
            closeResetDialog();
        }
    }

    function closeResetDialog() {
        setReset(false);
        setConfirmation('');
        resetTriggerButtonRef.current?.focus();
    }

    async function readFile(file: File | undefined) {
        if (!file) return;
        try {
            if (file.size > 2000000) {
                throw new Error('Tệp quá lớn. Giới hạn 2 MB.');
            }
            const next = importState(await file.text());
            setState(next);
            setName(next.profile.name);
            setGoal(next.profile.dailyGoal);
            notify('Đã nhập dữ liệu học tập.');
        } catch (error) {
            notify(error instanceof Error ? error.message : 'Không thể nhập tệp.');
        }
    }

    // Derived study metrics
    const totalReviewsCount = Object.values(state.reviews).reduce((sum, r) => sum + r.repetitions, 0);
    const studyMinutes = stats.completedLessons * 15 + totalReviewsCount * 2 + state.savedWordIds.length;
    const hours = Math.floor(studyMinutes / 60);
    const mins = studyMinutes % 60;
    const formattedStudyTime = hours > 0 ? `${hours}g ${mins}ph` : `${mins} phút`;

    const reviewEntries = Object.values(state.reviews);
    const retainedCount = reviewEntries.filter(r => r.repetitions > 0).length;
    const retentionRate =
        reviewEntries.length > 0 ? Math.round((retainedCount / reviewEntries.length) * 100) : 100;

    // 6-axis Radar SVG coordinates around (170, 160) with max radius 130
    const radarAngles = [-90, -30, 30, 90, 150, 210];
    const radarVertices = radar.axes.map((axis, idx) => {
        const rad = (radarAngles[idx] * Math.PI) / 180;
        const r = (axis.score / 100) * 130;
        const x = Math.round(170 + r * Math.cos(rad));
        const y = Math.round(160 + r * Math.sin(rad));
        return { x, y };
    });
    const radarPolygonPoints = radarVertices.map(v => `${v.x},${v.y}`).join(' ');

    // Heatmap summary
    const totalHeatmapPoints = heatmap.days.reduce((sum, cell) => sum + cell.xp, 0);
    const activeDaysCount = heatmap.activeDays;

    // TOCFL A1, A2, B1, B2 progress
    const a1Lessons = lessons.filter(l => l.level === 'A1');
    const a2Lessons = lessons.filter(l => l.level === 'A2');
    const b1Lessons = lessons.filter(l => l.level === 'B1');
    const b2Lessons = lessons.filter(l => l.level === 'B2');
    const a1Done = a1Lessons.filter(l => state.completedLessonIds.includes(l.id)).length;
    const a2Done = a2Lessons.filter(l => state.completedLessonIds.includes(l.id)).length;
    const b1Done = b1Lessons.filter(l => state.completedLessonIds.includes(l.id)).length;
    const b2Done = b2Lessons.filter(l => state.completedLessonIds.includes(l.id)).length;
    const a1Pct = Math.round((a1Done / Math.max(1, a1Lessons.length)) * 100);
    const a2Pct = Math.round((a2Done / Math.max(1, a2Lessons.length)) * 100);
    const b1Pct = Math.round((b1Done / Math.max(1, b1Lessons.length)) * 100);
    const b2Pct = Math.round((b2Done / Math.max(1, b2Lessons.length)) * 100);

    // Dynamic Sinology Badges
    const badges = [
        {
            icon: '🏆',
            title: 'Bậc Thầy Chuyển Âm',
            unlocked: stats.learnedWords >= 5,
            status: stats.learnedWords >= 5 ? 'Đã mở khóa ✓' : `${stats.learnedWords} / 5 từ đã lưu`
        },
        {
            icon: '🌟',
            title: 'Giọng Đài Bắc Chuẩn',
            unlocked: stats.completedLessons >= 1,
            status: stats.completedLessons >= 1 ? 'Đã mở khóa ✓' : `${stats.completedLessons} / 1 bài học`
        },
        {
            icon: '🚇',
            title: 'Chiến Binh MRT',
            unlocked: state.completedLessonIds.includes('lesson-3') || stats.completedLessons >= 3,
            status:
                state.completedLessonIds.includes('lesson-3') || stats.completedLessons >= 3
                    ? 'Đã mở khóa ✓'
                    : 'Hoàn thành bài MRT'
        },
        {
            icon: '⏳',
            title: 'Khảo Cổ Chữ Hán',
            unlocked: reviewEntries.length >= 10,
            status: reviewEntries.length >= 10 ? 'Đã mở khóa ✓' : `${reviewEntries.length} / 10 thẻ SRS`
        }
    ];
    const unlockedCount = badges.filter(b => b.unlocked).length;

    return (
        <div onKeyDown={handleKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Page Header Bento Banner */}
            <div className="bento-card" style={{ padding: '28px 32px', background: 'linear-gradient(135deg, #ffffff 0%, var(--surface-container-low) 50%, var(--gold-tint) 100%)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="badge-pill badge-vermilion">學習紀錄 · HỒ SƠ NĂNG LỰC HÁN NGỮ PHỒN THỂ</span>
                        <span className="badge-pill badge-gold">Chuẩn TOCFL A2 (進階級)</span>
                        <span className="badge-pill badge-jade">SM-2 Algorithm Active</span>
                    </div>

                    <h1 style={{ margin: 0 }}>
                        Kiến Tạo Ký Ức & Năng Lực Thực Chiến <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-serif)', fontSize: '24px' }}>(看見每一次練習)</span>
                    </h1>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--on-surface-variant)', maxWidth: '780px' }}>
                        Hệ thống định lượng hóa tiến trình tích lũy chữ Hán, phản xạ thanh điệu Đài Bắc và năng lực khảo thí TOCFL dựa trên dữ liệu Spaced Repetition SM-2 kết hợp cầu nối từ nguyên Hán - Việt.
                    </p>

                    {/* Quick Meta Badges */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '12px' }}>
                        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>🔥</span>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Chuỗi ôn tập</div>
                                <strong style={{ fontSize: '15px' }}>{stats.streak} Ngày liên tục</strong>
                            </div>
                        </div>

                        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>⏱️</span>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Thời lượng tích lũy</div>
                                <strong style={{ fontSize: '15px' }}>{formattedStudyTime}</strong>
                            </div>
                        </div>

                        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px', fontFamily: 'var(--font-serif)', color: 'var(--cognate-gold)' }}>字</span>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Chữ Phồn thể nạp</div>
                                <strong style={{ fontSize: '15px' }}>
                                    {stats.learnedWords} / 40 ({Math.min(100, Math.round((stats.learnedWords / 40) * 100))}%)
                                </strong>
                            </div>
                        </div>

                        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>🧠</span>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Ghi nhớ SM-2</div>
                                <strong style={{ fontSize: '15px', color: 'var(--jade-emerald)' }}>{retentionRate}% Retain</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI STATS METRIC BENTO CARDS */}
            <div className="bento-grid">
                <div className="col-span-3 bento-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: 600 }}>Đơn vị bài học</span>
                        <span style={{ fontSize: '20px' }}>📖</span>
                    </div>
                    <div style={{ fontSize: '32px', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>
                        {stats.completedLessons} <span style={{ fontSize: '14px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>/ {lessons.length} Bài</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'var(--surface-container)', margin: '12px 0 6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(stats.completedLessons / lessons.length) * 100}%`, background: 'var(--primary-container)' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                        {stats.completedLessons} bài đạt chuẩn · {lessons.length - stats.completedLessons} bài tiếp theo
                    </span>
                </div>

                <div className="col-span-3 bento-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: 600 }}>Độ chính xác bài kiểm tra</span>
                        <span style={{ fontSize: '20px' }}>🎯</span>
                    </div>
                    <div style={{ fontSize: '32px', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>
                        {quizAccuracy.percentage !== null ? `${quizAccuracy.percentage}%` : '---'} <span style={{ fontSize: '14px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>{quizAccuracy.totalQuestions > 0 ? `${quizAccuracy.totalCorrect}/${quizAccuracy.totalQuestions}` : ''}</span>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <span className="badge-pill badge-jade" style={{ fontSize: '10px' }}>
                            {quizAccuracy.totalCorrect > 0 ? `${quizAccuracy.totalCorrect} câu chuẩn xác` : 'Chưa làm quiz'}
                        </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '6px' }}>
                        Tự động tính sau mỗi bài học
                    </span>
                </div>

                <div className="col-span-3 bento-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: 600 }}>Đối thoại tình huống</span>
                        <span style={{ fontSize: '20px' }}>💬</span>
                    </div>
                    <div style={{ fontSize: '32px', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>
                        {stats.completedLessons} <span style={{ fontSize: '14px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>/ {lessons.length} Chủ đề</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '10px' }}>
                        <span className="badge-pill badge-neutral" style={{ fontSize: '9px' }}>Chợ đêm</span>
                        <span className="badge-pill badge-neutral" style={{ fontSize: '9px' }}>MRT</span>
                        <span className="badge-pill badge-neutral" style={{ fontSize: '9px' }}>7-Eleven</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '6px' }}>
                        Vượt qua các tình huống then chốt
                    </span>
                </div>

                <div className="col-span-3 bento-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: 600 }}>Thẻ SRS Tức thì</span>
                        <span style={{ fontSize: '20px' }}>📇</span>
                    </div>
                    <div style={{ fontSize: '32px', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>
                        {srsStats.total} <span style={{ fontSize: '14px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>Thẻ</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px' }}>
                        <div><strong style={{ color: 'var(--jade-emerald)' }}>{srsStats.review}</strong> Đã vững</div>
                        <div><strong style={{ color: 'var(--cognate-gold)' }}>{srsStats.learning}</strong> Củng cố</div>
                        <div><strong style={{ color: 'var(--primary)' }}>{srsStats.newCount}</strong> Mới</div>
                    </div>
                </div>
            </div>

            {/* MAIN BENTO ROW: 7 COLS LEFT, 5 COLS RIGHT */}
            <div className="bento-grid">
                {/* LEFT COLUMN (7 COLS) */}
                <div className="col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* COMPONENT A: RADAR CHART (6 TRỤC KỸ NĂNG TOCFL A2) */}
                    <div className="bento-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div>
                                <span className="badge-pill badge-vermilion" style={{ marginBottom: '4px' }}>Sinology Radar Matrix</span>
                                <h3 style={{ margin: '4px 0 0' }}>Lục giác Năng lực TOCFL A2 (六維綜合評估)</h3>
                            </div>
                            <span className="badge-pill badge-jade">Tổng hợp: {radar.overallScore} / 100</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                            <div style={{ width: '220px', height: '200px', margin: '0 auto' }}>
                                <svg viewBox="0 0 340 320" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                                    <polygon fill="none" points="170,30 283,95 283,225 170,290 57,225 57,95" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <polygon fill="none" points="170,65 252,112 252,208 170,255 88,208 88,112" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <polygon fill="none" points="170,100 222,130 222,190 170,220 118,190 118,130" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <line x1="170" y1="160" x2="170" y2="30" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <line x1="170" y1="160" x2="283" y2="95" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <line x1="170" y1="160" x2="283" y2="225" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <line x1="170" y1="160" x2="170" y2="290" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <line x1="170" y1="160" x2="57" y2="225" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <line x1="170" y1="160" x2="57" y2="95" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    {/* Data Polygon */}
                                    <polygon
                                        fill="rgba(5, 150, 105, 0.22)"
                                        points={radarPolygonPoints}
                                        stroke="#059669"
                                        strokeWidth="2.5"
                                    />
                                    {radarVertices.map((v, idx) => (
                                        <circle
                                            key={idx}
                                            cx={v.x}
                                            cy={v.y}
                                            r="4"
                                            fill={idx === 0 ? '#C8322B' : idx === 5 ? '#D97706' : '#059669'}
                                        />
                                    ))}
                                </svg>
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', minWidth: '180px' }}>
                                {radar.axes.map((axis, idx) => (
                                    <div
                                        key={axis.label}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            background: idx === 5 ? 'var(--gold-tint)' : 'var(--surface-container-low)'
                                        }}
                                    >
                                        <span style={{ color: idx === 5 ? 'var(--cognate-gold)' : 'var(--on-surface)' }}>
                                            {idx + 1}. {axis.label}
                                        </span>
                                        <strong
                                            style={{
                                                color:
                                                    idx === 0
                                                        ? 'var(--vermilion-cinnabar)'
                                                        : idx === 5
                                                        ? 'var(--cognate-gold)'
                                                        : 'var(--jade-emerald)'
                                            }}
                                        >
                                            {axis.score} / 100
                                        </strong>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sinology AI Advisor Box */}
                        <div style={{ marginTop: '16px', padding: '14px 18px', borderRadius: '10px', background: 'var(--gold-tint)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '20px' }}>💡</span>
                            <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                                <strong style={{ color: 'var(--cognate-gold)' }}>AI Cố vấn học tập Sinology:</strong> Điểm <strong>chuyển âm Hán - Việt đạt {radar.axes[0]?.score ?? 90}%</strong> là bảo chứng giúp bạn tiếp thu từ vựng Phồn thể nhanh hơn <strong>3.4 lần</strong> so với học viên quốc tế.
                            </div>
                        </div>
                    </div>

                    {/* COMPONENT B: GITHUB-STYLE ACTIVITY HEATMAP */}
                    <div className="bento-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <span className="badge-pill badge-neutral" style={{ marginBottom: '4px' }}>SM-2 Consistency</span>
                                <h3 style={{ margin: '4px 0 0' }}>Nhịp sinh học ôn luyện 12 tuần (學習節奏)</h3>
                            </div>
                            <span style={{ fontSize: '13px', color: 'var(--jade-emerald)', fontWeight: 600 }}>
                                {totalHeatmapPoints} XP ({activeDaysCount} ngày hoạt động)
                            </span>
                        </div>

                        <div style={{ overflowX: 'auto', padding: '10px 0' }}>
                            <div style={{ minWidth: '500px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--on-surface-variant)' }}>
                                    <span>12 tuần trước</span>
                                    <span>8 tuần trước</span>
                                    <span>4 tuần trước</span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Tuần này</span>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 14px)', gap: '4px', fontSize: '9px', color: 'var(--on-surface-variant)', lineHeight: '14px', textAlign: 'right', userSelect: 'none' }}>
                                        <span>T2</span>
                                        <span>·</span>
                                        <span>T4</span>
                                        <span>·</span>
                                        <span>T6</span>
                                        <span>·</span>
                                        <span>CN</span>
                                    </div>
                                    <div style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, 14px)', gap: '4px' }}>
                                        {heatmap.days.map(cell => {
                                            const bgByLevel = [
                                                'var(--surface-container-high)',
                                                'var(--jade-tint)',
                                                'rgba(5, 150, 105, 0.5)',
                                                'var(--jade-emerald)',
                                                'var(--vermilion-cinnabar)'
                                            ];
                                            return (
                                                <div
                                                    key={cell.date}
                                                    title={`${cell.date}: ${cell.xp} XP`}
                                                    style={{
                                                        width: '14px',
                                                        height: '14px',
                                                        borderRadius: '3px',
                                                        background: bgByLevel[cell.level],
                                                        opacity: cell.level > 0 ? 0.95 : 0.65
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '6px' }}>
                                    <span>Ít</span>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--surface-container-high)' }} />
                                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--jade-tint)' }} />
                                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(5, 150, 105, 0.5)' }} />
                                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--jade-emerald)' }} />
                                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--vermilion-cinnabar)' }} />
                                    <span>Nhiều</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (5 COLS) */}
                <div className="col-span-5" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* COMPONENT C: TOCFL ROADMAP & EXAM READINESS */}
                    <div className="bento-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div>
                                <span className="badge-pill badge-neutral" style={{ marginBottom: '4px' }}>Khảo thí Quốc gia</span>
                                <h3 style={{ margin: '4px 0 0' }}>Lộ trình TOCFL & Thăng cấp</h3>
                            </div>
                            <span className="badge-pill badge-gold">A2 Target</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ padding: '10px 14px', borderRadius: '8px', background: a1Done === a1Lessons.length ? 'var(--jade-tint)' : 'var(--surface-container-low)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--jade-emerald)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '12px' }}>
                                    {a1Done === a1Lessons.length ? '✓' : 'A1'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: '13px', color: 'var(--jade-emerald)' }}>TOCFL A1 (入門級)</strong>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--jade-emerald)' }}>{a1Pct}%</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                                        Hoàn thành {a1Done} / {a1Lessons.length} bài nền tảng A1
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--surface-container-low)', borderLeft: '4px solid var(--primary-container)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ fontSize: '13px' }}>TOCFL A2 (基礎級)</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700 }}>{a2Pct}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'var(--surface-container)', margin: '8px 0 4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.max(4, a2Pct)}%`, background: 'var(--primary-container)' }} />
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                                    Hoàn thành {a2Done} / {a2Lessons.length} bài thực chiến A2
                                </span>
                            </div>

                            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--surface-container-low)', borderLeft: '4px solid var(--jade-emerald)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ fontSize: '13px' }}>TOCFL B1 (進階級)</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--jade-emerald)', fontWeight: 700 }}>{b1Pct}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'var(--surface-container)', margin: '8px 0 4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.max(4, b1Pct)}%`, background: 'var(--jade-emerald)' }} />
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                                    Hoàn thành {b1Done} / {b1Lessons.length} bài trung cấp B1 (Ngân hàng, Xe máy, Phỏng vấn, Lễ hội)
                                </span>
                            </div>

                            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--surface-container-low)', borderLeft: '4px solid var(--cognate-gold)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ fontSize: '13px' }}>TOCFL B2 (高階級)</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--cognate-gold)', fontWeight: 700 }}>{b2Pct}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'var(--surface-container)', margin: '8px 0 4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.max(4, b2Pct)}%`, background: 'var(--cognate-gold)' }} />
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                                    Hoàn thành {b2Done} / {b2Lessons.length} bài cao cấp B2 (Thương mại, Bán dẫn, Thuế vụ, Diễn thuyết)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* COMPONENT D: ACHIEVEMENTS & BADGES */}
                    <div className="bento-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div>
                                <span className="badge-pill badge-neutral" style={{ marginBottom: '4px' }}>Huân chương học giả</span>
                                <h3 style={{ margin: '4px 0 0' }}>Tủ huy hiệu Sinology (成就徽章)</h3>
                            </div>
                            <span className="badge-pill badge-jade">{unlockedCount} / {badges.length} Đã mở</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                            {badges.map(badge => (
                                <div
                                    key={badge.title}
                                    style={{
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: 'var(--surface-container-low)',
                                        border: badge.unlocked ? '1px solid rgba(5, 150, 105, 0.25)' : '1px dashed var(--border-strong)',
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span style={{ fontSize: '24px' }}>{badge.icon}</span>
                                    <div>
                                        <strong style={{ fontSize: '12px' }}>{badge.title}</strong>
                                        <div style={{ fontSize: '10px', color: badge.unlocked ? 'var(--jade-emerald)' : 'var(--cognate-gold)' }}>
                                            {badge.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* SETTINGS & DATA MANAGEMENT (Preserves all existing IDs and features) */}
            <div className="bento-grid">
                {/* Profile and Goal Form */}
                <div className="col-span-6 bento-card">
                    <h3 style={{ margin: '0 0 16px' }}>Cài đặt hồ sơ & Nhịp học</h3>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            if (!name.trim()) {
                                notify('Vui lòng nhập tên của bạn.');
                                return;
                            }
                            try {
                                setState(updateProfile(state, { name: name.trim(), dailyGoal: goal }));
                                notify('Đã lưu cài đặt.');
                            } catch (err) {
                                notify(err instanceof Error ? err.message : 'Cài đặt không hợp lệ.');
                            }
                        }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                    >
                        <label htmlFor="profile-name" style={{ fontSize: '12px', fontWeight: 600 }}>Tên của bạn</label>
                        <input
                            id="profile-name"
                            required
                            maxLength={40}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--surface-container-low)', fontSize: '14px' }}
                        />

                        <label htmlFor="daily-goal" style={{ fontSize: '12px', fontWeight: 600 }}>Mục tiêu mỗi ngày</label>
                        <select
                            id="daily-goal"
                            value={goal}
                            onChange={e => setGoal(Number(e.target.value))}
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--surface-container-low)', fontSize: '14px' }}
                        >
                            <option value={10}>10 điểm · Nhẹ nhàng</option>
                            <option value={20}>20 điểm · Đều đặn</option>
                            <option value={30}>30 điểm · Tập trung</option>
                            <option value={50}>50 điểm · Bứt phá</option>
                            <option value={100}>100 điểm · Chuyên sâu</option>
                        </select>

                        <button className="bento-btn-primary" type="submit" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                            Lưu cài đặt
                        </button>
                    </form>
                </div>

                {/* Data Backup & Reset */}
                <div className="col-span-6 bento-card">
                    <h3 style={{ margin: '0 0 8px' }}>Dữ liệu của bạn</h3>
                    <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                        Tiến độ được lưu trên trình duyệt này. Xuất một bản sao để chuyển thiết bị hoặc sao lưu.
                    </p>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        <Button
                            secondary
                            onClick={() => {
                                const url = URL.createObjectURL(
                                    new Blob([exportState(state)], { type: 'application/json' })
                                );
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = 'zhongxue-tien-do.json';
                                link.click();
                                URL.revokeObjectURL(url);
                                notify('Đã xuất bản sao dữ liệu.');
                            }}
                        >
                            <Download size={16} /> Xuất dữ liệu
                        </Button>

                        <Button secondary onClick={() => fileInputRef.current?.click()}>
                            <Upload size={16} /> Nhập dữ liệu
                        </Button>

                        <input
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            aria-label="Chọn tệp dữ liệu JSON"
                            type="file"
                            accept="application/json,.json"
                            onChange={e => {
                                void readFile(e.target.files?.[0]);
                                e.target.value = '';
                            }}
                        />
                    </div>

                    <button
                        ref={resetTriggerButtonRef}
                        type="button"
                        style={{ color: 'var(--vermilion-cinnabar)', fontSize: '12px', alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onClick={() => setReset(true)}
                    >
                        Xóa toàn bộ tiến độ
                    </button>

                    {reset && (
                        <div
                            className="bento-banner"
                            role="dialog"
                            aria-modal="false"
                            aria-label="Xác nhận xóa tiến độ"
                            style={{ marginTop: '16px', background: 'var(--vermilion-tint)', borderColor: 'rgba(200, 50, 43, 0.3)', flexDirection: 'column', alignItems: 'stretch' }}
                        >
                            <h4 style={{ margin: '0 0 6px', color: 'var(--vermilion-cinnabar)' }}>Xóa tiến độ trên thiết bị này?</h4>
                            <p style={{ margin: '0 0 10px', fontSize: '12px' }}>
                                Thao tác này xóa bài học, từ đã lưu và lịch ôn. Nhập XÓA để xác nhận. (Nhấn Esc để hủy)
                            </p>
                            <input
                                ref={confirmInputRef}
                                aria-label="Nhập XÓA để xác nhận"
                                value={confirmation}
                                onChange={e => setConfirmation(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-strong)', marginBottom: '10px' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button secondary onClick={closeResetDialog}>
                                    Hủy
                                </Button>
                                <button
                                    type="button"
                                    className="bento-btn-primary"
                                    disabled={confirmation !== 'XÓA'}
                                    onClick={() => {
                                        const next = createInitialState();
                                        setState(next);
                                        setName(next.profile.name);
                                        setGoal(next.profile.dailyGoal);
                                        setReset(false);
                                        setConfirmation('');
                                        notify('Đã xóa tiến độ. Bạn có thể bắt đầu hành trình mới.');
                                        resetTriggerButtonRef.current?.focus();
                                    }}
                                >
                                    Xác nhận xóa
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* COMPONENT F: AI CONFIGURATION */}
            <div className="panel" style={{ padding: '24px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>🤖</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Trạng thái Kết nối Trợ lý AI (AgentRouter / LLM)</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                Định tuyến qua AgentRouter (DeepSeek V4 Flash) hoặc OpenRouter, kèm bộ đệm Sinology NLP ngoại tuyến.
                            </p>
                        </div>
                    </div>
                    <span className={`badge-pill ${aiHealth?.ok ? 'badge-jade' : aiHealth ? 'badge-cinnabar' : 'badge-gold'}`} style={{ fontSize: '12px' }}>
                        {aiHealth?.ok
                            ? `● Đã kết nối (${aiHealth.latencyMs}ms)`
                            : aiHealth
                                ? '● Kết nối lỗi'
                                : '● Đang chờ kiểm tra'}
                    </span>
                </div>

                <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--surface-container-low)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--on-surface)' }}>
                                API Base URL:
                            </label>
                            <input
                                type="text"
                                value={aiBaseUrl}
                                onChange={e => setAiBaseUrl(e.target.value)}
                                placeholder="https://agentrouter.org/v1"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--surface-container-lowest)', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--on-surface)' }}>
                                Model ID:
                            </label>
                            <input
                                type="text"
                                value={aiModel}
                                onChange={e => setAiModel(e.target.value)}
                                placeholder="deepseek-v4-flash"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--surface-container-lowest)', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--on-surface)' }}>
                            API Key (Tùy chọn ghi đè, mặc định dùng từ file .env):
                        </label>
                        <input
                            type="password"
                            placeholder="Để trống nếu muốn dùng khóa mặc định từ hệ thống"
                            value={aiApiKey}
                            onChange={e => setAiApiKey(e.target.value)}
                            aria-label="Khóa API AI"
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--surface-container-lowest)', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>

                    {aiHealth && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '6px',
                            marginBottom: '14px',
                            fontSize: '12px',
                            background: aiHealth.ok ? 'rgba(46, 125, 50, 0.08)' : 'rgba(211, 47, 47, 0.08)',
                            border: `1px solid ${aiHealth.ok ? 'var(--jade-emerald)' : 'var(--vermilion-cinnabar)'}`,
                            color: 'var(--on-surface)'
                        }}>
                            {aiHealth.ok ? (
                                <div>
                                    <strong>✅ Kết nối thành công!</strong> Đang sử dụng <code>{aiHealth.provider}</code> qua <code>{aiHealth.baseUrl}</code>. Độ trễ: <strong>{aiHealth.latencyMs}ms</strong>.
                                </div>
                            ) : (
                                <div>
                                    <strong>❌ Lỗi kết nối:</strong> {aiHealth.error}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="bento-btn-primary"
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                            onClick={() => {
                                try {
                                    window.localStorage.setItem('zhongxue.ai.config', JSON.stringify({
                                        apiKey: aiApiKey.trim(),
                                        baseUrl: aiBaseUrl.trim(),
                                        model: aiModel.trim()
                                    }));
                                    notify('Đã lưu cấu hình AI thành công.');
                                } catch {
                                    notify('Không thể lưu cài đặt.');
                                }
                            }}
                        >
                            Lưu cấu hình
                        </button>

                        <button
                            type="button"
                            className="bento-btn-secondary"
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                            disabled={testingAi}
                            onClick={async () => {
                                setTestingAi(true);
                                try {
                                    const curModel = aiModel.trim();
                                    const curKey = aiApiKey.trim();
                                    const curBase = aiBaseUrl.trim();
                                    try {
                                        window.localStorage.setItem('zhongxue.ai.config', JSON.stringify({
                                            apiKey: curKey,
                                            baseUrl: curBase,
                                            model: curModel
                                        }));
                                    } catch {
                                        //
                                    }
                                    const res = await checkAiHealth(curModel, curKey, curBase);
                                    setAiHealth(res);
                                    if (res.ok) {
                                        notify(`Kết nối ${res.provider} thành công! (${res.latencyMs}ms)`);
                                    } else {
                                        notify(`Lỗi: ${res.error}`);
                                    }
                                } catch (e) {
                                    const msg = e instanceof Error ? e.message : 'Lỗi kết nối';
                                    setAiHealth({
                                        ok: false,
                                        provider: 'AgentRouter',
                                        model: aiModel,
                                        baseUrl: aiBaseUrl,
                                        error: msg
                                    });
                                    notify(`Kiểm tra thất bại: ${msg}`);
                                } finally {
                                    setTestingAi(false);
                                }
                            }}
                        >
                            {testingAi ? 'Đang kiểm tra kết nối...' : `⚡ Kiểm tra kết nối (${aiModel})`}
                        </button>

                        <button
                            type="button"
                            className="bento-btn-secondary"
                            style={{ padding: '8px 14px', fontSize: '12px', background: aiModel === 'gpt-6.1-sol' ? 'var(--gold-tint)' : undefined }}
                            onClick={() => {
                                const nextModel = 'gpt-6.1-sol';
                                const nextBase = 'https://agentrouter.org/v1';
                                setAiBaseUrl(nextBase);
                                setAiModel(nextModel);
                                try {
                                    const raw = window.localStorage.getItem('zhongxue.ai.config');
                                    const prev = raw ? JSON.parse(raw) : {};
                                    window.localStorage.setItem('zhongxue.ai.config', JSON.stringify({
                                        ...prev,
                                        baseUrl: nextBase,
                                        model: nextModel
                                    }));
                                } catch {
                                    //
                                }
                                notify('Đã chuyển sang mô hình GPT-6.1 Sol (AgentRouter)');
                            }}
                        >
                            🌟 GPT-6.1 Sol (Khuyên dùng)
                        </button>

                        <button
                            type="button"
                            className="bento-btn-secondary"
                            style={{ padding: '8px 14px', fontSize: '12px', background: aiModel === 'deepseek-v4-flash' ? 'var(--jade-tint)' : undefined }}
                            onClick={() => {
                                const nextModel = 'deepseek-v4-flash';
                                const nextBase = 'https://agentrouter.org/v1';
                                setAiBaseUrl(nextBase);
                                setAiModel(nextModel);
                                try {
                                    const raw = window.localStorage.getItem('zhongxue.ai.config');
                                    const prev = raw ? JSON.parse(raw) : {};
                                    window.localStorage.setItem('zhongxue.ai.config', JSON.stringify({
                                        ...prev,
                                        baseUrl: nextBase,
                                        model: nextModel
                                    }));
                                } catch {
                                    //
                                }
                                notify('Đã chuyển sang mô hình DeepSeek V4 Flash');
                            }}
                        >
                            ⚡ DeepSeek V4 Flash
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
