# Nhật ký Thay đổi Kỹ thuật (Optimization Changelog)

**Dự án:** ZhongXue+ (V2 Autonomous Product Improvement)  
**Phiên bản:** v1.2.0-optimized  
**Ngày phát hành:** 2026-10-15  

---

## [v1.2.0-optimized] - 2026-10-15

### Added (Bổ sung mới)
- **`src/app/not-found.tsx`**: Trang 404 tùy chỉnh chuẩn nhận diện thương hiệu ZhongXue+, hiển thị song ngữ Trung - Việt ("404 · 找不到頁面 / Không tìm thấy trang"), nhận diện theme Dark/Light theo biến CSS hệ thống và có nút dẫn về `/dashboard`.
- **`src/app/error.tsx`**: Client Component bắt lỗi toàn cục (Global Error Boundary) với thông điệp song ngữ thân thiện, nút bấm "Thử lại / 重試" (`reset()`) và liên kết trở về trang chủ.
- **`docs/optimization/PROJECT_AUDIT.md`**: Báo cáo kiểm định toàn diện 6 chiều (UI, UX, Chức năng, Kiến trúc, Hiệu năng, Bảo mật) với chấm điểm chi tiết.
- **`docs/optimization/IMPROVEMENT_PLAN.md`**: Kế hoạch cải tiến có cấu trúc theo thứ tự ưu tiên P1, P2, P3 cùng tiêu chí nghiệm thu (Acceptance Criteria).
- **`docs/optimization/PROGRESS.md`**: Bảng theo dõi tiến độ hoàn thành các tác vụ cải tiến.
- **`docs/optimization/TEST_RESULTS.md`**: Biên bản kiểm thử tự động chi tiết với 100% tỷ lệ pass trên 37 bài test.
- **`docs/optimization/FINAL_REPORT.md`**: Báo cáo tổng kết toàn diện chuyển giao sản phẩm cho ban quản lý.

### Changed (Cập nhật & Tối ưu)
- **`src/components/shell.tsx`**:
  - Bổ sung Skip Link ẩn dành cho trợ năng: `<a href="#zx-main" className="zx-skip-link">Chuyển đến nội dung chính / 跳至主要內容</a>`.
  - Bổ sung `id="zx-main"` cho thẻ `<main>` để làm mốc tiếp nhận tiêu điểm khi người dùng bàn phím nhấn Enter.
- **`src/app/zhongxue.css`**:
  - Thêm style hiển thị khi focus cho `.zx-skip-link` với z-index 9999, nền nổi bật, viền bo tròn.
  - Chuẩn hóa trạng thái focus cho form controls: `input:focus-visible, select:focus-visible, textarea:focus-visible` với outline `2px solid var(--zx-green)`.
  - Cập nhật breakpoint `@media(max-width:1100px)` cho khối thống kê `.zx-stats` thành lưới 2x2 cân xứng (`grid-template-columns: repeat(2, 1fr)`).
- **`src/components/conversation-practice.tsx`**:
  - Tích hợp typing indicator bubble ("AI 練習夥伴 đang soạn câu trả lời…") với hiệu ứng ba chấm chuyển động khi `busy === true`.
  - Bổ sung dependency `busy` vào `useEffect` cuộn tự động xuống đáy khung chat để đảm bảo người dùng luôn nhìn thấy phản hồi tức thời.
- **`src/components/hanzi-stroke-writer.tsx`**:
  - Tích hợp state điều khiển tốc độ nét viết `isSlow` (mặc định 1.2x tốc độ chuẩn, chuyển thành 0.6x chậm với độ trễ 360ms giữa các nét).
  - Tích hợp nút chuyển đổi nhanh "Tốc độ mẫu: 🐢 Chậm (0.6x) / ⚡ Chuẩn (1.2x)" bên dưới 3 phím điều khiển.
- **`tests/e2e/core-flows.spec.ts`**:
  - Mở rộng thêm 3 test cases E2E kiểm tra trang 404, liên kết Skip-to-content, và responsive layout trên viewport tablet 768px.
  - Mở rộng test case Hanzi stroke writer để kiểm tra phím chuyển đổi tốc độ nét bút.

### Security & Data Protection
- Tạo checkpoint sao lưu dữ liệu toàn bộ hệ thống tại: `C:\Users\thanh\Desktop\project management\back-up\ZhongXue_data_2026-10-15T13-40-02-873Z`.
- Bảo toàn 100% dữ liệu người dùng và từ điển.
