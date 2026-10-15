"use client";

import { useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";
import { Play, RotateCcw, PenTool, Eye, CheckCircle2, AlertCircle } from "lucide-react";

interface HanziStrokeWriterProps {
  text: string;
  onClose?: () => void;
}

export function HanziStrokeWriter({ text, onClose }: HanziStrokeWriterProps) {
  // Extract all Chinese characters from input text
  const characters = Array.from(text).filter((char) =>
    /[\u4e00-\u9fa5]/.test(char)
  );

  const [activeCharIndex, setActiveCharIndex] = useState(0);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Nhấn 'Xem mẫu' để xem thứ tự nét bút, hoặc 'Tự viết' để luyện vẽ.");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);

  const currentChar = characters[activeCharIndex] || characters[0] || "中";

  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);
    setLoadError(false);
    setIsQuizMode(false);
    setQuizScore(null);
    setStatusMessage("Đang tải dữ liệu nét bút...");

    containerRef.current.innerHTML = "";

    try {
      const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";
      const writer = HanziWriter.create(containerRef.current, currentChar, {
        width: 220,
        height: 220,
        padding: 12,
        showOutline: true,
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 180,
        strokeColor: isDark ? "#f472b6" : "#c026d3",
        radicalColor: isDark ? "#38bdf8" : "#2563eb",
        outlineColor: isDark ? "#475569" : "#cbd5e1",
        showCharacter: true,
        onLoadCharDataSuccess() {
          setIsLoading(false);
          setStatusMessage("Sẵn sàng: Xem animation hoặc chuyển sang chế độ tự viết.");
        },
        onLoadCharDataError() {
          setIsLoading(false);
          setLoadError(true);
          setStatusMessage("Chưa có dữ liệu nét cho chữ này hoặc kết nối mạng bị gián đoạn.");
        },
      });

      writerRef.current = writer;
    } catch (e) {
      setIsLoading(false);
      setLoadError(true);
      setStatusMessage("Không thể khởi tạo bảng vẽ nét chữ.");
    }

    return () => {
      writerRef.current = null;
    };
  }, [currentChar]);

  const handleAnimate = () => {
    if (!writerRef.current || isLoading) return;
    setIsQuizMode(false);
    setQuizScore(null);
    setStatusMessage("Đang hiển thị thứ tự nét bút...");
    const currentOptions = (writerRef.current as unknown as { _options?: { strokeAnimationSpeed?: number; delayBetweenStrokes?: number } })._options;
    if (currentOptions) {
      currentOptions.strokeAnimationSpeed = isSlow ? 0.6 : 1.2;
      currentOptions.delayBetweenStrokes = isSlow ? 360 : 180;
    }
    writerRef.current.showOutline();
    writerRef.current.showCharacter();
    writerRef.current.animateCharacter({
      onComplete() {
        setStatusMessage("Đã hoàn thành mẫu nét. Hãy bấm 'Tự viết' để thử sức!");
      },
    });
  };

  const handleStartQuiz = () => {
    if (!writerRef.current || isLoading) return;
    setIsQuizMode(true);
    setQuizScore(null);
    setStatusMessage("Dùng chuột hoặc ngón tay để vẽ các nét theo thứ tự!");
    writerRef.current.hideCharacter();
    writerRef.current.showOutline();
    writerRef.current.quiz({
      onMistake(strokeData) {
        setStatusMessage(`Sai nét thứ ${strokeData.strokeNum + 1}! Hãy thử lại.`);
      },
      onCorrectStroke(strokeData) {
        setStatusMessage(`Chính xác nét thứ ${strokeData.strokeNum + 1}!`);
      },
      onComplete(summaryData) {
        const accuracy = Math.round(
          (summaryData.totalMistakes === 0 ? 100 : Math.max(40, 100 - summaryData.totalMistakes * 15))
        );
        setQuizScore(accuracy);
        setStatusMessage(`Chúc mừng bạn đã hoàn thành chữ "${currentChar}"! Điểm: ${accuracy}%`);
      },
    });
  };

  const handleReset = () => {
    if (!writerRef.current || isLoading) return;
    setIsQuizMode(false);
    setQuizScore(null);
    setStatusMessage("Đã làm mới bảng vẽ.");
    writerRef.current.showOutline();
    writerRef.current.showCharacter();
  };

  if (characters.length === 0) {
    return (
      <div className="zx-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
        <p>Từ này không chứa ký tự chữ Hán để luyện viết.</p>
        {onClose && (
          <button className="zx-button secondary" onClick={onClose} style={{ marginTop: "1rem" }}>
            Đóng
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="zx-stroke-card" style={{
      background: "var(--zx-card)",
      border: "1px solid var(--zx-line)",
      borderRadius: "16px",
      padding: "1.5rem",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
      maxWidth: "420px",
      margin: "1rem auto",
      textAlign: "center"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ textAlign: "left" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--zx-green)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Bút thuận · 筆順練習
          </span>
          <h3 style={{ margin: "0.25rem 0 0", fontSize: "1.2rem", fontWeight: 800, color: "var(--zx-ink)" }}>
            Luyện viết chữ Hán
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Đóng bảng luyện viết"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.25rem",
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
              borderRadius: "8px",
              color: "var(--zx-muted)"
            }}
          >
            ✕
          </button>
        )}
      </div>

      {characters.length > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1rem" }}>
          {characters.map((char, index) => (
            <button
              key={index}
              onClick={() => setActiveCharIndex(index)}
              style={{
                width: "42px",
                height: "42px",
                fontSize: "1.25rem",
                fontWeight: 700,
                borderRadius: "10px",
                border: activeCharIndex === index ? "2px solid var(--zx-green)" : "1px solid var(--zx-line)",
                background: activeCharIndex === index ? "var(--zx-subtle)" : "transparent",
                color: activeCharIndex === index ? "var(--zx-green)" : "var(--zx-ink)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {char}
            </button>
          ))}
        </div>
      )}

      {/* Tianzige grid canvas container */}
      <div style={{
        position: "relative",
        width: "220px",
        height: "220px",
        margin: "0 auto",
        background: "var(--zx-subtle)",
        border: "2px solid var(--zx-line)",
        borderRadius: "12px",
        backgroundImage: "linear-gradient(to right, transparent 49%, var(--zx-line) 49%, var(--zx-line) 51%, transparent 51%), linear-gradient(to bottom, transparent 49%, var(--zx-line) 49%, var(--zx-line) 51%, transparent 51%)",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)"
      }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Real-time status / Quiz Feedback */}
      <div style={{
        margin: "1rem 0",
        padding: "0.6rem 0.8rem",
        borderRadius: "8px",
        background: quizScore !== null ? "rgba(34,197,94,0.15)" : loadError ? "rgba(239,68,68,0.15)" : "var(--zx-subtle)",
        border: `1px solid ${quizScore !== null ? "rgba(34,197,94,0.4)" : loadError ? "rgba(239,68,68,0.4)" : "var(--zx-line)"}`,
        fontSize: "0.85rem",
        color: quizScore !== null ? "var(--zx-green)" : loadError ? "#ef4444" : "var(--zx-ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem"
      }}>
        {quizScore !== null ? <CheckCircle2 size={16} /> : loadError ? <AlertCircle size={16} /> : null}
        <span>{statusMessage}</span>
      </div>

      {/* Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
        <button
          className="zx-button"
          onClick={handleAnimate}
          disabled={isLoading || loadError}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", padding: "0.6rem 0.4rem", fontSize: "0.85rem" }}
        >
          <Play size={14} /> Xem mẫu
        </button>
        <button
          className={`zx-button ${isQuizMode ? "" : "secondary"}`}
          onClick={handleStartQuiz}
          disabled={isLoading || loadError}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", padding: "0.6rem 0.4rem", fontSize: "0.85rem" }}
        >
          <PenTool size={14} /> Tự viết
        </button>
        <button
          className="zx-button secondary"
          onClick={handleReset}
          disabled={isLoading || loadError}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", padding: "0.6rem 0.4rem", fontSize: "0.85rem" }}
        >
          <RotateCcw size={14} /> Xóa lại
        </button>
      </div>

      <div style={{ marginTop: "0.6rem", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => setIsSlow((prev) => !prev)}
          className="zx-link-button"
          style={{ fontSize: "11px", color: "var(--zx-muted)", cursor: "pointer", textDecoration: "underline" }}
        >
          Tốc độ mẫu: {isSlow ? "🐢 Chậm (0.6x)" : "⚡ Chuẩn (1.2x)"}
        </button>
      </div>
    </div>
  );
}
