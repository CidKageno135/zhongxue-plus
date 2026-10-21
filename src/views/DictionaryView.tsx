import { useState, useEffect } from 'react';
import { Bookmark, Search, X, Database, ArrowRight, Volume2, Edit3 } from 'lucide-react';
import type { Word } from '../types';
import { allWords, lessons } from '../data/lessons';
import { searchWords } from '../domain/learning';
import { WordCard } from '../components/WordCard';
import { searchDictionary, checkBackendHealth, type DbDictionaryResult } from '../services/api';
import { speakChinese } from '../services/speech';
import { HandwritingPad } from '../components/HandwritingPad';

interface DictionaryViewProps {
    query: string;
    setQuery: (q: string) => void;
    onlySaved: boolean;
    setOnlySaved: (s: boolean) => void;
    filteredWords: Word[];
    savedWordIds: string[];
    onToggleSave: (id: string, customWord?: Word) => void;
}

const TOPIC_FILTERS = [
    'Tất cả', 'A1', 'A2', 'B1', 'B2',
    'Giao tiếp', 'Ăn uống', 'Di chuyển', 'Đời sống', 'Công việc', 'Tài chính', 'Văn hóa', 'Thương mại', 'Công nghệ', 'Pháp lý'
] as const;

export function DictionaryView({
    query,
    setQuery,
    onlySaved,
    setOnlySaved,
    filteredWords,
    savedWordIds,
    onToggleSave
}: DictionaryViewProps) {
    const [dbResults, setDbResults] = useState<DbDictionaryResult[]>([]);
    const [totalCount, setTotalCount] = useState<number>(122595);
    const [resultTotal, setResultTotal] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [isDbSource, setIsDbSource] = useState(false);
    const [searchMode, setSearchMode] = useState<'all' | 'hanzi' | 'pinyin' | 'vi'>('all');
    const [showHandwriting, setShowHandwriting] = useState(false);
    const [topicFilter, setTopicFilter] = useState<string>('Tất cả');

    useEffect(() => {
        let active = true;
        void checkBackendHealth().then(health => {
            if (!active) return;
            if (health && health.online) {
                setIsDbSource(true);
                if (health.totalEntries > 0) {
                    setTotalCount(health.totalEntries);
                }
            } else {
                setIsDbSource(false);
            }
        });
        return () => {
            active = false;
        };
    }, []);

    // Query execution against PGlite database with instant initial local match
    useEffect(() => {
        const trimmed = query.trim();
        if (!trimmed) {
            const timer = setTimeout(() => {
                setDbResults([]);
                setResultTotal(0);
                setOffset(0);
                setLoading(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        let isMounted = true;
        const localMatches = searchWords(trimmed);
        const initialResults: DbDictionaryResult[] = localMatches.map((w: Word) => ({
            id: w.id,
            traditional: w.hanzi,
            simplified: w.hanzi,
            pinyin: w.pinyin,
            definitions: [w.meaning, w.exampleMeaning].filter(Boolean)
        }));

        const initialTimer = setTimeout(() => {
            if (isMounted) {
                setDbResults(initialResults);
                setResultTotal(initialResults.length);
                setLoading(true);
            }
        }, 0);

        const timer = setTimeout(async () => {
            try {
                const res = await searchDictionary(trimmed, searchMode, offset);
                if (isMounted) {
                    if (res.results.length > 0) {
                        setDbResults(res.results);
                        setResultTotal(res.total);
                        setTotalCount(res.count);
                        setIsDbSource(res.source === 'database');
                    } else if (localMatches.length === 0) {
                        setDbResults([]);
                        setResultTotal(0);
                    }
                    setLoading(false);
                }
            } catch {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }, 150);

        return () => {
            isMounted = false;
            clearTimeout(initialTimer);
            clearTimeout(timer);
        };
    }, [query, searchMode, offset]);

    const QUICK_SUGGESTIONS = [
        '學生', 'xuéshēng', 'học sinh', '捷運', '珍珠奶茶', '經濟', '夜市', '咖啡'
    ];

    const displayedWords = filteredWords.filter(w => {
        if (topicFilter === 'Tất cả') return true;
        const parentLesson = lessons.find(l => l.words.some(lw => lw.id === w.id));
        if (!parentLesson) return true;
        if (topicFilter === 'A1' || topicFilter === 'A2' || topicFilter === 'B1' || topicFilter === 'B2') {
            return parentLesson.level === topicFilter;
        }
        return parentLesson.category === topicFilter;
    });

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <p className="eyebrow" style={{ margin: 0 }}>CSDL TỪ ĐIỂN HOA - VIỆT PHỒN THỂ</p>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    backgroundColor: isDbSource ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                    color: isDbSource ? 'var(--jade-emerald)' : 'var(--tone-3)',
                    border: `1px solid ${isDbSource ? 'rgba(5, 150, 105, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`
                }}>
                    <Database size={13} />
                    <span>{isDbSource ? `PGlite DB: ${totalCount.toLocaleString('vi-VN')} mục từ` : 'Bộ nhớ bài học'}</span>
                </div>
            </div>

            <h1>Từ nhỏ. Thế giới rộng.</h1>
            <p className="muted">
                Tra cứu tức thời hơn 122.000 mục từ Hán ngữ Phồn thể Đài Loan đối chiếu Hán-Việt & nghĩa tiếng Việt chuẩn mực.
            </p>

            <div className="dictionary-tools">
                <label className="search-box">
                    <Search size={20} />
                    <input
                        aria-label="Tìm từ vựng"
                        placeholder="Nhập Hán tự, Pinyin hoặc nghĩa tiếng Việt (vd: 學生, xuesheng, học sinh)..."
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setOffset(0);
                        }}
                    />
                    {query ? (
                        <button
                            type="button"
                            className="icon-button"
                            aria-label="Xóa tìm kiếm"
                            onClick={() => {
                                setQuery('');
                                setOffset(0);
                            }}
                        >
                            <X size={17} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="icon-button"
                            aria-label="Vẽ chữ viết tay để tra từ"
                            title="Tra bằng chữ viết tay (giống Hanzii)"
                            onClick={() => setShowHandwriting(true)}
                            style={{ color: 'var(--vermilion-cinnabar)' }}
                        >
                            <Edit3 size={17} />
                        </button>
                    )}
                </label>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className={`filter-button ${showHandwriting ? 'selected' : ''}`}
                        onClick={() => setShowHandwriting(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Edit3 size={15} /> Viết tay (手寫)
                    </button>

                    <select
                        aria-label="Chế độ tra từ"
                        value={searchMode}
                        onChange={e => {
                            setSearchMode(e.target.value as 'all' | 'hanzi' | 'pinyin' | 'vi');
                            setOffset(0);
                        }}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--ivory-surface)',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'var(--on-surface)'
                        }}
                    >
                        <option value="all">Tra tự động</option>
                        <option value="hanzi">Chữ Hán (漢字)</option>
                        <option value="pinyin">Pinyin</option>
                        <option value="vi">Tiếng Việt</option>
                    </select>

                    <button
                        type="button"
                        className={`filter-button ${onlySaved ? 'selected' : ''}`}
                        aria-pressed={onlySaved}
                        onClick={() => setOnlySaved(!onlySaved)}
                    >
                        <Bookmark size={17} /> Đã lưu ({savedWordIds.length})
                    </button>
                </div>
            </div>

            {/* Quick search suggestion pills */}
            {!query && !onlySaved && (
                <div style={{ margin: '12px 0 8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 500 }}>Gợi ý tra nhanh:</span>
                    {QUICK_SUGGESTIONS.map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setQuery(s)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--ivory-surface)',
                                fontSize: '12px',
                                color: 'var(--on-surface)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span>{s}</span>
                            <ArrowRight size={11} color="var(--vermilion-cinnabar)" />
                        </button>
                    ))}
                </div>
            )}

            {/* Topic / Level filter bar when browsing default vocabulary */}
            {!query.trim() && (
                <div style={{ margin: '8px 0 14px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 500 }}>Chủ đề:</span>
                    {TOPIC_FILTERS.map(topic => {
                        const active = topicFilter === topic;
                        return (
                            <button
                                key={topic}
                                type="button"
                                onClick={() => setTopicFilter(topic)}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: '999px',
                                    border: `1px solid ${active ? 'var(--vermilion-cinnabar)' : 'var(--border-subtle)'}`,
                                    background: active ? 'var(--vermilion-tint)' : 'var(--surface-container-low)',
                                    color: active ? 'var(--vermilion-cinnabar)' : 'var(--on-surface-variant)',
                                    fontSize: '11px',
                                    fontWeight: active ? 700 : 500,
                                    cursor: 'pointer'
                                }}
                            >
                                {topic}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Results metadata bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 16px' }}>
                <p className="result-count" style={{ margin: 0 }}>
                    {query.trim()
                        ? `${resultTotal.toLocaleString('vi-VN')} kết quả cho “${query}” (từ ${totalCount.toLocaleString('vi-VN')} mục từ)`
                        : onlySaved
                        ? `${displayedWords.length} từ đã lưu trong sổ tay`
                        : `${displayedWords.length} / ${allWords.length} từ vựng bài học cơ bản`}
                </p>
                {loading && (
                    <span style={{ fontSize: '12px', color: 'var(--vermilion-cinnabar)', fontWeight: 600 }}>
                        Đang truy vấn CSDL PGlite...
                    </span>
                )}
            </div>

            {/* If user searched in database: render DB results */}
            {query.trim() ? (
                dbResults.length > 0 ? (
                    <>
                        <div className="word-grid">
                            {dbResults.map(entry => {
                                const lessonWord = allWords.find(w => w.hanzi === entry.traditional || w.hanzi === entry.simplified);
                                const effectiveId = lessonWord
                                    ? lessonWord.id
                                    : entry.id.startsWith('dict-')
                                    ? entry.id
                                    : `dict-${entry.id}`;
                                const isSaved = savedWordIds.includes(effectiveId);
                                const characters = Array.from(entry.traditional);
                                return (
                                    <article key={entry.id} className="word-card">
                                        <div className="row between">
                                            <span className="badge-pill badge-neutral">
                                                Phồn thể Đài Loan {entry.simplified && entry.simplified !== entry.traditional ? `· Giản: ${entry.simplified}` : ''}
                                            </span>
                                            <button
                                                className={`icon-button ${isSaved ? 'saved' : ''}`}
                                                aria-label={`${isSaved ? 'Bỏ lưu' : 'Lưu'} ${entry.traditional}`}
                                                onClick={() => {
                                                    if (lessonWord) {
                                                        onToggleSave(lessonWord.id);
                                                    } else {
                                                        const customWord: Word = {
                                                            id: effectiveId,
                                                            hanzi: entry.traditional,
                                                            pinyin: entry.pinyin,
                                                            meaning: entry.definitions.slice(0, 2).join('; ') || entry.traditional,
                                                            example: `${entry.traditional}（臺灣繁體詞彙）`,
                                                            examplePinyin: entry.pinyin,
                                                            exampleMeaning: entry.definitions[0] || entry.traditional,
                                                            category: 'Từ điển mở rộng',
                                                            lessonId: 'custom-dictionary'
                                                        };
                                                        onToggleSave(effectiveId, customWord);
                                                    }
                                                }}
                                            >
                                                <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
                                            </button>
                                        </div>

                                        <div style={{ margin: '14px 0 10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                {characters.map((char, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="tianzige-box"
                                                        style={{ width: '40px', height: '40px', borderRadius: '6px', flexShrink: 0 }}
                                                        onClick={() => speakChinese(char, 0.9)}
                                                        title="Nhấn để nghe phát âm"
                                                    >
                                                        <div className="tianzige-crosshair-h" />
                                                        <div className="tianzige-crosshair-v" />
                                                        <span className="tianzige-glyph" style={{ fontSize: '24px' }}>{char}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                <h3 lang="zh-TW" className="hanzi" style={{ margin: 0, fontSize: '24px', wordBreak: 'break-word' }}>
                                                    {entry.traditional}
                                                </h3>
                                                <button
                                                    type="button"
                                                    className="icon-button"
                                                    aria-label={`Phát âm ${entry.traditional}`}
                                                    onClick={() => speakChinese(entry.traditional, 0.9)}
                                                    style={{ padding: '4px' }}
                                                >
                                                    <Volume2 size={16} />
                                                </button>
                                                {entry.simplified !== entry.traditional && (
                                                    <small style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                                                        (Giản thể: {entry.simplified})
                                                    </small>
                                                )}
                                            </div>
                                        </div>

                                        <p className="pinyin">{entry.pinyin}</p>

                                        <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>
                                                Nghĩa tiếng Việt:
                                            </p>
                                            <p className="word-meaning" style={{ marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                                {entry.definitions.slice(0, 3).join('; ')}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {/* Pagination controls */}
                        {resultTotal > 20 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
                                <button
                                    type="button"
                                    className="filter-button"
                                    disabled={offset === 0 || loading}
                                    onClick={() => setOffset(Math.max(0, offset - 20))}
                                >
                                    ← Trang trước
                                </button>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                                    Trang {Math.floor(offset / 20) + 1} / {Math.ceil(resultTotal / 20)}
                                </span>
                                <button
                                    type="button"
                                    className="filter-button"
                                    disabled={offset + 20 >= resultTotal || loading}
                                    onClick={() => setOffset(offset + 20)}
                                >
                                    Trang sau →
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-state panel">
                        <Search size={35} />
                        <h2>Không tìm thấy từ phù hợp</h2>
                        <p>
                            Thử từ ngắn hơn, tiếng Việt không dấu hoặc phiên âm.
                        </p>
                    </div>
                )
            ) : displayedWords.length ? (
                /* Default view when no search query: render standard course words */
                <div className="word-grid">
                    {displayedWords.map(w => (
                        <WordCard
                            key={w.id}
                            word={w}
                            saved={savedWordIds.includes(w.id)}
                            onSave={() => onToggleSave(w.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="empty-state panel">
                    <Search size={35} />
                    <h2>Không tìm thấy từ phù hợp</h2>
                    <p>
                        {onlySaved
                            ? 'Hãy lưu những từ bạn muốn ôn trong bài học hoặc bỏ bộ lọc Đã lưu.'
                            : 'Thử từ ngắn hơn, tiếng Việt không dấu hoặc phiên âm.'}
                    </p>
                </div>
            )}

            {showHandwriting && (
                <HandwritingPad
                    onSelectWord={word => {
                        setQuery(word);
                        setOffset(0);
                    }}
                    onClose={() => setShowHandwriting(false)}
                />
            )}
        </>
    );
}
