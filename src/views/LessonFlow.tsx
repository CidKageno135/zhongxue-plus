import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import type { Lesson } from '../types';
import { WordCard } from '../components/WordCard';
import { SpeakButton } from '../components/SpeakButton';
import { Button } from '../components/Button';
import { loadLessonDraft, saveLessonDraft, type LessonDraft } from '../domain/learning';

interface LessonFlowProps {
    lesson: Lesson;
    onClose: () => void;
    onComplete: (correct: number, total: number) => void;
    onSave: (id: string) => void;
    saved: string[];
}

export function LessonFlow({
    lesson,
    onClose,
    onComplete,
    onSave,
    saved
}: LessonFlowProps) {
    // Check if there is an in-progress draft for this lesson
    const existingDraft = loadLessonDraft();
    const isMatchingDraft = existingDraft && existingDraft.lessonId === lesson.id;

    const [stage, setStage] = useState<number>(() => (isMatchingDraft ? existingDraft.stage : 0));
    const [question, setQuestion] = useState<number>(() => (isMatchingDraft ? existingDraft.question : 0));
    const [selected, setSelected] = useState<number | null>(() => (isMatchingDraft ? existingDraft.selected : null));
    const [correct, setCorrect] = useState<number>(() => (isMatchingDraft ? existingDraft.correct : 0));
    const [done, setDone] = useState(false);

    const stepHeadingRef = useRef<HTMLHeadingElement>(null);
    const stageNames = ['Từ vựng', 'Hội thoại', 'Ngữ pháp', 'Thử sức'];
    const current = lesson.quiz[question];

    // Save draft automatically as learner progresses
    useEffect(() => {
        if (done) {
            saveLessonDraft(null);
            return;
        }
        const draft: LessonDraft = {
            lessonId: lesson.id,
            stage,
            question,
            selected,
            correct
        };
        saveLessonDraft(draft);
    }, [lesson.id, stage, question, selected, correct, done]);

    // Manage focus smoothly on step transition
    useEffect(() => {
        stepHeadingRef.current?.focus();
    }, [stage, question]);

    function handleRestart() {
        setStage(0);
        setQuestion(0);
        setSelected(null);
        setCorrect(0);
        setDone(false);
        saveLessonDraft(null);
    }

    function handleFinish() {
        onComplete(correct, lesson.quiz.length);
        setDone(true);
        saveLessonDraft(null);
    }

    return (
        <div className="lesson-view">
            <div className="row between">
                <button type="button" className="text-button" onClick={onClose}>
                    <ArrowLeft size={17} /> Về lộ trình
                </button>
                <div className="row">
                    {(stage > 0 || question > 0) && !done && (
                        <button
                            type="button"
                            className="text-button"
                            onClick={handleRestart}
                            title="Học lại từ đầu bước 1"
                            aria-label="Học lại bài này từ đầu"
                        >
                            <RotateCcw size={14} /> Bắt đầu lại
                        </button>
                    )}
                    <span className="tag">{lesson.level} · {lesson.duration} phút</span>
                </div>
            </div>

            <h1>{lesson.title}</h1>
            <p className="muted">{lesson.subtitle}</p>

            <div className="lesson-steps" role="tablist" aria-label="Các bước bài học">
                {stageNames.map((s, i) => (
                    <span
                        key={s}
                        className={stage === i ? 'active' : stage > i ? 'complete' : ''}
                        role="tab"
                        aria-selected={stage === i}
                    >
                        {stage > i ? <Check size={14} /> : i + 1} {s}
                    </span>
                ))}
            </div>

            {done ? (
                <div className="completion panel" tabIndex={-1} ref={stepHeadingRef}>
                    <span className="completion-icon" aria-hidden="true">✦</span>
                    <p className="eyebrow">THÊM MỘT BƯỚC TIẾN</p>
                    <h2>Bạn đã hoàn thành bài học!</h2>
                    <p>Đúng {correct}/{lesson.quiz.length} câu. Mỗi lần thực hành đều giúp bạn tự tin hơn.</p>
                    <p className="muted">Tiến độ chỉ được cộng một lần cho mỗi bài. Bạn luôn có thể học lại.</p>
                    <Button onClick={onClose}>Về lộ trình <ArrowRight size={17} /></Button>
                </div>
            ) : (
                <>
                    {stage === 0 && (
                        <>
                            <div className="section-heading">
                                <h2 tabIndex={-1} ref={stepHeadingRef}>Những từ bạn sẽ dùng hôm nay</h2>
                                <span>{lesson.words.length} từ mới</span>
                            </div>
                            <div className="word-grid">
                                {lesson.words.map(w => (
                                    <WordCard
                                        key={w.id}
                                        word={w}
                                        saved={saved.includes(w.id)}
                                        onSave={() => onSave(w.id)}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {stage === 1 && (
                        <section className="panel dialogue">
                            <p className="eyebrow">NGHE VÀ ĐỌC THEO</p>
                            <h2 tabIndex={-1} ref={stepHeadingRef}>Một cuộc trò chuyện nhỏ</h2>
                            {lesson.dialogue.map((line, i) => (
                                <div className={`dialogue-line ${i % 2 ? 'right' : ''}`} key={i}>
                                    <span className="speaker">{line.speaker}</span>
                                    <div>
                                        <div className="row between">
                                            <p lang="zh-TW" className="chinese-line">{line.hanzi}</p>
                                            <SpeakButton text={line.hanzi} />
                                        </div>
                                        <p className="pinyin">{line.pinyin}</p>
                                        <p>{line.meaning}</p>
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {stage === 2 && (
                        <div className="grammar-grid">
                            {lesson.grammar.map((g, idx) => (
                                <article className="panel" key={g.title}>
                                    <p className="eyebrow">MẪU CÂU THỰC DỤNG</p>
                                    <h2 tabIndex={-1} ref={idx === 0 ? stepHeadingRef : undefined}>{g.title}</h2>
                                    <p className="grammar-pattern" lang="zh-TW">{g.pattern}</p>
                                    <p>{g.explanation}</p>
                                    <div className="example-box">
                                        <p lang="zh-TW">{g.example}</p>
                                        <p>{g.meaning}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {stage === 3 && current && (
                        <section className="panel quiz" aria-label="Phần kiểm tra">
                            <p className="eyebrow">CÂU {question + 1} / {lesson.quiz.length}</p>
                            <h2 tabIndex={-1} ref={stepHeadingRef}>{current.question}</h2>
                            <div className="quiz-options">
                                {current.options.map((option, i) => (
                                    <button
                                        key={option}
                                        type="button"
                                        disabled={selected !== null}
                                        className={`quiz-option ${selected !== null && i === current.answer ? 'correct' : ''} ${selected === i && i !== current.answer ? 'incorrect' : ''}`}
                                        onClick={() => {
                                            setSelected(i);
                                            if (i === current.answer) {
                                                setCorrect(c => c + 1);
                                            }
                                        }}
                                    >
                                        <span>{String.fromCharCode(65 + i)}</span>
                                        {option}
                                        {selected !== null && i === current.answer && <Check size={18} />}
                                    </button>
                                ))}
                            </div>
                            {selected !== null && (
                                <div className={`answer-feedback ${selected === current.answer ? 'success' : ''}`} role="status">
                                    <strong>{selected === current.answer ? 'Chính xác!' : 'Cùng xem lại nhé.'}</strong>
                                    <p>{current.explanation}</p>
                                </div>
                            )}
                        </section>
                    )}

                    <div className="lesson-actions">
                        {stage > 0 && stage < 3 && (
                            <Button secondary onClick={() => setStage(s => s - 1)}>Quay lại</Button>
                        )}
                        {stage < 3 ? (
                            <Button onClick={() => setStage(s => s + 1)}>Tiếp tục <ArrowRight size={17} /></Button>
                        ) : (
                            <Button
                                disabled={selected === null}
                                onClick={() => {
                                    if (question < lesson.quiz.length - 1) {
                                        setQuestion(q => q + 1);
                                        setSelected(null);
                                    } else {
                                        handleFinish();
                                    }
                                }}
                            >
                                {question < lesson.quiz.length - 1 ? 'Câu tiếp theo' : 'Hoàn thành bài học'} <ArrowRight size={17} />
                            </Button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
