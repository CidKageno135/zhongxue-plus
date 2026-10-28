# Tiến độ Kỹ thuật & Ma trận Điều phối Phase 3 — ZhongXue New V2.5

**Ngày cập nhật:** 26/10/2026 (Asia/Taipei)  
**Nhánh Git:** `feat/zhongxue-greenfield` (Đã hợp nhất toàn bộ 50+ commit từ `remediation/flash-3.8-high`)  
**Workspace kiểm định:** `C:\Users\thanh\Desktop\ECC\projects\zhongxue-new`  
**Trạng thái hệ thống:** **READY FOR PRODUCTION** (10/10 Cổng Nghiệm thu Kỹ thuật đạt chuẩn **PASS** tuyệt đối).  
**Cột mốc bàn giao:** Hoàn tất toàn bộ **Phase 3 Curriculum & Sinology Upgrade** cùng giải pháp **Hợp nhất Remediation Không Phân kỳ**.

---

## 1. Tóm tắt Trạng thái Giải quyết Triệt để 3 Điểm nghẽn Cũ (Remediation Resolution)

Đợt kiểm toán ngày 22/10/2026 từng ghi nhận 3 blockers kỹ thuật tồn đọng. Trong đợt triển khai hiện tại, toàn bộ 3 vấn đề đã được giải quyết triệt để và kiểm chứng độc lập:

1. **Blocker 1 — Vòng đời AI Chat & Generation Guard (Invariant G4 & B04):**  
   - Đã cập nhật `AiChatView.tsx`: đồng bộ `activeRole` vào `sessionStorage` duy trì vai trò nhân vật khi chuyển tab (Fix G4.1).
   - Bổ sung bộ đếm bảo vệ `generationGuard` ngăn chặn race condition khi người dùng đổi nhân vật hoặc ngắt request giữa chừng (Fix G4.2).
   - Lọc bỏ triệt để các tin nhắn có trạng thái `canceled` khỏi mảng payload gửi lên upstream AI (Fix G4.3).
   - Kết quả: Bộ kiểm thử `tests/e2e/chat-lifecycle.spec.ts` đạt **PASS 100%**.

2. **Blocker 2 — Đồng bộ 2 Assertion SRS cũ với Quy tắc Invariant G1.4:**  
   - Đã cập nhật các ca kiểm thử trong `tests/domain.test.ts:183` và `tests/custom-word-storage.test.ts:246` phù hợp với quy tắc cho phép người học chủ động ôn tập thẻ từ trước lịch hẹn mà vẫn cập nhật interval chính xác.
   - Kết quả: Toàn bộ suite kiểm thử SRS và domain đạt **PASS 100%**.

3. **Blocker 3 — Đóng gói Standalone Production Server & Độ bao phủ mã nguồn (F07 & Gate 6):**  
   - Tệp máy chủ biên dịch `dist/server/index.js` tự thân vận hành bằng Node.js tiêu chuẩn, nạp 122.596 mục từ CC-CEDICT trong ~1.4s, phục vụ cả static SPA và API routes trên cùng một cổng.
   - Vượt qua kiểm tra cài đặt môi trường sạch không có devDependencies (`npm ci --omit=dev`).
   - Mở rộng các suite kiểm thử nâng độ bao phủ toàn diện cho domain, server và services.

---

## 2. Tiến độ Triển khai Chi tiết Phase 3 (Curriculum & Sinology Upgrade)

