export interface SpeakOptions {
    rate?: number;
    pitch?: number;
    lang?: string;
    voice?: SpeechSynthesisVoice;
    onError?: (msg: string) => void;
    onEnd?: () => void;
}

export interface MicrophonePitchResult {
    hz: number | null;
    isRealMeasurement: boolean;
    errorType?: 'permission_denied' | 'no_device' | 'unsupported' | 'unsecure_context' | 'silence' | 'aborted' | 'unknown';
    message: string;
}

// Retain references globally to prevent Chromium V8 garbage collector from terminating active speech mid-sentence
declare global {
    interface Window {
        __zhongxue_active_utterance?: SpeechSynthesisUtterance | null;
        __zhongxue_utterance_retains?: Set<SpeechSynthesisUtterance>;
    }
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let finishActiveUtterance: (() => void) | null = null;
let cachedBestVoice: SpeechSynthesisVoice | null = null;

function retainUtterance(utt: SpeechSynthesisUtterance): void {
    activeUtterance = utt;
    if (typeof window !== 'undefined') {
        window.__zhongxue_active_utterance = utt;
        if (!window.__zhongxue_utterance_retains) {
            window.__zhongxue_utterance_retains = new Set();
        }
        window.__zhongxue_utterance_retains.add(utt);
    }
}

function releaseUtterance(utt: SpeechSynthesisUtterance | null): void {
    if (activeUtterance === utt) {
        activeUtterance = null;
    }
    if (typeof window !== 'undefined') {
        if (window.__zhongxue_active_utterance === utt) {
            window.__zhongxue_active_utterance = null;
        }
        if (utt && window.__zhongxue_utterance_retains) {
            window.__zhongxue_utterance_retains.delete(utt);
        }
    }
}

// Warm up voices as soon as browser emits voiceschanged
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
            cachedBestVoice = getBestChineseVoice();
        };
    }
}

/**
 * Score a speech synthesis voice to prioritize natural, smooth Taiwanese voices (zh-TW),
 * with graceful fallback to Hong Kong (zh-HK) and Mainland Mandarin (zh-CN).
 * Penalizes robotic legacy desktop synthesizers.
 */
export function scoreVoice(voice: SpeechSynthesisVoice): number {
    const name = (voice.name || '').toLowerCase();
    const lang = (voice.lang || '').toLowerCase().replace(/_/g, '-');
    let score = 0;

    // Tier 1: Taiwan Mandarin (zh-TW, cmn-Hant-TW, zh-Hant-TW, etc.)
    const isTaiwan =
        lang === 'zh-tw' ||
        lang === 'cmn-hant-tw' ||
        lang === 'zh-hant-tw' ||
        lang.includes('-tw') ||
        name.includes('taiwan') ||
        name.includes('taiwanese') ||
        name.includes('臺灣') ||
        name.includes('台灣');

    // Tier 2: Hong Kong Traditional (zh-HK, yue-Hant-HK, zh-Hant-HK, etc.)
    const isHongKong =
        lang === 'zh-hk' ||
        lang === 'yue-hant-hk' ||
        lang === 'zh-hant-hk' ||
        lang.includes('-hk') ||
        name.includes('hong kong') ||
        name.includes('hongkong') ||
        name.includes('cantonese') ||
        name.includes('粵語') ||
        name.includes('粤语');

    // Tier 3: Mainland Mandarin (zh-CN, cmn-Hans-CN, zh-Hans-CN, etc.)
    const isMainland =
        lang === 'zh-cn' ||
        lang === 'cmn-hans-cn' ||
        lang === 'zh-hans-cn' ||
        lang.includes('-cn') ||
        name.includes('mandarin') ||
        name.includes('mainland') ||
        name.includes('普通话') ||
        name.includes('普通話');

    const isNatural =
        name.includes('natural') ||
        name.includes('online') ||
        name.includes('neural') ||
        name.includes('premium');

    if (isTaiwan) {
        score += 1000;
        // Microsoft Edge Natural Voices (HsiaoChen, YunJhe, HsiaoYu) - highest rated
        if (name.includes('hsiaochen') || name.includes('yunjhe') || name.includes('hsiaoyu')) score += 500;
        // Google Taiwanese Mandarin
        if (name.includes('google') || name.includes('國語')) score += 300;
        // Apple iOS/macOS Taiwanese voices
        if (name.includes('mei-jia') || name.includes('sin-ji') || name.includes('ting-ting')) score += 300;
        if (isNatural) score += 200;
        // Penalize robotic legacy Windows Desktop SAPI5 voices
        if (name.includes('desktop') || name.includes('hanhan') || name.includes('huihui')) score -= 300;
    } else if (isHongKong) {
        // Fallback tier 1: Traditional Chinese (HK)
        score += 500;
        if (name.includes('hiumaan') || name.includes('wanlung') || name.includes('hiugaai')) score += 200;
        if (isNatural) score += 150;
        if (name.includes('desktop')) score -= 200;
    } else if (isMainland) {
        // Fallback tier 2: Mainland Mandarin (CN)
        score += 250;
        if (name.includes('xiaoxiao') || name.includes('yunxi') || name.includes('yunjian')) score += 150;
        if (isNatural) score += 100;
        if (name.includes('desktop')) score -= 150;
    } else if (lang.startsWith('zh') || name.includes('chinese') || lang.includes('cmn') || lang.includes('yue')) {
        // Fallback tier 3: Generic Chinese
        score += 100;
        if (isNatural) score += 50;
    }

    return score;
}

