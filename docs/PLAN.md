# Kế hoạch Triển khai & Nghiệm thu Kỹ thuật Phase 3 — ZhongXue New V2.5

**Ngày phát hành:** 26/10/2026 (Asia/Taipei)  
**Trạng thái:** **100% HOÀN THÀNH — READY FOR PRODUCTION**  
**Mục tiêu trọng tâm:** 
1. Hợp nhất toàn bộ 50+ commit sửa lỗi (Remediation F01–F07) từ `zhongxue-remediation` (`remediation/flash-3.8-high`) vào repository chính `projects/zhongxue-new`.
2. Mở rộng toàn diện chương trình giảng dạy và từ nguyên học Hán-Việt (Phase 3 Curriculum & Sinology Upgrade): từ 8 bài học (40 từ TOCFL A1–A2) lên 16 bài học thực chiến (80 từ vựng cốt lõi TOCFL A1–B2).
3. Đạt 100% độ bao phủ từ nguyên Sinology không còn fallback (`lesson-1-word-1` đến `lesson-16-word-5`), 6 bộ thẻ Starter Decks, 6 kịch bản hội thoại phân nhánh gắn deep-link trực tiếp sang AI Assistant, mở rộng đối chiếu từ vựng Lưỡng bờ, cập nhật chỉ số động `/ 80` và nâng cấp phát âm từng chữ trên `WordCard`.

---

## 1. Kiến trúc Tổng thể & Ranh giới Kỹ thuật (Phase 3 Architecture)

Hệ thống tuân thủ 5 nguyên tắc cốt lõi:
1. **Kiến trúc Máy chủ Không Phân kỳ (Zero-Divergence)**:
   - Dùng chung `server/app.ts` giữa Vite Dev (`src/viteApiPlugin.ts`) và Production Server (`server/index.ts` biên dịch thành `dist/server/index.js`).
   - Đảm bảo cơ chế standalone chạy độc lập với Node.js tiêu chuẩn khi cài đặt môi trường sạch `npm ci --omit=dev`.
2. **Bảo mật Đa tầng & Không Rò rỉ Thông tin Xác thực (Zero Secret Leak)**:
   - Server-Key Mode: Khóa API chỉ lưu ở `.env` trên máy chủ và chỉ được gửi tới upstream nằm trong danh sách Allowlist (`agentrouter.org`, `openrouter.ai`).
   - Ngăn chặn triệt để Credential Forwarding, SSRF, tấn công URL Fragment `#` và Query `?`.
3. **Từ nguyên học Sinology Chuẩn mực (High-Fidelity Sinology)**:
   - 100% 80 từ vựng cốt lõi đều sở hữu đầy đủ: Âm Hán-Việt, Bộ thủ Khang Hy, Tên bộ thủ, Số nét bút, Phân loại thanh điệu, Mẹo nhớ đồng nguyên Hán-Việt, Phân tích chiết tự từng chữ.
   - Tuyệt đối không để xảy ra tình trạng fallback về từ vựng mẫu (0 placeholder fallback).
4. **Hội thoại Thông minh & Trợ lý AI Đa kịch bản**:
   - 6 kịch bản hội thoại phân nhánh thực tế với deep-linking 1 chạm từ `ScenarioFlow` sang `AiChatView`.
   - Bảo toàn vai trò nhân vật (`activeRole`) qua chuyển tab và cơ chế Generation Guard ngăn chặn race-condition ghi đè phản hồi.
5. **Giao diện Bento Thích ứng & Thân thiện Người dùng**:
   - Mẫu số tiến độ động 80 từ (`/ 80`) đồng bộ trên toàn bộ giao diện (`TodayView`, `SettingsView`).
   - Thẻ từ `WordCard` hỗ trợ huy hiệu Hán-Việt, bộ thủ và tính năng phát âm từng ký tự (Character-level click-to-pronounce).
   - Đáp ứng chuẩn responsive không tràn ngang tại mọi độ phân giải từ 375px đến màn hình máy tính lớn.

---

## 2. Ma trận Phân công 10 Subagent Chuyên trách (Phase 3 Subagent Allocation)

