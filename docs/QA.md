# Báo cáo Kiểm định Chất lượng & Bằng chứng Thực nghiệm (QA Verification Report) — ZhongXue New V2

**Ngày kiểm định:** 22/10/2026 (Asia/Taipei)  
**Tác giả kiểm định:** Subagent R19 — Reviewer Phản biện Chất lượng & Bằng chứng  
**Model thực hiện:** Gemini 3.8 Flash (High) [Thừa kế từ phiên chính Antigravity]  
**Môi trường kiểm định:** Node.js v24.18.0, Windows x64 (PowerShell)  
**Isolated Checkout Workspace:** `C:\Users\thanh\Desktop\ECC\projects\zhongxue-remediation`  
**Git Branch:** `remediation/flash-3.8-high`  
**Trạng thái kiểm định tổng thể:** **NOT READY FOR PRODUCTION** (7/10 Cổng Nghiệm thu Bắt buộc PASS; 3 Blockers kỹ thuật đang chờ xử lý).  

---

## 1. Bảng Tổng Hợp Trạng Thái Kiểm Định Kỹ Thuật Sau Đợt Remediation

> [!IMPORTANT]
> **Đính chính tài liệu cũ (21/10/2026):** Bản báo cáo trước đây từng tuyên bố "383/383 PASS (100%)" và "READY FOR PRODUCTION". Cuộc kiểm toán độc lập đã chỉ ra các khiếm khuyết nghiêm trọng F01–F07. Báo cáo dưới đây phản ánh chính xác số liệu đo lường thực tế sau khi 8 Builder, 8 Tester và 2 Reviewer triển khai đợt sửa chữa có kiểm chứng.

| Hạng mục kiểm tra | Lệnh thực thi thực tế | Kết quả đo được | Trạng thái | Đánh giá độc lập của QA |
|---|---|:---:|:---:|---|
| **TypeScript Typecheck** | `npm.cmd run typecheck` | **0 errors** | **PASS** | `tsc -b --pretty false` hoàn thành với mã thoát 0. Mã nguồn sản phẩm và tests không có lỗi kiểu. |
| **Production Build** | `npm.cmd run build` | **PASS (2.95s)** | **PASS** | Biên dịch cả client SPA (`dist/index.html`, assets) và máy chủ standalone Node.js (`dist/server/index.js` ~109KB). |
| **Bảo mật (Security Tests)** | `npm.cmd run test:security` | **PASS (78/78 tests)** | **PASS** | 49 unit + 29 integration tests qua TCP loopback thật. Zero key leak, zero SSRF, cấm fragment `#` và query `?`. |
| **Tích hợp Máy chủ Production** | `npm.cmd run test:integration` | **PASS (54/54 tests)** | **PASS** | 18 tests server production + 29 tests API security + 7 tests HTTP AI lifecycle qua TCP thật. |
| **Acceptance Packages G1–G6** | Chạy các suite acceptance độc lập | **PASS (100%)** | **PASS** | F01 (13/13 PASS), F02/F03 (78/78 PASS), F04/F05 (85/85 PASS), F06 (142/142 PASS), F07 (24/24 PASS). |
| **Toàn bộ Test Suite** | `npm.cmd test` | **472 PASS / 2 FAIL** | **FAIL** | 13/15 test files đạt. 2 ca thất bại do 2 dòng assertion cũ từ baseline trước sửa đổi chưa được I20 đồng bộ với Invariant G1.4. |
| **Độ bao phủ (Coverage)** | `npm.cmd run test:coverage` | **75.89% lines / 80.68% branch** | **FAIL** | Ngưỡng yêu cầu là >= 80%. Services đạt 92.15%, nhưng Server đạt 76.19% lines và Domain chỉ đạt 54.65% lines. Thoát mã lỗi 1. |
| **ESLint Quy chuẩn mã nguồn** | `npm.cmd run lint` | **40 problems (40 errors)** | **FAIL** | Mã nguồn sản phẩm `src/` và `server/` sạch 100%. Tuy nhiên có 40 lỗi biến chưa dùng trong thư mục `tests/` và `docs/probe-r17.ts`. |
| **E2E Layout & Accessibility** | `npx playwright test tests/e2e/accessibility-regression.spec.ts tests/e2e/lesson.spec.ts` | **PASS (32/32 tests)** | **PASS** | Khắc phục triệt để lỗi tràn ngang +52px ở 375px và +37px ở 390px trên cả desktop thu nhỏ và mobile emulation. Xóa bỏ 100% `.first()`. |
| **E2E Chat Lifecycle (Invariant G4)** | `npx playwright test tests/e2e/chat-lifecycle.spec.ts` | **FAIL (3 FAILED / 0 PASSED)** | **FAIL** | **Subagent B04 chưa được thực thi**. `AiChatView.tsx` chưa được sửa để bảo toàn role và lọc tin nhắn hủy. |

