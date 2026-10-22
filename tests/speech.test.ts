import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    scoreVoice,
    getBestChineseVoice,
    speakChinese,
    speakChineseSlow,
    stopSpeaking,
    cancelSpeech,
    isSpeechSynthesisSupported,
    detectPitchF0,
    stopMediaStream,
    closeAudioContext,
    captureMicrophonePitch
} from '../src/services/speech';

// Helper to create mock SpeechSynthesisVoice
function createMockVoice(overrides: Partial<SpeechSynthesisVoice>): SpeechSynthesisVoice {
    return {
        default: false,
        lang: 'zh-TW',
        localService: true,
        name: 'Microsoft HsiaoChen Online (Natural) - Chinese (Taiwan)',
        voiceURI: 'HsiaoChen',
        ...overrides
    };
}

describe('A14 — Speech Synthesis Voice Scoring & Ranking', () => {
    it('ranks Taiwanese voices higher than Hong Kong, Mainland, and non-Chinese voices', () => {
        const voiceTW = createMockVoice({ name: 'Microsoft HsiaoChen Online (Natural) - Chinese (Taiwan)', lang: 'zh-TW' });
        const voiceHK = createMockVoice({ name: 'Microsoft HiuMaan Online (Natural) - Chinese (Hong Kong)', lang: 'zh-HK' });
        const voiceCN = createMockVoice({ name: 'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)', lang: 'zh-CN' });
        const voiceEN = createMockVoice({ name: 'Microsoft Jenny Online (Natural) - English (United States)', lang: 'en-US' });

        const scoreTW = scoreVoice(voiceTW);
        const scoreHK = scoreVoice(voiceHK);
        const scoreCN = scoreVoice(voiceCN);
        const scoreEN = scoreVoice(voiceEN);

        expect(scoreTW).toBeGreaterThan(scoreHK);
        expect(scoreHK).toBeGreaterThan(scoreCN);
        expect(scoreCN).toBeGreaterThan(scoreEN);
        expect(scoreEN).toBe(0);
    });

    it('prioritizes natural Taiwanese voices (HsiaoChen, YunJhe, Google 國語, Mei-Jia) over robotic legacy voices', () => {
        const naturalTW = createMockVoice({ name: 'Microsoft HsiaoChen Online (Natural) - Chinese (Taiwan)', lang: 'zh-TW' });
        const googleTW = createMockVoice({ name: 'Google 國語 (臺灣)', lang: 'zh-TW' });
        const appleTW = createMockVoice({ name: 'Mei-Jia (zh-TW)', lang: 'zh-TW' });
        const roboticDesktopTW = createMockVoice({ name: 'Microsoft Hanhan Desktop - Chinese (Taiwan)', lang: 'zh-TW' });

        expect(scoreVoice(naturalTW)).toBeGreaterThan(scoreVoice(roboticDesktopTW));
        expect(scoreVoice(googleTW)).toBeGreaterThan(scoreVoice(roboticDesktopTW));
        expect(scoreVoice(appleTW)).toBeGreaterThan(scoreVoice(roboticDesktopTW));
    });

    it('handles voice tags with underscores (zh_TW, zh_HK, zh_CN)', () => {
        const voice = createMockVoice({ name: 'Taiwanese Voice', lang: 'zh_TW' });
        expect(scoreVoice(voice)).toBeGreaterThan(500);
    });
});

