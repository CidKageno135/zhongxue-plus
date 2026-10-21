# ZhongXue 中學 — Modern Bento Sinology V2

Ứng dụng học tiếng Hoa Phồn thể Đài Loan dành cho người Việt (cấp độ nhập môn đến TOCFL A1–A2), kết hợp **thuật toán lặp lại ngắt quãng SuperMemo SM-2**, **cầu nối từ nguyên Hán-Việt (同源詞)**, **CSDL từ điển PGlite 122.595 mục từ**, **nhận diện chữ viết tay đa tầng (Google IME + Offline Stroke Classifier)** và **trợ lý đối thoại AI đa chủ đề**.

## Chạy trên máy

Yêu cầu Node.js 22+ và npm.

```powershell
cd C:\Users\thanh\Desktop\ECC\projects\zhongxue-new
npm.cmd install
npm.cmd run dev -- --port 5173
```

Để chạy đồng thời cả giao diện Vite (`:5173`) và máy chủ API từ điển PGlite 122k từ + AI Proxy (`:3001`):

```powershell
node server/api.mjs
npm.cmd run dev -- --port 5173
```

Mở [http://127.0.0.1:5173](http://127.0.0.1:5173). Bản dựng triển khai nằm trong `dist/` sau khi chạy `npm.cmd run build`.

## Phạm vi tính năng (Gói Tối Ưu Toàn Diện V2)

- **8 bài học thực chiến Đài Loan (40 từ vựng cốt lõi + ngữ pháp + hội thoại + trắc nghiệm):** Chào hỏi, Gọi trà sữa, Tàu điện MRT, Chợ đêm, Cửa hàng tiện lợi, Thuê nhà, Khám bệnh & Bảo hiểm Y tế, Giao tiếp công sở.
- **Bento Dashboard động 100% (`TodayView`):**
  - Thẻ trọng tâm SM-2 tự động chọn từ đến hạn ôn tập hoặc từ trọng tâm của bài tiếp theo kèm ô chữ Điền Tự Cách (田字格), âm Hán-Việt, bộ thủ Khang Hy và mẹo chiết tự.
  - Máy đo cao độ giọng nói (Pitch Contour F0) qua Web Audio API (`AnalyserNode`) kèm chế độ mô phỏng thông minh khi thiết bị không có micro.
  - Lục giác năng lực 6 trục TOCFL A2 và Bộ thủ trong ngày luân phiên theo lịch thực tế.
- **Hệ thống Ôn tập SM-2 4 mức (`ReviewView`):**
  - Hỗ trợ 4 mức chấm điểm (`Quên [1]`, `Khó [2]`, `Tốt [3]`, `Dễ [4]`), tự động tính Hệ số dễ dàng (`E-Factor`) và hỗ trợ phím tắt bàn phím (`Space` lật thẻ, `1-4` chấm điểm).
  - Tích hợp 4 bộ thẻ **Starter Decks Đài Loan** (Chợ đêm, MRT, Thuê nhà, TOCFL A2) nạp nhanh vào lộ trình SRS chỉ với 1 cú nhấp.
- **Từ điển Hoa-Việt Phồn thể 122k từ & Viết tay (`DictionaryView` + `HandwritingPad`):**
  - Tra cứu tức thời theo chữ Hán, Pinyin có/không dấu, và tiếng Việt có/không dấu; hỗ trợ lọc nhanh theo cấp độ (`A1`, `A2`) và chủ đề.
  - Lưu bất kỳ mục từ nào từ CSDL PGlite 122.595 từ vào sổ tay SRS cá nhân.
  - Bảng vẽ chữ viết tay (`HandwritingPad`) tích hợp bộ nhận diện nét vẽ ngoại tuyến (`fallbackClientHandwriting`) hoạt động ngay cả khi không có mạng hoặc backend `:3001` tắt.
- **Hội thoại Kịch bản & Trợ lý AI (`ConversationView` + `AiChatView`):**
  - Lưu lịch sử hội thoại AI trong `sessionStorage` xuyên suốt phiên học; bộ phản hồi nội bộ thông minh bao phủ cả 8 chủ đề đời sống Đài Loan kèm chữ Phồn thể, Pinyin, dịch nghĩa và gợi ý mẫu câu.
- **Hồ sơ Năng lực & Quản trị Dữ liệu (`SettingsView`):**
  - Biểu đồ Radar 6 trục, Heatmap hoạt động 84 ngày (12 tuần), Tủ huy hiệu Sinology mở khóa tự động theo thành tích thật, cùng tính năng Xuất/Nhập JSON có kiểm định toàn vẹn (`importState`/`exportState`).

## Kiểm tra chất lượng mã nguồn

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Kết quả kiểm tra thực tế được ghi tại [docs/PROGRESS.md](docs/PROGRESS.md) và [docs/QA.md](docs/QA.md). Xem thêm [kế hoạch](docs/PLAN.md), [quyết định kiến trúc](docs/adr/README.md) và [hệ thống thiết kế](DESIGN.md).
