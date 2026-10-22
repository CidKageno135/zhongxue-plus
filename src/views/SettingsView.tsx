import { useState, useRef, useEffect } from 'react';
import {
    Download,
    Upload,
    ShieldCheck,
    Server,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Info,
    Trash2,
    Activity,
    Cpu
} from 'lucide-react';
import type { LearningState } from '../domain/learning';
import {
    createInitialState,
    MAX_STATE_JSON_LENGTH,
    exportState,
    getStats,
    parseImportState,
    updateProfile,
    getQuizAccuracy,
    getSrsBreakdown,
    getCompetencyRadar,
    getActivityHeatmap
} from '../domain/learning';
import { Button } from '../components/Button';
import { lessons } from '../data/lessons';
import type { HealthResponse, AiConnectionStatus } from '../types';

interface SettingsViewProps {
    state: LearningState;
    setState: (s: LearningState) => void;
    onRestoreState: (s: LearningState) => string | null;
    notify: (s: string) => void;
}

const TRUSTED_AI_HOSTS = new Set([
    'agentrouter.org',
    'openrouter.ai',
    'api.openrouter.ai',
    'api.deepseek.com'
]);

function isTrustedBaseUrl(url: string): boolean {
    try {
        const parsed = new URL(url.trim());
        return TRUSTED_AI_HOSTS.has(parsed.hostname);
    } catch {
        return false;
    }
}

interface StoredAiConfig {
    authMode?: 'server' | 'client';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
}

function readStoredAiConfig(): StoredAiConfig {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem('zhongxue.ai.config');
        if (raw) return JSON.parse(raw);
    } catch {
        // ignore
    }
    return {};
}

