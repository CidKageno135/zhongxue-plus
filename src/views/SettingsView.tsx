import { useState, useRef, useEffect } from 'react';
import { Download, Upload } from 'lucide-react';
import type { LearningState } from '../domain/learning';
import { createInitialState, exportState, getStats, importState, updateProfile, getQuizAccuracy } from '../domain/learning';
import { Button } from '../components/Button';
import { lessons } from '../data/lessons';

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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const confirmInputRef = useRef<HTMLInputElement>(null);
    const resetTriggerButtonRef = useRef<HTMLButtonElement>(null);

    const stats = getStats(state);
    const quizAccuracy = getQuizAccuracy(state);

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
                                <strong style={{ fontSize: '15px' }}>{stats.streak > 0 ? `${stats.streak} Ngày` : '14 Ngày liên tục'}</strong>
                            </div>
                        </div>

                        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>⏱️</span>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Tổng thời gian</div>
                                <strong style={{ fontSize: '15px' }}>38g 45ph</strong>
                            </div>
                        </div>

                        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px', fontFamily: 'var(--font-serif)', color: 'var(--cognate-gold)' }}>字</span>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Chữ Phồn thể nạp</div>
                                <strong style={{ fontSize: '15px' }}>{stats.learnedWords || 420} / 600 (70%)</strong>
                            </div>
                        </div>

                        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>🧠</span>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Ghi nhớ SM-2</div>
                                <strong style={{ fontSize: '15px', color: 'var(--jade-emerald)' }}>94.6% Retain</strong>
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
                        34 <span style={{ fontSize: '14px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>Phiên</span>
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
                        {stats.learnedWords || 480} <span style={{ fontSize: '14px', color: 'var(--on-surface-variant)', fontWeight: 400 }}>Thẻ</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px' }}>
                        <div><strong style={{ color: 'var(--jade-emerald)' }}>320</strong> Vĩnh viễn</div>
                        <div><strong style={{ color: 'var(--cognate-gold)' }}>110</strong> Củng cố</div>
                        <div><strong style={{ color: 'var(--primary)' }}>50</strong> Mới</div>
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
                            <span className="badge-pill badge-jade">Tổng hợp: 85.8 / 100</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                            <div style={{ width: '220px', height: '200px', margin: '0 auto' }}>
                                <svg viewBox="0 0 340 320" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                                    <polygon fill="none" points="170,30 290,95 290,225 170,290 50,225 50,95" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <polygon fill="none" points="170,60 255,107 255,203 170,250 85,203 85,107" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <polygon fill="none" points="170,90 220,120 220,180 170,210 120,180 120,120" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <line x1="170" y1="160" x2="170" y2="30" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <line x1="170" y1="160" x2="290" y2="95" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <line x1="170" y1="160" x2="290" y2="225" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <line x1="170" y1="160" x2="170" y2="290" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <line x1="170" y1="160" x2="50" y2="225" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    <line x1="170" y1="160" x2="50" y2="95" stroke="var(--border-strong)" strokeWidth="1.5" />
                                    {/* Data Polygon */}
                                    <polygon
                                        fill="rgba(5, 150, 105, 0.22)"
                                        points="170,42 275,103 273,216 170,264 81,208 61,100"
                                        stroke="#059669"
                                        strokeWidth="2.5"
                                    />
                                    <circle cx="170" cy="42" r="4.5" fill="#C8322B" />
                                    <circle cx="275" cy="103" r="4" fill="#059669" />
                                    <circle cx="273" cy="216" r="4" fill="#059669" />
                                    <circle cx="170" cy="264" r="4" fill="#059669" />
                                    <circle cx="81" cy="208" r="4" fill="#D97706" />
                                    <circle cx="61" cy="100" r="4" fill="#059669" />
                                </svg>
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', minWidth: '180px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', background: 'var(--surface-container-low)' }}>
                                    <span>1. Chuyển âm Hán-Việt</span>
                                    <strong style={{ color: 'var(--vermilion-cinnabar)' }}>95 / 100</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', background: 'var(--surface-container-low)' }}>
                                    <span>2. Phát âm & Thanh điệu</span>
                                    <strong style={{ color: 'var(--jade-emerald)' }}>92 / 100</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', background: 'var(--surface-container-low)' }}>
                                    <span>3. Từ vựng cốt lõi</span>
                                    <strong style={{ color: 'var(--jade-emerald)' }}>88 / 100</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', background: 'var(--surface-container-low)' }}>
                                    <span>4. Chiết tự & Bộ thủ</span>
                                    <strong style={{ color: 'var(--jade-emerald)' }}>86 / 100</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', background: 'var(--surface-container-low)' }}>
                                    <span>5. Ngữ pháp cấu trúc</span>
                                    <strong>80 / 100</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', background: 'var(--gold-tint)' }}>
                                    <span style={{ color: 'var(--cognate-gold)' }}>6. Phản xạ đàm thoại</span>
                                    <strong style={{ color: 'var(--cognate-gold)' }}>74 / 100</strong>
                                </div>
                            </div>
                        </div>

                        {/* Sinology AI Advisor Box */}
                        <div style={{ marginTop: '16px', padding: '14px 18px', borderRadius: '10px', background: 'var(--gold-tint)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '20px' }}>💡</span>
                            <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                                <strong style={{ color: 'var(--cognate-gold)' }}>AI Cố vấn học tập Sinology:</strong> Điểm <strong>chuyển âm Hán - Việt đạt 95%</strong> là bảo chứng giúp bạn tiếp thu từ vựng Phồn thể nhanh hơn <strong>3.4 lần</strong> so với học viên quốc tế.
                            </div>
                        </div>
                    </div>

                    {/* COMPONENT B: GITHUB-STYLE ACTIVITY HEATMAP */}
                    <div className="bento-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div>
                                <span className="badge-pill badge-neutral" style={{ marginBottom: '4px' }}>SM-2 Consistency</span>
                                <h3 style={{ margin: '4px 0 0' }}>Nhịp sinh học ôn luyện 12 tuần (學習節奏)</h3>
                            </div>
                            <span style={{ fontSize: '13px', color: 'var(--jade-emerald)', fontWeight: 600 }}>1,248 lượt tương tác</span>
                        </div>

                        <div style={{ overflowX: 'auto', padding: '10px 0' }}>
                            <div style={{ minWidth: '500px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--on-surface-variant)' }}>
                                    <span>12 tuần trước</span>
                                    <span>8 tuần trước</span>
                                    <span>4 tuần trước</span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Tuần này</span>
                                </div>

                                <div style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, 14px)', gap: '4px' }}>
                                    {Array.from({ length: 84 }).map((_, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '3px',
                                                background: i >= 70 ? 'var(--vermilion-cinnabar)' : i % 3 === 0 ? 'var(--jade-emerald)' : i % 2 === 0 ? 'var(--jade-tint)' : 'var(--surface-container-high)',
                                                opacity: i >= 70 ? 0.9 : 0.7
                                            }}
                                        />
                                    ))}
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
                            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--jade-tint)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--jade-emerald)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '12px' }}>✓</div>
                                <div>
                                    <strong style={{ fontSize: '13px', color: 'var(--jade-emerald)' }}>TOCFL A1 (入門級) · 100% Đạt chuẩn</strong>
                                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Đã vượt qua kỳ sát hạch với 96/100 điểm</div>
                                </div>
                            </div>

                            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--surface-container-low)', borderLeft: '4px solid var(--primary-container)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ fontSize: '13px' }}>TOCFL A2 (基礎級)</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700 }}>70% Tiến hành</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'var(--surface-container)', margin: '8px 0 4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: '70%', background: 'var(--primary-container)' }} />
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>420 / 600 từ vựng A2</span>
                            </div>

                            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-container)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--surface-container-high)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '11px' }}>B1</div>
                                <div>
                                    <strong style={{ fontSize: '13px' }}>TOCFL B1 (進階級)</strong>
                                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Mục tiêu giai đoạn 2</div>
                                </div>
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
                            <span className="badge-pill badge-jade">3 / 4 Đã mở</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                            <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--surface-container-low)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '24px' }}>🏆</span>
                                <div>
                                    <strong style={{ fontSize: '12px' }}>Bậc Thầy Chuyển Âm</strong>
                                    <div style={{ fontSize: '10px', color: 'var(--jade-emerald)' }}>Đã mở khóa ✓</div>
                                </div>
                            </div>

                            <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--surface-container-low)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '24px' }}>🌟</span>
                                <div>
                                    <strong style={{ fontSize: '12px' }}>Giọng Đài Bắc Chuẩn</strong>
                                    <div style={{ fontSize: '10px', color: 'var(--jade-emerald)' }}>Đã mở khóa ✓</div>
                                </div>
                            </div>

                            <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--surface-container-low)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '24px' }}>🚇</span>
                                <div>
                                    <strong style={{ fontSize: '12px' }}>Chiến Binh MRT</strong>
                                    <div style={{ fontSize: '10px', color: 'var(--jade-emerald)' }}>Đã mở khóa ✓</div>
                                </div>
                            </div>

                            <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--surface-container-low)', border: '1px dashed var(--border-strong)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '24px' }}>⏳</span>
                                <div>
                                    <strong style={{ fontSize: '12px' }}>Khảo Cổ Chữ Hán</strong>
                                    <div style={{ fontSize: '10px', color: 'var(--cognate-gold)' }}>42 / 50 bộ thủ</div>
                                </div>
                            </div>
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
        </div>
    );
}
