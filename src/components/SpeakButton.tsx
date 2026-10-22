import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { speakChinese, stopSpeaking } from '../services/speech';

interface SpeakButtonProps {
    text: string;
    label?: string;
    rate?: number;
}

export function SpeakButton({ text, label = 'Nghe phát âm', rate = 0.82 }: SpeakButtonProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [message, setMessage] = useState('');
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (isPlaying) {
                stopSpeaking();
            }
        };
    }, [isPlaying]);

    function handleClick() {
        if (isPlaying) {
            stopSpeaking();
            setIsPlaying(false);
            return;
        }

        setMessage('');
        setIsPlaying(true);

        const started = speakChinese(text, {
            rate,
            onEnd: () => {
                if (mountedRef.current) {
                    setIsPlaying(false);
                }
            },
            onError: (msg) => {
                if (mountedRef.current) {
                    setIsPlaying(false);
                    setMessage(msg);
                }
            }
        });

        if (!started) {
            setIsPlaying(false);
        }
    }

    return (
        <span className="speech-control" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <button
                type="button"
                className={`icon-button ${isPlaying ? 'is-playing' : ''}`}
                onClick={handleClick}
                aria-label={isPlaying ? `Dừng phát âm (${label})` : label}
                aria-pressed={isPlaying}
                title={isPlaying ? `Dừng phát âm (${label})` : label}
                style={isPlaying ? { color: 'var(--vermilion-cinnabar)', background: 'var(--surface-container)' } : undefined}
            >
                {isPlaying ? <VolumeX size={18} className="animate-pulse" /> : <Volume2 size={18} />}
            </button>
            {message && (
                <span className="speech-message" role="status" style={{ fontSize: '11px', color: 'var(--vermilion-cinnabar)' }}>
                    {message}
                </span>
            )}
        </span>
    );
}