export function SettingsView({ state, setState, onRestoreState, notify }: SettingsViewProps) {
    // -------------------------------------------------------------------------
    // Learning Profile State
    // -------------------------------------------------------------------------
    const [name, setName] = useState(state.profile.name);
    const [goal, setGoal] = useState(state.profile.dailyGoal);
    const [reset, setReset] = useState(false);
    const [confirmation, setConfirmation] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const confirmInputRef = useRef<HTMLInputElement>(null);
    const resetTriggerButtonRef = useRef<HTMLButtonElement>(null);

    // -------------------------------------------------------------------------
    // AI Configuration State (Server-Key vs Client-Key Mode)
    // -------------------------------------------------------------------------
    const initialConfig = useRef(readStoredAiConfig()).current;

    const [authMode, setAuthMode] = useState<'server' | 'client'>(() => {
        if (initialConfig.authMode) return initialConfig.authMode;
        if (initialConfig.apiKey) return 'client';
        return 'server';
    });
    const [aiApiKey, setAiApiKey] = useState(() => initialConfig.apiKey || '');
    const [aiBaseUrl, setAiBaseUrl] = useState(() => initialConfig.baseUrl || 'https://agentrouter.org/v1');
    const [aiModel, setAiModel] = useState(() => initialConfig.model || 'gpt-6.1-sol');

    // -------------------------------------------------------------------------
    // Health & Probe State
    // -------------------------------------------------------------------------
    const [systemHealth, setSystemHealth] = useState<HealthResponse | null>(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [healthError, setHealthError] = useState<string | null>(null);
    const [healthContentTypeOk, setHealthContentTypeOk] = useState<boolean | null>(null);

    const [testingAi, setTestingAi] = useState(false);
    const [aiHealth, setAiHealth] = useState<AiConnectionStatus | null>(null);

    // -------------------------------------------------------------------------
    // Learning Metrics & Analytics
    // -------------------------------------------------------------------------
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
            // UTF-8 may use three bytes per UTF-16 code unit; importState enforces the shared character limit.
            if (file.size > MAX_STATE_JSON_LENGTH * 3) {
                throw new Error('Tệp dữ liệu quá lớn.');
            }
            const next = parseImportState(await file.text());
            const error = onRestoreState(next);
            if (error) throw new Error(error);
            setName(next.profile.name);
            setGoal(next.profile.dailyGoal);
            notify('Đã nhập dữ liệu học tập.');
        } catch (error) {
            notify(error instanceof Error ? error.message : 'Không thể nhập tệp.');
        }
    }

    // -------------------------------------------------------------------------
    // Health Probe (/api/health)
    // -------------------------------------------------------------------------
    async function probeSystemHealth() {
        setHealthLoading(true);
        setHealthError(null);
        try {
            const res = await fetch('/api/health', {
                headers: { Accept: 'application/json' }
            });
            const contentType = res.headers.get('content-type') || '';
            const isJson = contentType.includes('application/json');
            setHealthContentTypeOk(isJson);

            if (!isJson) {
                throw new Error(`Content-Type không phải JSON: ${contentType || 'trống'}`);
            }

            const data: HealthResponse = await res.json();
            setSystemHealth(data);
            if (res.ok) {
                notify(`Máy chủ hoạt động tốt. Từ điển nạp ${data.dictionary.totalEntries.toLocaleString()} mục.`);
            } else {
                notify(`Máy chủ cảnh báo: trạng thái ${data.status}`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Không thể kết nối /api/health';
            setHealthError(msg);
            setHealthContentTypeOk(false);
            notify(`Kiểm tra hệ thống thất bại: ${msg}`);
        } finally {
            setHealthLoading(false);
        }
    }

    useEffect(() => {
        let isMounted = true;
        async function checkHealthOnMount() {
            try {
                const res = await fetch('/api/health', {
                    headers: { Accept: 'application/json' }
                });
                const contentType = res.headers.get('content-type') || '';
                const isJson = contentType.includes('application/json');
                if (!isMounted) return;
                setHealthContentTypeOk(isJson);
                if (isJson) {
                    const data: HealthResponse = await res.json();
                    if (!isMounted) return;
                    setSystemHealth(data);
                }
            } catch (err) {
                if (!isMounted) return;
                setHealthError(err instanceof Error ? err.message : 'Không thể kết nối /api/health');
                setHealthContentTypeOk(false);
            }
        }
        void checkHealthOnMount();
        return () => {
            isMounted = false;
        };
    }, []);

    // -------------------------------------------------------------------------
    // AI Ping Probe (/api/conversation with action: 'ping')
    // -------------------------------------------------------------------------
    function saveAiConfig(
        mode: 'server' | 'client' = authMode,
        key: string = aiApiKey,
        baseUrl: string = aiBaseUrl,
        model: string = aiModel
    ) {
        if (typeof window === 'undefined') return;
        try {
            const payload: Record<string, string> = {
                authMode: mode,
                baseUrl: baseUrl.trim(),
                model: model.trim()
            };
            // NEVER save server keys or placeholder keys; only save client key if explicitly in client mode
            if (mode === 'client' && key.trim()) {
                payload.apiKey = key.trim();
            }
            window.localStorage.setItem('zhongxue.ai.config', JSON.stringify(payload));
        } catch {
            // ignore
        }
    }

    async function handlePingAi() {
        setTestingAi(true);
        const curModel = aiModel.trim();
        const curBase = aiBaseUrl.trim();
        const curKey = authMode === 'client' ? aiApiKey.trim() : undefined;

        // Persist config safely
        saveAiConfig(authMode, curKey || '', curBase, curModel);

        const tStart = Date.now();
        try {
            const res = await fetch('/api/conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'ping',
                    model: curModel,
                    baseUrl: curBase,
                    apiKey: curKey
                })
            });

            const elapsed = Date.now() - tStart;
            if (res.ok) {
                const data: AiConnectionStatus = await res.json();
                setAiHealth({
                    ...data,
                    latencyMs: data.latencyMs ?? elapsed
                });
                if (data.ok) {
                    notify(`Kết nối AI thành công! (${data.latencyMs ?? elapsed}ms)`);
                } else {
                    notify(`Lỗi kết nối AI: ${data.error || 'Không xác định'}`);
                }
            } else {
                const errData = await res.json().catch(() => null);
                const errMsg = errData?.error?.message || `Mã lỗi HTTP ${res.status}`;
                const failed: AiConnectionStatus = {
                    ok: false,
                    provider: curBase.includes('agentrouter') ? 'AgentRouter' : 'Upstream',
                    model: curModel,
                    baseUrl: curBase,
                    statusCode: res.status,
                    latencyMs: elapsed,
                    error: errMsg
                };
                setAiHealth(failed);
                notify(`Kiểm tra AI thất bại: ${errMsg}`);
            }
        } catch (err) {
            const elapsed = Date.now() - tStart;
            const msg = err instanceof Error ? err.message : 'Lỗi kết nối mạng';
            setAiHealth({
                ok: false,
                provider: 'Offline / Network Error',
                model: curModel,
                baseUrl: curBase,
                latencyMs: elapsed,
                error: msg
            });
            notify(`Kiểm tra thất bại: ${msg}`);
        } finally {
            setTestingAi(false);
        }
    }

    function handleClearApiKey() {
        setAiApiKey('');
        setAuthMode('server');
        saveAiConfig('server', '', aiBaseUrl, aiModel);
        notify('Đã xóa khóa cá nhân. Trở về chế độ Khóa máy chủ an toàn.');
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

    // 6-axis Radar SVG coordinates
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

    const isBaseUrlTrusted = isTrustedBaseUrl(aiBaseUrl);

    return (
        <div onKeyDown={handleKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '100%', boxSizing: 'border-box' }}>
            {/* Page Header Bento Banner */}
            <div
                className="bento-card"
                style={{
                    padding: '24px',
                    background: 'linear-gradient(135deg, #ffffff 0%, var(--surface-container-low) 50%, var(--gold-tint) 100%)',
                    boxSizing: 'border-box',
                    maxWidth: '100%'
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="badge-pill badge-vermilion">學習紀錄 · HỒ SƠ NĂNG LỰC HÁN NGỮ PHỒN THỂ</span>
                        <span className="badge-pill badge-gold">Chuẩn TOCFL A2 (進階級)</span>
                        <span className="badge-pill badge-jade">SM-2 Algorithm Active</span>
                    </div>

                    <h1 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 28px)', lineHeight: 1.3 }}>
                        Kiến Tạo Ký Ức & Năng Lực Thực Chiến <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-serif)', fontSize: 'clamp(18px, 3.5vw, 24px)' }}>(看見每一次練習)</span>
                    </h1>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--on-surface-variant)', maxWidth: '780px' }}>
                        Hệ thống định lượng hóa tiến trình tích lũy chữ Hán, phản xạ thanh điệu Đài Bắc và năng lực khảo thí TOCFL dựa trên dữ liệu Spaced Repetition SM-2 kết hợp cầu nối từ nguyên Hán - Việt.
                    </p>

                    {/* Quick Meta Badges */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: '12px', marginTop: '12px' }}>
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
                    {/* RADAR CHART */}
                    <div className="bento-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
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

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', minWidth: 'min(200px, 100%)' }}>
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

                    {/* ACTIVITY HEATMAP */}
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

                        <div style={{ overflowX: 'auto', padding: '10px 0', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <div style={{ minWidth: '480px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                    {/* TOCFL ROADMAP */}
                    <div className="bento-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
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
                                    Hoàn thành {b1Done} / {b1Lessons.length} bài trung cấp B1
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
                                    Hoàn thành {b2Done} / {b2Lessons.length} bài cao cấp B2
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ACHIEVEMENTS & BADGES */}
                    <div className="bento-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <span className="badge-pill badge-neutral" style={{ marginBottom: '4px' }}>Huân chương học giả</span>
                                <h3 style={{ margin: '4px 0 0' }}>Tủ huy hiệu Sinology (成就徽章)</h3>
                            </div>
                            <span className="badge-pill badge-jade">{unlockedCount} / {badges.length} Đã mở</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: '10px' }}>
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

            {/* LEARNING PROFILE & DATA MANAGEMENT */}
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
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--surface-container-low)', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                        />

                        <label htmlFor="daily-goal" style={{ fontSize: '12px', fontWeight: 600 }}>Mục tiêu mỗi ngày</label>
                        <select
                            id="daily-goal"
                            value={goal}
                            onChange={e => setGoal(Number(e.target.value))}
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--surface-container-low)', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
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
                                try {
                                    const json = exportState(state);
                                    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = 'zhongxue-tien-do.json';
                                    link.click();
                                    URL.revokeObjectURL(url);
                                    notify('Đã xuất bản sao dữ liệu.');
                                } catch (error) {
                                    notify(error instanceof Error ? error.message : 'Không thể xuất dữ liệu.');
                                }
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
                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-strong)', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <Button secondary onClick={closeResetDialog}>
                                    Hủy
                                </Button>
                                <button
                                    type="button"
                                    className="bento-btn-primary"
                                    disabled={confirmation !== 'XÓA'}
                                    onClick={() => {
                                        const next = createInitialState();
                                        const error = onRestoreState(next);
                                        if (error) {
                                            notify(error);
                                            return;
                                        }
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

            {/* SYSTEM READINESS & REAL HEALTH PROBE CARD */}
            <div className="bento-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Server size={22} style={{ color: 'var(--primary)' }} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Trạng thái Sẵn sàng Hệ thống (/api/health)</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                Kiểm định máy chủ cùng origin, phản hồi chuẩn JSON, và dung lượng từ điển 122.000 từ.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="bento-btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        disabled={healthLoading}
                        onClick={() => void probeSystemHealth()}
                    >
                        <RefreshCw size={14} className={healthLoading ? 'spin' : ''} />
                        {healthLoading ? 'Đang kiểm tra...' : 'Kiểm tra hệ thống'}
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '12px' }}>
                    {/* Server Status */}
                    <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--surface-container-low)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Máy chủ Node / Vite</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {systemHealth?.status === 'ok' ? (
                                <>
                                    <CheckCircle2 size={16} color="var(--jade-emerald)" />
                                    <strong style={{ fontSize: '13px', color: 'var(--jade-emerald)' }}>Sẵn sàng (200 OK)</strong>
                                </>
                            ) : healthError ? (
                                <>
                                    <XCircle size={16} color="var(--vermilion-cinnabar)" />
                                    <strong style={{ fontSize: '13px', color: 'var(--vermilion-cinnabar)' }}>Ngoại tuyến / Lỗi</strong>
                                </>
                            ) : (
                                <>
                                    <Activity size={16} color="var(--cognate-gold)" />
                                    <strong style={{ fontSize: '13px', color: 'var(--cognate-gold)' }}>Đang kết nối...</strong>
                                </>
                            )}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                            {systemHealth?.version ? `Phiên bản v${systemHealth.version}` : 'Cổng máy chủ ứng dụng'}
                        </div>
                    </div>

                    {/* Content-Type Probe */}
                    <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--surface-container-low)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Định dạng Content-Type</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {healthContentTypeOk === true ? (
                                <>
                                    <CheckCircle2 size={16} color="var(--jade-emerald)" />
                                    <strong style={{ fontSize: '13px', color: 'var(--jade-emerald)' }}>application/json</strong>
                                </>
                            ) : healthContentTypeOk === false ? (
                                <>
                                    <XCircle size={16} color="var(--vermilion-cinnabar)" />
                                    <strong style={{ fontSize: '13px', color: 'var(--vermilion-cinnabar)' }}>Sai định dạng</strong>
                                </>
                            ) : (
                                <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Chờ kiểm tra</span>
                            )}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                            Ngăn ngừa HTML SPA fallback
                        </div>
                    </div>

                    {/* Dictionary 122k Status */}
                    <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--surface-container-low)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Động cơ từ điển 122k</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {systemHealth?.dictionary?.loaded ? (
                                <>
                                    <CheckCircle2 size={16} color="var(--jade-emerald)" />
                                    <strong style={{ fontSize: '13px', color: 'var(--jade-emerald)' }}>
                                        {systemHealth.dictionary.totalEntries.toLocaleString()} mục từ
                                    </strong>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={16} color="var(--cognate-gold)" />
                                    <strong style={{ fontSize: '13px', color: 'var(--cognate-gold)' }}>Chưa nạp đủ</strong>
                                </>
                            )}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                            {systemHealth?.dictionary?.loadTimeMs ? `Thời gian nạp: ${systemHealth.dictionary.loadTimeMs}ms` : 'Bộ dữ liệu CVDICT'}
                        </div>
                    </div>

                    {/* Server AI Config */}
                    <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--surface-container-low)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Khóa AI Máy chủ (.env)</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {systemHealth?.ai?.configured ? (
                                <>
                                    <ShieldCheck size={16} color="var(--jade-emerald)" />
                                    <strong style={{ fontSize: '13px', color: 'var(--jade-emerald)' }}>
                                        Đã cấu hình ({systemHealth.ai.provider})
                                    </strong>
                                </>
                            ) : (
                                <>
                                    <Info size={16} color="var(--on-surface-variant)" />
                                    <strong style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>Chưa cấu hình .env</strong>
                                </>
                            )}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                            {systemHealth?.ai?.model ? `Model: ${systemHealth.ai.model}` : 'Bảo vệ ranh giới bảo mật A03'}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI CONFIGURATION & PROVIDER MANAGEMENT */}
            <div className="bento-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Cpu size={22} style={{ color: 'var(--cognate-gold)' }} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Cài đặt Trợ lý AI & Ranh giới Bảo mật (AI Provider)</h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                Quản lý chế độ xác thực khóa máy chủ, nhà cung cấp upstream và kiểm tra kết nối AI tức thì.
                            </p>
                        </div>
                    </div>

                    <span
                        className={`badge-pill ${aiHealth?.ok ? 'badge-jade' : aiHealth ? 'badge-cinnabar' : 'badge-gold'}`}
                        style={{ fontSize: '12px' }}
                    >
                        {aiHealth?.ok
                            ? `● Đã kết nối (${aiHealth.latencyMs}ms)`
                            : aiHealth
                            ? '● Lỗi kết nối'
                            : '● Đang chờ kiểm tra'}
                    </span>
                </div>

                {/* AUTH MODE SELECTION (Server-Key Mode vs Client-Key Mode) */}
                <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '10px', background: 'var(--surface-container-low)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--on-surface)' }}>
                        Chế độ Xác thực Khóa API (Authentication Mode)
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Option 1: Server-Key Mode */}
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: authMode === 'server' ? 'rgba(5, 150, 105, 0.08)' : 'var(--surface-container)',
                                border: `1.5px solid ${authMode === 'server' ? 'var(--jade-emerald)' : 'transparent'}`
                            }}
                        >
                            <input
                                type="radio"
                                name="auth-mode"
                                value="server"
                                checked={authMode === 'server'}
                                onChange={() => {
                                    setAuthMode('server');
                                    saveAiConfig('server', '', aiBaseUrl, aiModel);
                                    notify('Đã chuyển sang: Sử dụng khóa máy chủ (Mặc định - An toàn)');
                                }}
                                style={{ marginTop: '3px' }}
                            />
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <strong style={{ fontSize: '13px', color: 'var(--on-surface)' }}>
                                        Sử dụng khóa máy chủ (Mặc định - An toàn)
                                    </strong>
                                    <span className="badge-pill badge-jade" style={{ fontSize: '10px' }}>Khuyên dùng</span>
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                    Không lưu API Key trên trình duyệt. Máy chủ tự động gắn khóa hệ thống an toàn khi gửi tới các endpoint tin cậy (AgentRouter, OpenRouter).
                                </p>
                            </div>
                        </label>

                        {/* Option 2: Client-Key Mode */}
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: authMode === 'client' ? 'rgba(217, 119, 6, 0.08)' : 'var(--surface-container)',
                                border: `1.5px solid ${authMode === 'client' ? 'var(--cognate-gold)' : 'transparent'}`
                            }}
                        >
                            <input
                                type="radio"
                                name="auth-mode"
                                value="client"
                                checked={authMode === 'client'}
                                onChange={() => {
                                    setAuthMode('client');
                                    saveAiConfig('client', aiApiKey, aiBaseUrl, aiModel);
                                    notify('Đã chuyển sang: Sử dụng khóa cá nhân (Tùy chọn)');
                                }}
                                style={{ marginTop: '3px' }}
                            />
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <strong style={{ fontSize: '13px', color: 'var(--on-surface)' }}>
                                        Sử dụng khóa cá nhân (Tùy chọn)
                                    </strong>
                                    <span className="badge-pill badge-neutral" style={{ fontSize: '10px' }}>Khóa người dùng</span>
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                    Nhập khóa API riêng của bạn (OpenRouter, AgentRouter cá nhân hoặc Custom endpoint). Bạn có thể xóa khóa này bất kỳ lúc nào.
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Mode Explanation Banner */}
                    {authMode === 'server' ? (
                        <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '6px', background: 'var(--jade-tint)', border: '1px solid rgba(5, 150, 105, 0.25)', fontSize: '12px', color: 'var(--jade-emerald)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                            <span>
                                <strong>Bảo mật tối đa:</strong> Trình duyệt không lưu trữ và không gửi bất kỳ khóa API nào trong request payload. Máy chủ backend bảo đảm ủy quyền trực tiếp.
                            </span>
                        </div>
                    ) : (
                        <div style={{ marginTop: '12px' }}>
                            <label htmlFor="ai-api-key" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--on-surface)' }}>
                                Khóa API cá nhân (API Key):
                            </label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <input
                                    id="ai-api-key"
                                    type="password"
                                    placeholder="sk-..."
                                    value={aiApiKey}
                                    onChange={e => setAiApiKey(e.target.value)}
                                    aria-label="Khóa API AI cá nhân"
                                    style={{
                                        flex: 1,
                                        minWidth: 'min(240px, 100%)',
                                        padding: '10px 14px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-strong)',
                                        background: 'var(--surface-container-lowest)',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <button
                                    type="button"
                                    className="bento-btn-secondary"
                                    onClick={handleClearApiKey}
                                    style={{ padding: '8px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--vermilion-cinnabar)' }}
                                    title="Xóa khóa cá nhân và quay về dùng khóa máy chủ"
                                    aria-label="Xóa khóa cá nhân"
                                >
                                    <Trash2 size={14} /> Xóa khóa
                                </button>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                                Khóa cá nhân chỉ lưu trong localStorage của trình duyệt hiện tại và không bao giờ xuất hiện trong file sao lưu tiến độ.
                            </div>
                        </div>
                    )}
                </div>

                {/* ENDPOINT & MODEL CONFIGURATION */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--on-surface)' }}>
                            Nhà cung cấp & Điểm cuối (Provider Presets)
                        </span>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="bento-btn-secondary"
                                style={{
                                    padding: '5px 12px',
                                    fontSize: '11px',
                                    background: aiBaseUrl.includes('agentrouter') ? 'var(--gold-tint)' : undefined
                                }}
                                onClick={() => {
                                    const nextBase = 'https://agentrouter.org/v1';
                                    const nextModel = 'gpt-6.1-sol';
                                    setAiBaseUrl(nextBase);
                                    setAiModel(nextModel);
                                    saveAiConfig(authMode, aiApiKey, nextBase, nextModel);
                                    notify('Đã chọn AgentRouter (GPT-6.1 Sol)');
                                }}
                            >
                                🌟 AgentRouter (Khuyên dùng)
                            </button>
                            <button
                                type="button"
                                className="bento-btn-secondary"
                                style={{
                                    padding: '5px 12px',
                                    fontSize: '11px',
                                    background: aiBaseUrl.includes('openrouter') ? 'var(--jade-tint)' : undefined
                                }}
                                onClick={() => {
                                    const nextBase = 'https://openrouter.ai/api/v1';
                                    const nextModel = 'deepseek/deepseek-chat';
                                    setAiBaseUrl(nextBase);
                                    setAiModel(nextModel);
                                    saveAiConfig(authMode, aiApiKey, nextBase, nextModel);
                                    notify('Đã chọn OpenRouter');
                                }}
                            >
                                🌐 OpenRouter
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '12px' }}>
                        <div>
                            <label htmlFor="ai-base-url" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--on-surface)' }}>
                                API Base URL:
                            </label>
                            <input
                                id="ai-base-url"
                                type="text"
                                value={aiBaseUrl}
                                onChange={e => setAiBaseUrl(e.target.value)}
                                placeholder="https://agentrouter.org/v1"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-strong)',
                                    background: 'var(--surface-container-lowest)',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div>
                            <label htmlFor="ai-model" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--on-surface)' }}>
                                Model ID:
                            </label>
                            <input
                                id="ai-model"
                                type="text"
                                value={aiModel}
                                onChange={e => setAiModel(e.target.value)}
                                placeholder="gpt-6.1-sol hoặc deepseek-v4-flash"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-strong)',
                                    background: 'var(--surface-container-lowest)',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>

                    {/* Quick Model Selector Pills */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', alignSelf: 'center' }}>Chọn nhanh model:</span>
                        <button
                            type="button"
                            className="bento-btn-secondary"
                            style={{ padding: '3px 10px', fontSize: '11px', background: aiModel === 'gpt-6.1-sol' ? 'var(--gold-tint)' : undefined }}
                            onClick={() => {
                                setAiModel('gpt-6.1-sol');
                                saveAiConfig(authMode, aiApiKey, aiBaseUrl, 'gpt-6.1-sol');
                            }}
                        >
                            GPT-6.1 Sol (AgentRouter)
                        </button>
                        <button
                            type="button"
                            className="bento-btn-secondary"
                            style={{ padding: '3px 10px', fontSize: '11px', background: aiModel === 'deepseek-v4-flash' ? 'var(--jade-tint)' : undefined }}
                            onClick={() => {
                                setAiModel('deepseek-v4-flash');
                                saveAiConfig(authMode, aiApiKey, aiBaseUrl, 'deepseek-v4-flash');
                            }}
                        >
                            DeepSeek V4 Flash
                        </button>
                        <button
                            type="button"
                            className="bento-btn-secondary"
                            style={{ padding: '3px 10px', fontSize: '11px', background: aiModel === 'deepseek/deepseek-chat' ? 'var(--surface-container)' : undefined }}
                            onClick={() => {
                                setAiModel('deepseek/deepseek-chat');
                                saveAiConfig(authMode, aiApiKey, aiBaseUrl, 'deepseek/deepseek-chat');
                            }}
                        >
                            DeepSeek V3 (OpenRouter)
                        </button>
                    </div>

                    {/* A03 Security Notice for Custom Endpoints */}
                    {!isBaseUrlTrusted && (
                        <div
                            style={{
                                marginTop: '12px',
                                padding: '12px 14px',
                                borderRadius: '8px',
                                background: 'rgba(217, 119, 6, 0.08)',
                                border: '1px solid var(--cognate-gold)',
                                fontSize: '12px',
                                color: 'var(--on-surface)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--cognate-gold)', marginBottom: '4px' }}>
                                <AlertTriangle size={16} /> Cảnh báo an ninh Upstream (Chính sách A03)
                            </div>
                            <div>
                                Endpoint <code>{aiBaseUrl}</code> không thuộc danh sách máy chủ tin cậy được ủy quyền.
                                Theo chính sách bảo mật, máy chủ sẽ <strong>KHÔNG chuyển tiếp khóa hệ thống</strong> tới địa chỉ này.
                                Bạn bắt buộc phải chọn <strong>"Sử dụng khóa cá nhân"</strong> và cung cấp API Key hợp lệ.
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Ping Result Card */}
                {aiHealth && (
                    <div
                        style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            fontSize: '12px',
                            background: aiHealth.ok ? 'rgba(5, 150, 105, 0.08)' : 'rgba(200, 50, 43, 0.08)',
                            border: `1px solid ${aiHealth.ok ? 'var(--jade-emerald)' : 'var(--vermilion-cinnabar)'}`,
                            color: 'var(--on-surface)'
                        }}
                    >
                        {aiHealth.ok ? (
                            <div>
                                <strong style={{ color: 'var(--jade-emerald)' }}>✅ Kết nối AI thành công!</strong>{' '}
                                Nhà cung cấp: <code>{aiHealth.provider}</code> | Model: <code>{aiHealth.model}</code> | Độ trễ: <strong>{aiHealth.latencyMs}ms</strong>
                            </div>
                        ) : (
                            <div>
                                <strong style={{ color: 'var(--vermilion-cinnabar)' }}>❌ Thử nghiệm kết nối thất bại:</strong>{' '}
                                {aiHealth.error} {aiHealth.statusCode ? `(Mã HTTP: ${aiHealth.statusCode})` : ''}
                            </div>
                        )}
                    </div>
                )}

                {/* AI Actions */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="bento-btn-primary"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => {
                            saveAiConfig(authMode, aiApiKey, aiBaseUrl, aiModel);
                            notify('Đã lưu cấu hình AI thành công.');
                        }}
                    >
                        Lưu cấu hình AI
                    </button>

                    <button
                        type="button"
                        className="bento-btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        disabled={testingAi}
                        onClick={() => void handlePingAi()}
                    >
                        <RefreshCw size={14} className={testingAi ? 'spin' : ''} />
                        {testingAi ? 'Đang kiểm tra kết nối...' : `⚡ Kiểm tra kết nối AI (Ping)`}
                    </button>
                </div>
            </div>
        </div>
    );
}