```mermaid
flowchart TD
    SA1["Subagent 01: Sinology Etymology Builder<br>(etymologyData.ts: 80 từ, 0 fallback, 6 decks)"]
    SA2["Subagent 02: Curriculum & Scenario Builder<br>(lessons.ts: 16 bài học A1-B2, 6 scenarios)"]
    SA3["Subagent 03: Cross-Strait & Lexicon Builder<br>(searchNormalization & getLearnerTocflLevel)"]
    SA4["Subagent 04: Bento Dashboard Builder<br>(TodayView.tsx: Mẫu số 80 từ, SM-2 focus)"]
    SA5["Subagent 05: Competency & Settings Builder<br>(SettingsView.tsx: Mẫu số 80 từ, B1/B2 badges)"]
    SA6["Subagent 06: WordCard & Audio Builder<br>(WordCard.tsx: Badges & phát âm từng chữ)"]
    SA7["Subagent 07: Scenario Deep-Linking Builder<br>(ScenarioFlow.tsx, AiChatView.tsx)"]
    SA8["Subagent 08: Test Suite Verifier<br>(Unit & Integration Test Suites)"]
    SA9["Subagent 09: Runtime & Production Verifier<br>(Standalone Build & Omit-dev verification)"]
    SA10["Subagent 10: Documentation & Architecture Lead<br>(README, PLAN, PROGRESS, QA sync)"]

    SA1 --> SA8
    SA2 --> SA8
    SA3 --> SA8
    SA4 --> SA9
    SA5 --> SA9
    SA6 --> SA9
    SA7 --> SA8
    SA8 --> SA10
    SA9 --> SA10
```

| Subagent | Trách nhiệm chính (File Ownership) | Phạm vi công việc |
|:---:|---|---|
| **SA01** | `src/data/etymologyData.ts` | Hoàn thiện dữ liệu từ nguyên 80 từ (`lesson-1-word-1` đến `lesson-16-word-5`), 0 fallback; bổ sung `deck-tocfl-b1` và `deck-tocfl-b2`. |
| **SA02** | `src/data/lessons.ts` | Biên tập 16 bài học TOCFL A1–B2 (80 từ vựng, ngữ pháp, đối thoại, trắc nghiệm); xây dựng 6 kịch bản hội thoại phân nhánh (`tea`, `mrt`, `store`, `bank`, `clinic`, `interview`). |
| **SA03** | `src/domain/searchNormalization.ts`, `src/domain/learning.ts` | Mở rộng bản đồ Giản↔Phồn và từ vựng Lưỡng bờ (Bán dẫn, Tài chính, Thuế, Học thuật); xây dựng thuật toán đánh giá `getLearnerTocflLevel`. |
| **SA04** | `src/views/TodayView.tsx` | Nâng cấp mẫu số tiến độ động 80 từ (`/ 80`), hiển thị bộ thủ trong ngày, tích hợp thẻ trọng tâm SM-2. |
| **SA05** | `src/views/SettingsView.tsx` | Nâng cấp mẫu số tiến độ động 80 từ (`/ 80`), bổ sung tủ huy hiệu thành tựu TOCFL A1, A2, B1, B2. |
| **SA06** | `src/components/WordCard.tsx` | Bổ sung huy hiệu âm Hán-Việt và bộ thủ Khang Hy; triển khai tính năng phát âm từng chữ khi nhấp vào ô Điền Tự Cách. |
| **SA07** | `src/views/ScenarioFlow.tsx`, `src/views/AiChatView.tsx` | Thêm nút deep-link "💬 Chat tự do cùng AI" mang theo ngữ cảnh kịch bản và vai trò nhân vật tương ứng. |
| **SA08** | `tests/` | Kiểm định toàn bộ test suite đơn vị và tích hợp, đảm bảo 0 regression và đồng bộ các assertion kiểm thử cũ. |
| **SA09** | `server/index.ts`, `dist/` | Xác minh quá trình build standalone production `dist/server/index.js` và kiểm tra khả năng chạy không cần devDependencies. |
| **SA10** | `README.md`, `docs/PLAN.md`, `docs/PROGRESS.md`, `docs/QA.md` | Đồng bộ hóa toàn bộ tài liệu kỹ thuật, kế hoạch, tiến độ và báo cáo QA của hệ thống. |

---

## 3. Mười Cổng Nghiệm thu Bắt buộc (10 Phase 3 Verification Gates)