export function getBestChineseVoice(preferredLang?: string): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return cachedBestVoice;

    let candidates = voices.filter(v => {
        const lang = (v.lang || '').toLowerCase().replace(/_/g, '-');
        const name = (v.name || '').toLowerCase();
        return (
            lang.startsWith('zh') ||
            lang.includes('-tw') ||
            lang.includes('-hk') ||
            lang.includes('-cn') ||
            lang.includes('cmn') ||
            lang.includes('yue') ||
            name.includes('chinese') ||
            name.includes('taiwan') ||
            name.includes('mandarin') ||
            name.includes('cantonese')
        );
    });

    if (preferredLang) {
        const normPreferred = preferredLang.toLowerCase().replace(/_/g, '-');
        const exact = candidates.filter(v => (v.lang || '').toLowerCase().replace(/_/g, '-') === normPreferred);
        if (exact.length > 0) {
            candidates = exact;
        }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => scoreVoice(b) - scoreVoice(a));
    cachedBestVoice = candidates[0] ?? null;
    return cachedBestVoice;
}

export function isSpeechSynthesisSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        Boolean(window.speechSynthesis) &&
        typeof window.speechSynthesis.speak === 'function' &&
        ('SpeechSynthesisUtterance' in window || typeof SpeechSynthesisUtterance !== 'undefined')
    );
}

/**
 * Stop any current speech synthesis playback and clear active references.
 */
export function stopSpeaking(): void {
    // Some browsers do not emit end/error for canceled queued utterances.
    finishActiveUtterance?.();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
        } catch {
            // Ignore cancel errors
        }
        window.__zhongxue_active_utterance = null;
        window.__zhongxue_utterance_retains?.clear();
    }
    activeUtterance = null;
}

export const cancelSpeech = stopSpeaking;

/**
 * Pronounce Chinese text at standard natural speed (rate: 0.92)
 */
