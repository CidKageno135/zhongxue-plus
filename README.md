# ZhongXue 中學 — Modern Bento Sinology V2

Ứng dụng học tiếng Hoa Phồn thể Đài Loan dành cho người Việt (cấp độ nhập môn đến TOCFL A1–A2), kết hợp **thuật toán lặp lại ngắt quãng SuperMemo SM-2**, **cầu nối từ nguyên Hán-Việt (同源詞)**, **động cơ từ điển CC-CEDICT Phồn thể nén in-memory 122.596 mục từ (`CVDICT.u8.gz`)**, **nhận diện chữ viết tay đa tầng (Google IME + Offline Stroke Classifier)** và **trợ lý đối thoại AI đa chủ đề với kiến trúc bảo mật Server-Key**.

---

## 1. Kiến trúc Hệ thống Không Phân kỳ (Zero-Divergence Architecture)

ZhongXue New V2 giải quyết triệt để vấn đề phân kỳ hành vi giữa môi trường phát triển (Development) và môi trường vận hành thực tế (Production):

- **Lõi máy chủ dùng chung (`server/app.ts`)**: Toàn bộ chuỗi middleware kiểm định dữ liệu (`server/validation.ts`), ranh giới bảo mật upstream (`server/security.ts`), bộ kết nối AI (`server/ai.ts`) và động cơ tra cứu từ điển (`server/dictionary.ts`) được đóng gói thành một bộ xử lý ứng dụng độc lập duy nhất.
- **Môi trường Development**: Plugin Vite (`src/viteApiPlugin.ts`) được tinh gọn xuống còn một adapter mỏng (~57 dòng code), trực tiếp chuyển tiếp các yêu cầu `/api/*` vào cùng một handler `server/app.ts`. Không có sự phân nhánh logic hay mock data giả lập trong dev.
- **Môi trường Production**: Máy chủ Node.js độc lập (`server/index.ts`) phục vụ cả giao diện SPA tĩnh từ thư mục `dist/` và toàn bộ các tuyến API trên cùng một origin loopback (`127.0.0.1:3000`), bảo đảm cơ chế SPA fallback không bao giờ chặn nhầm các yêu cầu API.

---

## 2. Khởi chạy Ứng dụng

Yêu cầu môi trường: **Node.js 20+** (khuyên dùng Node.js 22 LTS) và **npm**.

### 2.1. Chế độ Phát triển (Development Mode)

Chỉ cần một lệnh duy nhất. Toàn bộ API (`/api/health`, `/api/dictionary`, `/api/conversation`, `/api/handwriting`) chạy song song trong cùng tiến trình Vite Dev:

```powershell
cd C:\Users\thanh\Desktop\ECC\projects\zhongxue-new
npm.cmd install
npm.cmd run dev -- --port 5173
```

