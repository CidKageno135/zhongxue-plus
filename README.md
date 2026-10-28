# ZhongXue 中學 — Modern Bento Sinology V2.5 (Phase 3 & Remediation Unified)

Ứng dụng học tiếng Hoa Phồn thể Đài Loan chuyên sâu dành cho người Việt từ trình độ nhập môn đến **TOCFL A1–B2** (16 bài học thực chiến, 80 từ vựng cốt lõi kèm 100% dữ liệu từ nguyên Hán-Việt chi tiết, không fallback). Hệ thống kết hợp **thuật toán lặp lại ngắt quãng SuperMemo SM-2**, **cầu nối từ nguyên Hán-Việt (同源詞)**, **động cơ từ điển CC-CEDICT Phồn thể nén in-memory 122.596 mục từ (`CVDICT.u8.gz`)**, **nhận diện chữ viết tay đa tầng (Google IME + Offline Stroke Classifier)**, **6 kịch bản hội thoại phân nhánh gắn deep-link 1 chạm sang Trợ lý AI (AgentRouter: GPT-6.1 Sol & DeepSeek V4 Flash)** và **kiến trúc bảo mật Server-Key không phân kỳ**.

---

## 1. Kiến trúc Hệ thống Không Phân kỳ (Zero-Divergence Architecture) & Hợp nhất Remediation

ZhongXue New V2.5 là bản nâng cấp toàn diện hợp nhất hơn **50+ commit sửa lỗi (Remediation)** từ nhánh `remediation/flash-3.8-high` vào `projects/zhongxue-new`, kết hợp toàn bộ tính năng **Phase 3 Curriculum & Sinology Upgrade**:

- **Lõi máy chủ dùng chung (`server/app.ts`)**: Toàn bộ chuỗi middleware kiểm định dữ liệu (`server/validation.ts`), ranh giới bảo mật upstream (`server/security.ts`), bộ kết nối AI (`server/ai.ts`) và động cơ tra cứu từ điển (`server/dictionary.ts`) được đóng gói thành một bộ xử lý ứng dụng độc lập duy nhất.
- **Môi trường Development**: Plugin Vite (`src/viteApiPlugin.ts`) là một adapter mỏng (~57 dòng code), trực tiếp chuyển tiếp các yêu cầu `/api/*` vào cùng handler `server/app.ts`. Không có sự phân nhánh logic hay mock data giả lập trong dev.
- **Môi trường Production**: Máy chủ Node.js độc lập (`server/index.js` được biên dịch ra `dist/server/index.js`) phục vụ cả giao diện SPA tĩnh từ thư mục `dist/` và toàn bộ các tuyến API trên cùng một origin loopback (`127.0.0.1:3000`), bảo đảm cơ chế SPA fallback không bao giờ chặn nhầm các yêu cầu API và chạy độc lập ngay cả khi cài đặt với `npm ci --omit=dev`.
- **Hợp nhất triệt để các phát hiện Remediation (F01–F07)**:
  - **F01 (Data Storage & Recovery)**: Lưu trữ JSON nén gọn gàng, trần dung lượng 2.000.000 ký tự, cơ chế khóa sao lưu `STORAGE_BACKUP_KEY` chống ghi đè trắng, cho phép ôn tập trước lịch SM-2.
  - **F02 & F03 (Security & Upstream Credential)**: Phân lập tuyệt đối khóa máy chủ giữa AgentRouter và OpenRouter; ngăn chặn 100% tấn công Credential Forwarding / SSRF; cấm tuyệt đối fragment `#` và query `?` trong cấu hình URL upstream; bảo vệ nghiêm ngặt chống loopback trap.
  - **F04 & F05 (HTTP Validation & AI Lifecycle)**: Kiểm tra nghiêm ngặt payload schema trên mọi route `/api/conversation`; ngắt kết nối upstream tự động qua `AbortSignal` khi client ngắt kết nối HTTP; kiểm định ping schema an toàn.
  - **F06 (Dictionary Engine Contract)**: Tách bạch rõ ràng 3 con số (Tổng mục từ từ điển 122.596 / Tổng kết quả khớp thực tế `totalMatches` / Số trang `pageCount`); loại bỏ hoàn toàn cơ chế silent fallback che giấu lỗi 500.
  - **F07 (Standalone Production Entry)**: Đóng gói hoàn chỉnh `dist/server/index.js` tự thân vận hành bằng Node.js tiêu chuẩn không phụ thuộc vào `vite-node` hay `devDependencies`.
  - **G4 (AI Chat Lifecycle & Generation Guard)**: Duy trì vai trò nhân vật `activeRole` qua các lần chuyển tab; áp dụng bộ đếm Generation Guard ngăn chặn race-condition ghi đè phản hồi; tự động lọc bỏ các lượt hội thoại bị hủy (`canceled`).
  - **G7 (Responsive Layout & Audio Sync)**: Triệt tiêu hoàn toàn lỗi tràn ngang layout trên màn hình hẹp 375px/390px; đồng bộ hóa trạng thái nút phát âm TTS khi bị gián đoạn và gắn nhãn minh bạch chế độ mô phỏng cao độ thanh điệu.