export function speakChinese(text: string, options?: number | SpeakOptions): boolean {
    const opts: SpeakOptions = typeof options === 'number' ? { rate: options } : (options ?? {});

    if (!isSpeechSynthesisSupported()) {
        opts.onError?.('Trình duyệt này chưa hỗ trợ đọc. Bạn vẫn có thể luyện bằng phiên âm.');
        return false;
    }

    const chineseText = text.trim();
    if (!chineseText) return false;

    const bestVoice = opts.voice ?? getBestChineseVoice(opts.lang);
    const voices = window.speechSynthesis.getVoices();

    if (voices && voices.length > 0 && !bestVoice) {
        opts.onError?.('Thiết bị chưa có giọng tiếng Hoa. Hãy cài giọng zh-TW trong cài đặt thiết bị để nghe phát âm.');
        return false;
    }

    try {
        stopSpeaking();
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
    } catch {
        // Ignore synthesis reset errors
    }

    try {
        const UtteranceClass =
            (typeof window !== 'undefined' && window.SpeechSynthesisUtterance) ||
            (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);

        if (!UtteranceClass) {
            opts.onError?.('Trình duyệt này chưa hỗ trợ đọc. Bạn vẫn có thể luyện bằng phiên âm.');
            return false;
        }

        const utterance = new UtteranceClass(chineseText);
        utterance.lang = opts.lang ?? (bestVoice ? bestVoice.lang : 'zh-TW');
        if (bestVoice) {
            utterance.voice = bestVoice;
        }
        // Rate 0.92 provides a natural, smooth Taiwanese cadence
        utterance.rate = opts.rate ?? 0.92;
        utterance.pitch = opts.pitch ?? 1.02;

        let isDone = false;
        const markDone = () => {
            if (isDone) return;
            isDone = true;
            releaseUtterance(utterance);
            if (finishActiveUtterance === markDone) finishActiveUtterance = null;
            opts.onEnd?.();
        };

        utterance.onend = () => {
            markDone();
        };

        utterance.onerror = (e) => {
            if (isDone) return;
            // In Chromium, canceling an utterance triggers error event with error === 'interrupted' or 'canceled'.
            // Do not display a user error for deliberate stops; notify onEnd so caller/SpeakButton resets state.
            const errType = (e as unknown as { error?: string })?.error;
            if (errType === 'interrupted' || errType === 'canceled') {
                markDone();
            } else {
                isDone = true;
                releaseUtterance(utterance);
                if (finishActiveUtterance === markDone) finishActiveUtterance = null;
                opts.onError?.('Chưa thể phát âm thanh trên thiết bị này. Hãy thử lại.');
            }
        };

        retainUtterance(utterance);
        finishActiveUtterance = markDone;
        try {
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            isDone = true;
            releaseUtterance(utterance);
            if (finishActiveUtterance === markDone) finishActiveUtterance = null;
            throw error;
        }
        return true;
    } catch {
        opts.onError?.('Chưa thể phát âm thanh trên thiết bị này. Hãy thử lại.');
        return false;
    }
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
    if (!buffer || buffer.length === 0 || sampleRate <= 0) return -1;

    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
        sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    if (rms < 0.015) return -1; // Noise gate threshold

    // Human fundamental voice frequency range: 80Hz to 450Hz
    const minOffset = Math.floor(sampleRate / 450);
    const maxOffset = Math.floor(sampleRate / 80);
    if (buffer.length <= maxOffset) return -1;

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

    return bestOffset > 0 ? Math.round((sampleRate / bestOffset) * 10) / 10 : -1;
}

/**
 * Stop all tracks on a MediaStream to prevent hardware mic indicators (e.g. orange dot on iOS/Mac)
 * and battery drain from lingering after unmount.
 */
export function stopMediaStream(stream: MediaStream | null | undefined): void {
    if (!stream) return;
    try {
        stream.getTracks().forEach(track => {
            try {
                track.stop();
            } catch {
                // Ignore track stop failure
            }
        });
    } catch {
        // Ignore stream stop failure
    }
}

/**
 * Safely close an AudioContext to release system audio hardware resources.
 */
export function closeAudioContext(ctx: AudioContext | null | undefined): void {
    if (!ctx) return;
    try {
        if (ctx.state !== 'closed') {
            void ctx.close();
        }
    } catch {
        // Ignore audio context close failure
    }
}

