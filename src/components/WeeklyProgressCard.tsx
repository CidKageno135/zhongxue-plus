import { Calendar } from 'lucide-react';
import type { WeeklyProgress } from '../domain/learning';

interface WeeklyProgressCardProps {
    weekly: WeeklyProgress;
    dailyGoal: number;
}

export function WeeklyProgressCard({ weekly, dailyGoal }: WeeklyProgressCardProps) {
    return (
        <section className="weekly-card panel" aria-label="Tiến độ học tuần này">
            <div className="row between">
                <span className="eyebrow">TIẾN ĐỘ TUẦN NÀY</span>
                <Calendar size={18} />
            </div>
            <div className="weekly-summary">
                <strong>{weekly.totalXp} <small>XP tuần này</small></strong>
                <span>{weekly.activeDays > 0 ? `Đã học ${weekly.activeDays}/7 ngày` : 'Chưa có hoạt động'}</span>
            </div>
            <div className="weekly-bars" role="group" aria-label="Biểu đồ 7 ngày gần nhất">
                {weekly.days.map((day) => {
                    const heightPercent = day.xp > 0 ? Math.min(100, Math.max(18, Math.round((day.xp / dailyGoal) * 100))) : 8;
                    return (
                        <div key={day.date} className={`weekly-bar-col ${day.isToday ? 'today' : ''} ${day.metGoal ? 'goal-met' : ''}`}>
                            <div className="bar-track" title={`${day.date}: ${day.xp} XP`}>
                                <div
                                    className="bar-fill"
                                    style={{ height: `${heightPercent}%` }}
                                    aria-label={`${day.dayLabel} (${day.date}): ${day.xp} XP`}
                                />
                            </div>
                            <span className="bar-label">{day.dayLabel}</span>
                        </div>
                    );
                })}
            </div>
            {!weekly.hasActivity ? (
                <p className="muted zero-state-note">
                    Chưa có hoạt động nào trong 7 ngày qua. Hãy bắt đầu một bài học để ghi lại ngày đầu tiên!
                </p>
            ) : (
                <p className="muted weekly-note">
                    {weekly.activeDays >= 3 ? 'Nhịp học rất đều đặn, tiếp tục duy trì nhé!' : 'Duy trì mỗi ngày một chút để tạo thói quen vững chắc.'}
                </p>
            )}
        </section>
    );
}