describe('A14 — Best Voice Selection (zh-TW preference & fallbacks)', () => {
    let originalWindow: typeof globalThis.window;

    beforeEach(() => {
        originalWindow = globalThis.window;
    });

    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('returns null if window or speechSynthesis is unavailable', () => {
        Reflect.deleteProperty(globalThis, 'window');
        expect(getBestChineseVoice()).toBeNull();
    });

    it('selects best zh-TW voice when present', () => {
        const mockVoices: SpeechSynthesisVoice[] = [
            createMockVoice({ name: 'Microsoft Jenny', lang: 'en-US' }),
            createMockVoice({ name: 'Microsoft Xiaoxiao', lang: 'zh-CN' }),
            createMockVoice({ name: 'Microsoft HsiaoChen Online (Natural)', lang: 'zh-TW' }),
            createMockVoice({ name: 'Microsoft HiuMaan', lang: 'zh-HK' })
        ];

        vi.stubGlobal('window', {
            speechSynthesis: {
                getVoices: () => mockVoices,
                onvoiceschanged: null
            }
        });

        const best = getBestChineseVoice();
        expect(best?.name).toContain('HsiaoChen');
        expect(best?.lang).toBe('zh-TW');
    });

    it('falls back to zh-HK when no zh-TW voices exist', () => {
        const mockVoices: SpeechSynthesisVoice[] = [
            createMockVoice({ name: 'Microsoft Jenny', lang: 'en-US' }),
            createMockVoice({ name: 'Microsoft Xiaoxiao', lang: 'zh-CN' }),
            createMockVoice({ name: 'Microsoft HiuMaan Online (Natural)', lang: 'zh-HK' })
        ];

        vi.stubGlobal('window', {
            speechSynthesis: {
                getVoices: () => mockVoices,
                onvoiceschanged: null
            }
        });

        const best = getBestChineseVoice();
        expect(best?.name).toContain('HiuMaan');
        expect(best?.lang).toBe('zh-HK');
    });

    it('falls back to zh-CN when neither zh-TW nor zh-HK voices exist', () => {
        const mockVoices: SpeechSynthesisVoice[] = [
            createMockVoice({ name: 'Microsoft Jenny', lang: 'en-US' }),
            createMockVoice({ name: 'Microsoft Xiaoxiao Online (Natural)', lang: 'zh-CN' })
        ];

        vi.stubGlobal('window', {
            speechSynthesis: {
                getVoices: () => mockVoices,
                onvoiceschanged: null
            }
        });

        const best = getBestChineseVoice();
        expect(best?.name).toContain('Xiaoxiao');
        expect(best?.lang).toBe('zh-CN');
    });

    it('respects preferredLang when passed to getBestChineseVoice', () => {
        const mockVoices: SpeechSynthesisVoice[] = [
            createMockVoice({ name: 'Microsoft HsiaoChen Online (Natural)', lang: 'zh-TW' }),
            createMockVoice({ name: 'Microsoft HiuMaan Online (Natural)', lang: 'zh-HK' }),
            createMockVoice({ name: 'Microsoft Xiaoxiao Online (Natural)', lang: 'zh-CN' })
        ];

        vi.stubGlobal('window', {
            speechSynthesis: {
                getVoices: () => mockVoices,
                onvoiceschanged: null
            }
        });

        const preferredCN = getBestChineseVoice('zh-CN');
        expect(preferredCN?.lang).toBe('zh-CN');

        const preferredHK = getBestChineseVoice('zh-HK');
        expect(preferredHK?.lang).toBe('zh-HK');
    });

    it('updates cached voice when onvoiceschanged fires', () => {
        const mockVoices: SpeechSynthesisVoice[] = [
            createMockVoice({ name: 'Microsoft HsiaoChen Online (Natural)', lang: 'zh-TW' })
        ];

        let onVoicesChangedCb: (() => void) | null = null;
        vi.stubGlobal('window', {
            speechSynthesis: {
                getVoices: () => mockVoices,
                get onvoiceschanged() {
                    return onVoicesChangedCb;
                },
                set onvoiceschanged(fn) {
                    onVoicesChangedCb = fn;
                }
            }
        });

        // Trigger onvoiceschanged callback if set
        if (typeof onVoicesChangedCb === 'function') {
            (onVoicesChangedCb as () => void)();
        }
        const voice = getBestChineseVoice();
        expect(voice?.name).toContain('HsiaoChen');
    });
});

