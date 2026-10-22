# Tiến độ và Ma trận Điều phối 20 Subagents — ZhongXue New V2

**Ngày cập nhật**: 21/10/2026 (Asia/Taipei)  
**Nhánh Git**: `feat/zhongxue-greenfield`  
**Mốc kiểm tra Baseline ban đầu**: Commit `eb4de8e`  
**Mốc hoàn tất Wave 3**: 20/20 Subagents hoàn thành 100%  
**Trạng thái hệ thống**: **READY FOR PRODUCTION**  

---

## 1. Tóm tắt Kết quả Nghiệm thu Toàn diện (Wave 3 Final)

Toàn bộ 20 Subagents kỹ thuật từ A01 đến A20 đã hoàn tất nhiệm vụ, vượt qua toàn bộ 10 Cổng Nghiệm thu Bắt buộc với số liệu thực tế đo lường:

| Hạng mục kiểm tra | Lệnh thực hiện | Kết quả thực tế | Ghi chú & Đánh giá |
|---|---|:---:|---|
| **TypeScript Typecheck** | `npm.cmd run typecheck` | **PASS (0 errors)** | Không có lỗi kiểu dữ liệu trên cả client, server và tests |
| **ESLint** | `npm.cmd run lint` | **PASS (0 errors, 0 warnings)** | Tuân thủ 100% quy chuẩn coding standards |
| **Unit & Integration Suite** | `npm.cmd test` | **PASS (383/383 tests)** | 11/11 test files đạt 100% trong ~4.5s |
| **Bảo mật (Security Tests)** | `npm.cmd run test:security` | **PASS (62/62 tests)** | Chặn rò rỉ khóa máy chủ, SSRF, redirect, Origin/CORS |
| **Tích hợp HTTP thật (Integration)** | `npm.cmd run test:integration` | **PASS (31/31 tests)** | Kiểm thử trực tiếp HTTP trên Node.js production server |
| **Độ bao phủ (Coverage)** | `npm.cmd run test:coverage` | **85,28% lines / 93,67% funcs** | Domain: 94,56% lines; Services: 91,94% lines; Security: 97,38% lines |
| **Đóng gói Production Build** | `npm.cmd run build` | **PASS (2.63s)** | Bundle tối ưu trong `dist/` |
| **Playwright E2E Suite** | `npm.cmd run test:e2e` | **PASS (10/10 test files)** | Sửa dứt điểm 2 ca timeout AI; hermetic mock ổn định |
| **Production Server E2E** | `npm.cmd run test:e2e:prod` | **PASS** | Kiểm thử trực tiếp trên máy chủ Node.js `server/index.ts` |
| **Động cơ Từ điển RAM** | Khởi động server | **122.596 mục từ** | Nạp file nén `CVDICT.u8.gz` vào RAM trong ~1.4s |

---

## 2. Ma trận Chi tiết 20 Subagents (A01 – A20) — 100% HOÀN THÀNH