Mở trình duyệt tại: [http://127.0.0.1:5173](http://127.0.0.1:5173)

### 2.2. Chế độ Đóng gói & Chạy Thực tế (Production Mode)

Đóng gói ứng dụng thành bundle tối ưu và khởi chạy máy chủ Node.js độc lập:

```powershell
# Bước 1: Đóng gói bản dựng tĩnh vào dist/
npm.cmd run build

# Bước 2: Khởi chạy máy chủ production độc lập (loopback 127.0.0.1:3000)
npm.cmd run start
```

Mở trình duyệt tại: [http://127.0.0.1:3000](http://127.0.0.1:3000)

> [!NOTE]
> **Xóa bỏ tài liệu cũ lỗi thời**: Các tài liệu trước đây từng nhắc đến lệnh `node server/api.mjs` hoặc cổng phụ `:3001` đều đã được gỡ bỏ. Phiên bản hiện tại chỉ dùng đúng một cổng cho cả giao diện và API.

---

## 3. Cấu hình Biến Môi trường & Mô hình Bảo mật Khóa (Server-Key vs Client-Key)

Sao chép tệp mẫu `.env.example` thành `.env`:

```powershell
copy .env.example .env
```

### 3.1. Server-Key Mode (Khuyên dùng — Mặc định)
- **Cơ chế**: Các API Key (`AI_SOL_KEY`, `AI_DEEPSEEK_KEY`, `AI_API_KEY`) được lưu trữ tại tệp `.env` trên máy chủ.
- **Bảo mật tuyệt đối**: Khóa máy chủ **CHỈ ĐƯỢC PHÉP** gửi tới các nhà cung cấp upstream tin cậy nằm trong danh sách Allowlist máy chủ (`agentrouter.org`, `openrouter.ai`).
- **Phòng thủ rò rỉ**: Nếu client gửi yêu cầu với một `baseUrl` tùy ý lạ, hệ thống sẽ **từ chối ngay lập tức** việc gắn khóa máy chủ, ngăn chặn 100% tấn công Credential Forwarding / SSRF. Trình duyệt client không chứa bất kỳ secret nào trong bundle hay `localStorage`.

### 3.2. Client-Key Mode (Tùy chọn dành cho Người dùng Tự cấp Khóa)
- Người dùng có thể tự nhập API Key cá nhân trong màn hình **Cài đặt (`SettingsView`)** nếu muốn dùng quota hoặc endpoint riêng.
- Khóa cá nhân chỉ lưu trong `localStorage` của trình duyệt người dùng đó và chỉ được gửi kèm khi người dùng chủ động cấu hình.

---

## 4. Động cơ Từ điển CC-CEDICT In-Memory (122.596 Mục từ)

- **Không dùng PGlite**: Dự án không sử dụng CSDL PostgreSQL WASM (PGlite).
- **Bộ nạp In-Memory siêu tốc**: Nạp trực tiếp tệp từ điển gzipped `data/dictionary/CVDICT.u8.gz` (chứa đúng **122.596 bản ghi**) vào bộ nhớ RAM khi máy chủ khởi động (~1.4 giây).
- **Chuẩn hóa Tìm kiếm Toàn diện (`src/domain/searchNormalization.ts`)**:
  - Hỗ trợ Hán tự Phồn thể & Giản thể (`學生`, `学生`).
  - Hỗ trợ Pinyin có dấu thanh điệu (`xuéshēng`), Pinyin không dấu (`xuesheng`), và Pinyin số thanh (`xue2 sheng1`).
  - Hỗ trợ tiếng Việt có dấu (`học sinh`) và tiếng Việt không dấu (`hoc sinh`), xử lý chính xác ký tự `đ/Đ` và nguyên âm `ü/v`.
  - Phân trang chuẩn xác (`limit`, `offset`) với tổng số kết quả thực tế, không bị giới hạn ảo 250 bản ghi.

---

## 5. Phạm vi Tính năng V2

- **8 bài học thực chiến Đài Loan (40 từ vựng cốt lõi + ngữ pháp + hội thoại + trắc nghiệm):** Chào hỏi, Gọi trà sữa, Tàu điện MRT, Chợ đêm, Cửa hàng tiện lợi, Thuê nhà, Khám bệnh & Bảo hiểm Y tế, Giao tiếp công sở.
- **Bento Dashboard động 100% (`TodayView`):**
  - Thẻ trọng tâm SM-2 tự động chọn từ đến hạn ôn tập hoặc từ trọng tâm bài học kèm ô Điền Tự Cách (田字格), âm Hán-Việt, bộ thủ Khang Hy và mẹo chiết tự.
  - Máy đo cao độ giọng nói (Pitch Contour F0) qua Web Audio API (`AnalyserNode`) kèm chế độ mô phỏng trực quan khi không có micro.
  - Lục giác năng lực 6 trục TOCFL A2 và Bộ thủ trong ngày luân phiên theo lịch thực tế.
- **Hệ thống Ôn tập SM-2 4 mức (`ReviewView`):**
  - Hỗ trợ 4 mức chấm điểm (`Quên [1]`, `Khó [2]`, `Tốt [3]`, `Dễ [4]`), tự động tính Hệ số dễ dàng (`E-Factor`) và hỗ trợ phím tắt bàn phím (`Space` lật thẻ, `1-4` chấm điểm).
  - Tích hợp 4 bộ thẻ **Starter Decks Đài Loan** (Chợ đêm, MRT, Thuê nhà, TOCFL A2) nạp nhanh vào lộ trình SRS chỉ với 1 cú nhấp.
- **Từ điển Hoa-Việt Phồn thể 122k từ & Viết tay (`DictionaryView` + `HandwritingPad`):**
  - Tra cứu tức thời theo chữ Hán, Pinyin có/không dấu, và tiếng Việt có/không dấu; hỗ trợ lọc theo cấp độ và chủ đề.
  - Lưu bất kỳ mục từ nào từ kho dữ liệu 122.596 từ vào sổ tay SRS cá nhân.
  - Bảng vẽ chữ viết tay (`HandwritingPad`) tích hợp bộ nhận diện nét vẽ ngoại tuyến (`fallbackClientHandwriting`) hoạt động ngay cả khi không có mạng.
- **Hội thoại Kịch bản & Trợ lý AI (`ConversationView` + `AiChatView`):**
  - Hỗ trợ mô hình `gpt-6.1-sol` (OpenAI Responses API) và `deepseek-v4-flash` (Chat Completions API) qua AgentRouter.
  - Bộ phản hồi nội bộ Sinology Local NLP thông minh bảo đảm luôn phản hồi có gắn nhãn rõ ràng khi gặp sự cố mạng/timeout 12s.
- **Hồ sơ Năng lực & Quản trị Dữ liệu (`SettingsView`):**
  - Biểu đồ Radar 6 trục, Heatmap hoạt động 84 ngày (12 tuần), Tủ huy hiệu Sinology mở khóa tự động, tính năng Xuất/Nhập JSON bảo toàn dữ liệu học.

---

## 6. Kiểm tra Chất lượng Mã nguồn & Bộ Kiểm thử Tự động

Dự án sở hữu bộ kiểm thử tự động toàn diện với **383/383 tests PASS 100%**:

```powershell
# 1. Kiểm tra an toàn kiểu tĩnh (0 lỗi)
npm.cmd run typecheck

# 2. Kiểm tra quy chuẩn linter (0 lỗi, 0 cảnh báo)
npm.cmd run lint

# 3. Chạy toàn bộ 383 bài kiểm tra đơn vị và tích hợp
npm.cmd test

# 4. Đo độ bao phủ mã nguồn (Coverage >= 85% toàn dự án, >= 94% domain)
npm.cmd run test:coverage

# 5. Chạy riêng 62 bài kiểm tra bảo mật (Credential Forwarding, SSRF, CORS, Allowlist)
npm.cmd run test:security

# 6. Chạy riêng 31 bài kiểm tra tích hợp HTTP thật trên máy chủ production
npm.cmd run test:integration

# 7. Đóng gói ứng dụng production
npm.cmd run build

# 8. Chạy 10 bộ kiểm thử đầu-cuối Playwright E2E (Desktop Chrome & Mobile iPhone 13)
npm.cmd run test:e2e

# 9. Chạy E2E kiểm thử trực tiếp trên máy chủ Production độc lập
npm.cmd run test:e2e:prod
```

Chi tiết kết quả nghiệm thu và ma trận điều phối 20 Subagent được ghi nhận tại [docs/PROGRESS.md](docs/PROGRESS.md), [docs/QA.md](docs/QA.md), [docs/PLAN.md](docs/PLAN.md) và [docs/adr/0001-shared-dev-prod-backend-and-security.md](docs/adr/0001-shared-dev-prod-backend-and-security.md).
