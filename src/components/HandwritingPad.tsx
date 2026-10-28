import { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Trash2, X, Sparkles, Edit3, AlertCircle, Info } from 'lucide-react';
import { recognizeHandwritingDetailed, fallbackClientHandwriting, type HandwritingRecognitionResult, type HandwritingStroke } from '../services/api';

interface HandwritingPadProps {
    onSelectWord: (word: string) => void;
    onClose: () => void;
}

export function HandwritingPad({ onSelectWord, onClose }: HandwritingPadProps) {
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const closeBtnRef = useRef<HTMLButtonElement | null>(null);
    const triggerElementRef = useRef<HTMLElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const requestIdRef = useRef<number>(0);

    const [isDrawing, setIsDrawing] = useState(false);
    const [strokes, setStrokes] = useState<HandwritingStroke[]>([]);
    const [candidates, setCandidates] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [recognitionMode, setRecognitionMode] = useState<'idle' | 'online' | 'offline_fallback' | 'no_candidates'>('idle');

    const currentStroke = useRef<{ x: number[]; y: number[]; t: number[] }>({ x: [], y: [], t: [] });
    const startTimeRef = useRef<number>(0);

    const CANVAS_SIZE = 300;

    const cancelRecognition = useCallback(() => {
        requestIdRef.current++;
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
    }, []);

    const handleClose = useCallback(() => {
        cancelRecognition();
        onClose();
    }, [onClose, cancelRecognition]);

    // Accessibility: Focus management (save trigger, focus close button, restore on unmount)
    useEffect(() => {
        triggerElementRef.current = document.activeElement as HTMLElement | null;

        const timer = setTimeout(() => {
            closeBtnRef.current?.focus();
        }, 30);

        return () => {
            clearTimeout(timer);
            cancelRecognition();
            if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
                triggerElementRef.current.focus();
            }
        };
    }, [cancelRecognition]);

    // Accessibility: Keyboard navigation (Escape to close, Tab loop focus trap)
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleClose();
                return;
            }

            if (e.key === 'Tab') {
                const dialog = dialogRef.current;
                if (!dialog) return;

                const focusableElements = Array.from(
                    dialog.querySelectorAll<HTMLElement>(
                        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    )
                ).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

                if (focusableElements.length === 0) {
                    e.preventDefault();
                    return;
                }

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement || !dialog.contains(document.activeElement)) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement || !dialog.contains(document.activeElement)) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleClose]);

    /** Redraw all strokes on the canvas */
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);

        // Draw Tianzige (米字格) guidelines
        ctx.save();
        ctx.strokeStyle = 'rgba(200, 50, 43, 0.16)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(0, CANVAS_SIZE / 2);
        ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(CANVAS_SIZE / 2, 0);
        ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(200, 50, 43, 0.08)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE);
        ctx.moveTo(CANVAS_SIZE, 0);
        ctx.lineTo(0, CANVAS_SIZE);
        ctx.stroke();

        ctx.restore();

        // Draw existing strokes
        ctx.save();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const stroke of strokes) {
            const [xs, ys] = stroke;
            if (xs.length === 0) continue;

            ctx.beginPath();
            if (xs.length === 1) {
                ctx.arc(xs[0], ys[0], 2.25, 0, Math.PI * 2);
                ctx.fillStyle = '#1e293b';
                ctx.fill();
            } else {
                ctx.moveTo(xs[0], ys[0]);
                for (let i = 1; i < xs.length; i++) {
                    ctx.lineTo(xs[i], ys[i]);
                }
                ctx.stroke();
            }
        }
        ctx.restore();
    }, [strokes]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = CANVAS_SIZE * dpr;
        canvas.height = CANVAS_SIZE * dpr;
        canvas.style.width = `${CANVAS_SIZE}px`;
        canvas.style.height = `${CANVAS_SIZE}px`;

        redrawCanvas();
    }, [redrawCanvas]);

    /** Trigger handwriting recognition with timeout cancellation, request ID guard, and offline fallback */
    const triggerRecognition = useCallback(async (currentStrokes: HandwritingStroke[]) => {
        requestIdRef.current++;
        const thisRequestId = requestIdRef.current;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (!currentStrokes.length) {
            setCandidates([]);
            setRecognitionMode('idle');
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        setLoading(true);

        const isBrowserOffline = typeof navigator !== 'undefined' && !navigator.onLine;

        // If explicitly offline, use client fallback directly without network delay
        if (isBrowserOffline) {
            const fallback = fallbackClientHandwriting(currentStrokes);
            if (!controller.signal.aborted && requestIdRef.current === thisRequestId) {
                setCandidates(fallback);
                setRecognitionMode(fallback.length > 0 ? 'offline_fallback' : 'no_candidates');
                setLoading(false);
            }
            return;
        }

        // Online recognition with 3500ms timeout
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<HandwritingRecognitionResult>((_, reject) => {
            timeout = setTimeout(() => {
                reject(new Error('HANDWRITING_TIMEOUT'));
            }, 3500);
            controller.signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                reject(new DOMException('Aborted', 'AbortError'));
            });
        });

        try {
            const results = await Promise.race([
                recognizeHandwritingDetailed(currentStrokes, CANVAS_SIZE, CANVAS_SIZE, controller.signal),
                timeoutPromise
            ]);

            if (controller.signal.aborted || requestIdRef.current !== thisRequestId) return;

            if (results.candidates.length > 0) {
                setCandidates(results.candidates);
                setRecognitionMode(results.source === 'online' ? 'online' : 'offline_fallback');
            } else {
                const fallback = fallbackClientHandwriting(currentStrokes);
                setCandidates(fallback);
                setRecognitionMode(fallback.length > 0 ? 'offline_fallback' : 'no_candidates');
            }
        } catch {
            if (controller.signal.aborted || requestIdRef.current !== thisRequestId) {
                return;
            }

            // Timeout, network or server error -> seamlessly switch to client fallback
            const fallback = fallbackClientHandwriting(currentStrokes);
            if (!controller.signal.aborted && requestIdRef.current === thisRequestId) {
                setCandidates(fallback);
                setRecognitionMode(fallback.length > 0 ? 'offline_fallback' : 'no_candidates');
                controller.abort();
            }
        } finally {
            clearTimeout(timeout);
            if (abortControllerRef.current === controller && requestIdRef.current === thisRequestId) {
                setLoading(false);
            }
        }
    }, []);

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Ignore secondary/tertiary mouse clicks
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        try {
            canvas.setPointerCapture(e.pointerId);
        } catch {
            // ignore if pointer capture fails
        }
        setIsDrawing(true);

        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_SIZE / (rect.width || CANVAS_SIZE);
        const scaleY = CANVAS_SIZE / (rect.height || CANVAS_SIZE);
        const x = Math.max(0, Math.min(CANVAS_SIZE, Math.round((e.clientX - rect.left) * scaleX)));
        const y = Math.max(0, Math.min(CANVAS_SIZE, Math.round((e.clientY - rect.top) * scaleY)));
        startTimeRef.current = Date.now();

        currentStroke.current = {
            x: [x],
            y: [y],
            t: [0]
        };

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y, 2.25, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.restore();
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_SIZE / (rect.width || CANVAS_SIZE);
        const scaleY = CANVAS_SIZE / (rect.height || CANVAS_SIZE);
        const x = Math.max(0, Math.min(CANVAS_SIZE, Math.round((e.clientX - rect.left) * scaleX)));
        const y = Math.max(0, Math.min(CANVAS_SIZE, Math.round((e.clientY - rect.top) * scaleY)));
        const t = Date.now() - startTimeRef.current;

        const xs = currentStroke.current.x;
        const ys = currentStroke.current.y;

        // Prevent redundant identical points
        if (xs.length > 0 && xs[xs.length - 1] === x && ys[ys.length - 1] === y) {
            return;
        }

        xs.push(x);
        ys.push(y);
        currentStroke.current.t.push(t);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (xs.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(xs[xs.length - 2], ys[ys.length - 2]);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            try {
                canvas.releasePointerCapture(e.pointerId);
            } catch {
                // ignore
            }
        }

        const s = currentStroke.current;
        if (s.x.length > 0) {
            const newStroke: HandwritingStroke = [s.x, s.y, s.t];
            const updatedStrokes = [...strokes, newStroke];
            setStrokes(updatedStrokes);
            void triggerRecognition(updatedStrokes);
        }
    }

    function handleUndo() {
        if (!strokes.length) return;
        requestIdRef.current++;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        currentStroke.current = { x: [], y: [], t: [] };
        const updated = strokes.slice(0, -1);
        setStrokes(updated);
        if (updated.length === 0) {
            setCandidates([]);
            setRecognitionMode('idle');
            setLoading(false);
        } else {
            void triggerRecognition(updated);
        }
    }

    function handleClear() {
        if (!strokes.length && !candidates.length) return;
        requestIdRef.current++;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        currentStroke.current = { x: [], y: [], t: [] };
        setStrokes([]);
        setCandidates([]);
        setRecognitionMode('idle');
        setLoading(false);
    }

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="handwriting-pad-title"
            aria-describedby="handwriting-pad-desc"
            onClick={e => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(19, 27, 46, 0.55)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '16px'
            }}
        >
            {/* Screen Reader Announcement Live Region */}
            <div
                aria-live="polite"
                aria-atomic="true"
                style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: 0,
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0
                }}
            >
                {loading
                    ? 'Đang nhận diện nét vẽ...'
                    : candidates.length > 0
                        ? `Đã nhận diện ${candidates.length} gợi ý chữ Hán`
                        : strokes.length > 0
                            ? 'Chưa nhận diện được chữ phù hợp'
                            : ''}
            </div>

            <div style={{
                width: '100%',
                maxWidth: '420px',
                background: '#ffffff',
                borderRadius: '20px',
                boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--ivory-surface)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            background: 'var(--vermilion-cinnabar)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Edit3 size={16} />
                        </div>
                        <div>
                            <h3 id="handwriting-pad-title" style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--on-surface)' }}>
                                Tra bằng chữ viết tay (手寫輸入)
                            </h3>
                            <small id="handwriting-pad-desc" style={{ color: 'var(--on-surface-variant)', fontSize: '11px' }}>
                                Vẽ chữ Hán bằng chuột hoặc ngón tay (Nhấn Esc để đóng)
                            </small>
                        </div>
                    </div>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={handleClose}
                        className="icon-button"
                        aria-label="Đóng bảng viết tay"
                        style={{ padding: '6px' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Candidate Selection Bar */}
                <div style={{
                    padding: '10px 16px',
                    background: 'var(--surface-container-low)',
                    borderBottom: '1px solid var(--border-subtle)',
                    minHeight: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap'
                }}>
                    {loading && (
                        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--vermilion-cinnabar)' }} />
                            Đang nhận diện...
                        </span>
                    )}

                    {!loading && strokes.length === 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--on-surface-variant)', fontSize: '12px' }}>
                            <Sparkles size={14} color="var(--tone-3)" />
                            <span>Vẽ nét vào ô vuông bên dưới, gợi ý chữ Hán sẽ xuất hiện ở đây.</span>
                        </div>
                    )}

                    {!loading && strokes.length > 0 && candidates.length === 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--on-surface-variant)', fontSize: '12px' }}>
                            <AlertCircle size={14} color="var(--tone-4)" />
                            <span>Chưa nhận diện được. Hãy thử lùi 1 nét hoặc vẽ nét rõ hơn.</span>
                        </div>
                    )}

                    {candidates.map((char, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                requestIdRef.current++;
                                if (abortControllerRef.current) {
                                    abortControllerRef.current.abort();
                                    abortControllerRef.current = null;
                                }
                                onSelectWord(char);
                                onClose();
                            }}
                            title={`Chọn "${char}" để tra từ điển`}
                            aria-label={char}
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-strong)',
                                background: '#ffffff',
                                fontSize: '22px',
                                fontWeight: 700,
                                fontFamily: '"Noto Serif", serif',
                                color: 'var(--on-surface)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                                flexShrink: 0
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'var(--vermilion-cinnabar)';
                                e.currentTarget.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--border-strong)';
                                e.currentTarget.style.transform = 'none';
                            }}
                        >
                            {char}
                        </button>
                    ))}
                </div>

                {/* Offline Recognition Disclaimer / Limits Notice */}
                {recognitionMode === 'offline_fallback' && (
                    <div style={{
                        padding: '6px 16px',
                        background: 'rgba(217, 119, 6, 0.08)',
                        borderBottom: '1px solid rgba(217, 119, 6, 0.2)',
                        fontSize: '11px',
                        color: '#92400e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <Info size={13} style={{ flexShrink: 0 }} />
                        <span>
                            Chế độ ngoại tuyến: Nhận diện theo hình học nét (~120 chữ Hán thông dụng & bài học). Cần kết nối mạng để nhận diện toàn bộ Hán tự hiếm.
                        </span>
                    </div>
                )}

                {/* Canvas Drawing Area */}
                <div style={{
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'center',
                    background: 'var(--ivory-surface)'
                }}>
                    <div style={{
                        position: 'relative',
                        width: `${CANVAS_SIZE}px`,
                        height: `${CANVAS_SIZE}px`,
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '2px solid rgba(200, 50, 43, 0.3)',
                        boxShadow: 'inset 0 2px 8px rgba(15, 23, 42, 0.04)',
                        overflow: 'hidden'
                    }}>
                        <canvas
                            ref={canvasRef}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            role="img"
                            aria-label="Khung vẽ chữ Hán"
                            style={{
                                width: '100%',
                                height: '100%',
                                touchAction: 'none',
                                cursor: 'crosshair',
                                display: 'block'
                            }}
                        />
                    </div>
                </div>

                {/* Footer Controls Toolbar */}
                <div style={{
                    padding: '14px 20px',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--ivory-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={handleUndo}
                            disabled={!strokes.length}
                            className="filter-button"
                            aria-label="Lùi 1 nét"
                            title="Lùi 1 nét (Undo)"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                padding: '6px 12px',
                                opacity: !strokes.length ? 0.5 : 1,
                                cursor: !strokes.length ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <RotateCcw size={14} />
                            <span>Lùi 1 nét</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            disabled={!strokes.length}
                            className="filter-button"
                            aria-label="Xóa hết"
                            title="Xóa hết nét vẽ (Clear)"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                padding: '6px 12px',
                                opacity: !strokes.length ? 0.5 : 1,
                                cursor: !strokes.length ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Trash2 size={14} />
                            <span>Xóa hết</span>
                        </button>
                    </div>

                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
                        {strokes.length} nét đã vẽ
                    </span>
                </div>
            </div>
        </div>
    );
}