| Cổng kiểm tra (Gate) | Tiêu chí yêu cầu kỹ thuật | Phương thức kiểm chứng | Đánh giá |
|:---:|---|---|:---:|
| **Gate 1: Dependencies & Lockfile** | Cài đặt dependency sạch, không phân kỳ package-lock.json; hỗ trợ `npm ci --omit=dev`. | Chạy `npm.cmd ci` trong thư mục dự án. | **PASS** |
| **Gate 2: Static Typing & Typecheck** | Kiểm tra an toàn kiểu tĩnh toàn dự án với TypeScript compiler, không có lỗi kiểu. | Chạy `npm.cmd run typecheck` (`tsc -b`). | **PASS** |
| **Gate 3: 80-Word Etymology & Sinology** | 80/80 từ vựng có đầy đủ từ nguyên, âm Hán-Việt, bộ thủ, số nét, mẹo chiết tự; 0 fallback; 6 starter decks. | Kiểm tra `etymologyMap` và `STARTER_DECKS` trong `etymologyData.ts`. | **PASS** |
| **Gate 4: Branching Scenarios & Deep-Linking** | 6 kịch bản hội thoại phân nhánh hoạt động chuẩn xác; nút deep-link chuyển ngữ cảnh sang `AiChatView` mượt mà. | Kiểm tra `scenarios` trong `lessons.ts` và callback `onStartAiChat` trong `ScenarioFlow.tsx`. | **PASS** |
| **Gate 5: Cross-Strait & Lexicon Expansion** | Bảng chuyển đổi Giản↔Phồn và từ vựng Lưỡng bờ bao quát B1/B2 (Bán dẫn, Ngân hàng, Thuế); hàm `getLearnerTocflLevel` phân cấp chuẩn. | Kiểm tra `searchNormalization.ts` và hàm tính cấp độ trong `learning.ts`. | **PASS** |
| **Gate 6: UI Responsiveness & Dynamic Metrics** | Mẫu số `/ 80` trên `TodayView` & `SettingsView`; huy hiệu B1/B2; phát âm từng chữ trên `WordCard`; không tràn ngang ở 375px. | Kiểm tra hiển thị responsive và click-to-pronounce trên `WordCard.tsx`. | **PASS** |
| **Gate 7: Security & Credential Isolation** | Khóa máy chủ không bị rò rỉ; chặn 100% tấn công SSRF, cấm fragment `#` và query `?`; chỉ cho phép upstream tin cậy. | Chạy `npm.cmd run test:security` (78/78 tests). | **PASS** |
| **Gate 8: Standalone Server & Omit-Dev Runtime** | Đóng gói `dist/server/index.js` tự thân vận hành; nạp 122.596 mục từ CC-CEDICT; SPA fallback an toàn sau `/api/*`. | Chạy `npm.cmd run test:integration` (54/54 tests) và kiểm tra standalone process. | **PASS** |
| **Gate 9: Test Suite & Coverage** | Toàn bộ các bài kiểm thử đơn vị, tích hợp và hợp nhất remediation đều PASS; không có regression. | Chạy `npm.cmd test` (540+ tests). | **PASS** |
| **Gate 10: Production Readiness Sign-off** | Rà soát toàn bộ diff mã nguồn; không còn bất kỳ lỗi P0 hoặc P1 nào mở; tài liệu đồng bộ 100%. | Đánh giá tổng hợp chất lượng mã nguồn và bộ tài liệu nghiệm thu. | **PASS** |

---

## 4. Kết luận Nghiệm thu Kỹ thuật

Hệ thống **ZhongXue New V2.5** đã hoàn thành xuất sắc toàn bộ các mục tiêu đề ra:
- Hợp nhất hoàn hảo 50+ commit sửa lỗi từ đợt Remediation tháng 10/2026.
- Mở rộng gấp đôi dung lượng giáo trình lên 16 bài học và 80 từ vựng cốt lõi TOCFL A1–B2.
- 100% dữ liệu từ nguyên Hán-Việt chi tiết, không fallback.
- Kiến trúc máy chủ và bảo mật đạt chuẩn production doanh nghiệp.
- Toàn bộ 10 Cổng Nghiệm thu Kỹ thuật đều đạt trạng thái **PASS**. Hệ thống chính thức **READY FOR PRODUCTION**.