| Subagent | Vai trò chính | Đợt | Tệp sở hữu & Phạm vi | Kết quả & Bằng chứng thực tế | Báo cáo chi tiết |
|:---|:---|:---:|:---|:---|:---:|
| **A01** | **Integration Builder & Hợp đồng Kiến trúc** | W0, W2 | `docs/API-CONTRACT.md`, `package.json`, `src/viteApiPlugin.ts`... | Thu gọn Vite plugin từ 751 dòng xuống 57 dòng; thống nhất `server/app.ts`; thêm scripts `start`, `test:security`, `test:integration`, `test:e2e:prod`. | [A01.md](agent-reports/A01.md) |
| **A02** | **Máy chủ Production** | W1 | `server/index.ts`, `server/app.ts`, `server/routes.ts`, `server/static.ts` | Máy chủ Node.js độc lập; cùng origin `127.0.0.1:3000`; SPA fallback sau `/api/*`; route lạ trả JSON 404; chống path traversal. | [A02.md](agent-reports/A02.md) |
| **A03** | **Ranh giới Bảo mật Upstream** | W1 | `server/security.ts`, `tests/security-policy.test.ts` | 41 unit security tests PASS; khóa máy chủ chỉ gửi tới allowlist; chặn `baseUrl` lạ; chặn redirect rò rỉ Authorization; kiểm tra Origin. | [A03.md](agent-reports/A03.md) |
| **A04** | **Kiểm định Dữ liệu & Lỗi HTTP** | W1 | `server/validation.ts`, `server/errors.ts`, `tests/api-validation.test.ts` | 70 validation tests PASS; giới hạn tải trọng 100KB; validate JSON body, timeout, nét vẽ; chuẩn hóa mã lỗi HTTP; không rò rỉ secrets. | [A04.md](agent-reports/A04.md) |
| **A05** | **Bộ kết nối AI & Fallback Server** | W1 | `server/ai.ts`, `server/aiFallback.ts`, `tests/ai-provider.test.ts` | 26 tests PASS; hỗ trợ Responses API (`gpt-6.1-sol`) và Chat (`deepseek-v4-flash`); timeout 12s; fallback Sinology NLP có nhãn guided minh bạch. | [A05.md](agent-reports/A05.md) |
| **A06** | **Động cơ Từ điển & Phân trang** | W1 | `server/dictionary.ts`, `tests/dictionary-engine.test.ts` | 26 tests PASS; nạp 122.596 bản ghi vào RAM trong ~1.4s; phân trang chính xác (bỏ giới hạn ảo 250); tích hợp chuẩn hóa Pinyin/Việt. | [A06.md](agent-reports/A06.md) |
| **A07** | **Chuẩn hóa Tiếng Việt & Pinyin** | W1 | `src/domain/searchNormalization.ts`, `tests/search-normalization.test.ts` | 36 tests PASS; hàm thuần xử lý Hán tự, Pinyin có dấu (`xuéshēng`), Pinyin không dấu, số thanh, tiếng Việt có/không dấu (`học sinh`/`hoc sinh`), đ/Đ, ü/v. | [A07.md](agent-reports/A07.md) |
| **A08** | **API Client & Trạng thái Kết nối** | W2 | `src/services/api.ts`, `tests/api-client.test.ts` | 57 tests PASS; chuyển sang same-origin; loại bỏ phụ thuộc cổng 3001; kiểm tra Content-Type JSON; xử lý offline, timeout, guided fallback. | [A08.md](agent-reports/A08.md) |
| **A09** | **Giao diện Hội thoại & Hủy Request** | W2 | `src/views/AiChatView.tsx`, `src/views/ConversationListView.tsx` | Hiển thị rõ ràng loading, lỗi, nút thử lại; hủy request khi chuyển tab/unmount; không làm mất nội dung đã nhập; nhãn guided minh bạch. | [A09.md](agent-reports/A09.md) |
| **A10** | **Giao diện Tra từ** | W2 | `src/views/DictionaryView.tsx` | Debounce tìm kiếm mượt mà; phân trang trung thực theo tổng số kết quả; đồng bộ local/corpus; giữ tính năng lưu vào sổ tay SRS. | [A10.md](agent-reports/A10.md) |
| **A11** | **Dữ liệu Học & Tương thích Sao lưu** | W1 | `src/domain/learning.ts`, `tests/custom-word-storage.test.ts` | 33 tests PASS; bảo toàn Hanzi, pinyin, nghĩa của từ ngoài giáo trình qua reload & export/import JSON; kiểm định SM-2 và quota lưu trữ. | [A11.md](agent-reports/A11.md) |
| **A12** | **Ôn tập SRS & Phím tắt** | W2 | `src/views/ReviewView.tsx`, `tests/e2e/review-regression.spec.ts` | Sửa mẫu số phiên ôn `totalInSession`; 4 mức đánh giá SM-2; phím tắt `Space` lật thẻ, `1-4` chấm điểm; nạp 4 bộ thẻ Starter Decks Đài Loan. | [A12.md](agent-reports/A12.md) |
| **A13** | **Viết tay & Khả năng Truy cập (a11y)** | W1 | `src/components/HandwritingPad.tsx`, `tests/e2e/handwriting-regression.spec.ts` | Modal `role="dialog"`; quản lý focus trap, phím Escape, trả focus về nút mở; nhận diện offline fallback rõ ràng giới hạn. | [A13.md](agent-reports/A13.md) |
| **A14** | **Âm thanh, Micro & Mô phỏng F0** | W1 | `src/services/speech.ts`, `src/components/SpeakButton.tsx`, `src/views/TodayView.tsx`, `tests/speech.test.ts` | 38 tests PASS; phát âm chuẩn zh-TW; dọn dẹp AudioContext/MediaStream chống rò rỉ bộ nhớ; phân biệt rõ đo micro thật với mô phỏng trực quan. | [A14.md](agent-reports/A14.md) |
| **A15** | **Cài đặt Provider & Bảo mật Khóa** | W2 | `src/views/SettingsView.tsx`, `tests/e2e/ai-settings.spec.ts` | Server-key mode không đẩy key xuống client; lưu/xóa key cá nhân minh bạch; ping kiểm tra kết nối thật; preset GPT-6.1 Sol và DeepSeek. | [A15.md](agent-reports/A15.md) |
| **A16** | **QA API & Bảo mật Độc lập** | W1, W3 | `tests/integration/api-security.test.ts`, `tests/integration/production-server.test.ts` | 31 integration tests PASS; kiểm thử HTTP thật; xác nhận route lạ trả 404, `/api/*` trả JSON; chứng minh không bao giờ rò rỉ khóa máy chủ. | [A16.md](agent-reports/A16.md) |
| **A17** | **QA Hội thoại & Từ điển Đầu-Cuối** | W1, W3 | `tests/e2e/handwriting-and-ai.spec.ts`, `tests/e2e/learning.spec.ts`, `tests/e2e/api-resilience.spec.ts` | Tách biệt test mock hermetic và live suite; sửa dứt điểm 2 ca timeout AI chat; xác nhận nhãn guided/live và phân trang từ điển. | [A17.md](agent-reports/A17.md) |
| **A18** | **QA Hồi quy Dữ liệu, Mobile & a11y** | W1, W3 | `tests/domain.test.ts`, `tests/e2e/settings-conversation.spec.ts`, `tests/e2e/lesson.spec.ts`... | 25 domain tests PASS; hồi quy 16 bài học, viewport 375px không tràn ngang, focus trap và xuất/nhập backup toàn vẹn. | [A18.md](agent-reports/A18.md) |
| **A19** | **Reviewer Độc lập** | W0, W3 | `docs/reviews/2026-10-21-hardening-review.md` | Rà soát độc lập toàn bộ diff; xác nhận 0 lỗi P0/P1 mở; phê duyệt chất lượng mã nguồn đạt chuẩn production. | [A19.md](agent-reports/A19.md) |
| **A20** | **Tài liệu và Bàn giao** | Toàn bộ | `README.md`, `.env.example`, `docs/PLAN.md`, `docs/QA.md`, `docs/PROGRESS.md`, `docs/adr/`, `Vault/` | **HOÀN TẤT 100%**: Chuẩn hóa tài liệu, sửa sai lệch lịch sử, lập hồ sơ bàn giao chính thức tại Vault. | [A20.md](agent-reports/A20.md) |

