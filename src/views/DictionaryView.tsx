import { useState, useEffect, useRef, useCallback } from 'react';
import { Bookmark, Search, X, Database, ArrowRight, Volume2, Edit3, Loader2 } from 'lucide-react';
import type { Word } from '../types';
import { allWords, lessons } from '../data/lessons';
import { findWord } from '../domain/learning';
import { WordCard } from '../components/WordCard';
import { searchDictionary, checkBackendHealth, type DbDictionaryResult } from '../services/api';
import { speakChinese } from '../services/speech';
import { HandwritingPad } from '../components/HandwritingPad';
import { normalizeVietnamese, normalizePinyin, isHanziText, matchesQuery } from '../domain/searchNormalization';

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

const QUICK_SUGGESTIONS = [
    '學生', 'xuéshēng', 'học sinh', '捷運', '珍珠奶茶', '經濟', '夜市', '咖啡'
];

/** Resolves canonical or custom word identifier for SRS registration */
function getEffectiveWordId(entry: DbDictionaryResult): { effectiveId: string; lessonWord?: Word } {
    const lessonWord = allWords.find(w => w.hanzi === entry.traditional || w.hanzi === entry.simplified);
    const effectiveId = lessonWord
        ? lessonWord.id
        : entry.id.startsWith('dict-') || entry.id.startsWith('cv_')
        ? entry.id
        : `dict-${entry.id}`;
    return { effectiveId, lessonWord };
}

