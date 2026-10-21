# Tiến độ và xác minh — ZhongXue V2 (Gói Tối Ưu Toàn Diện & Mô Phỏng 30 Personas)

Ngày: 20/10/2026 (Asia/Taipei).

## Đã xác nhận & Triển khai thành công

- Dự án đặt tại `projects/zhongxue-new` trên nhánh tính năng `feat/zhongxue-greenfield`.
- Đã tiến hành điều phối **30 Subagents mô phỏng người dùng thực tế** qua 6 nhóm học viên (A1 người mới, Công nhân công xưởng, Du học sinh, Ẩm thực chợ đêm, Cửa hàng tiện lợi, Thuê nhà, Khám bệnh BHYT, Đi xe máy đổ xăng 95, Ngân hàng & ARC, Phỏng vấn IT, Lễ hội truyền thống, Đàm phán B2, Kỹ sư TSMC, Khai thuế 183 ngày, Người dùng vẽ tay, Nghiên cứu từ điển 122k, Học giả Hán học, Luyện cao độ âm điệu, Người dùng phím tắt SRS, Mobile 375px, Khiếm thị/Người cao tuổi, Ngoại tuyến mất mạng, Stress test phá hoại, Heatmap 84 ô, Thợ săn huy hiệu, Quản trị viên sao lưu, Đàm thoại AI chuyên sâu, Chuyển đổi Giản - Phồn).
- Đã giải quyết triệt để 5 nhóm vấn đề kỹ thuật lớn (5 Pha Thực Thi):
  - **Pha 1 (Logic & Hội thoại AI):** Đồng bộ `roleId` (`factory`, `tax`, `tech`, `scooter`...) từ `AiChatView.tsx` qua `api.ts` đến `viteApiPlugin.ts`; sửa lỗi regex từ vựng `ẩm thực đường phố` không bị kích hoạt nhầm trà sữa; thêm ô cấu hình OpenRouter / Gemini API Key trong `SettingsView.tsx`; tự động hủy phát âm `speechSynthesis.cancel()` khi chuyển tab trong `App.tsx`.
  - **Pha 2 (Khắc phục lỗi Đếm SRS & Phím tắt Anki):** Sửa lỗi mẫu số tụt dần thành `totalInSession`; hỗ trợ luồng Double-Space (Space lật thẻ ➔ Space xác nhận Tốt [3]); phím `R` phát âm lại; nhãn thời gian ôn tập động theo hệ số SM-2.
  - **Pha 3 (Mô hình Cao độ Chao 5 cấp & Web Audio F0):** Thay đường cong tĩnh bằng hệ thống đường cong âm điệu Chao (1–5) tương ứng 4 thanh điệu chuẩn và biến điệu thanh 3 (2+3) trong `TodayView.tsx`.
  - **Pha 4 (Hán học Động & Bộ Chuyển đổi Giản - Phồn):** Tích hợp hàm `convertSimpToTrad` và từ đồng nghĩa hai bờ eo biển (`地铁 ↔ 捷運`, `出租车 ↔ 計程車`, `软件 ↔ 軟體`, `芯片 ↔ 晶圓`...); nạp font CJK Phồn thể `Noto Serif TC` và `Noto Sans TC`.
  - **Pha 5 (Khả năng Tiếp cận a11y & Trải nghiệm):** Thêm `:focus-visible` và `:focus-within` toàn cục; nâng touch targets $\ge 44\text{px}$; thêm `interactive-widget=resizes-content` trong viewport meta; phím tắt 1-4 và Enter cho trắc nghiệm `LessonFlow.tsx`; nhãn các thứ trong tuần (T2, T4, T6, CN) cho Heatmap 84 ô.
  - **Pha 6 (Kết nối AgentRouter & Huấn luyện viên Phát âm AI):** 
    - Tạo file `.env` tích hợp AgentRouter (`https://agentrouter.org/v1`, model `deepseek-v4-flash`, key `sk-eVZ0wFaM...`).
    - Nâng cấp `viteApiPlugin.ts` hỗ trợ trực tiếp AgentRouter (headers `Originator: codex_cli_rs`, `User-Agent`, `Version`), nạp biến môi trường tự động, hỗ trợ health ping và tăng `max_tokens: 2048` để phục vụ mô hình DeepSeek suy luận (reasoning tokens).
    - Nâng cấp `SettingsView.tsx`: Thêm bảng cấu hình AgentRouter / OpenRouter, nút "⚡ Kiểm tra kết nối AgentRouter" trực tiếp đo độ trễ mạng thực tế, nút "Mặc định AgentRouter".
    - Hoàn thiện tính năng Luyện phát âm trong `AiChatView.tsx`: Bổ sung 2 nút nghe chuẩn 1.0x và nghe chậm 0.7x (imitation), nút "Luyện đọc" nạp câu vào micro, thanh "🎯 Nhờ AI sửa & chấm phát âm", xử lý toàn diện lỗi micro (Web Speech API).
  - **Pha 7 (Tích hợp Mô hình GPT-6.1 Sol & OpenAI Responses API trên AgentRouter):**
    - Cấu hình hỗ trợ song song hai mô hình hàng đầu trên AgentRouter: `gpt-6.1-sol` (OpenAI Responses API) và `deepseek-v4-flash` (Chat Completions API).
    - Lưu trữ và tự động định tuyến API Key chuyên dụng:
      - `AI_SOL_KEY`: `sk-hXMK...` (dành riêng cho `gpt-6.1-sol`).
      - `AI_DEEPSEEK_KEY`: `sk-eVZ0...` (dành riêng cho `deepseek-v4-flash`).
    - Nâng cấp `src/viteApiPlugin.ts`:
      - Triển khai bộ phân tích dữ liệu `extractResponseApiText` bóc tách cấu trúc phản hồi dạng nhánh `output[].content[].text` của OpenAI Responses API.
      - Tự động chuyển hướng endpoint: `/responses` với `{ model, input, max_output_tokens: 2500 }` cho `gpt-6.1-sol`; `/chat/completions` với `{ model, messages, max_tokens: 2048 }` cho DeepSeek/OpenRouter.
      - Hỗ trợ ping đo độ trễ mạng riêng biệt theo từng dòng mô hình.
    - Cải tiến giao diện người dùng & Cơ chế Phòng thủ Khóa (Self-Healing Multi-Key Resolution):
      - `SettingsView.tsx`: Cung cấp 2 nút preset nhanh "🌟 GPT-6.1 Sol (Khuyên dùng)" và "⚡ DeepSeek V4 Flash", nút kiểm tra kết nối tương tác trực tiếp theo mô hình đang chọn.
      - `AiChatView.tsx`: Bổ sung nút chuyển đổi 1-click trên thanh tiêu đề `gpt-6.1-sol ⇄ deepseek-v4-flash` kèm thông báo trạng thái và tự động cập nhật cấu hình vào `localStorage`.
      - **Khắc phục lỗi令牌 403 Forbidden của DeepSeek:** AgentRouter phân quyền token riêng biệt theo từng mô hình (key Sol không có quyền gọi DeepSeek và ngược lại). Đã triển khai bộ phân giải thông minh `resolveApiKeyForModel` tại cả frontend (`api.ts`) và backend (`viteApiPlugin.ts`): tự động phát hiện và chuyển đổi sang key tương thích ngay cả khi `localStorage` hoặc client gửi nhầm key của mô hình còn lại; tăng `max_tokens: 4096` cho DeepSeek suy luận.

## Kết quả kiểm định chất lượng thực tế

| Kiểm tra | Trạng thái |
|---|---|
| TypeScript (`npm.cmd run typecheck`) | **PASS** (0 lỗi) |
| ESLint (`npm.cmd run lint`) | **PASS** (0 lỗi / 0 cảnh báo) |
| Unit test (`npm.cmd test`) | **PASS — 25/25 tests** (`tests/domain.test.ts`) |
| Production build (`npm.cmd run build`) | **PASS** (`dist/` đóng gói thành công trong 2,48 giây) |
| Dev server (`http://127.0.0.1:5173/`) | **Sẵn sàng & Hoạt động ổn định** |

Báo cáo kiểm thử trình duyệt chi tiết được ghi tại [docs/QA.md](docs/QA.md) và hồ sơ bàn giao kiến trúc tại `Vault/project/zhongxue-bento-sinology-v2-handoff.md`.
