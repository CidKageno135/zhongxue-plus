import Link from "next/link";
import { Logo } from "@/components/shell";

export default function NotFound() {
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
        maxWidth: "480px",
        width: "100%",
        textAlign: "center",
        padding: "40px 28px"
      }}>
        <div style={{ display: "inline-block", marginBottom: "20px" }}>
          <Logo />
        </div>
        <p style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "var(--zx-green)",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          marginBottom: "8px"
        }}>
          404 · 找不到頁面
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "12px", color: "var(--zx-ink)" }}>
          Không tìm thấy trang
        </h1>
        <p style={{ fontSize: "14px", color: "var(--zx-muted)", marginBottom: "28px", lineHeight: 1.6 }}>
          Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được thay đổi. Hãy quay lại trang chủ để tiếp tục bài học của bạn.
        </p>
        <Link href="/dashboard" className="zx-button" style={{ width: "100%", justifyContent: "center" }}>
          Về trang chủ / 回到首頁 →
        </Link>
      </div>
    </div>
  );
}
