export interface SpeakOptions {
    rate?: number;
    pitch?: number;
    lang?: string;
    onError?: (msg: string) => void;
    onEnd?: () => void;
}

// Keep reference at module level to prevent Chromium V8 GC from cancelling active speech
let activeUtterance: SpeechSynthesisUtterance | null = null;
let cachedBestVoice: SpeechSynthesisVoice | null = null;

// Warm up voices as soon as browser emits voiceschanged
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
            cachedBestVoice = getBestChineseVoice();
        };
    }
}

/**
 * Score a speech synthesis voice to prioritize natural, smooth Taiwanese voices
 * and penalize harsh/robotic legacy desktop synthesizers.
 */
function scoreVoice(voice: SpeechSynthesisVoice): number {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();
    let score = 0;

    const isTaiwan =
        lang === 'zh-tw' ||
        lang === 'zh_tw' ||
        lang === 'cmn-hant-tw' ||
        lang.includes('tw') ||
        name.includes('taiwan') ||
        name.includes('taiwanese');

    const isNatural =
        name.includes('natural') ||
        name.includes('online') ||
        name.includes('neural') ||
        name.includes('premium');

    if (isTaiwan) {
        score += 600;
        // Microsoft Edge Natural Voices (HsiaoChen, YunJhe) - highest rated
        if (name.includes('hsiaochen') || name.includes('yunjhe')) score += 600;
        // Google Chrome Taiwanese Mandarin
        if (name.includes('google') || name.includes('國語')) score += 400;
        // Apple iOS/macOS Taiwanese voices
        if (name.includes('mei-jia') || name.includes('sin-ji') || name.includes('ting-ting')) score += 400;
        if (isNatural) score += 300;
        // Penalize robotic legacy Windows Desktop SAPI5 voices
        if (name.includes('desktop') || name.includes('hanhan') || name.includes('huihui')) score -= 400;
    } else if (lang.startsWith('zh') || name.includes('chinese')) {
        score += 150;
        if (name.includes('xiaoxiao') || name.includes('yunxi') || isNatural) score += 150;
        if (name.includes('desktop')) score -= 250;
    }

    return score;
}

export function getBestChineseVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return cachedBestVoice;

    const candidates = voices
        .filter(v => v.lang.toLowerCase().startsWith('zh') || v.name.toLowerCase().includes('chinese'))
        .sort((a, b) => scoreVoice(b) - scoreVoice(a));

    cachedBestVoice = candidates[0] ?? null;
    return cachedBestVoice;
}

/**
 * Pronounce Chinese text at standard natural speed (rate: 0.92)
 */
export function speakChinese(text: string, options?: number | SpeakOptions): boolean {
    const opts: SpeakOptions = typeof options === 'number' ? { rate: options } : (options ?? {});
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
        opts.onError?.('Trình duyệt này chưa hỗ trợ đọc. Bạn vẫn có thể luyện bằng phiên âm.');
        return false;
    }

    const chineseText = text.trim();
    if (!chineseText) return false;

    const bestVoice = getBestChineseVoice();
    const voices = window.speechSynthesis.getVoices();

    if (voices.length > 0 && !bestVoice) {
        opts.onError?.('Thiết bị chưa có giọng tiếng Hoa. Hãy cài giọng zh-TW trong cài đặt thiết bị để nghe phát âm.');
        return false;
    }

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(chineseText);
    utterance.lang = opts.lang ?? (bestVoice ? bestVoice.lang : 'zh-TW');
    if (bestVoice) {
        utterance.voice = bestVoice;
    }
    // Rate 0.92 provides a natural, smooth Taiwanese cadence
    utterance.rate = opts.rate ?? 0.92;
    utterance.pitch = opts.pitch ?? 1.02;

    utterance.onend = () => {
        if (activeUtterance === utterance) {
            activeUtterance = null;
        }
        opts.onEnd?.();
    };

    utterance.onerror = () => {
        if (activeUtterance === utterance) {
            activeUtterance = null;
        }
        opts.onError?.('Chưa thể phát âm thanh trên thiết bị này. Hãy thử lại.');
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
}

/**
 * Pronounce Chinese text at slow speed (0.72x) for pronunciation practice and phonetic imitation
 */
export function speakChineseSlow(text: string, options?: SpeakOptions): boolean {
    return speakChinese(text, { ...options, rate: 0.72 });
}

/**
 * Autocorrelation F0 Pitch Detector for human voice (80Hz - 450Hz)
 */
export function detectPitchF0(buffer: Float32Array, sampleRate: number): number {
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
        sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    if (rms < 0.015) return -1;

    const minOffset = Math.floor(sampleRate / 450);
    const maxOffset = Math.floor(sampleRate / 80);
    let bestOffset = -1;
    let maxCorr = 0;

    for (let offset = minOffset; offset <= maxOffset; offset++) {
        let corr = 0;
        for (let i = 0; i < buffer.length - offset; i++) {
            corr += buffer[i] * buffer[i + offset];
        }
        if (corr > maxCorr) {
            maxCorr = corr;
            bestOffset = offset;
        }
    }

    return bestOffset > 0 ? sampleRate / bestOffset : -1;
}
