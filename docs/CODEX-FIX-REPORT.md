# ZhongXue — sửa trực tiếp và kiểm chứng độc lập

Ngày thực hiện: **22–23/10/2026 (Asia/Taipei)**. Checkout: `projects/zhongxue-remediation`, nhánh `remediation/flash-3.8-high`. Phiên bản source/test được kiểm chứng: **`fcc2b23`**.

**Trạng thái: PASS TRONG PHẠM VI ĐÃ KIỂM CHỨNG.** Tất cả cổng nghiệm thu dưới đây đã đạt trên cùng snapshot source/test. Báo cáo này thay thế kết luận nghiệm thu trong `remediation-2026-10-22/FINAL-REPORT.md`. Nội dung cũ được giữ để đối chiếu, không dùng làm bằng chứng cho mã hiện tại.

## Vấn đề cần sửa

Kiểm chứng trước đợt này tại `Vault/project/reviews/2026-10-22-remediation-review/REPORT.md` đã tái hiện:

1. Payload vượt giới hạn đọc vẫn được báo lưu thành công, rồi tải lại không còn từ.
2. Không tạo được backup nhưng vẫn ghi đè dữ liệu chính.
3. Nhánh URL OpenRouter kiểm bằng substring bỏ qua quyết định của resolver; khóa AgentRouter/DeepSeek chưa tách hoàn toàn.
4. Typecheck không bao gồm tests/config; E2E toàn bộ còn lỗi; harness startup dùng deadline ngắn, cổng cố định và có thể để lại tiến trình.

Đợt sửa trực tiếp chia quyền sở hữu theo storage, security, API/UI, âm thanh/viết tay, kiểm thử trình duyệt và tooling. Review độc lập và tích hợp cuối do Codex điều phối. Không coi số agent hoặc lời xác nhận của agent là bằng chứng hoàn tất.

## Phạm vi và tiêu chí chấp nhận

| Phần | Điều kiện cần kiểm chứng | Trạng thái cổng cuối |
|---|---|---|
| Storage | Mọi lần báo lưu thành công phải đọc lại được; vượt ngưỡng phải từ chối rõ; backup thất bại phải giữ bản gốc; không làm mất backup cũ | PASS |
| Provider/key | Không có nhánh bỏ qua resolver; khóa của từng provider không chuyển chéo; chỉ dùng sentinel và upstream giả trong test | PASS |
| API/UI | Giữ đầy đủ lỗi và hủy yêu cầu; thống kê từ điển đúng hợp đồng; không giả kết quả thành công | PASS |
| Âm thanh/viết tay | Không kẹt trạng thái khi lỗi/hủy; kiểm thử thực thi đường hành vi liên quan | PASS |
| Tooling | Typecheck strict bao gồm tests/config; production build mới; server test được dọn sạch | PASS |
| Trình duyệt | Chạy toàn bộ dev và production trên desktop/mobile, phân biệt skip live AI với lỗi | PASS |

## Những thay đổi thực tế

- **Lưu trữ và phục hồi:** export/save dùng cùng hợp đồng dung lượng và cấu trúc với import; từ chối trước khi ghi nếu dữ liệu không thể đọc lại. Backup phải giữ đúng chuỗi gốc, đọc lại xác nhận được và không ghi đè backup khác đã tồn tại. App dừng autosave sau lỗi đọc cho tới khi người dùng chủ động phục hồi thành công. Import chỉ cập nhật registry sau khi lưu thành công; lỗi quota giữ nguyên dữ liệu và registry. Reset và export báo lỗi rõ ràng khi thao tác không thành công. Giới hạn JSON tính theo số ký tự, nên backup Unicode trên 2 MB vẫn hợp lệ nếu nằm trong giới hạn ký tự.
- **Khóa AI:** bỏ hẳn nhánh `includes('openrouter.ai')` vượt qua resolver. Khóa chung chỉ dùng cho origin/provider đã được cấu hình và xác thực; DeepSeek trực tiếp chỉ dùng khóa riêng, không lấy khóa AgentRouter. Các ca đối nghịch kiểm tra cả việc không có request outbound và các đích/header được phép bằng khóa sentinel.
- **Viết tay và phát âm:** kết quả nhận dạng mang nguồn online/local để UI ghi đúng trạng thái fallback; đóng modal, undo và clear hủy request và chặn kết quả cũ. Speech cập nhật trạng thái kết thúc khi hủy/chuyển phát âm dù trình duyệt không phát sự kiện cancel, đồng thời bỏ qua sự kiện muộn của lượt cũ.
- **Đo F0:** bỏ đường cong giọng người dùng và kết luận khớp thanh điệu được tạo từ một giá trị Hz. UI chỉ hiển thị F0 đo được, đường mẫu mô phỏng và giới hạn chưa đánh giá độ khớp; giữ bộ đếm lượt ghi âm độc lập. Ca waveform 220 Hz đã thất bại trên hành vi cũ ở cả desktop/mobile (`f0-red.log`) trước khi sửa.
- **Kiểm thử và công cụ:** typecheck strict bao gồm tests/config. Harness dùng entry Node trực tiếp, cổng động, HTTP health và cleanup tiến trình sở hữu. E2E production build mới trước khi chạy. Sửa selector theo tên truy cập thật và helper điều hướng responsive; ca corpus đối chiếu `乾杯` với dữ liệu HTTP và corpus thật (`cv_4423`). Không bỏ các assertion lưu lại ID/metadata hoặc persistence sau reload.

## Kết quả đã chạy trong phạm vi tooling

`npx vitest run --configLoader runner --maxWorkers=1 tests/tooling/production-harness.test.ts tests/acceptance/production-package.test.ts`: **9/9 PASS**, exit 0. Đây là kiểm tra tập trung trước cổng toàn bộ, không phải kết quả toàn dự án.