---

## 2. Thống Kê 15 Tệp Kiểm Thử Unit & Integration (474 Tests Thực Tế)

| STT | Tệp kiểm thử | Số ca test | Trạng thái | Thời gian | Trách nhiệm | Mục tiêu bảo vệ & Kết quả |
|:---:|---|:---:|:---:|:---:|:---:|---|
| 1 | `tests/acceptance/storage-roundtrip.test.ts` | 7 | **PASS** | 166ms | T09, B01 | **F01 Roundtrip:** Lưu và tải trọn vẹn 500, 600, 1.000 từ; compact JSON; trần 2.000.000 ký tự. |
| 2 | `tests/acceptance/storage-recovery.test.ts` | 6 | **PASS** | 18ms | T09, B01 | **F01 Recovery:** `STORAGE_BACKUP_KEY`, chống ghi đè trắng khi storage lỗi. |
| 3 | `tests/acceptance/production-package.test.ts` | 6 | **PASS** | 3576ms | T14, B06 | **F07 Omit-dev:** Standalone `dist/server/index.js`, khởi động độc lập trên port 3998, nạp 122.596 mục từ. |
| 4 | `tests/security-policy.test.ts` | 49 | **PASS** | 23ms | T10, B02 | **F02 & F03 Unit:** Phân lập khóa OpenRouter/AgentRouter; cấm `#` và `?`; secure-by-default. |
| 5 | `tests/api-validation.test.ts` | 78 | **PASS** | 141ms | T11, B03 | **F05 Validation:** Chặn `"null"`, mảng nguyên thủy, role lạ bằng HTTP 400 Bad Request; Content-Type sai trả 415. |
| 6 | `tests/speech.test.ts` | 45 | **PASS** | 200ms | T15, B07 | **G7 Audio:** Đồng bộ `onEnd` khi gián đoạn; minh bạch nhãn mô phỏng cao độ thanh điệu. |
| 7 | `tests/api-client.test.ts` | 61 | **PASS** | 264ms | T13, B05 | **F06 Adapter:** Tách 3 con số, chặn silent fallback khi API 500 với từ ngoài giáo trình (`apiFailed: true`). |
| 8 | `tests/search-normalization.test.ts` | 49 | **PASS** | 19ms | T13, B05 | **G5 Normalization:** Ma trận 12 trường hợp tìm kiếm Hán tự, Pinyin có/không dấu/số, tiếng Việt có/không dấu. |
| 9 | `tests/ai-provider.test.ts` | 28 | **PASS** | 1040ms | T11, B03 | **G3 Provider:** Kết nối AI upstream, timeout 12s, fallback Sinology NLP có nhãn minh bạch. |
| 10 | `tests/integration/ai-http-lifecycle.test.ts` | 7 | **PASS** | 1333ms | T11, B03 | **F04 Lifecycle:** Hủy upstream qua `AbortSignal` khi client ngắt kết nối; ping body rỗng bị từ chối (`ok: false`). |
| 11 | `tests/integration/production-server.test.ts` | 18 | **PASS** | 2073ms | T14, B06 | **G6 Server:** SPA fallback an toàn sau `/api/*`; route lạ trả JSON 404; sensitivity test không nuốt lỗi. |
| 12 | `tests/integration/api-security.test.ts` | 29 | **PASS** | 2108ms | T10, B02 | **F02 & F03 HTTP:** Zero key leak sang OpenRouter; loopback trap server nhận 0 request khi bị tấn công `#`. |
| 13 | `tests/dictionary-engine.test.ts` | 32 | **PASS** | 5484ms | T13, B05 | **F06 Engine:** Nạp 122.596 mục từ RAM, phân tách 3 con số trên route thật `GET /api/dictionary`. |
| 14 | `tests/domain.test.ts` | 26 | **25 PASS / 1 FAIL** | 50ms | T09, B01 | **G1.4 SRS Bug:** Test dòng 59 PASS (cho phép ôn trước lịch). Dòng 183 FAIL (assertion cũ chưa đồng bộ). |
| 15 | `tests/custom-word-storage.test.ts` | 33 | **32 PASS / 1 FAIL** | 60ms | T09, B01 | **G1.4 SRS Custom:** Test dòng 246 FAIL (assertion cũ mong muốn giữ nguyên state khi rate lần 2 trong ngày). |
| **Tổng** | **15 Test Files** | **474** | **472 PASS / 2 FAIL** | **~14s** | | **Tỷ lệ Đạt: 99.58% (Cần đồng bộ 2 ca cũ)** |

