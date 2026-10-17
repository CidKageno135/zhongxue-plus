# ZhongXue 中學

Ứng dụng cá nhân chạy cục bộ để học tiếng Hoa phồn thể cho người Việt mới bắt đầu, tập trung vào tình huống sinh hoạt tại Đài Loan. Đây là dự án mới hoàn toàn, được xây dựng trong thư mục riêng theo thiết kế Stitch mới. V1 chưa phải dịch vụ production phục vụ nhiều tài khoản.

## Chạy trên máy

Yêu cầu Node.js 22 và npm.

```powershell
cd C:\Users\thanh\Desktop\ECC\projects\zhongxue-new
npm install
npm run dev -- --port 5173
```

Mở [http://127.0.0.1:5173](http://127.0.0.1:5173). Nếu cổng đã được dùng, xem địa chỉ Vite in ra hoặc chọn cổng khác. Bản dựng triển khai nằm trong `dist/` sau khi chạy `npm run build`.

## Phạm vi v1

- Tám bài học theo tình huống đời sống, có chữ phồn thể, pinyin và nghĩa tiếng Việt.
- Bài kiểm tra, tiến độ và XP; hoàn thành lại cùng bài không cộng lặp phần thưởng.
- Ôn tập theo lịch giãn cách, từ điển theo bài và ba hội thoại có kịch bản.
- Đọc mẫu bằng giọng nói của trình duyệt khi thiết bị hỗ trợ.
- Lưu trên trình duyệt, xuất và nhập dữ liệu học tập có kiểm tra định dạng.

Nội dung hướng tới người học A1–A2; không phải giáo trình hay chứng nhận TOCFL chính thức. Hội thoại sử dụng kịch bản đã soạn; ứng dụng không chấm phát âm bằng AI. Giọng đọc phụ thuộc vào hệ điều hành và trình duyệt. Dữ liệu nằm trên thiết bị đang dùng, chưa có tài khoản, máy chủ hay đồng bộ nhiều thiết bị; nên xuất bản sao trước khi xóa dữ liệu trình duyệt.

## Kiểm tra mã nguồn

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Kết quả kiểm tra thực tế được ghi tại [docs/PROGRESS.md](docs/PROGRESS.md). Không coi danh sách lệnh trên là bằng chứng chúng đã chạy thành công.

Kiến trúc: React, TypeScript và Vite, dữ liệu học tập lưu cục bộ. Xem [kế hoạch](docs/PLAN.md), [quyết định kiến trúc](docs/adr/README.md) và [hệ thống thiết kế](DESIGN.md).