/** Determines if an entry is saved in SRS */
function checkIsSaved(entry: DbDictionaryResult, savedWordIds: string[]): boolean {
    const { effectiveId, lessonWord } = getEffectiveWordId(entry);
    return savedWordIds.includes(effectiveId) || (lessonWord ? savedWordIds.includes(lessonWord.id) : false);
}

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
    const [totalCount, setTotalCount] = useState<number>(122596);
    const [resultTotal, setResultTotal] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [isDbSource, setIsDbSource] = useState(false);
    const [searchMode, setSearchMode] = useState<'all' | 'hanzi' | 'pinyin' | 'vi'>('all');
    const [showHandwriting, setShowHandwriting] = useState(false);
    const [topicFilter, setTopicFilter] = useState<string>('Tất cả');
    const [savedToast, setSavedToast] = useState<{ id: string; message: string } | null>(null);

    // Request tracking to prevent out-of-order race conditions
    const requestIdRef = useRef<number>(0);
    const latestQueryRef = useRef<string>(query);

    // Synchronize ref on query update without accessing ref in render body
    useEffect(() => {
        latestQueryRef.current = query;
    }, [query]);

    // Detect database health and real vocabulary count on mount
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

    // Debounced query execution (~280ms) with out-of-order response elimination
    useEffect(() => {
        const trimmed = query.trim();

        // Empty query resets safely asynchronously to prevent cascading renders
        if (!trimmed) {
            const clearTimer = setTimeout(() => {
                requestIdRef.current++;
                setDbResults([]);
                setResultTotal(0);
                setOffset(0);
                setLoading(false);
                setLoadingMore(false);
            }, 0);
            return () => clearTimeout(clearTimer);
        }

        let isMounted = true;

        const timer = setTimeout(async () => {
            const thisRequestId = ++requestIdRef.current;
            setLoading(true);
            try {
                const res = await searchDictionary(trimmed, searchMode, 0);

                // Ignore stale responses if a newer request was dispatched or unmounted
                if (!isMounted || thisRequestId !== requestIdRef.current) {
                    return;
                }
                if (latestQueryRef.current.trim() !== trimmed) {
                    return;
                }

                setDbResults(res.results || []);
                const matches = typeof res.totalMatches === 'number' ? res.totalMatches : (res.total || 0);
                setResultTotal(matches);
                if (typeof res.dictionaryTotal === 'number' && res.dictionaryTotal > 0) {
                    setTotalCount(res.dictionaryTotal);
                }
                setIsDbSource(res.source === 'database');
                setOffset(0);
            } catch {
                if (!isMounted || thisRequestId !== requestIdRef.current) return;
                setDbResults([]);
                setResultTotal(0);
            } finally {
                if (isMounted && thisRequestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        }, 280);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [query, searchMode]);

    // Incremental pagination (Load more) handler appending next 20 results
    const handleLoadMore = useCallback(async () => {
        const trimmed = query.trim();
        if (!trimmed || loadingMore || loading) return;

        const nextOffset = offset + 20;
        setLoadingMore(true);
        const thisRequestId = ++requestIdRef.current;

        try {
            const res = await searchDictionary(trimmed, searchMode, nextOffset);

            if (thisRequestId !== requestIdRef.current) return;
            if (latestQueryRef.current.trim() !== trimmed) return;

            if (res.results && res.results.length > 0) {
                setDbResults(prev => [...prev, ...res.results]);
                setOffset(nextOffset);
                if (typeof res.totalMatches === 'number') {
                    setResultTotal(res.totalMatches);
                } else if (typeof res.total === 'number') {
                    setResultTotal(res.total);
                }
                if (typeof res.dictionaryTotal === 'number' && res.dictionaryTotal > 0) {
                    setTotalCount(res.dictionaryTotal);
                }
            }
        } catch {
            // Ignore load more failure
        } finally {
            if (thisRequestId === requestIdRef.current) {
                setLoadingMore(false);
            }
        }
    }, [query, searchMode, offset, loadingMore, loading]);

    // Save/Unsave word handler with feedback
    const handleToggleSave = useCallback((entry: DbDictionaryResult) => {
        const { effectiveId, lessonWord } = getEffectiveWordId(entry);
        const wasSaved = checkIsSaved(entry, savedWordIds);

        if (lessonWord) {
            onToggleSave(lessonWord.id);
        } else {
            const customWord: Word = {
                id: effectiveId,
                hanzi: entry.traditional,
                pinyin: entry.pinyin,
                meaning: entry.definitions.slice(0, 3).join('; ') || entry.traditional,
                example: `${entry.traditional}（臺灣繁體詞彙）`,
                examplePinyin: entry.pinyin,
                exampleMeaning: entry.definitions[0] || entry.traditional,
                category: 'Từ điển mở rộng',
                lessonId: 'custom-dictionary'
            };
            onToggleSave(effectiveId, customWord);
        }

        const msg = wasSaved ? `Đã bỏ lưu "${entry.traditional}"` : `Đã lưu "${entry.traditional}" vào ôn tập SRS`;
        setSavedToast({ id: entry.id, message: msg });
        setTimeout(() => {
            setSavedToast(prev => (prev?.id === entry.id ? null : prev));
        }, 2500);
    }, [savedWordIds, onToggleSave]);

    // Full list of saved words across lessons & custom registry
    const allSavedWords = savedWordIds
        .map(id => findWord(id))
        .filter((w): w is Word => Boolean(w));

    // Course words displayed when no active query
    const displayedWords = onlySaved
        ? allSavedWords.filter(w => {
            if (topicFilter === 'Tất cả') return true;
            const parentLesson = lessons.find(l => l.words.some(lw => lw.id === w.id));
            if (!parentLesson) return topicFilter === 'Từ điển mở rộng' || w.category === topicFilter;
            if (topicFilter === 'A1' || topicFilter === 'A2' || topicFilter === 'B1' || topicFilter === 'B2') {
                return parentLesson.level === topicFilter;
            }
            return parentLesson.category === topicFilter;
        })
        : filteredWords.filter(w => {
            if (topicFilter === 'Tất cả') return true;
            const parentLesson = lessons.find(l => l.words.some(lw => lw.id === w.id));
            if (!parentLesson) return true;
            if (topicFilter === 'A1' || topicFilter === 'A2' || topicFilter === 'B1' || topicFilter === 'B2') {
                return parentLesson.level === topicFilter;
            }
            return parentLesson.category === topicFilter;
        });

    // Active results filtered by saved status if "Đã lưu" is active
    const visibleDbResults = (() => {
        if (!onlySaved) return dbResults;
        const inDbSaved = dbResults.filter(entry => checkIsSaved(entry, savedWordIds));
        const qTrim = query.trim();
        if (!qTrim) {
            return inDbSaved;
        }

        const matchingSavedWords = allSavedWords.filter(w => {
            return (
                matchesQuery(w.hanzi, qTrim) ||
                matchesQuery(w.pinyin, qTrim) ||
                matchesQuery(w.meaning, qTrim) ||
                (w.example ? matchesQuery(w.example, qTrim) : false)
            );
        });

        const mergedMap = new Map<string, DbDictionaryResult>();
        for (const entry of inDbSaved) {
            mergedMap.set(entry.traditional, entry);
        }
        for (const w of matchingSavedWords) {
            if (!mergedMap.has(w.hanzi)) {
                mergedMap.set(w.hanzi, {
                    id: w.id,
                    traditional: w.hanzi,
                    simplified: w.hanzi,
                    pinyin: w.pinyin,
                    definitions: [w.meaning, w.exampleMeaning].filter(Boolean)
                });
            }
        }
        return Array.from(mergedMap.values());
    })();

    return (
        <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .dictionary-tools select:focus {
                    outline: 2px solid var(--vermon-cinnabar, #c2410c);
                    outline-offset: 1px;
                }
            `}</style>

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
                    <span>{isDbSource ? `CSDL 122k: ${totalCount.toLocaleString('vi-VN')} mục từ` : 'Bộ nhớ bài học'}</span>
                </div>
            </div>

            <h1 style={{ wordBreak: 'break-word' }}>Từ nhỏ. Thế giới rộng.</h1>
            <p className="muted" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
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
                            latestQueryRef.current = e.target.value;
                            setQuery(e.target.value);
                            setOffset(0);
                            if (!e.target.value.trim()) {
                                requestIdRef.current++;
                                setDbResults([]);
                                setResultTotal(0);
                                setLoading(false);
                                setLoadingMore(false);
                            }
                        }}
                    />
                    {query ? (
                        <button
                            type="button"
                            className="icon-button"
                            aria-label="Xóa tìm kiếm"
                            onClick={() => {
                                latestQueryRef.current = '';
                                setQuery('');
                                setOffset(0);
                                requestIdRef.current++;
                                setDbResults([]);
                                setResultTotal(0);
                                setLoading(false);
                                setLoadingMore(false);
                            }}
                        >
                            <X size={17} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="icon-button"
                            aria-label="Vẽ chữ viết tay để tra từ"
                            title="Tra bằng chữ viết tay (手寫)"
                            onClick={() => setShowHandwriting(true)}
                            style={{ color: 'var(--vermilion-cinnabar)' }}
                        >
                            <Edit3 size={17} />
                        </button>
                    )}
                </label>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
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
                            borderRadius: '9999px',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--ivory-surface)',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--on-surface)',
                            cursor: 'pointer'
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
                        <Bookmark size={16} /> Đã lưu ({savedWordIds.length})
                    </button>
                </div>
            </div>

            {/* Quick search suggestion pills */}
            {!query && !onlySaved && (
                <div style={{ margin: '12px 0 8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 500 }}>Gợi ý tra nhanh:</span>
                    {QUICK_SUGGESTIONS.map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => {
                                latestQueryRef.current = s;
                                setQuery(s);
                                setOffset(0);
                            }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 16px', flexWrap: 'wrap', gap: '8px' }}>
                <p className="result-count" style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>
                    {query.trim() ? (
                        loading && dbResults.length === 0 ? (
                            `Đang tra cứu “${query}”...`
                        ) : resultTotal > 0 ? (
                            `Tìm thấy ${resultTotal.toLocaleString('vi-VN')} kết quả khớp cho “${query}” (từ ${totalCount.toLocaleString('vi-VN')} mục từ)`
                        ) : (
                            `Không tìm thấy kết quả cho “${query}”`
                        )
                    ) : onlySaved ? (
                        `${displayedWords.length} từ đã lưu trong sổ tay`
                    ) : (
                        `${displayedWords.length} / ${allWords.length} từ vựng bài học cơ bản`
                    )}
                </p>
                {loading && (
                    <span style={{ fontSize: '12px', color: 'var(--vermilion-cinnabar)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                        <span>Đang truy vấn CSDL 122k...</span>
                    </span>
                )}
            </div>

            {/* Active search view */}
            {query.trim() ? (
                loading && dbResults.length === 0 ? (
                    /* Skeleton placeholder while first search is in flight */
                    <div className="word-grid" aria-busy="true" aria-label="Đang tìm kiếm từ vựng...">
                        {[1, 2, 3, 4, 5, 6].map(idx => (
                            <div
                                key={idx}
                                className="word-card"
                                style={{
                                    opacity: 0.65,
                                    border: '1px solid var(--border-subtle)',
                                    background: 'var(--surface-container-low)',
                                    animation: 'pulse 1.4s ease-in-out infinite'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <div style={{ height: '18px', width: '90px', background: 'var(--border-subtle)', borderRadius: '999px' }} />
                                    <div style={{ height: '24px', width: '90px', background: 'var(--border-subtle)', borderRadius: '999px' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                                    <div style={{ width: '40px', height: '40px', background: 'var(--border-subtle)', borderRadius: '6px' }} />
                                    <div style={{ width: '40px', height: '40px', background: 'var(--border-subtle)', borderRadius: '6px' }} />
                                </div>
                                <div style={{ height: '18px', width: '50%', background: 'var(--border-subtle)', borderRadius: '4px', marginBottom: '10px' }} />
                                <div style={{ height: '14px', width: '85%', background: 'var(--border-subtle)', borderRadius: '4px', marginBottom: '6px' }} />
                                <div style={{ height: '14px', width: '65%', background: 'var(--border-subtle)', borderRadius: '4px' }} />
                            </div>
                        ))}
                    </div>
                ) : visibleDbResults.length > 0 ? (
                    <>
                        <div className="word-grid">
                            {visibleDbResults.map(entry => {
                                const isSaved = checkIsSaved(entry, savedWordIds);
                                const characters = Array.from(entry.traditional);
                                return (
                                    <article key={entry.id} className="word-card">
                                        <div className="row between" style={{ alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <span className="badge-pill badge-neutral">
                                                    Phồn thể Đài Loan {entry.simplified && entry.simplified !== entry.traditional ? `· Giản: ${entry.simplified}` : ''}
                                                </span>
                                                {isSaved && (
                                                    <span
                                                        className="badge-pill"
                                                        style={{
                                                            backgroundColor: 'rgba(5, 150, 105, 0.12)',
                                                            color: 'var(--jade-emerald)',
                                                            border: '1px solid rgba(5, 150, 105, 0.25)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '11px',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        <Bookmark size={11} fill="currentColor" />
                                                        <span>Đã lưu</span>
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                className={`filter-button ${isSaved ? 'selected' : ''}`}
                                                aria-label={`${isSaved ? 'Bỏ lưu' : 'Lưu'} ${entry.traditional}`}
                                                title={isSaved ? `Bỏ lưu "${entry.traditional}" khỏi sổ tay ôn tập SRS` : `Lưu "${entry.traditional}" vào sổ tay ôn tập SRS`}
                                                onClick={() => handleToggleSave(entry)}
                                                style={{
                                                    padding: '5px 12px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    borderRadius: '999px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    border: `1px solid ${isSaved ? 'rgba(5, 150, 105, 0.35)' : 'var(--border-strong)'}`,
                                                    backgroundColor: isSaved ? 'rgba(5, 150, 105, 0.12)' : 'var(--ivory-surface)',
                                                    color: isSaved ? 'var(--jade-emerald)' : 'var(--on-surface)',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
                                                <span>{isSaved ? 'Đã lưu' : 'Lưu vào ôn tập'}</span>
                                            </button>
                                        </div>

                                        <div style={{ margin: '14px 0 10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                {characters.map((char, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="tianzige-box"
                                                        style={{ width: '40px', height: '40px', borderRadius: '6px', flexShrink: 0, cursor: 'pointer' }}
                                                        onClick={() => speakChinese(char, 0.9)}
                                                        title={`Nhấn để nghe phát âm "${char}"`}
                                                        role="button"
                                                        tabIndex={0}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                speakChinese(char, 0.9);
                                                            }
                                                        }}
                                                        aria-label={`Phát âm chữ ${char}`}
                                                    >
                                                        <div className="tianzige-crosshair-h" />
                                                        <div className="tianzige-crosshair-v" />
                                                        <span className="tianzige-glyph" style={{ fontSize: '24px' }}>{char}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                <h3 lang="zh-TW" className="hanzi hanzi-title" style={{ margin: 0, fontSize: '24px', wordBreak: 'break-word' }}>
                                                    {entry.traditional}
                                                </h3>
                                                <button
                                                    type="button"
                                                    className="icon-button"
                                                    aria-label={`Phát âm ${entry.traditional}`}
                                                    title={`Phát âm "${entry.traditional}"`}
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

                                        <p className="pinyin" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{entry.pinyin}</p>

                                        <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>
                                                Nghĩa tiếng Việt:
                                            </p>
                                            <p className="word-meaning" style={{ marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.5 }}>
                                                {entry.definitions.slice(0, 4).join('; ')}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {/* Incremental pagination button (Load more) */}
                        {resultTotal > dbResults.length && !onlySaved && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: '28px 0 16px' }}>
                                <button
                                    type="button"
                                    className="filter-button"
                                    aria-label="Tải thêm"
                                    disabled={loadingMore || loading}
                                    onClick={handleLoadMore}
                                    style={{
                                        padding: '10px 24px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: '999px',
                                        backgroundColor: 'var(--vermilion-cinnabar)',
                                        color: '#ffffff',
                                        border: 'none',
                                        cursor: loadingMore || loading ? 'wait' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 2px 8px rgba(194, 65, 12, 0.25)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {loadingMore ? (
                                        <>
                                            <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
                                            <span>Đang tải thêm kết quả...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Tải thêm ({Math.min(20, resultTotal - dbResults.length)} từ tiếp theo)</span>
                                            <ArrowRight size={14} />
                                        </>
                                    )}
                                </button>
                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                    Đang hiển thị {dbResults.length} / {resultTotal.toLocaleString('vi-VN')} kết quả (trang {Math.floor(offset / 20) + 1})
                                </p>
                            </div>
                        )}

                        {resultTotal > 0 && dbResults.length >= resultTotal && resultTotal > 20 && !onlySaved && (
                            <p style={{ textAlign: 'center', margin: '24px 0 12px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                ✓ Đã hiển thị toàn bộ {resultTotal.toLocaleString('vi-VN')} kết quả
                            </p>
                        )}
                    </>
                ) : (
                    /* Empty search results state with helpful guidance */
                    <div className="empty-state panel" style={{ textAlign: 'center', padding: '36px 20px', maxWidth: '640px', margin: '24px auto' }}>
                        <Search size={38} color="var(--vermilion-cinnabar)" style={{ opacity: 0.7, marginBottom: '8px' }} />
                        <h2>Không tìm thấy từ phù hợp</h2>
                        <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', margin: '8px 0 16px', lineHeight: 1.6 }}>
                            {onlySaved
                                ? `Không có từ nào đã lưu trong sổ tay khớp với “${query}”.`
                                : `Không tìm thấy mục từ nào khớp với từ khóa “${query}” trong CSDL ${totalCount.toLocaleString('vi-VN')} từ.`}
                        </p>

                        <div style={{
                            background: 'var(--surface-container-low)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '12px',
                            padding: '16px 20px',
                            textAlign: 'left',
                            margin: '0 auto 20px',
                            fontSize: '13px',
                            lineHeight: 1.7,
                            color: 'var(--on-surface)'
                        }}>
                            <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--on-surface)' }}>
                                💡 Mẹo tra cứu hiệu quả:
                            </p>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--on-surface-variant)' }}>
                                {isHanziText(query) ? (
                                    <>
                                        <li>Bạn đang nhập chữ Hán: Hệ thống hỗ trợ cả <strong>Phồn thể Đài Loan (繁體)</strong> và Giản thể (简体).</li>
                                        <li>Thử tra từng chữ đơn lẻ nếu tra cụm câu dài chưa có kết quả.</li>
                                    </>
                                ) : (
                                    <>
                                        <li>Tra bằng <strong>Pinyin</strong>: Hỗ trợ có dấu (vd: <code>xuéshēng</code>), số thanh (vd: <code>xue2 sheng1</code>), hoặc không dấu (vd: <code>{normalizePinyin(query).clean || 'xuesheng'}</code>).</li>
                                        <li>Tra bằng <strong>tiếng Việt</strong>: Hỗ trợ có dấu (vd: <code>học sinh</code>) hoặc không dấu (vd: <code>{normalizeVietnamese(query) || 'hoc sinh'}</code>).</li>
                                    </>
                                )}
                                <li>Sử dụng chức năng <strong>Viết tay (手寫)</strong> nếu bạn nhớ mặt chữ nhưng không rõ phiên âm.</li>
                                <li>Kiểm tra lại chế độ lọc: đang ở chế độ <strong>{searchMode === 'all' ? 'Tự động' : searchMode === 'hanzi' ? 'Chữ Hán' : searchMode === 'pinyin' ? 'Pinyin' : 'Tiếng Việt'}</strong>.</li>
                            </ul>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="filter-button"
                                onClick={() => {
                                    latestQueryRef.current = '';
                                    setQuery('');
                                    setOffset(0);
                                    requestIdRef.current++;
                                    setDbResults([]);
                                    setResultTotal(0);
                                    setLoading(false);
                                    setLoadingMore(false);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <X size={15} /> Xóa tìm kiếm và quay lại bài học
                            </button>
                            <button
                                type="button"
                                className="filter-button selected"
                                onClick={() => setShowHandwriting(true)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Edit3 size={15} /> Tra bằng chữ viết tay (手寫)
                            </button>
                        </div>
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
                        latestQueryRef.current = word;
                        setQuery(word);
                        setOffset(0);
                        setShowHandwriting(false);
                    }}
                    onClose={() => setShowHandwriting(false)}
                />
            )}

            {/* Notification confirmation toast for SRS saving */}
            {savedToast && (
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        background: 'var(--surface-container-high)',
                        color: 'var(--on-surface)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        padding: '10px 16px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontWeight: 600,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Bookmark size={15} fill="var(--jade-emerald)" color="var(--jade-emerald)" />
                    <span>{savedToast.message}</span>
                </div>
            )}
        </div>
    );
}