---

## 3. Xác nhận 4 Vấn đề Kỹ thuật Cốt lõi đã được Khắc phục Hoàn toàn

1. **Lỗ hổng Credential Forwarding (P0) ➔ ĐÃ KHẮC PHỤC TRIỆT ĐỂ**:
   - `server/security.ts` áp dụng chính sách allowlist nghiêm ngặt. Khi request gửi `baseUrl` tùy ý ngoài allowlist, server từ chối gắn khóa máy chủ.
   - Bằng chứng: 62 security tests đạt PASS 100% (trong đó có các bài test sentinel giả lập tấn công chuyển tiếp khóa).
2. **Lỗi máy chủ Production & SPA Fallback (P0) ➔ ĐÃ KHẮC PHỤC TRIỆT ĐỂ**:
   - Xây dựng máy chủ Node.js độc lập `server/index.ts` phục vụ cùng origin `127.0.0.1:3000`. Tuyến `/api/*` được mount trước SPA fallback; route lạ trả JSON 404; preview và production trả về đúng dữ liệu JSON.
   - Bằng chứng: 31 bài kiểm thử tích hợp HTTP thật (`tests/integration/`) đạt PASS 100%.
3. **Lỗi chuẩn hóa tìm kiếm từ điển (P1) ➔ ĐÃ KHẮC PHỤC TRIỆT ĐỂ**:
   - `src/domain/searchNormalization.ts` xử lý chuẩn hóa Unicode, Pinyin có dấu (`xuéshēng`) và tiếng Việt không dấu (`hoc sinh`) đều tìm ra đúng mục từ `學生`.
   - Bằng chứng: 36 tests trong `tests/search-normalization.test.ts` và 26 tests trong `tests/dictionary-engine.test.ts` đạt PASS 100%.
4. **Lệch số liệu metadata từ điển ➔ ĐÃ LÀM RÕ & ĐỒNG BỘ**:
   - Xác minh chính xác: Bộ từ điển CC-CEDICT gzipped (`CVDICT.u8.gz`) chứa đúng **122.596 bản ghi** phân tích thành công vào bộ nhớ RAM trong thời gian ~1.4 giây. Không có cơ sở dữ liệu PGlite hay máy chủ `server/api.mjs` cũ.
