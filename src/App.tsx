import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
    completeLesson,
    clearCustomWordRegistry,
    importState,
    exportState,
    getDueWords,
    getStats,
    loadState,
    reviewWord,
    saveLessonWords,
    saveState,
    saveWordsBatch,
    searchWords,
    toggleSavedWord,
    type LearningState
} from './domain/learning';
import type { Lesson, Scenario, Word } from './types';
import { Sidebar, type Route } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { TodayView } from './views/TodayView';
import { PathView } from './views/PathView';
import { LessonFlow } from './views/LessonFlow';
import { ScenarioFlow } from './views/ScenarioFlow';
import { ReviewView } from './views/ReviewView';
import { DictionaryView } from './views/DictionaryView';
import { ConversationListView } from './views/ConversationListView';
import { SettingsView } from './views/SettingsView';
import './styles.css';

export default function App() {
    const [loaded] = useState(() => loadState());
    const [state, setState] = useState<LearningState>(loaded.state);
    const [route, setRoute] = useState<Route>('today');
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [query, setQuery] = useState('');
    const [onlySaved, setOnlySaved] = useState(false);
    const [notice, setNotice] = useState(loaded.error ?? (loaded.isCorrupt ? 'Không thể đọc tiến độ đã lưu. Dữ liệu trong phiên này vẫn sử dụng được.' : ''));
    const [menu, setMenu] = useState(false);
    const [recoveryRequired, setRecoveryRequired] = useState(Boolean(loaded.error || loaded.isCorrupt));

    const heading = useRef<HTMLElement>(null);
    const stats = getStats(state);
    const due = getDueWords(state);

    useEffect(() => {
        if (recoveryRequired) return;
        const error = saveState(state);
        if (error) {
            queueMicrotask(() => setNotice(error));
        }
    }, [state, recoveryRequired]);

    useEffect(() => {
        heading.current?.focus();
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [route, lesson, scenario]);

    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(''), 6500);
        return () => clearTimeout(timer);
    }, [notice]);

    function navigate(next: Route) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setRoute(next);
        setLesson(null);
        setScenario(null);
        setMenu(false);
    }

    function saveWord(id: string, customWord?: Word) {
        setState(s => toggleSavedWord(s, id, customWord));
    }

    function launch(l: Lesson) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setLesson(l);
        setScenario(null);
    }

    const filtered = searchWords(query).filter(
        w => !onlySaved || state.savedWordIds.includes(w.id)
    );

    return (
        <div className="app-shell">
            <a href="#main-content" className="skip-link">
                Đến nội dung chính
            </a>

            <Sidebar
                route={route}
                menuOpen={menu}
                setMenuOpen={setMenu}
                onNavigate={navigate}
                dueCount={due.length}
                profile={state.profile}
            />

            <div className="main-shell">
                <Topbar
                    route={route}
                    menuOpen={menu}
                    setMenuOpen={setMenu}
                    streak={stats.streak}
                    xp={stats.xp}
                    profileName={state.profile.name}
                    onNavigate={navigate}
                    dueCount={due.length}
                />

                <main id="main-content" tabIndex={-1} ref={heading}>
                    {recoveryRequired && (
                        <section role="alert" aria-label="Khôi phục tiến độ">
                            <p>Không thể đọc tiến độ đã lưu. Tự động lưu đang tạm dừng để bảo vệ dữ liệu gốc. Bạn có thể nhập bản sao trong cài đặt trước khi tiếp tục.</p>
                            <button type="button" onClick={() => {
                                const error = saveState(state);
                                if (error) setNotice(error);
                                else {
                                    setRecoveryRequired(false);
                                    setNotice('Đã giữ bản sao dữ liệu gốc và tiếp tục lưu tiến độ hiện tại.');
                                }
                            }}>Giữ bản sao gốc và tiếp tục lưu</button>
                        </section>
                    )}
                    {lesson ? (
                        <LessonFlow
                            key={lesson.id}
                            lesson={lesson}
                            saved={state.savedWordIds}
                            onSave={saveWord}
                            onSaveAll={() => {
                                setState(s => saveLessonWords(s, lesson.id));
                                setNotice(`Đã lưu toàn bộ ${lesson.words.length} từ của bài học vào sổ tay ôn tập.`);
                            }}
                            onClose={() => {
                                setLesson(null);
                                setRoute('path');
                            }}
                            onComplete={(correct, total) =>
                                setState(s =>
                                    completeLesson(s, lesson.id, undefined, { correct, total })
                                )
                            }
                        />
                    ) : scenario ? (
                        <ScenarioFlow
                            scenario={scenario}
                            onClose={() => {
                                setScenario(null);
                                setRoute('conversation');
                            }}
                        />
                    ) : (
                        <>
                            {route === 'today' && (
                                <TodayView
                                    state={state}
                                    onLaunch={launch}
                                    onNavigate={navigate}
                                    onSelectWord={word => setQuery(word)}
                                    onToggleSave={saveWord}
                                    onReviewWord={(id, rating) =>
                                        setState(s => reviewWord(s, id, rating))
                                    }
                                />
                            )}

                            {route === 'path' && (
                                <PathView state={state} onLaunch={launch} />
                            )}

                            {route === 'review' && (
                                <ReviewView
                                    state={state}
                                    onReview={(id, rating) =>
                                        setState(s => reviewWord(s, id, rating))
                                    }
                                    onDictionary={() => navigate('dictionary')}
                                    onSaveWords={ids => setState(s => saveWordsBatch(s, ids))}
                                    onNotice={setNotice}
                                />
                            )}

                            {route === 'dictionary' && (
                                <DictionaryView
                                    query={query}
                                    setQuery={setQuery}
                                    onlySaved={onlySaved}
                                    setOnlySaved={setOnlySaved}
                                    filteredWords={filtered}
                                    savedWordIds={state.savedWordIds}
                                    onToggleSave={saveWord}
                                />
                            )}

                            {route === 'conversation' && (
                                <ConversationListView
                                    onSelectScenario={s => setScenario(s)}
                                />
                            )}

                            {route === 'settings' && (
                                <SettingsView
                                    state={state}
                                    setState={setState}
                                    onRestoreState={next => {
                                        const error = saveState(next);
                                        if (error) return error;
                                        const json = exportState(next);
                                        clearCustomWordRegistry();
                                        setState(importState(json));
                                        setRecoveryRequired(false);
                                        return null;
                                    }}
                                    notify={setNotice}
                                />
                            )}
                        </>
                    )}

                    <footer className="footer">
                        <span>中學 · ZhongXue</span>
                        <span>Mỗi ngày một chút, gần nhau hơn.</span>
                        <span>繁體中文 · 臺灣</span>
                    </footer>
                </main>
            </div>

            {notice && (
                <div className="toast" role="status" aria-live="polite">
                    <span>{notice}</span>
                    <button
                        type="button"
                        className="icon-button"
                        aria-label="Đóng thông báo"
                        onClick={() => setNotice('')}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