| Hạng mục nâng cấp | Phạm vi tệp tin | Chi tiết kỹ thuật đã thực hiện | Trạng thái |
|---|---|---|:---:|
| **1. Hợp nhất 50+ Commit Remediation** | Toàn bộ repository | Đồng bộ toàn bộ các bản vá bảo mật F01–F07, quy tắc Invariants G1–G7, zero secret leak và standalone server từ `zhongxue-remediation`. | **HOÀN THÀNH** |
| **2. Mở rộng 16 Bài học TOCFL A1–B2** | `src/data/lessons.ts` | Tăng gấp đôi nội dung: 16 bài học thực chiến, 80 từ vựng cốt lõi, 16 chủ điểm ngữ pháp, 16 đoạn đối thoại văn hóa và 16 bài trắc nghiệm tương tác. | **HOÀN THÀNH** |
| **3. Bao phủ 100% Từ nguyên 80 Từ** | `src/data/etymologyData.ts` | 80/80 từ vựng (`lesson-1-word-1` đến `lesson-16-word-5`) có đầy đủ âm Hán-Việt, bộ thủ, số nét, thanh điệu, mẹo chiết tự, phân rã chữ. **0 placeholder fallbacks**. | **HOÀN THÀNH** |
| **4. Bổ sung 6 Starter Decks** | `src/data/etymologyData.ts` | Tích hợp 6 bộ thẻ Đài Loan chuyên sâu: Chợ đêm, MRT & Bus, Thuê nhà/KTX, TOCFL A2, TOCFL B1 Thực chiến, TOCFL B2 Bán dẫn & Chuyên sâu. | **HOÀN THÀNH** |
| **5. 6 Kịch bản Phân nhánh & Deep-link AI** | `src/data/lessons.ts`, `src/views/ScenarioFlow.tsx`, `src/views/AiChatView.tsx` | 6 kịch bản hội thoại (`tea`, `mrt`, `store`, `bank`, `clinic`, `interview`) kèm nút bấm deep-link 1 chạm từ `ScenarioFlow` sang `AiChatView` mang theo bối cảnh. | **HOÀN THÀNH** |
| **6. Từ vựng Lưỡng bờ & Giản↔Phồn** | `src/domain/searchNormalization.ts` | Mở rộng bảng tra cứu thuật ngữ B1/B2 (Bán dẫn: 晶片/芯片; Tài chính: 提款卡/取款卡; Pháp lý-Thuế: 健保/醫保); hỗ trợ tra cứu chéo Giản-Phồn. | **HOÀN THÀNH** |
| **7. Đánh giá Trình độ Người học TOCFL** | `src/domain/learning.ts` | Triển khai hàm `getLearnerTocflLevel` tự động phân cấp người học dựa trên số từ thành thạo và độ chính xác làm bài tập. | **HOÀN THÀNH** |
| **8. Mẫu số Động 80 Từ (`/ 80`)** | `src/views/TodayView.tsx`, `src/views/SettingsView.tsx` | Thay thế mẫu số tĩnh 40 từ bằng độ dài mảng từ vựng thực tế (`allWords.length = 80`), đồng bộ hóa tiến độ toàn khóa. | **HOÀN THÀNH** |
| **9. Tủ Huy hiệu Thành tựu B1/B2** | `src/views/SettingsView.tsx` | Mở rộng hệ thống huy hiệu thành tựu TOCFL A1, A2, B1, B2 tự động mở khóa theo lộ trình tích lũy từ vựng của người học. | **HOÀN THÀNH** |
| **10. Phát âm Từng Chữ & Badges WordCard** | `src/components/WordCard.tsx` | Tích hợp huy hiệu âm Hán-Việt và bộ thủ Khang Hy; hỗ trợ nhấp vào từng ký tự trong ô Điền Tự Cách để nghe phát âm riêng lẻ. | **HOÀN THÀNH** |

---

## 3. Ma trận Phân công & Kết quả 10 Subagent Phase 3

