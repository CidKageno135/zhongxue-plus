import { Award } from 'lucide-react';
import type { QuizAccuracy } from '../domain/learning';

interface QuizAccuracyCardProps {
    accuracy: QuizAccuracy;
}

export function QuizAccuracyCard({ accuracy }: QuizAccuracyCardProps) {
    return (
        <section className="accuracy-card panel" aria-label="Độ chính xác bài kiểm tra">
            <div className="row between">
                <span className="eyebrow">ĐỘ CHÍNH XÁC QUIZ</span>
                <Award size={18} />
            </div>
            {accuracy.percentage !== null ? (
                <>
                    <div className="accuracy-stat">
                        <strong className="accuracy-number">{accuracy.percentage}%</strong>
                        <span className="accuracy-sub">chính xác</span>
                    </div>
                    <div className="accuracy-bar-track" aria-hidden="true">
                        <div className="accuracy-bar-fill" style={{ width: `${accuracy.percentage}%` }} />
                    </div>
                    <p className="accuracy-details">
                        Đúng <strong>{accuracy.totalCorrect}</strong> / {accuracy.totalQuestions} câu qua {accuracy.completedQuizzes} bài kiểm tra.
                    </p>
                    <p className="muted">
                        {accuracy.percentage >= 80 ? 'Nắm bài rất vững vàng!' : 'Luyện lại để nâng cao phản xạ tự nhiên.'}
                    </p>
                </>
            ) : (
                <div className="accuracy-zero-state">
                    <strong>— %</strong>
                    <p className="accuracy-zero-title">Chưa có dữ liệu kiểm tra</p>
                    <p className="muted">
                        Hoàn thành phần thử sức ở cuối mỗi bài học để theo dõi độ chính xác thật tại đây.
                    </p>
                </div>
            )}
        </section>
    );
}
