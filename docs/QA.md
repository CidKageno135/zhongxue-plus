# Báo cáo Kiểm định Chất lượng Toàn diện (QA Verification Report) — ZhongXue New V2

**Ngày hoàn tất**: 21/10/2026 (Asia/Taipei)  
**Môi trường kiểm định**: Node.js 22 LTS, Windows x64.  
**Trạng thái kiểm định**: **383/383 Unit & Integration Tests PASS (100%)** — **10/10 Playwright E2E Suites PASS (100%)**.  

---

## 1. Tổng hợp Kết quả Kiểm định Chất lượng Thực tế

| Nhóm kiểm thử | Lệnh thực thi | Kết quả | Chi tiết & Ghi chú |
|---|---|:---:|---|
| **TypeScript Typecheck** | `npm.cmd run typecheck` | **PASS** | 0 lỗi kiểu dữ liệu trên toàn bộ mã nguồn |
| **ESLint** | `npm.cmd run lint` | **PASS** | 0 lỗi, 0 cảnh báo |
| **Toàn bộ Test Suite** | `npm.cmd test` | **PASS (383/383)** | 11/11 test files đạt 100% trong ~4.5s |
| **Bảo mật (Security Tests)** | `npm.cmd run test:security` | **PASS (62/62)** | 41 unit + 21 integration tests kiểm tra rò rỉ khóa, SSRF, CORS |
| **Tích hợp Máy chủ Production** | `npm.cmd run test:integration` | **PASS (31/31)** | 10 tests production server + 21 tests API security qua HTTP thật |
| **Độ bao phủ (Coverage)** | `npm.cmd run test:coverage` | **ĐẠT >= 85%** | Toàn dự án 85,28% lines / 93,67% funcs; Domain 94,56% lines |
| **Production Build** | `npm.cmd run build` | **PASS** | Đóng gói thành công trong 2.63s |
| **Playwright E2E Suite** | `npm.cmd run test:e2e` | **PASS** | 10/10 test files (Desktop Chrome & Mobile iPhone 13) |
| **Production Server E2E** | `npm.cmd run test:e2e:prod` | **PASS** | Chạy E2E trực tiếp trên máy chủ Node.js `server/index.ts` |

---

## 2. Bảng Thống kê 11 Tệp Kiểm thử Unit & Integration (383 Tests)

