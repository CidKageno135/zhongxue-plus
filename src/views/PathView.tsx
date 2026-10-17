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
    const stats = getStats(state);

    return (
        <>
            <p className="eyebrow">TỪ CÂU ĐẦU TIÊN ĐẾN CUỘC SỐNG HẰNG NGÀY</p>
            <h1>Một lộ trình, nhiều khám phá.</h1>
            <p className="muted">
                Tiếng Hoa phồn thể · Đài Loan · {lessons.length} bài học A1–A2 · Học theo nhịp của bạn
            </p>

            <div className="path-overview panel">
                <div>
                    <h2>Bắt đầu từ những điều gần gũi</h2>
                    <p>{stats.completedLessons}/{lessons.length} bài đã hoàn thành</p>
                </div>
                <progress
                    max={lessons.length}
                    value={stats.completedLessons}
                    aria-label="Tiến độ lộ trình"
                />
            </div>

            <div className="path-list">
                {lessons.map((l, i) => {
                    const isCompleted = state.completedLessonIds.includes(l.id);
                    const score = state.quizScores[l.id];
                    return (
                        <article key={l.id} className="path-card panel">
                            <span className={`path-number ${isCompleted ? 'finished' : ''}`}>
                                {isCompleted ? <Check /> : String(i + 1).padStart(2, '0')}
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
