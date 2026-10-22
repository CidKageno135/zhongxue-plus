# ADR-0001: Kiến trúc Thống nhất Máy chủ Dev/Production và Cách ly Thông tin Xác thực Upstream

**Ngày**: 2026-10-21  
**Trạng thái**: proposed (Dự thảo Wave 0 — phối hợp cùng A01, A02, A03)  
**Người quyết định**: Integration Builder & Lead Architect (A01), Production Server Lead (A02), Upstream Security Lead (A03), Documentation & Handoff (A20)

---

## 1. Bối cảnh (Context)

Trong quá trình đánh giá và xác minh độc lập phiên bản hiện tại (commit `eb4de8e` trên nhánh `feat/zhongxue-greenfield`), hai vấn đề kiến trúc và bảo mật nghiêm trọng đã được nhận diện:

1. **Phân kỳ môi trường Dev và Production (Dev/Prod Divergence)**:
   - Toàn bộ logic backend (tra cứu từ điển 122k mục từ, kết nối trợ lý AI, nhận diện nét vẽ viết tay) hiện chỉ được đăng ký trong hook `configureServer` của Vite plugin (`src/viteApiPlugin.ts`).
   - Khi chạy bản build production hoặc lệnh `vite preview`, hook `configureServer` không được kích hoạt để phục vụ API. Do đó, mọi yêu cầu `/api/health`, `/api/dictionary`, `/api/conversation`, `/api/handwriting` bị cơ chế SPA fallback đánh chặn và trả về HTTP 200 kèm nội dung HTML (`index.html`). Điều này khiến frontend nhận diện sai trạng thái hoặc ném lỗi phân tích cú pháp JSON (`Unexpected token '<'`).
   - Tệp tài liệu `README.md` trước đây hướng dẫn khởi chạy máy chủ backend độc lập bằng lệnh `node server/api.mjs`, tuy nhiên thư mục `server/` và tệp `server/api.mjs` hoàn toàn không tồn tại trong repository. Dự án hiện chưa có script khởi chạy production được tài liệu hóa và kiểm thử.

2. **Rủi ro rò rỉ thông tin xác thực máy chủ (Credential Forwarding Flaw)**:
   - Tại `src/viteApiPlugin.ts` (quanh các dòng 494–512), khi client gửi request hội thoại kèm `baseUrl` tùy ý nhưng không gửi `apiKey`, backend tự động lấy các biến môi trường nhạy cảm trên máy chủ (`AI_API_KEY`, `AI_SOL_KEY`, `AI_DEEPSEEK_KEY`) gắn vào header `Authorization: Bearer <SERVER_KEY>` và chuyển tiếp tới `baseUrl` do client chỉ định.
   - Cơ chế này cho phép bên thứ ba hoặc kịch bản khai thác gửi một endpoint độc hại để chiếm đoạt toàn bộ API key upstream của máy chủ mà không cần quyền truy cập hệ thống tệp.
   - Thiếu cơ chế kiểm định `Origin`, mở rộng CORS không kiểm soát, và chưa có giới hạn dung lượng tải trọng (payload size limit) hoặc thời gian chờ (timeout limit) phòng thủ.

---

## 2. Quyết định kiến trúc (Decision)

Nhằm đảm bảo tính nhất quán môi trường và an toàn bảo mật cấp công nghiệp, nhóm thống nhất thực hiện các quyết định sau:

### 2.1. Thống nhất mã nguồn Backend dùng chung (Unified Backend Handlers)
- Tách toàn bộ logic xử lý nghiệp vụ HTTP ra khỏi `src/viteApiPlugin.ts` thành các module Node.js độc lập đặt tại thư mục `server/`:
  - `server/app.ts`: Khởi tạo và cấu hình ứng dụng HTTP, gắn chuỗi middleware kiểm định, định tuyến API và xử lý lỗi.
  - `server/routes.ts`: Đăng ký các tuyến API chuẩn hóa (`/api/health`, `/api/dictionary`, `/api/conversation`, `/api/handwriting`).
  - `server/static.ts`: Phục vụ tài nguyên tĩnh từ thư mục `dist/` cùng origin với cơ chế bảo vệ chống tấn công duyệt thư mục (Path Traversal Protection).
  - `server/index.ts`: Điểm vào khởi chạy máy chủ Node.js production độc lập (mặc định lắng nghe loopback `127.0.0.1:3000`).
- **Môi trường Development**: `src/viteApiPlugin.ts` được thu gọn thành một middleware adapter mỏng, chuyển tiếp các yêu cầu `/api/*` trực tiếp vào cùng handler của `server/app.ts`. Nhờ đó, dev và production dùng chung 100% logic API, loại bỏ nguy cơ phân kỳ hành vi.
- **Khởi động một lệnh**: Người dùng và môi trường CI chỉ cần chạy một lệnh duy nhất cho production (`npm.cmd run start` hoặc `node server/index.ts`) để phục vụ cả giao diện người dùng và toàn bộ API trên cùng một cổng.

