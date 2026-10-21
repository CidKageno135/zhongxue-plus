# Kế hoạch ZhongXue V2 (Gói Tối Ưu Toàn Diện) — 20/10/2026

## Mục tiêu và quyết định kiến trúc

Nâng cấp toàn diện ứng dụng `projects/zhongxue-new` từ bản mẫu giao diện Bento Sinology lên hệ thống học tập **100% dữ liệu động (Zero Mock Data)**, kết hợp hội thảo kiến trúc 10 chuyên gia (10 Gemini Flash Subagents) phụ trách từng phân hệ chuyên sâu:

1. **Subagent #1 (Domain & SM-2 Architect):** Nâng cấp thuật toán SM-2 hỗ trợ 4 mức (`again`, `hard`, `good`, `easy`), tính `computeEaseFactor`, hỗ trợ lưu từ mở rộng PGlite (`dict-...`) và bảo toàn tương thích ngược 100% với `importState`/`exportState` v1.
2. **Subagent #2 (Curriculum & Sinology Lead):** Xây dựng cơ sở dữ liệu Hán học `src/data/etymologyData.ts` cho toàn bộ 40 từ vựng cốt lõi (âm Hán-Việt, bộ thủ Khang Hy, số nét, phân rã chiết tự, mẹo chuyển âm Pinyin ↔ Hán-Việt), 4 bộ `STARTER_DECKS` và 7 `DAILY_RADICALS`.
3. **Subagent #3 (Dashboard Bento Specialist):** Đồng bộ hóa toàn bộ thẻ Hero Flashcard, chuỗi Streak, Topbar XP và các chỉ số trên `TodayView.tsx` với trạng thái thực của học viên.
4. **Subagent #4 (Audio & Pitch Engineer):** Hợp nhất bộ phát âm `zh-TW` (`speakChinese` chống lỗi GC trên Chromium) và thuật toán tự tương quan `detectPitchF0` qua Web Audio API.
5. **Subagent #5 (SRS & Hotkeys Specialist):** Trang bị phím tắt `Space` / `1-4`, sửa nút `Khó [2]` gọi đúng mức `'hard'`, và kích hoạt nạp bộ thẻ Starter Decks trên `ReviewView.tsx`.
6. **Subagent #6 (Dictionary & PGlite Specialist):** Cho phép lưu và ôn tập bất kỳ mục từ PGlite 122k nào trong `DictionaryView.tsx`, kiểm tra `checkBackendHealth()` thực tế và thêm bộ lọc chủ đề/cấp độ.
7. **Subagent #7 (Handwriting Engine Lead):** Xây dựng thuật toán nhận diện nét vẽ ngoại tuyến (`fallbackClientHandwriting`) trong `src/services/api.ts` và nâng cấp khả năng truy cập (`Escape`, click backdrop, `role="dialog"`) cho `HandwritingPad.tsx`.
8. **Subagent #8 (AI Tutor & Lesson UX Lead):** Lưu lịch sử `AiChatView.tsx` vào `sessionStorage`, nâng cấp `simulateLocalAiReply` bao phủ 8 chủ đề bài học, và bổ sung nút "Lưu toàn bộ từ bài học" trong `LessonFlow.tsx`.
9. **Subagent #9 (Analytics & Settings Lead):** Kết nối Radar 6 trục, Heatmap 84 ngày và 4 huy hiệu Sinology trong `SettingsView.tsx` với dữ liệu học tập thực tế.
10. **Subagent #10 (QA & Documentation Lead):** Mở rộng bộ kiểm thử đơn vị (`tests/domain.test.ts`) và kiểm thử đầu-cuối Playwright (`tests/e2e/handwriting-and-ai.spec.ts`), đồng bộ hóa tài liệu dự án và `Vault/`.

## Tiêu chí hoàn thành

- Mọi con số thống kê trên `Topbar`, `TodayView`, `ReviewView`, `SettingsView` phản ánh trung thực tiến độ của người dùng.
- Thuật toán SM-2 xử lý chính xác cả 4 mức đánh giá và phím tắt bàn phím (`Space`, `1-4`).
- Từ điển lưu được cả từ trong bài học lẫn từ PGlite 122k mà không làm gãy kiểm định `importState`.
- Bảng viết tay nhận diện được chữ Hán ngay cả khi offline; trợ lý AI trả lời thông minh cho cả 8 chủ đề và giữ nguyên lịch sử khi chuyển tab.
- Toàn bộ cổng kiểm định chất lượng (`typecheck`, `lint`, `test`, `build`, `test:e2e`) đạt PASS 100%.
