# ZhongXue+ (中學+) — Hệ Thống Thiết Kế Bento V2 (Bento Sinology)

Nguồn thiết kế: Dự án Google Stitch `1767150616432476172` (*Dashboard Design System Audit* / *ZhongXue+ Dashboard Bento V2*).

---

## 1. Triết Lý Thiết Kế (Design Philosophy)

**Bento Sinology (Hán học Bento)** kết hợp bố cục 12 cột module trực quan hiện đại với tinh thần học thuật Hán ngữ Phồn thể Đài Loan:
- **Tôn vinh tự hình**: Khung tập viết nét **Điền Tự Cách / Mễ Tự Cách (米字格 / 田字格)** chuẩn mực với đường định vị viền đứt quãng và chữ Noto Serif khắc họa sắc sảo.
- **Cầu nối Hán - Việt**: Tận dụng quy luật tương đồng ngữ âm và từ nguyên Pinyin ➔ Âm Hán-Việt giúp người học ghi nhớ sâu và phản xạ tự nhiên.
- **Khoa học nhận thức**: Ứng dụng giải thuật giãn cách Spaced Repetition **SM-2** (4 mức đánh giá: Quên, Khó, Tốt, Dễ) và biểu đồ đường cong lãng quên Ebbinghaus.
- **Định lượng năng lực**: Trực quan hóa tiến trình TOCFL A1–A2 qua biểu đồ Radar 6 trục SVG và bản đồ nhiệt hoạt động 12 tuần.

---

## 2. Bảng Màu & Design Tokens

| Token | Mã HEX | Ý nghĩa học thuật & Ứng dụng |
|---|---|---|
| **Vermilion Cinnabar** | `#C8322B` | Màu chu sa son thiếp, thương hiệu chính, nút CTA, thanh thứ 4 (thanh trắc) |
| **Vermilion Bright** | `#D93829` | Trạng thái hover, nút năng động |
| **Vermilion Tint** | `#FEF2F2` | Nền nhạt thẻ son, hộp hội thoại đối đáp |
| **Jade Emerald** | `#059669` | Màu ngọc bích truyền thống, thành tựu, thanh thứ 2 (dương bình), tỷ lệ chính xác |
| **Jade Tint** | `#ECFDF5` | Nền chúc mừng, badge thành tựu |
| **Cognate Gold** | `#D97706` | Màu hoàng kim từ nguyên Hán-Việt, thanh thứ 3 (thượng thanh), huy hiệu học thuật |
| **Gold Tint** | `#FFFBEB` | Nền mẹo từ nguyên của Tiểu Long, badge chú ý |
| **Tone Blue** | `#2563EB` | Màu phiên âm Pinyin, thanh thứ 1 (âm bình) |
| **Ivory Surface** | `#FFFFFF` | Nền thẻ Bento, độ nổi tinh tế |
| **Surface Dim / Canvas**| `#FAFAF7` / `#FAF8FF` | Nền toàn trang tạo cảm giác ấm áp như trang sách ngà |
| **Border Strong** | `#E2E8F0` | Đường viền mảnh định hình khối Bento |
| **Border Subtle** | `#F1F1EB` | Phân cách nội bộ giữa các tầng thông tin |

---

## 3. Hệ Thống Kiểu Chữ (Typography Scale)

| Phân cấp | Phông chữ | Kích thước & Trọng lượng | Ứng dụng |
|---|---|---|---|
| **Hanzi Display** | `Noto Serif` | 64px–72px, SemiBold (600) | Điền Tự Cách (Tianzige), thẻ Hero |
| **Headline Large** | `Noto Serif` | 28px–34px, Bold (700) | Tiêu đề trang, tiêu đề Bento chính |
| **Headline Medium** | `Be Vietnam Pro` | 20px–24px, SemiBold (600) | Tiêu đề phân mục, thẻ bài giảng |
| **Body Large / Lead** | `Be Vietnam Pro` | 16px, Regular (400) | Đoạn mô tả ngữ cảnh, câu thoại mẫu |
| **Body Medium** | `Be Vietnam Pro` | 14px, Regular (400) | Nội dung thẻ từ điển, giải thích ngữ pháp |
| **Label / Eyebrow** | `Be Vietnam Pro` | 11px, Bold (700), Tracking 0.08em | Nhãn phân loại chữ in hoa, tag trình độ TOCFL |
| **Pinyin / Accent** | `Be Vietnam Pro` | 13px–15px, SemiBold (600) | Ký âm La-tinh có dấu thanh |

---

## 4. Kiến Trúc Giao Diện 12 Cột Responsive Bento Grid

### Desktop (≥ 1024px)
- **Topbar Sticky**: Thanh điều hướng trên cùng với logo `中`, tên ứng dụng `ZhongXue+ Bento V2`, chip trình độ `TOCFL A2`, ô tìm kiếm toàn năng Omnibar `⌘K`, chỉ số ngọc thưởng và avatar học viên.
- **Sub-navigation Ribbon**: Dải tab hình viên thuốc (pill tabs) cho 6 phân hệ cốt lõi: Hôm nay, Lộ trình, Từ điển, Ôn tập, Hội thoại, Tiến độ & Cài đặt.
- **12-Col Bento Layout**:
  - `col-span-7`: Hero Flashcard Tianzige + bộ điều khiển phát âm + phân tích từ nguyên Hán-Việt.
  - `col-span-5`: AI Pitch Contour Visualizer + Chuỗi 14 ngày học + Đánh giá phản xạ.
  - `col-span-4`: Biểu đồ Radar TOCFL A2 (6 trục năng lực).
  - `col-span-4`: Bộ thủ trong ngày (#193 鬲 - Lịch sử và biến thể).
  - `col-span-4`: Độ chính xác kiểm tra & tiến trình tuần thực tế.
  - `col-span-8`: Thẻ bài học trọng tâm tiếp theo (`.hero`).
  - `col-span-4`: Góc học thuật Tiểu Long (Tiến sĩ ngữ âm Hán-Việt).

### Mobile / Tablet (≤ 768px)
- Bố cục tự động chuyển thành cột đơn dọc (`display: flex; flex-direction: column; width: 100%`) loại bỏ hoàn toàn hiện tượng tràn ngang.
- Nút hamburger `Mở menu` kích hoạt ngăn kéo trượt mượt mà với nền mờ backdrop.
- Các nút tương tác lớn, kích thước cảm ứng ≥ 44px tuân thủ tiêu chuẩn WCAG 2.2 AA.

---

## 5. Kiểm Thử & Đảm Bảo Chất Lượng (Quality Gates)

Toàn bộ hệ thống vượt qua 100% các tiêu chí kiểm định:
- **TypeScript Typecheck**: Không có bất kỳ lỗi kiểu dữ liệu nào.
- **ESLint**: 0 lỗi, 0 cảnh báo.
- **Vitest Unit Tests**: 27/27 kiểm thử nghiệp vụ (SM-2, logic bài học, lưu bản nháp) vượt qua.
- **Playwright E2E Tests**: 32/32 kịch bản tương tác thực tế vượt qua trên cả 2 môi trường Desktop Chrome và Mobile Safari/WebKit.