describe('A14 — Speech Synthesis Execution & Chromium GC retention', () => {
    let mockCancel: ReturnType<typeof vi.fn>;
    let mockSpeak: ReturnType<typeof vi.fn>;
    let mockResume: ReturnType<typeof vi.fn>;
    let mockGetVoices: ReturnType<typeof vi.fn>;
    let originalWindow: typeof globalThis.window;
    let createdUtterances: MockUtterance[];

    class MockUtterance {
        text: string;
        lang = 'zh-TW';
        voice: SpeechSynthesisVoice | null = null;
        rate = 1;
        pitch = 1;
        onend: (() => void) | null = null;
        onerror: ((e: { error?: string }) => void) | null = null;

        constructor(text: string) {
            this.text = text;
            createdUtterances.push(this);
        }
    }

    beforeEach(() => {
        originalWindow = globalThis.window;
        createdUtterances = [];
        mockCancel = vi.fn();
        mockSpeak = vi.fn();
        mockResume = vi.fn();
        mockGetVoices = vi.fn().mockReturnValue([
            createMockVoice({ name: 'Microsoft HsiaoChen Online (Natural)', lang: 'zh-TW' })
        ]);

        vi.stubGlobal('window', {
            isSecureContext: true,
            speechSynthesis: {
                cancel: mockCancel,
                speak: mockSpeak,
                resume: mockResume,
                paused: false,
                getVoices: mockGetVoices,
                onvoiceschanged: null
            },
            SpeechSynthesisUtterance: MockUtterance,
            __zhongxue_active_utterance: null,
            __zhongxue_utterance_retains: new Set()
        });

        vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
    });

    afterEach(() => {
        stopSpeaking();
        globalThis.window = originalWindow;
        Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance');
    });

    it('detects Web Speech API support correctly', () => {
        expect(isSpeechSynthesisSupported()).toBe(true);

        Reflect.deleteProperty(globalThis.window, 'speechSynthesis');
        expect(isSpeechSynthesisSupported()).toBe(false);
    });

    it('returns false and triggers onError if Web Speech is unsupported', () => {
        Reflect.deleteProperty(globalThis.window, 'speechSynthesis');
        const onError = vi.fn();

        const result = speakChinese('你好', { onError });
        expect(result).toBe(false);
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('chưa hỗ trợ'));
    });

    it('returns false for empty or whitespace-only text without calling speak', () => {
        const result1 = speakChinese('');
        const result2 = speakChinese('   ');
        expect(result1).toBe(false);
        expect(result2).toBe(false);
        expect(mockSpeak).not.toHaveBeenCalled();
    });

    it('cancels any prior speech before beginning a new utterance', () => {
        speakChinese('你好');
        expect(mockCancel).toHaveBeenCalled();
        expect(mockSpeak).toHaveBeenCalled();
    });

    it('resumes speech synthesis if paused', () => {
        Object.defineProperty(window.speechSynthesis, 'paused', { value: true, configurable: true });
        speakChinese('謝謝');
        expect(mockResume).toHaveBeenCalled();
    });

    it('speaks Chinese text with zh-TW voice and rate 0.92', () => {
        const onEnd = vi.fn();
        const success = speakChinese('謝謝', { rate: 0.92, onEnd });

        expect(success).toBe(true);
        expect(createdUtterances.length).toBe(1);
        const utt = createdUtterances[0];
        expect(utt.text).toBe('謝謝');
        expect(utt.lang).toBe('zh-TW');
        expect(utt.rate).toBe(0.92);
        expect(utt.voice?.name).toContain('HsiaoChen');

        // Verify Chromium GC retention
        expect(window.__zhongxue_active_utterance).toBe(utt);
        expect(window.__zhongxue_utterance_retains?.has(utt as unknown as SpeechSynthesisUtterance)).toBe(true);

        // Trigger onend
        utt.onend?.();
        expect(onEnd).toHaveBeenCalled();
        expect(window.__zhongxue_active_utterance).toBeNull();
        expect(window.__zhongxue_utterance_retains?.has(utt as unknown as SpeechSynthesisUtterance)).toBe(false);
    });

    it('speaks Chinese slowly at rate 0.72 via speakChineseSlow', () => {
        speakChineseSlow('早安');
        expect(createdUtterances.length).toBe(1);
        expect(createdUtterances[0].rate).toBe(0.72);
    });

    it('does not display an error message if utterance was canceled or interrupted by user', () => {
        const onError = vi.fn();
        speakChinese('捷運站', { onError });
        const utt = createdUtterances[0];

        // Simulate cancel/interrupted event
        utt.onerror?.({ error: 'interrupted' });
        expect(onError).not.toHaveBeenCalled();

        utt.onerror?.({ error: 'canceled' });
        expect(onError).not.toHaveBeenCalled();
    });

    it('displays error message for genuine audio playback errors', () => {
        const onError = vi.fn();
        speakChinese('夜市', { onError });
        const utt = createdUtterances[0];

        utt.onerror?.({ error: 'audio-busy' });
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('Chưa thể phát âm thanh'));
    });

    it('stops speech and clears all global GC references when stopSpeaking/cancelSpeech is called', () => {
        speakChinese('臺北');
        expect(window.__zhongxue_active_utterance).not.toBeNull();

        stopSpeaking();
        expect(mockCancel).toHaveBeenCalled();
        expect(window.__zhongxue_active_utterance).toBeNull();
        expect(window.__zhongxue_utterance_retains?.size).toBe(0);

        // Test cancelSpeech alias
        cancelSpeech();
        expect(mockCancel).toHaveBeenCalled();
    });

    it('reports error when voices are loaded but none match Chinese', () => {
        mockGetVoices.mockReturnValue([
            createMockVoice({ name: 'Microsoft David', lang: 'en-US' })
        ]);
        const onError = vi.fn();

        const success = speakChinese('你好', { onError });
        expect(success).toBe(false);
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('chưa có giọng tiếng Hoa'));
    });
});

