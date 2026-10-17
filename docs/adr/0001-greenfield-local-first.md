# ADR-0001: Bản mới React/Vite lưu dữ liệu cục bộ

**Date**: 2026-10-17
**Status**: accepted
**Deciders**: Người dùng ủy quyền toàn bộ quyết định; Codex điều phối và các subagent thảo luận thiết kế, nội dung và triển khai.

## Context

Người dùng yêu cầu xây ZhongXue từ đầu, không dựa trên bản cũ, và chạy được một sản phẩm hoàn chỉnh để xem. Cần một luồng học tiếng Hoa phồn thể thực sự hoạt động, với phản hồi bài tập và tiến độ bền vững, đồng thời tránh chi phí và phụ thuộc dịch vụ chưa được cấu hình.

## Decision

Dùng React, Vite và TypeScript trong thư mục và Git repo mới; lưu tiến độ, XP và lịch ôn trên trình duyệt với xuất/nhập dữ liệu có kiểm tra. V1 gồm tám bài đời sống Đài Loan cho người Việt A1–A2, quiz, ôn giãn cách, từ điển, ba hội thoại có kịch bản và TTS tùy khả năng trình duyệt. Thiết kế xuất phát từ dự án Stitch mới; Codex subagent là bên triển khai thực tế.

## Alternatives Considered

### Tiếp tục ứng dụng cũ

- **Pros**: Có sẵn mã và cấu trúc.
- **Cons**: Mang theo ràng buộc và thiết kế cũ.
- **Why not**: Trái yêu cầu xây mới rõ ràng của người dùng.

### Máy chủ, tài khoản và hội thoại AI ngay trong v1

- **Pros**: Đồng bộ thiết bị, hội thoại mở rộng và quản lý tài khoản.
- **Cons**: Cần dịch vụ, khóa truy cập, quyền riêng tư, vận hành và xác minh chất lượng bổ sung.
- **Why not**: Không cần thiết để hoàn thành luồng học cốt lõi có thể chạy ngay; không giả lập tính năng AI chưa có.

## Consequences

### Positive

- Có thể chạy độc lập trên máy, không cần bí mật hay backend.
- Nội dung và tiến độ có kiểu dữ liệu rõ, kiểm thử được.
- Tách biệt hoàn toàn công việc mới với ứng dụng cũ.

### Negative

- Không đồng bộ thiết bị, dữ liệu có thể mất khi xóa bộ nhớ trình duyệt.
- Hội thoại bị giới hạn trong kịch bản; giọng đọc thay đổi theo thiết bị.

### Risks

- Giảm rủi ro mất dữ liệu bằng xuất/nhập có kiểm tra định dạng.
- Không công bố chứng nhận trình độ hay chấm phát âm AI; mô tả rõ giới hạn nội dung.
- Kiểm thử XP không cộng lặp, lịch ôn và import sai trước bàn giao.