Test harness được viết trước khi sửa: bản cũ thất bại ở 2/3 ca, tái hiện việc đọc banner trước khi HTTP sẵn sàng và lỗi cleanup/timeout. Sau sửa 3/3 đạt. Harness chạy entry Node trực tiếp, đợi `/api/health` trả JSON thành công, chọn cổng động và dọn tiến trình sở hữu khi kết thúc hoặc startup thất bại.

Acceptance startup chỉ loại `node_modules/.bin` khỏi PATH: **đây là smoke test, không chứng minh dependencies phát triển đã bị gỡ**. Kiểm tra cài sạch `npm ci --omit=dev` thuộc cổng riêng bên dưới.

## Cổng toàn bộ trên cùng phiên bản mã

Source/test: **`fcc2b23`**; `source-manifest.json` lưu SHA256 của 83 tệp source/config/test được theo dõi để đối chiếu snapshot. Log được lưu trong `Vault/project/reviews/2026-10-22-zhongxue-direct-fix/`. Cả hai lượt trình duyệt và lượt typecheck/lint/unit/coverage xác nhận cuối đều đã đạt; `final-gate-exits.json` ghi exit 0 cho ba cổng xác nhận cuối.

| Cổng | Kết quả | Bằng chứng |
|---|---|---|
| Typecheck strict: src/server/tests/config | **PASS**, exit 0 | `typecheck-verified.log` |
| Lint | **PASS**, exit 0 | `lint-verified.log` |
| Build client + server | **PASS**; có cảnh báo bundle khoảng 556 kB, không có lỗi build | `build.log` |
| Toàn bộ unit/integration/acceptance | **547/547 PASS**, 18 tệp, exit 0 ở lượt xác nhận cuối | `coverage-verified.log` |
| Coverage và thresholds | PASS: **87,29% lines/statements, 84,71% branches, 95,85% functions** | `coverage-verified.log`; scope `src/domain/**`, `src/services/**`, `server/**`; không phải toàn bộ UI |
| E2E storage tập trung, desktop/mobile | **12/12 PASS** sau sửa điều hướng | `e2e-storage-final.log` |
| E2E dev đầy đủ, desktop/mobile | **144 passed, 0 failed, 2 skipped**, exit 0, 3,8 phút; hai skip là live AI cần bật riêng | `e2e-dev-verified.log` |
| E2E production đầy đủ, build mới, desktop/mobile | **144 passed, 0 failed, 2 skipped**, exit 0, 3,3 phút; build mới gồm TypeScript, cổng riêng 3018; hai skip là live AI cần bật riêng | `e2e-prod-verified.log` |
| Cài production sạch và boot thật | **PASS**, thực hiện `npm ci --omit=dev --offline`, 4 gói runtime; HTTP health/từ điển/HTML/404 đạt | `production-clean-install/verification.md`, `install-confirmed.log`, `probe-result.json`, `artifact-hash-comparison.json` trong cùng thư mục staging |
| Review diff và kiểm tra secrets | **PASS trong phạm vi diff `9249505..fcc2b23`**, không phát hiện lỗi chặn; review không thay kết quả chạy test | `independent-review.md` |

Không gọi READY khi cổng bắt buộc chưa đạt. Nếu có lỗi còn lại, ghi trigger, ảnh hưởng và cách tái hiện; không hạ assertion, bỏ test hoặc lấy một tập E2E đã chọn làm đại diện toàn bộ.

`final-snapshot-and-cleanup.json` xác nhận 83 hash source/config/test giữ nguyên trong quá trình chạy; chín artifact production sạch vẫn trùng sau lượt production build mới; không còn tiến trình lắng nghe tại hai cổng test 4173/3018. Các commit tài liệu sau `fcc2b23` không thay đổi snapshot mã đã kiểm chứng.

Lượt dev trước `fcc2b23` có **142 passed, 2 failed, 2 skipped** (`e2e-dev-final.log`). Hai lỗi đều dừng ở selector tên nút `Từ điển` khớp tuyệt đối trong test 600 từ; trace xác nhận chưa tới bước render danh sách hoặc so sánh metadata. `fcc2b23` dùng helper điều hướng desktop/mobile và bổ sung kiểm tra đủ 600 thẻ, giữ toàn bộ so sánh ID/metadata và hồ sơ sau reload. Lượt này là lịch sử tái hiện lỗi test, không được ghi thành một lượt toàn bộ đạt.

Clean production được kiểm tra ở thư mục staging không có `.env`; chín tệp artifact/dữ liệu có SHA256 trùng bản build hiện tại. Server Node dùng cổng loopback do hệ điều hành cấp, khóa provider bị để trống và chặn outbound bên ngoài. Health trả **122.596** mục từ; verifier chờ tiến trình con do mình tạo kết thúc. Cài offline chứng minh cache và runtime tại máy này, không xác nhận kết nối npm registry trên máy mới.

Coverage trên là tổng hợp: không có nghĩa mỗi tệp đều đạt 80%. `server/index.ts` có 0% trong phép đo Vitest do server được chạy bằng tiến trình ngoài; `server/app.ts` khoảng 44,7% lines. Cổng production HTTP/Chromium và clean install cung cấp bằng chứng hành vi riêng, không biến các dòng đó thành coverage đã đo.

## Giới hạn kiểm chứng

Không gọi upstream AI có phí bằng khóa thật. Kiểm thử Chromium và API giả không xác nhận chất lượng câu trả lời AI thực tế, micro/loa vật lý hay dịch vụ bên ngoài. Chưa push, deploy hoặc merge trong phạm vi sửa này.