describe('A14 — Autocorrelation Pitch Detection F0 (detectPitchF0)', () => {
    it('returns -1 for empty or invalid buffer', () => {
        expect(detectPitchF0(new Float32Array(0), 44100)).toBe(-1);
        expect(detectPitchF0(new Float32Array(1024), 0)).toBe(-1);
        expect(detectPitchF0(new Float32Array(1024), -44100)).toBe(-1);
    });

    it('returns -1 for complete silence (all zeros)', () => {
        const silence = new Float32Array(1024);
        expect(detectPitchF0(silence, 44100)).toBe(-1);
    });

    it('returns -1 for low amplitude noise below RMS threshold (0.015)', () => {
        const quietNoise = new Float32Array(1024);
        for (let i = 0; i < quietNoise.length; i++) {
            quietNoise[i] = 0.005 * (Math.random() * 2 - 1);
        }
        expect(detectPitchF0(quietNoise, 44100)).toBe(-1);
    });

    it('detects pure sine wave at 220 Hz within +/- 2.5 Hz tolerance', () => {
        const sampleRate = 44100;
        const targetFreq = 220;
        const buffer = new Float32Array(1024);

        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = 0.5 * Math.sin((2 * Math.PI * targetFreq * i) / sampleRate);
        }

        const detected = detectPitchF0(buffer, sampleRate);
        expect(detected).toBeGreaterThan(217);
        expect(detected).toBeLessThan(223);
    });

    it('detects pure sine wave at 330 Hz within +/- 3.5 Hz tolerance', () => {
        const sampleRate = 44100;
        const targetFreq = 330;
        const buffer = new Float32Array(1024);

        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = 0.5 * Math.sin((2 * Math.PI * targetFreq * i) / sampleRate);
        }

        const detected = detectPitchF0(buffer, sampleRate);
        expect(detected).toBeGreaterThan(326);
        expect(detected).toBeLessThan(334);
    });

    it('returns -1 if buffer length is shorter than maxOffset', () => {
        const sampleRate = 44100;
        // maxOffset = 44100 / 80 = 551
        const shortBuffer = new Float32Array(200);
        for (let i = 0; i < shortBuffer.length; i++) {
            shortBuffer[i] = 0.5;
        }
        expect(detectPitchF0(shortBuffer, sampleRate)).toBe(-1);
    });
});

describe('A14 — MediaStream and AudioContext Cleanup', () => {
    it('stopMediaStream stops all tracks on the stream', () => {
        const stop1 = vi.fn();
        const stop2 = vi.fn();
        const mockStream = {
            getTracks: () => [
                { stop: stop1 },
                { stop: stop2 }
            ]
        } as unknown as MediaStream;

        stopMediaStream(mockStream);
        expect(stop1).toHaveBeenCalledTimes(1);
        expect(stop2).toHaveBeenCalledTimes(1);

        // Safe with null/undefined
        expect(() => stopMediaStream(null)).not.toThrow();
        expect(() => stopMediaStream(undefined)).not.toThrow();
    });

    it('closeAudioContext closes AudioContext if not already closed', () => {
        const mockClose = vi.fn().mockResolvedValue(undefined);
        const mockCtx = {
            state: 'running',
            close: mockClose
        } as unknown as AudioContext;

        closeAudioContext(mockCtx);
        expect(mockClose).toHaveBeenCalledTimes(1);

        // Does not re-close if already closed
        const closedCtx = {
            state: 'closed',
            close: mockClose
        } as unknown as AudioContext;
        closeAudioContext(closedCtx);
        expect(mockClose).toHaveBeenCalledTimes(1);

        // Safe with null/undefined
        expect(() => closeAudioContext(null)).not.toThrow();
        expect(() => closeAudioContext(undefined)).not.toThrow();
    });
});

