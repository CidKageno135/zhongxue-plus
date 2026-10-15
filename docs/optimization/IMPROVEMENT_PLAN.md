# Kế hoạch Tối ưu hóa Sản phẩm (Autonomous Improvement Plan)

**Dự án:** ZhongXue+ (V2 Optimization Phase)  
**Mục tiêu:** Nâng điểm sẵn sàng từ **88/100 ➔ 96+/100**, đảm bảo tính toàn diện trên UI, UX, Accessibility, Performance và Automated QA.

---

## Danh mục Công việc Cải tiến (Prioritized Improvement Backlog)

### Nhóm P1 — High Priority (Trải nghiệm Người học & Độ bền Vững)

#### TASK-OPT-01: Xây dựng Custom 404 Not Found & Error Boundary
- **Vấn đề:** Khi truy cập đường dẫn sai hoặc gặp lỗi runtime chưa bắt được, hệ thống hiển thị trang Next.js mặc định thiếu nhận diện thương hiệu, không có theme Dark/Light và không có lối thoát về trang chủ.
- **Giải pháp:**
  - Tạo `src/app/not-found.tsx` chuẩn nhận diện ZhongXue+, tự động nhận theme hiện tại, có nút bấm rõ ràng dẫn về `/dashboard`.
  - Tạo `src/app/error.tsx` với cơ chế retry an toàn, thông báo thân thiện bằng tiếng Việt và tiếng Trung.
- **Acceptance Criteria (AC):**
  - Truy cập route không tồn tại (vd: `/unknown-path`) hiển thị trang 404 thương hiệu ZhongXue+.
  - Nút "Quay về trang chủ" dẫn trực tiếp đến `/dashboard`.
  - Hỗ trợ đầy đủ Light/Dark theme không bị lệch màu.
- **Verification:** Playwright E2E test kiểm chứng status 404 và giao diện hiển thị.

#### TASK-OPT-02: Trợ năng (Accessibility) — Skip Link & Focus States
- **Vấn đề:** Người dùng dùng bàn phím (Keyboard-only) hoặc trình đọc màn hình phải nhấn Tab qua toàn bộ thanh menu 7 mục trước khi tiếp cận nội dung chính của trang.
- **Giải pháp:**
  - Bổ sung `<a href="#zx-main" className="zx-skip-link">` tại đầu component `Shell`.
  - Bổ sung style ẩn/hiện khi focus cho `.zx-skip-link` trong `zhongxue.css`.
  - Thêm `id="zx-main"` vào thẻ `<main className="zx-main">`.
  - Chuẩn hóa focus outline tương phản cao cho `input`, `select`, `textarea`.
- **Acceptance Criteria:**
  - Khi nhấn Tab ngay khi tải trang, nút "Chuyển đến nội dung chính" hiện lên rõ ràng.
  - Nhấn Enter chuyển tiêu điểm focus trực tiếp vào `<main>`.
- **Verification:** Keyboard navigation E2E test.

---

### Nhóm P2 — Medium Priority (Giao diện Responsive & Tính năng Hỗ trợ)

#### TASK-OPT-03: Tinh chỉnh Giao diện Responsive Tablet (768px – 1024px)
- **Vấn đề:** Khối thống kê `.zx-stats` trên tablet (chiều rộng 768px – 1024px) vẫn dàn 4 cột trong khoảng chiều rộng bị thanh sidebar chiếm 252px, dẫn đến số liệu và nhãn bị chật chội.
- **Giải pháp:**
  - Bổ sung breakpoint `@media(min-width: 801px) and (max-width: 1100px)` trong `zhongxue.css` để dàn `.zx-stats` thành 2 cột cân xứng.
- **Acceptance Criteria:**
  - Trên màn hình 768px - 1024px, 4 ô thống kê hiển thị dạng 2x2 cân đối, thông số không bị xuống dòng cụt.
- **Verification:** Playwright E2E test với viewport 768x1024.

#### TASK-OPT-04: Typing Indicator cho Phân hệ Hội thoại AI (Conversation UX)
- **Vấn đề:** Khi gửi tin nhắn cho AI, người dùng chỉ thấy nút bấm đổi thành "回應中…", nhưng khung chat bên trên không có tín hiệu phản hồi chuyển động, tạo cảm giác đứng hình.
- **Giải pháp:**
  - Thêm bubble tin nhắn trạng thái dạng loading dots ("AI 練習夥伴 đang soạn câu trả lời…") trong danh sách chat khi `busy` là `true`.
- **Acceptance Criteria:**
  - Ngay khi nhấn Gửi, bubble loading xuất hiện và tự động cuộn xuống dưới cùng.
  - Khi có câu trả lời thực tế, bubble loading được thay thế bằng nội dung tin nhắn.
- **Verification:** Component state test & manual verification.

#### TASK-OPT-05: Tùy chọn Tốc độ Nét bút trong Hanzi Stroke Writer
- **Vấn đề:** Tốc độ diễn hoạt nét bút hiện cố định ở 1.2x, có thể quá nhanh với người học sơ cấp muốn quan sát chi tiết cấu trúc bộ thủ.
- **Giải pháp:**
  - Thêm nút chuyển đổi tốc độ "Chậm (0.6x)" và "Chuẩn (1.2x)" trong giao diện `HanziStrokeWriter`.
- **Acceptance Criteria:**
  - Người học có thể chọn tốc độ chậm để quan sát từng nét bút.
- **Verification:** Playwright E2E test kiểm tra nút đổi tốc độ và diễn hoạt.

---

### Nhóm P3 — Low Priority (Mở rộng Kiểm thử Đa kích thước)

#### TASK-OPT-06: Mở rộng Bộ E2E Playwright Suite Đa Viewport
- **Kế hoạch:** Bổ sung các test cases kiểm thử tự động trên:
  - Mobile (375x667)
  - Tablet (768x1024)
  - Desktop (1440x900)
  - Custom 404 Route Check
  - Skip to Content Keyboard Check
- **Verification:** 100% test cases PASS.