### 2.2. Thiết lập ranh giới bảo mật cách ly thông tin xác thực Upstream (Strict Upstream Security Boundary)
- Toàn bộ việc kết nối ra upstream AI được quản lý tập trung tại `server/security.ts` và `server/ai.ts`:
  - **Khóa môi trường máy chủ CHỈ ĐƯỢC gửi tới các nhà cung cấp tin cậy đã được cấu hình tại server** (Server Allowlist).
  - **Tuyệt đối không dùng khóa máy chủ cho bất kỳ `baseUrl` tùy ý nào từ client**. Nếu request yêu cầu endpoint bên ngoài danh sách tin cậy, request đó bắt buộc phải tự mang theo client API key hợp lệ hoặc bị từ chối ngay lập tức với mã lỗi HTTP 400/403.
  - Xác thực URL nghiêm ngặt: Kiểm tra giao thức (`https:` bắt buộc trừ loopback test), hostname, loại bỏ hoàn toàn `userinfo` (dạng `user:pass@host`) và cấm tự động chuyển hướng (redirect) mang theo thông tin xác thực.
  - Kiểm định `Origin` chống tấn công Cross-Site Scripting / Cross-Site Request Forgery từ trình duyệt bên ngoài. Mặc định chỉ chấp nhận same-origin hoặc các origin được cấu hình rõ ràng trong `APP_ORIGIN`.

### 2.3. Kiểm định dữ liệu vào và xử lý lỗi có kiểm soát
- Triển khai `server/validation.ts` và `server/errors.ts`:
  - Kiểm tra kiểu dữ liệu, giới hạn kích thước mảng tin nhắn, độ dài chuỗi ký tự, tọa độ nét vẽ viết tay.
  - Áp dụng giới hạn tải trọng (body parser limit tối đa 100KB cho chat/handwriting).
  - Chuẩn hóa mã phản hồi HTTP: 400 (Bad Request), 404 (Not Found cho các route `/api/*` không tồn tại), 413 (Payload Too Large), 415 (Unsupported Media Type), 502/504 (Upstream Error / Timeout).
  - Tuyệt đối không trả về stack trace hoặc giá trị secret/Authorization trong phản hồi lỗi hoặc log hệ thống.

---

## 3. Các phương án đã cân nhắc (Alternatives Considered)

### Phương án A: Tách riêng hai dự án Backend (Express/FastAPI) và Frontend (Vite)
- **Ưu điểm**: Phân tách hoàn toàn công nghệ giữa frontend và backend.
- **Nhược điểm**: Tăng gấp đôi độ phức tạp cài đặt môi trường, yêu cầu người dùng cuối phải mở 2 terminal và chạy 2 tiến trình trên 2 cổng khác nhau (`:5173` và `:3001`), dễ gặp sự cố CORS và khó đóng gói thành một ứng dụng desktop hoặc Docker gọn nhẹ.
- **Lý do bác bỏ**: Không phù hợp với định hướng thiết kế ứng dụng gọn nhẹ, dễ triển khai cục bộ của ZhongXue New.

### Phương án B: Giữ nguyên logic API hoàn toàn trong Vite Plugin
- **Ưu điểm**: Tiện lợi khi phát triển nội bộ bằng lệnh `npm run dev`.
- **Nhược điểm**: Không thể chạy production thực sự; bắt buộc phải chạy Vite dev server trên production, tiêu tốn tài nguyên bộ nhớ và tiềm ẩn nguy cơ bảo mật.
- **Lý do bác bỏ**: Không thể nghiệm thu tiêu chí bàn giao production của dự án.

### Phương án C: Gọi trực tiếp API nhà cung cấp AI từ trình duyệt Client
- **Ưu điểm**: Giảm tải cho máy chủ trung gian.
- **Nhược điểm**: Buộc phải nhúng API key vào mã nguồn client hoặc yêu cầu người dùng lưu key vào `localStorage`, dễ bị đánh cắp qua DevTools, mã độc extension hoặc tấn công XSS. Không thể kiểm soát định mức và chi phí.
- **Lý do bác bỏ**: Vi phạm nghiêm trọng nguyên tắc bảo vệ thông tin xác thực.

---

## 4. Hệ quả và Tác động (Consequences)

### Tích cực
- Dev và Production đảm bảo tính nhất quán 100% về hành vi nghiệp vụ API.
- Bản build production độc lập, phục vụ tĩnh và API trên cùng một origin, loại bỏ triệt để lỗi SPA fallback trả HTML 200 cho API.
- Ranh giới bảo mật upstream ngăn chặn triệt để nguy cơ đánh cắp API key qua việc thao túng `baseUrl`.
- Đóng gói quy trình khởi động production thành 1 lệnh duy nhất, thân thiện với người dùng và các bài kiểm thử tự động (Playwright/Vitest).

### Tiêu cực & Biện pháp kiểm soát
- Cần bổ sung thêm các bài kiểm thử tích hợp (integration tests) kiểm tra trực tiếp máy chủ Node.js qua giao thức HTTP thật.
- Phân công Subagent A01 và A02 phối hợp chốt hợp đồng DTO, đảm bảo A03, A04, A05, A06 triển khai theo đúng giao diện mô-đun hóa mà không gây xung đột nhánh.

---

## 5. Kế hoạch kiểm định nghiệm thu (Verification Plan)

1. **Kiểm thử rò rỉ khóa (Security Policy Test)**: Sử dụng mock upstream và sentinel key giả lập, xác nhận yêu cầu gửi tới hostname tùy ý không bao giờ nhận được khóa máy chủ trong header.
2. **Kiểm thử máy chủ Production (Production Server Test)**: Khởi chạy máy chủ độc lập từ bản build `dist/`, gửi request kiểm tra `/api/health`, `/api/dictionary?q=學生`, `/api/conversation` trả về đúng định dạng JSON và HTTP status tương ứng; các route lạ `/api/nonexistent` trả JSON 404; truy cập tài nguyên tĩnh và reload đường dẫn SPA hoạt động mượt mà.
3. **Kiểm thử tải trọng và kiểu dữ liệu (Validation Test)**: Gửi payload JSON sai cấu trúc, payload quá kích thước, offset âm, limit vượt ngưỡng, xác nhận server trả mã lỗi thích hợp mà không bị crash hoặc treo tiến trình.