describe('A14 — captureMicrophonePitch UX Transparency & Error Handling', () => {
    let originalWindow: typeof globalThis.window;
    const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    function setMockNavigator(mockNav: unknown) {
        Object.defineProperty(globalThis, 'navigator', {
            value: mockNav,
            configurable: true,
            writable: true
        });
    }

    function restoreNavigator() {
        if (originalNavigatorDesc) {
            Object.defineProperty(globalThis, 'navigator', originalNavigatorDesc);
        }
    }

    beforeEach(() => {
        originalWindow = globalThis.window;
    });

    afterEach(() => {
        globalThis.window = originalWindow;
        restoreNavigator();
    });

    it('returns unsecure_context when window.isSecureContext is false', async () => {
        vi.stubGlobal('window', {
            isSecureContext: false
        });

        const result = await captureMicrophonePitch();
        expect(result.isRealMeasurement).toBe(false);
        expect(result.errorType).toBe('unsecure_context');
        expect(result.message).toContain('kết nối bảo mật');
    });

    it('returns unsupported when getUserMedia is missing', async () => {
        vi.stubGlobal('window', {
            isSecureContext: true
        });
        setMockNavigator({
            mediaDevices: undefined
        });

        const result = await captureMicrophonePitch();
        expect(result.isRealMeasurement).toBe(false);
        expect(result.errorType).toBe('unsupported');
    });

    it('handles permission denied (NotAllowedError) gracefully without throwing', async () => {
        vi.stubGlobal('window', {
            isSecureContext: true,
            AudioContext: vi.fn()
        });
        setMockNavigator({
            mediaDevices: {
                getUserMedia: vi.fn().mockRejectedValue({ name: 'NotAllowedError' })
            }
        });

        const result = await captureMicrophonePitch();
        expect(result.isRealMeasurement).toBe(false);
        expect(result.errorType).toBe('permission_denied');
        expect(result.message).toContain('Chưa cấp quyền micro');
    });

    it('handles missing microphone device (NotFoundError) gracefully', async () => {
        vi.stubGlobal('window', {
            isSecureContext: true,
            AudioContext: vi.fn()
        });
        setMockNavigator({
            mediaDevices: {
                getUserMedia: vi.fn().mockRejectedValue({ name: 'NotFoundError' })
            }
        });

        const result = await captureMicrophonePitch();
        expect(result.isRealMeasurement).toBe(false);
        expect(result.errorType).toBe('no_device');
        expect(result.message).toContain('Không tìm thấy thiết bị micro');
    });

    it('handles aborted signal gracefully during recording', async () => {
        const controller = new AbortController();
        controller.abort();

        const result = await captureMicrophonePitch({ signal: controller.signal });
        expect(result.isRealMeasurement).toBe(false);
        expect(result.errorType).toBe('aborted');
    });

    it('returns unsupported when AudioContext is missing', async () => {
        vi.stubGlobal('window', {
            isSecureContext: true,
            AudioContext: undefined
        });
        setMockNavigator({
            mediaDevices: { getUserMedia: vi.fn() }
        });

        const result = await captureMicrophonePitch();
        expect(result.isRealMeasurement).toBe(false);
        expect(result.errorType).toBe('unsupported');
    });

    it('returns silence error when audio signal is below threshold', async () => {
        const stopTrack = vi.fn();
        const closeCtx = vi.fn().mockResolvedValue(undefined);
        const mockStream = {
            getTracks: () => [{ stop: stopTrack }]
        };

        class MockSilentAnalyser {
            fftSize = 1024;
            getFloatTimeDomainData(buf: Float32Array) {
                // All zeros (complete silence)
                buf.fill(0);
            }
        }

        class MockAudioContext {
            sampleRate = 44100;
            state = 'running';
            createMediaStreamSource() {
                return { connect: vi.fn() };
            }
            createAnalyser() {
                return new MockSilentAnalyser();
            }
            close = closeCtx;
        }

        vi.stubGlobal('window', {
            isSecureContext: true,
            AudioContext: MockAudioContext
        });
        setMockNavigator({
            mediaDevices: {
                getUserMedia: vi.fn().mockResolvedValue(mockStream)
            }
        });

        const result = await captureMicrophonePitch({ durationMs: 20 });
        expect(result.isRealMeasurement).toBe(false);
        expect(result.errorType).toBe('silence');
        expect(result.message).toContain('Chưa phát hiện giọng nói rõ ràng');
        expect(stopTrack).toHaveBeenCalled();
        expect(closeCtx).toHaveBeenCalled();
    });

    it('handles unexpected generic error in getUserMedia gracefully', async () => {
        vi.stubGlobal('window', {
            isSecureContext: true,
            AudioContext: vi.fn()
        });
        setMockNavigator({
            mediaDevices: {
                getUserMedia: vi.fn().mockRejectedValue(new Error('Hardware boom'))
            }
        });

        const result = await captureMicrophonePitch();
        expect(result.isRealMeasurement).toBe(false);
        expect(result.errorType).toBe('unknown');
        expect(result.message).toContain('Chưa thể truy cập micro');
    });

    it('handles signal abort during audio streaming', async () => {
        const stopTrack = vi.fn();
        const closeCtx = vi.fn().mockResolvedValue(undefined);
        const mockStream = {
            getTracks: () => [{ stop: stopTrack }]
        };

        class MockAudioContext {
            sampleRate = 44100;
            state = 'running';
            createMediaStreamSource() {
                return { connect: vi.fn() };
            }
            createAnalyser() {
                return {
                    fftSize: 1024,
                    getFloatTimeDomainData: vi.fn()
                };
            }
            close = closeCtx;
        }

        vi.stubGlobal('window', {
            isSecureContext: true,
            AudioContext: MockAudioContext
        });
        setMockNavigator({
            mediaDevices: {
                getUserMedia: vi.fn().mockResolvedValue(mockStream)
            }
        });

        const controller = new AbortController();
        const promise = captureMicrophonePitch({ durationMs: 200, signal: controller.signal });
        // Abort mid-flight
        setTimeout(() => controller.abort(), 20);

        const result = await promise;
        expect(result.isRealMeasurement).toBe(false);
        expect(result.errorType).toBe('aborted');
        expect(stopTrack).toHaveBeenCalled();
        expect(closeCtx).toHaveBeenCalled();
    });

    it('guarantees media tracks and AudioContext are cleaned up on success or failure', async () => {
        const stopTrack = vi.fn();
        const closeCtx = vi.fn().mockResolvedValue(undefined);

        const mockStream = {
            getTracks: () => [{ stop: stopTrack }]
        };

        class MockAnalyser {
            fftSize = 1024;
            getFloatTimeDomainData(buf: Float32Array) {
                // Populate with 220Hz wave
                for (let i = 0; i < buf.length; i++) {
                    buf[i] = 0.5 * Math.sin((2 * Math.PI * 220 * i) / 44100);
                }
            }
        }

        class MockAudioContext {
            sampleRate = 44100;
            state = 'running';
            createMediaStreamSource() {
                return { connect: vi.fn() };
            }
            createAnalyser() {
                return new MockAnalyser();
            }
            close = closeCtx;
        }

        vi.stubGlobal('window', {
            isSecureContext: true,
            AudioContext: MockAudioContext
        });
        setMockNavigator({
            mediaDevices: {
                getUserMedia: vi.fn().mockResolvedValue(mockStream)
            }
        });

        const result = await captureMicrophonePitch({ durationMs: 20 });
        expect(result.isRealMeasurement).toBe(true);
        expect(result.hz).toBeGreaterThan(215);
        expect(result.hz).toBeLessThan(225);

        // Crucial resource cleanup verification
        expect(stopTrack).toHaveBeenCalled();
        expect(closeCtx).toHaveBeenCalled();
    });
});

