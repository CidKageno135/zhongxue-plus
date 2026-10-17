import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
    completeLesson,
    getDueWords,
    getStats,
    loadState,
    reviewWord,
    saveState,
    searchWords,
    toggleSavedWord,
    type LearningState
} from './domain/learning';
import type { Lesson, Scenario } from './types';
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
    const [notice, setNotice] = useState(loaded.error ?? '');
    const [menu, setMenu] = useState(false);

    const heading = useRef<HTMLElement>(null);
    const stats = getStats(state);
    const due = getDueWords(state);

    useEffect(() => {
        if (loaded.error && state === loaded.state) return;
        const error = saveState(state);
        if (error) {
            queueMicrotask(() => setNotice(error));
        }
    }, [state, loaded]);

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
        setRoute(next);
        setLesson(null);
        setScenario(null);
        setMenu(false);
    }

    function saveWord(id: string) {
        setState(s => toggleSavedWord(s, id));
    }

    function launch(l: Lesson) {
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
                    profileName={state.profile.name}
                    onNavigate={navigate}
                    dueCount={due.length}
                />

                <main id="main-content" tabIndex={-1} ref={heading}>
                    {lesson ? (
                        <LessonFlow
                            key={lesson.id}
                            lesson={lesson}
                            saved={state.savedWordIds}
                            onSave={saveWord}
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