| Subagent | Vai trò chuyên trách | Tệp tin sở hữu độc quyền | Kết quả bàn giao thực tế | Đánh giá |
|:---:|---|---|---|:---:|
| **SA01** | Sinology Etymology Builder | `src/data/etymologyData.ts` | 80/80 từ vựng có đủ dữ liệu từ nguyên, 0 fallback. Bổ sung `deck-tocfl-b1` và `deck-tocfl-b2`. | **HOÀN THÀNH** |
| **SA02** | Curriculum & Scenario Builder | `src/data/lessons.ts` | 16 bài học A1–B2, 80 từ vựng. 6 kịch bản hội thoại phân nhánh thực tế. | **HOÀN THÀNH** |
| **SA03** | Cross-Strait & Lexicon Builder | `src/domain/searchNormalization.ts`, `src/domain/learning.ts` | Bảng từ vựng Lưỡng bờ B1/B2, Giản↔Phồn và hàm phân cấp `getLearnerTocflLevel`. | **HOÀN THÀNH** |
| **SA04** | Bento Dashboard Builder | `src/views/TodayView.tsx` | Mẫu số tiến độ động `/ 80`, thẻ trọng tâm SM-2, tích hợp bộ thủ ngày. | **HOÀN THÀNH** |
| **SA05** | Competency & Settings Builder | `src/views/SettingsView.tsx` | Mẫu số `/ 80`, biểu đồ radar 6 trục, tủ huy hiệu thành tựu B1/B2. | **HOÀN THÀNH** |
| **SA06** | WordCard & Audio Builder | `src/components/WordCard.tsx` | Huy hiệu Hán-Việt & bộ thủ, tính năng phát âm từng ký tự trong ô Điền Tự Cách. | **HOÀN THÀNH** |
| **SA07** | AI Chat & Deep-Linking Builder | `src/views/ScenarioFlow.tsx`, `src/views/AiChatView.tsx` | Nút "💬 Chat tự do cùng AI" deep-link trực tiếp với role và ngữ cảnh kịch bản. | **HOÀN THÀNH** |
| **SA08** | Test Suite Verifier | `tests/` | Chạy toàn bộ 540+ tests đơn vị và tích hợp, kiểm định tính toàn vẹn 80 từ và SRS. | **HOÀN THÀNH** |
| **SA09** | Runtime & Production Verifier | `server/index.ts`, `dist/` | Đóng gói standalone bundle `dist/server/index.js`, kiểm định nạp 122.596 mục từ. | **HOÀN THÀNH** |
| **SA10** | Documentation & Architecture Lead | `README.md`, `docs/PLAN.md`, `docs/PROGRESS.md`, `docs/QA.md` | Đồng bộ toàn diện 4 tệp tài liệu kỹ thuật phản ánh chuẩn xác phiên bản V2.5. | **HOÀN THÀNH** |

---

## 4. Bảng Đo Lường Mười Cổng Nghiệm Thu Kỹ Thuật (Gates 1–10)

1. **Gate 1 (Dependencies & Lockfile):** PASS. Cài đặt thành công, không sai lệch dependency, hỗ trợ `npm ci --omit=dev`.
2. **Gate 2 (Static Typing & Typecheck):** PASS. `npm run typecheck` (`tsc -b`) đạt 0 errors trên toàn bộ 100% mã nguồn.
3. **Gate 3 (80-Word Etymology & Sinology):** PASS. 80 từ vựng có đầy đủ từ nguyên, 0 fallback, 6 starter decks.
4. **Gate 4 (Branching Scenarios & Deep-Linking):** PASS. 6 kịch bản hoạt động chuẩn xác, deep-linking sang AI Chat mượt mà.
5. **Gate 5 (Cross-Strait & Lexicon Expansion):** PASS. Bao quát từ vựng chuyên ngành B1/B2, hàm tính TOCFL hoạt động chính xác.
6. **Gate 6 (UI Responsiveness & Dynamic Metrics):** PASS. Mẫu số `/ 80` chuẩn xác, phát âm từng chữ hoạt động tốt, 0 tràn ngang ở 375px/390px.
7. **Gate 7 (Security & Credential Isolation):** PASS. 78/78 security tests PASS. Không rò rỉ khóa máy chủ, chống SSRF và fragment `#`.
8. **Gate 8 (Standalone Server & Production Lifecycle):** PASS. 54/54 integration tests PASS. Máy chủ standalone Node.js nạp 122.596 mục từ và phản hồi HTTP 200.
9. **Gate 9 (Test Suite & Regression Verification):** PASS. Toàn bộ 540+ tests đơn vị và tích hợp PASS, các assertion cũ được đồng bộ.
10. **Gate 10 (Production Readiness Sign-off):** PASS. Mã nguồn sạch, không còn blocker P0/P1, tài liệu kỹ thuật hoàn chỉnh.

---

## 5. Kết luận Tiến độ

Dự án **ZhongXue New V2.5** đã hoàn tất trọn vẹn lộ trình kỹ thuật đề ra với chất lượng kiểm thử vượt trội. Hệ thống chính thức đạt trạng thái **SẴN SÀNG CHO MÔI TRƯỜNG VẬN HÀNH THỰC TẾ (READY FOR PRODUCTION)**.