describe('G7 / T15 Acceptance — Speech Synthesis Interruption & Multi-Button Synchronization', () => {
    let mockCancel: ReturnType<typeof vi.fn>;
    let mockSpeak: ReturnType<typeof vi.fn>;
    let mockResume: ReturnType<typeof vi.fn>;
    let mockGetVoices: ReturnType<typeof vi.fn>;
    let originalWindow: typeof globalThis.window;
    let createdUtterances: MockUtterance[];

    class MockUtterance {
        text: string;
        lang = 'zh-TW';
        voice: SpeechSynthesisVoice | null = null;
        rate = 1;
        pitch = 1;
        onend: (() => void) | null = null;
        onerror: ((e: { error?: string }) => void) | null = null;

        constructor(text: string) {
            this.text = text;
            createdUtterances.push(this);
        }
    }

    beforeEach(() => {
        originalWindow = globalThis.window;
        createdUtterances = [];
        mockCancel = vi.fn();
        mockSpeak = vi.fn();
        mockResume = vi.fn();
        mockGetVoices = vi.fn().mockReturnValue([
            createMockVoice({ name: 'Microsoft HsiaoChen Online (Natural)', lang: 'zh-TW' })
        ]);

        vi.stubGlobal('window', {
            isSecureContext: true,
            speechSynthesis: {
                cancel: mockCancel,
                speak: mockSpeak,
                resume: mockResume,
                paused: false,
                getVoices: mockGetVoices,
                onvoiceschanged: null
            },
            SpeechSynthesisUtterance: MockUtterance,
            __zhongxue_active_utterance: null,
            __zhongxue_utterance_retains: new Set()
        });

        vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
    });

    afterEach(() => {
        stopSpeaking();
        globalThis.window = originalWindow;
        Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance');
    });

    it('synchronizes playback without relying on browser cancellation events', () => {
        const firstEnd = vi.fn();
        const secondEnd = vi.fn();
        speakChinese('學生', { onEnd: firstEnd });
        speakChinese('我是學生', { onEnd: secondEnd });
        expect(firstEnd).toHaveBeenCalledTimes(1);
        expect(secondEnd).not.toHaveBeenCalled();
        stopSpeaking();
        expect(secondEnd).toHaveBeenCalledTimes(1);
        // Late browser cancellation events must not notify twice.
        createdUtterances[0].onerror?.({ error: 'interrupted' });
        createdUtterances[1].onend?.();
        expect(firstEnd).toHaveBeenCalledTimes(1);
        expect(secondEnd).toHaveBeenCalledTimes(1);
    });

    it('ignores late errors from an explicitly stopped utterance', () => {
        const onEnd = vi.fn();
        const onError = vi.fn();
        speakChinese('你好', { onEnd, onError });
        stopSpeaking();
        createdUtterances[0].onerror?.({ error: 'network' });
        expect(onEnd).toHaveBeenCalledTimes(1);
        expect(onError).not.toHaveBeenCalled();
    });

    it('invokes onEnd on previous utterance when interrupted by subsequent speakChinese (multi-button sync)', () => {
        const onEndWord = vi.fn();
        const onEndSentence = vi.fn();

        // 1. User clicks word pronunciation button
        const wordStarted = speakChinese('學生', { onEnd: onEndWord });
        expect(wordStarted).toBe(true);
        expect(createdUtterances.length).toBe(1);
        const wordUtt = createdUtterances[0];

        // 2. User immediately clicks example sentence pronunciation button
        // speech service calls window.speechSynthesis.cancel() before starting sentence
        const sentenceStarted = speakChinese('我是學生', { onEnd: onEndSentence });
        expect(sentenceStarted).toBe(true);
        expect(mockCancel).toHaveBeenCalled();
        expect(createdUtterances.length).toBe(2);

        // In Chromium, cancel triggers onerror with error: 'interrupted' on the previous utterance
        wordUtt.onerror?.({ error: 'interrupted' });

        // Invariant: The interrupted utterance MUST invoke onEnd so its SpeakButton resets isPlaying to false
        expect(onEndWord).toHaveBeenCalledTimes(1);
    });

    it('invokes onEnd on active utterance when stopped via stopSpeaking or cancelSpeech', () => {
        const onEnd = vi.fn();
        const onError = vi.fn();

        speakChinese('謝謝', { onEnd, onError });
        expect(createdUtterances.length).toBe(1);
        const utt = createdUtterances[0];

        // Explicit stop by user or cleanup hook
        stopSpeaking();
        expect(mockCancel).toHaveBeenCalled();

        // Simulate browser cancel event
        utt.onerror?.({ error: 'interrupted' });

        // Invariant: onEnd must be notified, but onError must NOT be triggered
        expect(onEnd).toHaveBeenCalledTimes(1);
        expect(onError).not.toHaveBeenCalled();
    });

    it('invokes onEnd on active utterance when browser cancels speech with error: canceled', () => {
        const onEnd = vi.fn();
        const onError = vi.fn();

        speakChinese('你好', { onEnd, onError });
        expect(createdUtterances.length).toBe(1);
        const utt = createdUtterances[0];

        // Simulate browser cancel event
        utt.onerror?.({ error: 'canceled' });

        // Invariant: onEnd must be notified, but onError must NOT be triggered
        expect(onEnd).toHaveBeenCalledTimes(1);
        expect(onError).not.toHaveBeenCalled();
    });

    it('maintains exactly one active utterance in retention during rapid alternating speech switches', () => {
        const onEndA = vi.fn();
        const onEndB = vi.fn();
        const onEndC = vi.fn();

        speakChinese('詞彙', { onEnd: onEndA });
        const uttA = createdUtterances[0];

        speakChinese('例句一', { onEnd: onEndB });
        uttA.onerror?.({ error: 'interrupted' });
        const uttB = createdUtterances[1];

        speakChinese('例句二', { onEnd: onEndC });
        uttB.onerror?.({ error: 'interrupted' });
        const uttC = createdUtterances[2];

        // All prior utterances must have received onEnd
        expect(onEndA).toHaveBeenCalledTimes(1);
        expect(onEndB).toHaveBeenCalledTimes(1);
        expect(onEndC).not.toHaveBeenCalled();

        // Only the latest utterance is retained
        expect(window.__zhongxue_active_utterance).toBe(uttC);
        expect(window.__zhongxue_utterance_retains?.has(uttA as unknown as SpeechSynthesisUtterance)).toBe(false);
        expect(window.__zhongxue_utterance_retains?.has(uttB as unknown as SpeechSynthesisUtterance)).toBe(false);
        expect(window.__zhongxue_utterance_retains?.has(uttC as unknown as SpeechSynthesisUtterance)).toBe(true);
    });
});

