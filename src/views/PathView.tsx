import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import type { Lesson } from '../types';
import type { LearningState } from '../domain/learning';
import { lessons } from '../data/lessons';
import { getStats } from '../domain/learning';
import { Button } from '../components/Button';

interface PathViewProps {
    state: LearningState;
    onLaunch: (l: Lesson) => void;
}

export function PathView({ state, onLaunch }: PathViewProps) {
    const [levelFilter, setLevelFilter] = useState<'ALL' | 'A1' | 'A2' | 'B1' | 'B2'>('ALL');
    const stats = getStats(state);

    const displayedLessons = levelFilter === 'ALL'
        ? lessons
        : lessons.filter(l => l.level === levelFilter);

    const filterCounts = {
        ALL: lessons.length,
        A1: lessons.filter(l => l.level === 'A1').length,
        A2: lessons.filter(l => l.level === 'A2').length,
        B1: lessons.filter(l => l.level === 'B1').length,
        B2: lessons.filter(l => l.level === 'B2').length
    };

    return (
        <>
            <p className="eyebrow">TỪ CÂU ĐẦU TIÊN ĐẾN CUỘC SỐNG VÀ CÔNG NGHỆ CAO</p>
            <h1>Một lộ trình, nhiều khám phá.</h1>
            <p className="muted">
                Tiếng Hoa phồn thể · Đài Loan · Toàn diện {lessons.length} bài học A1–B2 · Học theo nhịp của bạn
            </p>

            <div className="path-overview panel">
                <div>
                    <h2>Bắt đầu từ những điều gần gũi đến chuyên sâu</h2>
                    <p>{stats.completedLessons}/{lessons.length} bài đã hoàn thành</p>
                </div>
                <progress
                    max={lessons.length}
                    value={stats.completedLessons}
                    aria-label="Tiến độ lộ trình"
                />
            </div>

            {/* Level Selector Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                margin: '18px 0 24px',
                overflowX: 'auto',
                maxWidth: '100%',
                paddingBottom: '4px'
            }}>
                {(['ALL', 'A1', 'A2', 'B1', 'B2'] as const).map(lvl => {
                    const active = levelFilter === lvl;
                    const label = lvl === 'ALL' ? `Tất cả (${filterCounts.ALL})` : `TOCFL ${lvl} (${filterCounts[lvl]} bài)`;
                    return (
                        <button
                            key={lvl}
                            type="button"
                            onClick={() => setLevelFilter(lvl)}
                            className="filter-button"
                            style={{
                                padding: '6px 14px',
                                borderRadius: '999px',
                                border: `1px solid ${active ? 'var(--vermilion-cinnabar)' : 'var(--border-strong)'}`,
                                background: active ? 'var(--vermilion-cinnabar)' : 'var(--ivory-surface)',
                                color: active ? '#ffffff' : 'var(--on-surface)',
                                fontWeight: active ? 700 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            <div className="path-list">
                {displayedLessons.map((l, i) => {
                    const isCompleted = state.completedLessonIds.includes(l.id);
                    const score = state.quizScores[l.id];
                    const globalIdx = lessons.findIndex(item => item.id === l.id);
                    return (
                        <article key={l.id} className="path-card panel">
                            <span className={`path-number ${isCompleted ? 'finished' : ''}`}>
                                {isCompleted ? <Check /> : String((globalIdx >= 0 ? globalIdx : i) + 1).padStart(2, '0')}
                            </span>
                            <span className="path-emoji">{l.icon}</span>
                            <div className="path-description">
                                <span className="eyebrow">{l.level} · {l.category}</span>
                                <h2>{l.title}</h2>
                                <p>{l.subtitle}</p>
                                <small>
                                    {l.duration} phút · {l.words.length} từ mới
                                    {score ? ` · Kết quả ${score.correct}/${score.total}` : ''}
                                </small>
                            </div>
                            <Button
                                secondary={isCompleted}
                                onClick={() => onLaunch(l)}
                            >
                                {isCompleted ? 'Học lại' : 'Học bài này'} <ArrowRight size={16} />
                            </Button>
                        </article>
                    );
                })}
            </div>
        </>
    );
}