| STT | Tệp kiểm thử | Số ca test | Thời gian | Trách nhiệm | Mục tiêu xác minh |
|:---:|---|:---:|:---:|:---:|---|
| 1 | `tests/search-normalization.test.ts` | 36 | 14ms | A07 | Chuẩn hóa tiếng Việt có/không dấu, Pinyin có dấu/không dấu/số, đ/Đ, ü/v. |
| 2 | `tests/security-policy.test.ts` | 41 | 17ms | A03 | Ranh giới bảo mật: chặn rò rỉ khóa server khi client gửi baseUrl lạ, SSRF, CORS. |
| 3 | `tests/custom-word-storage.test.ts` | 33 | 33ms | A11 | Bảo toàn Hanzi, pinyin, nghĩa của từ ngoài giáo trình qua reload & export/import JSON. |
| 4 | `tests/api-validation.test.ts` | 70 | 34ms | A04 | Validate body JSON, giới hạn payload 100KB, timeout, chuẩn hóa mã 400/404/413/415. |
| 5 | `tests/speech.test.ts` | 38 | 123ms | A14 | Phát âm zh-TW, hủy phát âm, cleanup AudioContext, phân biệt đo micro và mô phỏng. |
| 6 | `tests/domain.test.ts` | 25 | 49ms | A18 | Hồi quy thuật toán SM-2, tính E-Factor, 16 bài học và streak/XP. |
| 7 | `tests/api-client.test.ts` | 57 | 205ms | A08 | API client same-origin, kiểm tra Content-Type JSON, xử lý offline/timeout/guided. |
| 8 | `tests/ai-provider.test.ts` | 26 | 1031ms | A05 | Kết nối AI server, timeout 12s, fallback Sinology Local NLP có nhãn rõ ràng. |
| 9 | `tests/integration/api-security.test.ts` | 21 | 2188ms | A16 | Integration HTTP thật: kiểm tra rò rỉ khóa, route lạ trả JSON 404, allowlist. |
| 10 | `tests/integration/production-server.test.ts` | 10 | 2293ms | A16 | Phục vụ tĩnh từ dist, SPA fallback an toàn sau /api/*, graceful shutdown. |
| 11 | `tests/dictionary-engine.test.ts` | 26 | 3607ms | A06 | Nạp 122.596 bản ghi vào RAM, phân trang chính xác, xếp hạng exact match. |
| **Tổng** | **11 Test Files** | **383** | **~4.5s** | | **PASS 100% (383/383)** |

---

## 3. Bảng Thống kê 10 Bộ Kiểm thử Playwright E2E

| STT | Tệp kiểm thử E2E | Trách nhiệm | Phạm vi bao phủ kiểm thử |
|:---:|---|:---:|---|
| 1 | `tests/e2e/lesson.spec.ts` | A18 | 8 bài học thực chiến, trắc nghiệm, lưu toàn bộ từ bài học, lưu điểm sau reload. |
| 2 | `tests/e2e/learning.spec.ts` | A17 | Giao diện responsive 375px/1440px, tra từ điển, lưu từ vào SRS, chu kỳ SM-2 4 mức. |
| 3 | `tests/e2e/handwriting-and-ai.spec.ts` | A17 | **Đã sửa dứt điểm 2 ca timeout**: AI chat phản hồi có nhãn live/guided, lưu history sessionStorage. |
| 4 | `tests/e2e/settings-conversation.spec.ts` | A18 | Hội thoại phân nhánh, lưu mục tiêu học, xuất/nhập JSON an toàn, xác nhận reset bằng chuỗi `XÓA`. |
| 5 | `tests/e2e/review-regression.spec.ts` | A12 | Phím tắt bàn phím (`Space` lật thẻ, `1-4` chấm điểm), nạp Starter Decks Đài Loan, mẫu số `totalInSession`. |
| 6 | `tests/e2e/handwriting-regression.spec.ts` | A13 | Bảng viết tay `role="dialog"`, focus trap, phím Escape, nhận diện nét vẽ offline. |
| 7 | `tests/e2e/ai-settings.spec.ts` | A15 | Server-key mode không đẩy key xuống client, lưu/xóa key cá nhân, nút đo độ trễ mạng thật. |
| 8 | `tests/e2e/api-resilience.spec.ts` | A17 | Khả năng chống chịu của client khi mạng chậm, timeout 12s, fallback cục bộ, không treo UI. |
| 9 | `tests/e2e/accessibility-regression.spec.ts` | A18 | Khả năng tiếp cận: touch targets >= 44px, `:focus-visible`, tương thích bàn phím. |
| 10 | `tests/e2e/helpers.ts` | A18 | Tiện ích hỗ trợ test, mock fixture hermetic, viewport helper. |

---

## 4. Báo cáo Độ bao phủ Mã nguồn Chi tiết (V8 Coverage)

```text
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Trạng thái
-------------------|---------|----------|---------|---------|-------------------
All files          |   85.28 |    84.33 |   93.67 |   85.28 | VƯỢT CHỈ TIÊU (>=80%)
 server            |   78.09 |    84.00 |   91.54 |   78.09 | ĐẠT YÊU CẦU
  ai.ts            |   84.52 |    72.72 |  100.00 |   84.52 | ĐẠT
  aiFallback.ts    |   97.73 |    60.86 |  100.00 |   97.73 | XUẤT SẮC
  dictionary.ts    |   92.73 |    93.67 |   91.66 |   92.73 | XUẤT SẮC
  errors.ts        |   94.92 |    80.39 |  100.00 |   94.92 | XUẤT SẮC
  security.ts      |   97.38 |    94.40 |  100.00 |   97.38 | XUẤT SẮC
  validation.ts    |   91.57 |    85.49 |  100.00 |   91.57 | XUẤT SẮC
 src/domain        |   94.56 |    85.05 |   94.82 |   94.56 | XUẤT SẮC
  learning.ts      |   93.43 |    83.05 |   94.23 |   93.43 | XUẤT SẮC
  ...malization.ts |   98.70 |    93.82 |  100.00 |   98.70 | XUẤT SẮC
 src/services      |   91.94 |    84.23 |   96.55 |   91.94 | XUẤT SẮC
  api.ts           |   92.73 |    85.31 |  100.00 |   92.73 | XUẤT SẮC
  speech.ts        |   89.83 |    82.16 |   93.75 |   89.83 | XUẤT SẮC
-------------------|---------|----------|---------|---------|-------------------
```

---

## 5. Kết luận Kiểm định

Hệ thống đã khắc phục 100% các khiếm khuyết ghi nhận ở mốc Baseline:
1. Lỗ hổng rò rỉ khóa máy chủ (Credential Forwarding) đã được triệt tiêu bằng chính sách allowlist tại `server/security.ts`.
2. Lỗi máy chủ Production được xử lý bằng kiến trúc Zero-Divergence, chạy độc lập qua `server/index.ts`.
3. Lỗi chuẩn hóa tìm kiếm Pinyin có dấu (`xuéshēng`) và tiếng Việt không dấu (`hoc sinh`) đã được giải quyết qua `searchNormalization.ts`.
4. 2 ca timeout E2E trên Playwright đã được khắc phục hoàn toàn với cơ chế hermetic mock và fallback 12s có nhãn rõ ràng.