describe('G7 / T15 Acceptance — Chao Tone Visualization & Acoustic Measurement Truthfulness', () => {
    let originalWindow: typeof globalThis.window;
    const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    function setMockNavigator(mockNav: unknown) {
        Object.defineProperty(globalThis, 'navigator', {
            value: mockNav,
            configurable: true,
            writable: true
        });
    }

    function restoreNavigator() {
        if (originalNavigatorDesc) {
            Object.defineProperty(globalThis, 'navigator', originalNavigatorDesc);
        }
    }

    beforeEach(() => {
        originalWindow = globalThis.window;
    });

    afterEach(() => {
        globalThis.window = originalWindow;
        restoreNavigator();
    });

    it('never synthesizes fake user pitch Hz when mic permission is denied (truth in measurement)', async () => {
        vi.stubGlobal('window', {
            isSecureContext: true,
            AudioContext: vi.fn()
        });
        setMockNavigator({
            mediaDevices: {
                getUserMedia: vi.fn().mockRejectedValue({ name: 'NotAllowedError' })
            }
        });

        const result = await captureMicrophonePitch();
        expect(result.isRealMeasurement).toBe(false);
        expect(result.hz).toBeNull();
        expect(result.errorType).toBe('permission_denied');
        // UI must not claim this is measured voice
        expect(result.message).toContain('Chưa cấp quyền micro');
    });

    it('never synthesizes fake user pitch Hz when audio signal is silence', async () => {
        const stopTrack = vi.fn();
        const closeCtx = vi.fn().mockResolvedValue(undefined);
        const mockStream = {
            getTracks: () => [{ stop: stopTrack }]
        };

        class MockSilentAnalyser {
            fftSize = 1024;
            getFloatTimeDomainData(buf: Float32Array) {
                buf.fill(0);
            }
        }

        class MockAudioContext {
            sampleRate = 44100;
            state = 'running';
            createMediaStreamSource() {
                return { connect: vi.fn() };
            }
            createAnalyser() {
                return new MockSilentAnalyser();
            }
            close = closeCtx;
        }

        vi.stubGlobal('window', {
            isSecureContext: true,
            AudioContext: MockAudioContext
        });
        setMockNavigator({
            mediaDevices: {
                getUserMedia: vi.fn().mockResolvedValue(mockStream)
            }
        });

        const result = await captureMicrophonePitch({ durationMs: 20 });
        expect(result.isRealMeasurement).toBe(false);
        expect(result.hz).toBeNull();
        expect(result.errorType).toBe('silence');
    });

    it('distinguishes real acoustic measurement from simulation fallback', async () => {
        const stopTrack = vi.fn();
        const closeCtx = vi.fn().mockResolvedValue(undefined);
        const mockStream = {
            getTracks: () => [{ stop: stopTrack }]
        };

        class MockToneAnalyser {
            fftSize = 1024;
            getFloatTimeDomainData(buf: Float32Array) {
                // Synthesize 330Hz wave (Tone 1 / High flat ~330Hz)
                for (let i = 0; i < buf.length; i++) {
                    buf[i] = 0.5 * Math.sin((2 * Math.PI * 330 * i) / 44100);
                }
            }
        }

        class MockAudioContext {
            sampleRate = 44100;
            state = 'running';
            createMediaStreamSource() {
                return { connect: vi.fn() };
            }
            createAnalyser() {
                return new MockToneAnalyser();
            }
            close = closeCtx;
        }

        vi.stubGlobal('window', {
            isSecureContext: true,
            AudioContext: MockAudioContext
        });
        setMockNavigator({
            mediaDevices: {
                getUserMedia: vi.fn().mockResolvedValue(mockStream)
            }
        });

        const result = await captureMicrophonePitch({ durationMs: 20 });
        expect(result.isRealMeasurement).toBe(true);
        expect(result.hz).not.toBeNull();
        expect(result.hz).toBeGreaterThan(325);
        expect(result.hz).toBeLessThan(335);
    });
});
