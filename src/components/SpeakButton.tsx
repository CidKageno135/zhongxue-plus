import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { speakChinese } from '../services/speech';

export function SpeakButton({ text, label = 'Nghe phát âm' }: { text: string; label?: string }) {
    const [message, setMessage] = useState('');
    function speak() {
        setMessage('');
        speakChinese(text, {
            rate: 0.82,
            onError: msg => setMessage(msg)
        });
    }
    return (
        <span className="speech-control">
            <button
                type="button"
                className="icon-button"
                onClick={speak}
                aria-label={label}
                title={label}
            >
                <Volume2 size={18} />
            </button>
            {message && (
                <span className="speech-message" role="status">
                    {message}
                </span>
            )}
        </span>
    );
}
