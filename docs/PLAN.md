# Kế hoạch ZhongXue v1 — 17/10/2026

## Mục tiêu và quyết định

Xây dựng ứng dụng mới có thể chạy trên máy và học được trọn luồng: chọn bài → học → kiểm tra → lưu tiến độ → ôn tập. Người dùng đã giao quyền quyết định về sản phẩm, thiết kế và triển khai; kế hoạch được thảo luận và phân công cho các subagent Codex trực tiếp.

Ứng dụng React/Vite/TypeScript lưu dữ liệu trên trình duyệt. Nội dung gồm tám bài tiếng Hoa phồn thể theo đời sống Đài Loan, giải thích tiếng Việt ở mức nhập môn A1–A2, từ điển theo bài và ba hội thoại có kịch bản. Đọc mẫu dùng TTS trình duyệt nếu có giọng phù hợp. Chưa đưa máy chủ, đăng nhập, đồng bộ hoặc chấm điểm phát âm AI vào v1.

## Các giai đoạn

1. Chốt luồng học và mô hình trạng thái; lập dự án Stitch mới, chọn ngôn ngữ thiết kế.
2. Viết nội dung và kiểm thử phần tiến độ, XP không cộng lặp, lịch ôn và nhập/xuất dữ liệu.
3. Xây dựng dashboard, bài học, quiz, ôn tập, từ điển, hội thoại và trang dữ liệu.
4. Tích hợp; chạy kiểm tra kiểu, lint, unit test, build và kiểm tra trình duyệt trên desktop/mobile.
5. Sửa lỗi phát hiện, chạy bản hoàn chỉnh và bàn giao hướng dẫn cùng bằng chứng xác minh.

## Tiêu chí hoàn thành

- Bắt đầu và hoàn thành một bài học; tiến độ giữ nguyên sau tải lại trang.
- Quiz phản hồi có ý nghĩa; XP không bị nhân lên khi hoàn thành lại bài.
- Lịch ôn thay đổi theo kết quả và có trạng thái khi chưa đến hạn.
- Từ điển tìm được nội dung bài học; hội thoại đi đến kết thúc rõ ràng.
- Nhập dữ liệu sai bị từ chối; dữ liệu hợp lệ có thể xuất rồi nhập lại.
- Các màn hình chính sử dụng được trên desktop và mobile; không có lỗi nghiêm trọng trên console.
- Các bước xác minh được ghi bằng kết quả thực tế trong `PROGRESS.md`.

## Phân công và ranh giới

Codex điều phối và các subagent xây dựng nội dung, logic, UI, kiểm thử và tài liệu trong `projects/zhongxue-new`. Antigravity có bridge hiện gắn với dự án cũ, nên chưa được dùng để thực thi bản mới; không ghi nhận một lượt chạy Antigravity chưa diễn ra. Ứng dụng cũ không phải nền tảng triển khai.