---

## 3. Báo Cáo Đo Độ Bao Phủ Mã Nguồn Thực Tế (V8 Coverage Audit)

Đo lường bằng lệnh: `npm.cmd run test:coverage` (Threshold yêu cầu cấu hình trong `vite.config.ts`: 80% cho all metrics):

```text
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Đánh giá QA
-------------------|---------|----------|---------|---------|-------------------
All files          |   75.89 |    80.68 |   79.26 |   75.89 | CHƯA ĐẠT CHỈ TIÊU (75.89% < 80%)
 server            |   76.19 |    80.77 |    93.50 |   76.19 | CHƯA ĐẠT (Lines < 80%)
  ai.ts            |   77.10 |    76.30 |   100.00 |   77.10 | Chưa đạt (< 80%)
  aiFallback.ts    |   97.73 |    65.38 |   100.00 |   97.73 | Đạt
  app.ts           |   44.70 |    76.47 |    66.66 |   44.70 | Cần bổ sung test
  dictionary.ts    |   61.26 |    77.10 |    75.00 |   61.26 | Cần bổ sung test
  errors.ts        |   94.32 |    80.35 |   100.00 |   94.32 | Xuất sắc
  index.ts         |    0.00 |   100.00 |   100.00 |    0.00 | Standalone entry
  routes.ts        |   58.74 |    66.66 |    75.00 |   58.74 | Cần bổ sung test
  security.ts      |   94.31 |    90.42 |   100.00 |   94.31 | Xuất sắc
  static.ts        |   76.11 |    60.78 |   100.00 |   76.11 | Chưa đạt (< 80%)
  validation.ts    |   92.76 |    88.88 |   100.00 |   92.76 | Xuất sắc
 src/domain        |   54.65 |    73.11 |    50.87 |   54.65 | CHƯA ĐẠT
  learning.ts      |   43.09 |    60.60 |    45.09 |   43.09 | Cần bổ sung unit tests
  ...malization.ts |   98.70 |    93.75 |   100.00 |   98.70 | Xuất sắc
 src/services      |   92.15 |    83.48 |    96.66 |   92.15 | ĐẠT XUẤT SẮC (>= 80%)
  api.ts           |   92.94 |    83.98 |   100.00 |   92.94 | Xuất sắc
  speech.ts        |   90.05 |    82.53 |    94.11 |   90.05 | Xuất sắc
-------------------|---------|----------|---------|---------|-------------------
```

---

## 4. Danh Sách 3 Điểm Nghẽn Kỹ Thuật (Blockers) Cần Xử Lý

1. **Blocker 1 — Kích hoạt Builder B04 sửa Invariant G4 trong `src/views/AiChatView.tsx`:**
   - Cần đồng bộ `activeRole` vào `sessionStorage` để không bị reset về `'free'` sau khi chuyển tab (Fix G4.1).
   - Thêm generation guard counter để request cũ bị hủy không ghi đè input và tin nhắn sang role mới (Fix G4.2).
   - Lọc bỏ các tin nhắn có `status === 'canceled'` khỏi payload `messages` gửi lên AI model (Fix G4.3).
2. **Blocker 2 — Đồng bộ 2 assertion SRS cũ trong `domain.test.ts` và `custom-word-storage.test.ts`:**
   - Cập nhật `domain.test.ts:183` và `custom-word-storage.test.ts:246` phù hợp với Invariant G1.4 (cho phép tăng `interval` khi ôn trước lịch).
3. **Blocker 3 — Nâng độ bao phủ (Coverage) lên >= 80% và Dọn dẹp ESLint:**
   - Bổ sung test cases cho `learning.ts`, `routes.ts`, `app.ts` để đưa tổng độ phủ lines từ 75.89% lên >= 80%.
   - Dọn dẹp 40 biến probe chưa dùng trong `tests/` và `docs/`.
