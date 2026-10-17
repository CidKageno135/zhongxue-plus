import { Bookmark, Search, X } from 'lucide-react';
import type { Word } from '../types';
import { allWords } from '../data/lessons';
import { WordCard } from '../components/WordCard';

interface DictionaryViewProps {
    query: string;
    setQuery: (q: string) => void;
    onlySaved: boolean;
    setOnlySaved: (s: boolean) => void;
    filteredWords: Word[];
    savedWordIds: string[];
    onToggleSave: (id: string) => void;
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
    return (
        <>
            <p className="eyebrow">BỎ TÚI NHỮNG TỪ THẬT HỮU ÍCH</p>
            <h1>Từ nhỏ. Thế giới rộng.</h1>
            <p className="muted">
                Tra từ của toàn bộ bài học bằng chữ Hán, phiên âm hoặc tiếng Việt.
            </p>

            <div className="dictionary-tools">
                <label className="search-box">
                    <Search size={20} />
                    <input
                        aria-label="Tìm từ vựng"
                        placeholder="Tìm từ vựng, ví dụ: trà, ni hao, 謝謝…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    {query && (
                        <button
                            type="button"
                            className="icon-button"
                            aria-label="Xóa tìm kiếm"
                            onClick={() => setQuery('')}
                        >
                            <X size={17} />
                        </button>
                    )}
                </label>

                <button
                    type="button"
                    className={`filter-button ${onlySaved ? 'selected' : ''}`}
                    aria-pressed={onlySaved}
                    onClick={() => setOnlySaved(!onlySaved)}
                >
                    <Bookmark size={17} /> Đã lưu ({savedWordIds.length})
                </button>
            </div>

            <p className="result-count">{filteredWords.length} / {allWords.length} từ vựng</p>

            {filteredWords.length ? (
                <div className="word-grid">
                    {filteredWords.map(w => (
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
        </>
    );
}
