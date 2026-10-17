import { Bookmark } from 'lucide-react';
import type { Word } from '../types';
import { SpeakButton } from './SpeakButton';

interface WordCardProps {
    word: Word;
    saved: boolean;
    onSave: () => void;
}

export function WordCard({ word, saved, onSave }: WordCardProps) {
    const characters = Array.from(word.hanzi);
    return (
        <article className="word-card">
            <div className="row between">
                <span className="badge-pill badge-neutral">{word.category}</span>
                <button
                    className={`icon-button ${saved ? 'saved' : ''}`}
                    aria-label={`${saved ? 'Bỏ lưu' : 'Lưu'} ${word.hanzi}`}
                    onClick={onSave}
                >
                    <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '14px 0 8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {characters.map((char, idx) => (
                        <div
                            key={idx}
                            className="tianzige-box"
                            style={{ width: '44px', height: '44px', borderRadius: '6px' }}
                        >
                            <div className="tianzige-crosshair-h" />
                            <div className="tianzige-crosshair-v" />
                            <span className="tianzige-glyph" style={{ fontSize: '26px' }}>{char}</span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 lang="zh-TW" className="hanzi" style={{ margin: 0, fontSize: '24px' }}>{word.hanzi}</h3>
                    <SpeakButton text={word.hanzi} />
                </div>
            </div>

            <p className="pinyin">{word.pinyin}</p>
            <p className="word-meaning">{word.meaning}</p>
            <div className="word-example">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p lang="zh-TW" style={{ margin: 0, fontWeight: 600 }}>{word.example}</p>
                    <SpeakButton text={word.example} />
                </div>
                <small style={{ color: 'var(--tone-1)', marginTop: '2px', display: 'block' }}>{word.examplePinyin}</small>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>{word.exampleMeaning}</p>
            </div>
        </article>
    );
}