/**
 * Capture microphone audio and measure fundamental pitch F0,
 * with strict resource cleanup and transparent feedback.
 */
export async function captureMicrophonePitch(options?: {
    durationMs?: number;
    signal?: AbortSignal;
}): Promise<MicrophonePitchResult> {
    const durationMs = options?.durationMs ?? 400;
    const signal = options?.signal;

    if (signal?.aborted) {
        return {
            hz: null,
            isRealMeasurement: false,
            errorType: 'aborted',
            message: 'Đã hủy thu âm.'
        };
    }

    if (typeof window === 'undefined') {
        return {
            hz: null,
            isRealMeasurement: false,
            errorType: 'unsupported',
            message: 'Môi trường không hỗ trợ Web Audio API.'
        };
    }

    // Modern browsers require a secure context (HTTPS or localhost) for getUserMedia
    if (window.isSecureContext === false) {
        return {
            hz: null,
            isRealMeasurement: false,
            errorType: 'unsecure_context',
            message: 'Micro yêu cầu kết nối bảo mật HTTPS hoặc localhost. Đang hiển thị mô phỏng trực quan.'
        };
    }

    if (!navigator.mediaDevices?.getUserMedia) {
        return {
            hz: null,
            isRealMeasurement: false,
            errorType: 'unsupported',
            message: 'Trình duyệt chưa hỗ trợ ghi âm trực tiếp. Đang hiển thị mô phỏng trực quan.'
        };
    }

    const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtxClass) {
        return {
            hz: null,
            isRealMeasurement: false,
            errorType: 'unsupported',
            message: 'Trình duyệt chưa hỗ trợ Web Audio. Đang hiển thị mô phỏng trực quan.'
        };
    }

    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;

    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        if (signal?.aborted) {
            stopMediaStream(stream);
            return {
                hz: null,
                isRealMeasurement: false,
                errorType: 'aborted',
                message: 'Đã dừng thu âm.'
            };
        }

        ctx = new AudioCtxClass();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);

        const buf = new Float32Array(analyser.fftSize);

        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, durationMs);
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timer);
                    reject(new DOMException('Aborted', 'AbortError'));
                }, { once: true });
            }
        });

        analyser.getFloatTimeDomainData(buf);
        const detectedHz = detectPitchF0(buf, ctx.sampleRate);

        if (detectedHz <= 0) {
            return {
                hz: null,
                isRealMeasurement: false,
                errorType: 'silence',
                message: 'Chưa phát hiện giọng nói rõ ràng. Đang hiển thị mô phỏng đường mẫu.'
            };
        }

        return {
            hz: detectedHz,
            isRealMeasurement: true,
            message: `Đã đo cao độ thực tế: ${detectedHz} Hz.`
        };
    } catch (err: unknown) {
        const error = err as { name?: string; message?: string };
        if (error?.name === 'AbortError' || signal?.aborted) {
            return {
                hz: null,
                isRealMeasurement: false,
                errorType: 'aborted',
                message: 'Đã dừng thu âm.'
            };
        }
        if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
            return {
                hz: null,
                isRealMeasurement: false,
                errorType: 'permission_denied',
                message: 'Chưa cấp quyền micro. Đang hiển thị mô phỏng đường mẫu để bạn tham khảo.'
            };
        }
        if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
            return {
                hz: null,
                isRealMeasurement: false,
                errorType: 'no_device',
                message: 'Không tìm thấy thiết bị micro. Đang hiển thị mô phỏng đường mẫu.'
            };
        }
        return {
            hz: null,
            isRealMeasurement: false,
            errorType: 'unknown',
            message: 'Chưa thể truy cập micro. Đang hiển thị mô phỏng đường mẫu.'
        };
    } finally {
        stopMediaStream(stream);
        closeAudioContext(ctx);
    }
}
