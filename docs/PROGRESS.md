# Tiến độ và xác minh

Ngày: 17/10/2026 (Asia/Taipei).

## Đã xác nhận

- Dự án mới được đặt tại `projects/zhongxue-new`.
- Khởi tạo Git riêng và nhánh `feat/zhongxue-greenfield`; chưa tạo commit tại thời điểm viết tài liệu.
- Chốt kiến trúc local-first và hướng thiết kế Stitch mới, ghi ADR-0001.
- Phân công triển khai trực tiếp cho các subagent Codex.
- Điều phối xác nhận kiểm thử logic được viết trước triển khai. Lượt QA ban đầu còn đỏ do thành phần `App` chưa được tích hợp; đây chưa phải kết quả kiểm tra cuối.

## Bản v1 đã tích hợp

Sáu khu vực đã triển khai: tổng quan, bài học, ôn tập, từ điển, hội thoại và dữ liệu học tập. Dev server đang chạy tại [http://127.0.0.1:5173](http://127.0.0.1:5173), phiên tiến trình `17778`. Đây là ứng dụng cá nhân lưu cục bộ, chưa phải dịch vụ nhiều tài khoản.

Kết quả dưới đây được điều phối xác nhận từ lượt kiểm tra thực tế:

| Kiểm tra | Trạng thái |
|---|---|
| TypeScript | PASS |
| ESLint | PASS |
| Unit test | PASS — 18/18 |
| Coverage logic miền | 100% statements/functions/lines; 91,91% branches |
| Production build | PASS |
| Trình duyệt desktop / mobile | PASS — 24/24 E2E trong 19,2 giây, bao phủ 12 luồng trên desktop/mobile và hồi quy sau sửa hội thoại |
| Kiểm tra ảnh giao diện | Đã xem `desktop-preview.png`, `mobile-preview.png`; mobile không tràn ngang |
| URL chạy để xem | Đã xác nhận `http://127.0.0.1:5173` |

Review phát hiện lỗi phản hồi theo tình huống trong hội thoại; bản sửa đã áp dụng và bộ hồi quy mở rộng 24/24 đã đạt. Reviewer cuối không còn blocker. Coverage nêu trên chỉ áp dụng logic miền, không phải toàn bộ giao diện. Ảnh desktop/mobile đã được làm mới theo bản cuối; báo cáo trình duyệt chi tiết nằm trong `docs/QA.md`.

Tài nguyên dashboard và bài học mobile mới từ Stitch đã lưu trong `.stitch/designs/` và có `.stitch/metadata.json`. Bản v1 sẵn sàng xem tại URL trên; chuẩn bị tạo commit trên nhánh tính năng. Chính sách công cụ chặn thao tác tự mở trình duyệt, nên người dùng mở liên kết để xem; dev server vẫn đang chạy.
