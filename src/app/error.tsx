"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ZhongXue ErrorBoundary]:", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "var(--zx-paper)",
      color: "var(--zx-ink)"
    }}>
      <div className="zx-panel" style={{
        maxWidth: "500px",
        width: "100%",
        textAlign: "center",
        padding: "40px 28px"
      }}>
        <div style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.12)",
          color: "#ef4444",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 20px"
        }}>
          <AlertCircle size={32} />
        </div>
        <p style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "#ef4444",
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginBottom: "6px"
        }}>
          系統異常 · Đã xảy ra lỗi
        </p>
        <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px", color: "var(--zx-ink)" }}>
          Không thể tải trang lúc này
        </h1>
        <p style={{ fontSize: "14px", color: "var(--zx-muted)", marginBottom: "26px", lineHeight: 1.6 }}>
          Hệ thống gặp sự cố tạm thời khi xử lý yêu cầu. Dữ liệu học tập của bạn đã được lưu an toàn.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="zx-button"
            onClick={() => reset()}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <RefreshCw size={16} /> Thử lại / 重試
          </button>
          <Link
            href="/dashboard"
            className="zx-button secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <Home size={16} /> Về trang chủ / 回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
