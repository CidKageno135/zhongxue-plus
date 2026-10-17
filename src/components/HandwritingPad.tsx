import { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Trash2, X, Sparkles, Edit3 } from 'lucide-react';
import { recognizeHandwriting, type HandwritingStroke } from '../services/api';

interface HandwritingPadProps {
    onSelectWord: (word: string) => void;
    onClose: () => void;
}

export function HandwritingPad({ onSelectWord, onClose }: HandwritingPadProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokes, setStrokes] = useState<HandwritingStroke[]>([]);
    const [candidates, setCandidates] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Current stroke being drawn
    const currentStroke = useRef<{ x: number[]; y: number[]; t: number[] }>({ x: [], y: [], t: [] });
    const startTimeRef = useRef<number>(0);

    const CANVAS_SIZE = 300;

    /** Redraw all strokes on the canvas */
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset transform and clear
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Handle high DPI
        const dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);

        // Draw Tianzige (米字格) guidelines
        ctx.save();
        ctx.strokeStyle = 'rgba(200, 50, 43, 0.16)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        // Horizontal midline
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_SIZE / 2);
        ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE / 2);
        ctx.stroke();

        // Vertical midline
        ctx.beginPath();
        ctx.moveTo(CANVAS_SIZE / 2, 0);
        ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE);
        ctx.stroke();

        // Diagonals
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
            ctx.moveTo(xs[0], ys[0]);
            for (let i = 1; i < xs.length; i++) {
                ctx.lineTo(xs[i], ys[i]);
            }
            ctx.stroke();
        }
        ctx.restore();
    }, [strokes]);

    // Setup high-DPI canvas once on mount and on stroke changes
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

    // Perform handwriting recognition
    const triggerRecognition = useCallback(async (currentStrokes: HandwritingStroke[]) => {
        if (!currentStrokes.length) {
            setCandidates([]);
            return;
        }

        setLoading(true);
        try {
            const results = await recognizeHandwriting(currentStrokes, CANVAS_SIZE, CANVAS_SIZE);
            setCandidates(results);
        } catch {
            //
        } finally {
            setLoading(false);
        }
    }, []);

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setIsDrawing(true);

        const rect = canvas.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
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
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        const t = Date.now() - startTimeRef.current;

        currentStroke.current.x.push(x);
        currentStroke.current.y.push(y);
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

        const xs = currentStroke.current.x;
        const ys = currentStroke.current.y;
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
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        const s = currentStroke.current;
        if (s.x.length > 0) {
            const newStroke: HandwritingStroke = [s.x, s.y, s.t];
            const updatedStrokes = [...strokes, newStroke];
            setStrokes(updatedStrokes);
            triggerRecognition(updatedStrokes);
        }
    }

    function handleUndo() {
        if (!strokes.length) return;
        const updated = strokes.slice(0, -1);
        setStrokes(updated);
        triggerRecognition(updated);
    }

    function handleClear() {
        setStrokes([]);
        setCandidates([]);
        redrawCanvas();
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(19, 27, 46, 0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
        }}>
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
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--on-surface)' }}>
                                Tra bằng chữ viết tay (手寫輸入)
                            </h3>
                            <small style={{ color: 'var(--on-surface-variant)', fontSize: '11px' }}>
                                Vẽ chữ Hán bằng chuột hoặc ngón tay
                            </small>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
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
                        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                            Đang nhận diện...
                        </span>
                    )}

                    {!loading && candidates.length === 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--on-surface-variant)', fontSize: '12px' }}>
                            <Sparkles size={14} color="var(--tone-3)" />
                            <span>Vẽ nét vào ô vuông bên dưới, từ khóa sẽ xuất hiện ở đây.</span>
                        </div>
                    )}

                    {candidates.map((char, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                onSelectWord(char);
                                onClose();
                            }}
                            title={`Chọn "${char}" để tra từ điển`}
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
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                padding: '6px 12px'
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
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                padding: '6px 12px'
                            }}
                        >
                            <Trash2 size={14} />
                            <span>Xóa hết</span>
                        </button>
                    </div>

                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                        {strokes.length} nét đã vẽ
                    </span>
                </div>
            </div>
        </div>
    );
}