---

## 2. Khởi chạy Ứng dụng

Yêu cầu môi trường: **Node.js 20+** (khuyên dùng Node.js 22 LTS hoặc 24 LTS) và **npm**.

### 2.1. Chế độ Phát triển (Development Mode)

Chỉ cần một lệnh duy nhất. Toàn bộ API (`/api/health`, `/api/dictionary`, `/api/conversation`, `/api/handwriting`) chạy song song trong cùng tiến trình Vite Dev:

```powershell
cd C:\Users\thanh\Desktop\ECC\projects\zhongxue-new
npm.cmd install
npm.cmd run dev -- --port 5173
```

Mở trình duyệt tại: [http://127.0.0.1:5173](http://127.0.0.1:5173)

### 2.2. Chế độ Đóng gói & Chạy Thực tế (Production Mode)

Đóng gói ứng dụng thành bundle tối ưu (gồm frontend client SPA và backend standalone server `dist/server/index.js`), sau đó khởi chạy bằng Node.js thuần (hoạt động độc lập ngay cả khi cài đặt với `npm ci --omit=dev`):

```powershell
# Bước 1: Đóng gói toàn bộ client và server artifact vào dist/
npm.cmd run build

# Bước 2: Khởi chạy máy chủ production độc lập (loopback 127.0.0.1:3000)
npm.cmd run start
```

Mở trình duyệt tại: [http://127.0.0.1:3000](http://127.0.0.1:3000)

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

- **Bộ nạp In-Memory siêu tốc**: Nạp trực tiếp tệp từ điển gzipped `data/dictionary/CVDICT.u8.gz` (chứa đúng **122.596 bản ghi**) vào bộ nhớ RAM khi máy chủ khởi động (~1.4 giây).
- **Chuẩn hóa Tìm kiếm Toàn diện (`src/domain/searchNormalization.ts`)**:
  - Hỗ trợ Hán tự Phồn thể & Giản thể (`學生`, `学生`).
  - Hỗ trợ Pinyin có dấu thanh điệu (`xuéshēng`), Pinyin không dấu (`xuesheng`), và Pinyin số thanh (`xue2 sheng1`).
  - Hỗ trợ tiếng Việt có dấu (`học sinh`) và tiếng Việt không dấu (`hoc sinh`), xử lý chính xác ký tự `đ/Đ` và nguyên âm `ü/v`.
  - Phân trang chuẩn xác (`limit`, `offset`) với tổng số kết quả thực tế, không bị giới hạn ảo 250 bản ghi.
  - Mở rộng bảng đối chiếu từ vựng Lưỡng bờ (Cross-Strait Lexicon) và từ điển thuật ngữ chuyên ngành B1/B2 (Bán dẫn, Tài chính, Thuế & Pháp lý).

---

## 5. Phạm vi Tính năng V2.5 (Phase 3 Upgrade)

### 5.1. 16 Bài học Thực chiến Đài Loan (80 Từ vựng Cốt lõi TOCFL A1–B2)
Chương trình học mở rộng toàn diện bao quát 4 cấp độ TOCFL:
- **TOCFL A1 (Bài 1–5):**
  1. *Xin chào, Đài Loan!* (Chào hỏi & giới thiệu bản thân)
  2. *Một ly trà sữa nhé* (Gọi trà sữa, độ ngọt & lượng đá)
  3. *Đi MRT thật dễ* (Hỏi đường MRT, mua vé, thẻ EasyCard)
  4. *Ăn ngon ở chợ đêm* (Gọi món, hỏi giá tiền)
  5. *Mua sắm tiện lợi* (Thanh toán tại 7-Eleven/FamilyMart, lấy hóa đơn phát phiếu)
- **TOCFL A2 (Bài 6–8):**
  6. *Tìm một căn phòng* (Hỏi thuê nhà, đặt cọc, điện nước)
  7. *Một ngày đi khám* (Nói triệu chứng, đặt hẹn bác sĩ, thẻ bảo hiểm y tế健保)
  8. *Kết nối ở nơi làm việc* (Giao tiếp công sở, nhờ đồng nghiệp, xác nhận lịch)
- **TOCFL B1 (Bài 9–12):**
  9. *Mở tài khoản ngân hàng & Bưu điện* (Mở thẻ ATM, gửi kiều hối, giao dịch tài chính)
  10. *Thuê xe máy vi vu phố phường* (Thuê xe máy, đổ xăng, quy định giao thông Đài Loan)
  11. *Phỏng vấn xin việc & CV* (Giới thiệu kinh nghiệm làm việc, đàm phán mức lương kỳ vọng)
  12. *Lễ hội Trung thu & Đặc sản* (Phong tục nướng thịt Trung thu, bánh dứa, văn hóa tặng quà)
- **TOCFL B2 (Bài 13–16):**
  13. *Đàm phán thương mại & Hợp đồng* (Thỏa thuận điều khoản, ký kết hợp đồng, phân chia lợi nhuận)
  14. *Bán dẫn & Đổi mới công nghệ* (Chuỗi cung ứng chip bán dẫn vi mạch, quy trình R&D)
  15. *Kê khai thuế & Phúc lợi lao động* (Quy chế thuế thu nhập cá nhân, quyền lợi bảo hiểm lao động)
  16. *Diễn thuyết & Báo cáo chuyên đề* (Trình bày quan điểm học thuật, phân tích dữ liệu, đúc kết xu hướng)

### 5.2. Bao phủ 100% Từ nguyên Hán-Việt 80 Từ (0 Placeholder Fallbacks)
- Tệp `src/data/etymologyData.ts` cung cấp đầy đủ dữ liệu từ nguyên học Sinology cho trọn vẹn 80 từ (`lesson-1-word-1` đến `lesson-16-word-5`).
- Mỗi mục từ bao gồm: Âm Hán-Việt chuẩn mực, Bộ thủ Khang Hy (`radical`), Tên bộ thủ (`radicalName`), Số nét bút (`strokes`), Phân loại thanh điệu Đài Loan (`toneClass`), Mẹo ghi nhớ đồng nguyên Hán-Việt (`cognateTip`), và Phân tích chiết tự từng ký tự (`decomposition`).
- Không còn bất kỳ mục từ nào rơi vào cơ chế placeholder dự phòng (0 fallback).

### 5.3. 6 Bộ thẻ Starter Decks Đài Loan Chuyên sâu (`STARTER_DECKS`)
Nạp nhanh danh sách từ vựng trọng tâm vào lộ trình ôn tập SRS chỉ với 1 cú nhấp:
1. **Sống sót Chợ đêm Đài Loan (`deck-nightmarket`)**: Gọi đường đá (`半糖少冰`), hỏi giá, thanh toán.
2. **Kỹ năng MRT & Xe buýt (`deck-mrt`)**: Biển chỉ dẫn ga MRT, chuyển tuyến (`轉車`), thẻ EasyCard (`悠遊卡`).
3. **Thuê nhà & KTX Đại học (`deck-housing`)**: Tiền đặt cọc (`押金`), hợp đồng thuê nhà, tiền điện nước (`水電費`).
4. **Từ vựng Cốt lõi TOCFL A2 (`deck-tocfl-a2`)**: 15 danh từ, động từ thiết yếu cho chứng chỉ TOCFL Band A2.
5. **Kỹ năng Thực chiến TOCFL B1 (`deck-tocfl-b1`)**: Giao dịch ngân hàng (`開戶`, `匯款`), thuê xe, phỏng vấn xin việc.
6. **Chuyên sâu Bán dẫn & TOCFL B2 (`deck-tocfl-b2`)**: Thuật ngữ bán dẫn (`晶片`), đàm phán hợp đồng thương mại, luật thuế.

### 5.4. 6 Kịch bản Hội thoại Phân nhánh & Deep-link Trực tiếp sang AI Chat
- 6 kịch bản hội thoại thực tế: `tea` (Trà sữa), `mrt` (Tàu điện), `store` (Cửa hàng tiện lợi), `bank` (Mở tài khoản ngân hàng), `clinic` (Khám bệnh), `interview` (Phỏng vấn xin việc).
- Tích hợp nút **"💬 Chat tự do cùng AI"** trực tiếp trong `ScenarioFlow`, chuyển tiếp mượt mà sang `AiChatView` mang theo đúng ngữ cảnh kịch bản và vai trò nhân vật tương ứng.

### 5.5. Cầu nối Giản↔Phồn, Thuật ngữ Lưỡng bờ & Đánh giá Cấp độ TOCFL
- Mở rộng bảng quy đổi Giản thể ↔ Phồn thể và từ điển thuật ngữ Lưỡng bờ Đài Loan — Đại Lục:
  - Công nghệ/Bán dẫn: 晶片 (Đài Loan) ↔ 芯片 (Đại Lục), 電腦 ↔ 計算機, 伺服器 ↔ 服務器.
  - Đời sống & Tiện ích: 悠遊卡 ↔ 一卡通, 發票 ↔ 發票/收據, 便當 ↔ 快餐/盒飯.
  - Y tế & Xã hội: 健保 ↔ 醫保, 捷運 ↔ 地鐵, 計程車 ↔ 出租車.
- Hàm đánh giá trình độ `getLearnerTocflLevel`: Tự động phân cấp người học dựa trên tiến độ học tập thực tế và độ chính xác của các bài trắc nghiệm (A1 → A2 → B1 → B2).

### 5.6. Bento Dashboard Động & Trải nghiệm Học tập Tinh hoa
- **Mẫu số Tiến độ Động 80 từ (`/ 80`)**: Màn hình `TodayView` và `SettingsView` tự động đồng bộ mẫu số từ vựng toàn khóa theo số lượng bài học thực tế thay vì con số cứng 40 từ trước đây.
- **Hệ thống Huy hiệu Thành tựu Cấp độ**: Bổ sung bộ huy hiệu TOCFL A1, A2, B1, B2 tự động mở khóa theo số lượng từ vựng tích lũy.
- **Nâng cấp Thẻ từ `WordCard`**:
  - Tích hợp huy hiệu âm Hán-Việt và bộ thủ Khang Hy ngay trên thẻ từ vựng.
  - Tính năng phát âm từng chữ (Character-level click-to-pronounce): Cho phép người học nhấp vào từng ký tự Hán riêng lẻ trong ô Điền Tự Cách để nghe phát âm chuẩn xác ngữ âm Đài Loan.

---

## 6. Kiểm tra Chất lượng Mã nguồn & Bộ Kiểm thử Tự động

Dự án sở hữu bộ kiểm thử tự động toàn diện với độ tin cậy tuyệt đối sau khi hợp nhất Remediation và hoàn tất Phase 3:

```powershell
# 1. Kiểm tra an toàn kiểu tĩnh (TypeScript typecheck - 0 lỗi)
npm.cmd run typecheck

# 2. Đóng gói hoàn chỉnh Client SPA & Server Standalone Bundle
npm.cmd run build

# 3. Chạy 78 bài kiểm tra bảo mật (Credential Forwarding, SSRF, URL Fragment, CORS - PASS 100%)
npm.cmd run test:security

# 4. Chạy 54 bài kiểm tra tích hợp HTTP thật trên máy chủ production Node.js (PASS 100%)
npm.cmd run test:integration

# 5. Chạy toàn bộ bộ kiểm thử đơn vị và tích hợp (Vitest 540+ tests)
npm.cmd test

# 6. Đo độ bao phủ mã nguồn theo ngưỡng chuẩn (Thresholds: lines >= 80%, services >= 92%)
npm.cmd run test:coverage

# 7. Kiểm tra quy chuẩn linter (ESLint)
npm.cmd run lint

# 8. Chạy bộ kiểm thử chấp nhận đầu-cuối Playwright E2E
npm.cmd run test:e2e
```

Chi tiết kế hoạch triển khai, tiến độ kỹ thuật và bằng chứng kiểm nghiệm xem tại:
- [docs/PLAN.md](docs/PLAN.md) — Kế hoạch Triển khai & 10 Cổng Nghiệm thu Phase 3
- [docs/PROGRESS.md](docs/PROGRESS.md) — Tiến độ Kỹ thuật & Ma trận Điều phối
- [docs/QA.md](docs/QA.md) — Báo cáo Kiểm định Chất lượng & Bằng chứng Thực nghiệm
