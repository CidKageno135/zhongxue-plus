# ZhongXue+ 智慧華語學習 App

Bản mẫu web theo báo cáo môn quản lý dự án. Bản gốc được giữ trong C:/Users/thanh/Desktop/project management/back-up.

## Chạy trên máy

Trên máy này, nhấp đúp **Chay_ZhongXue.cmd**. Nếu app đang chạy, file sẽ mở lại trang; nếu chưa, file sẽ khởi động app. Giữ cửa sổ chạy app mở trong lúc sử dụng.

Cần Node.js 22 trở lên. Chạy trong thư mục này:

```
npm install
npm run dev
```

Mở http://localhost:3001 . Trang chủ tự dùng tài khoản mẫu; có thể đăng ký tài khoản riêng để lưu tiến độ độc lập. Không cần cài PostgreSQL riêng: mặc định dùng PGlite, lưu tại .data/zhongxue_db. Không chạy hai phiên app cùng thư mục dữ liệu. Nếu dùng PostgreSQL riêng, tạo bảng trước bằng Drizzle và đặt DATABASE_URL trong .env.local; cấu hình drizzle.config.json phải trỏ đúng database của bạn.

## Đối chiếu với báo cáo

- 20 bài mẫu: A1 (1–10), A2 (11–20); từ mới, mẫu câu, pinyin, giải thích tiếng Việt.
- Luyện nói: giọng đọc zh-TW, nhận diện qua SpeechRecognition của trình duyệt, so sánh nội dung câu. Nhập tay được ghi riêng là luyện chữ. Không tuyên bố chấm thanh điệu hay điểm nói chính thức.
- Hội thoại AI: kết nối Chat Completions qua máy chủ. Khi chưa cấu hình API, chỉ dùng mẫu gợi ý cố định và ghi rõ chế độ mẫu.
- Tiến độ: lưu hoạt động theo người dùng, đơn vị hoàn thành và gợi ý bài chưa học. Không tạo lịch sử học giả.
- Giao diện phồn thể với chú thích tiếng Việt; bố cục dùng được trên máy tính và điện thoại.

Đây là bản mẫu web, chưa phải app iOS/Android được đóng gói và phát hành trên cửa hàng. 20 bài là nội dung minh họa, chưa được giáo viên Hoa ngữ ký duyệt; không coi là hoàn thành các tiêu chí nghiệm thu của báo cáo. Dữ liệu của tài khoản demo được dùng chung cho những người mở app không đăng nhập.

## Bật AI thật

Sao chép .env.example thành .env.local. Nhập AI_API_KEY của OpenRouter; mẫu cấu hình dùng AI_BASE_URL=https://openrouter.ai/api/v1 và AI_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free. AI_TIMEOUT_MS=90000 cho phép đợi tối đa 90 giây. Khởi động lại app sau khi đổi cấu hình. Khóa chỉ được đọc phía máy chủ và .env.local được bỏ qua bởi Git; không chia sẻ file này. Chưa có khóa: phần hội thoại dùng gợi ý mẫu. Khi dịch vụ lỗi hoặc đạt giới hạn, app báo lỗi và cho phép tự chọn chế độ mẫu; không tự đổi sang model trả phí.

OpenRouter: https://openrouter.ai/docs/api_reference/overview . Có thể dùng dịch vụ Chat Completions khác bằng cách đổi AI_BASE_URL, AI_MODEL và khóa tương ứng.

Tài liệu API: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
Nhận diện giọng nói: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

Nhận diện tùy trình duyệt và mạng. Cho phép mic khi bắt đầu, dùng localhost hoặc HTTPS. Nội dung nói có thể được dịch vụ của trình duyệt xử lý; app không lưu file ghi âm. Giọng đọc phụ thuộc giọng tiếng Trung cài trên máy.

## Kiểm tra

```
npm test
npm run test:coverage
npm run typecheck
npm run lint
npm run build
npm start
```

Kiểm thử AI dùng dịch vụ giả lập có kiểm soát, không gọi API tính phí. Các API gốc về từ vựng, SRS và quiz vẫn giữ để mở rộng sau; giao diện chính đi theo bốn chức năng của báo cáo.

## Cải thiện trải nghiệm học — 12/10/2026

- Mỗi bài có ba câu: chọn nghĩa, điền theo mẫu câu và ghép câu. Đúng cả ba mới hoàn thành bài; có giải thích từng câu. Điểm được tính lại phía máy chủ từ câu trả lời, không nhận điểm do trình duyệt tự gửi.
- Luyện nói/nhập tay: chỉ rõ chữ thiếu, thừa hoặc khác câu mẫu; có giọng đọc chậm. Chỉ số là độ giống văn bản, chưa đánh giá thanh điệu hay chất lượng âm thanh.
- Hội thoại lưu theo tài khoản, chủ đề và chế độ AI/mẫu; mỗi đoạn giữ tám lượt gần nhất, bộ chọn hiện mười đoạn gần đây. Nút Hội thoại mới giữ các đoạn cũ. Các cuộc trò chuyện trước khi tính năng lưu được thêm chỉ có số lượt trong tiến độ, không thể phục hồi nội dung chưa từng lưu.
- Câu trả lời AI được yêu cầu kèm pinyin/tiếng Việt và trình bày văn bản thường. Lỗi nội dung hoặc dịch vẫn có thể xảy ra; câu mẫu cố định ở Gợi ý trả lời đã có pinyin/tiếng Việt.
- Từ mới trong bài có liên kết tra từ. Trang /flashcards ôn tối đa100 từ lưu gần nhất; lật thẻ và kiểm tra nhanh khi có ít nhất hai nghĩa khác nhau. Kết quả thuộc lượt ôn hiện tại, không phải lịch ôn SRS dài hạn hay điểm thi.
- Trang đăng nhập/đăng ký không bị tài khoản mẫu chuyển hướng sai. Có đăng xuất và thông báo dữ liệu demo dùng chung. Menu đóng không nhận focus; mở bằng bàn phím và đóng bằng Escape được hỗ trợ.
- Lịch sử học phân trang30 bản ghi; tổng tiến độ được tính trên toàn bộ lịch sử tại database. Dữ liệu cũ được giữ qua việc thêm bảng mới.

## Giới hạn và vận hành

- AI:8 lượt/phút theo tài khoản và nhóm mạng;20 lượt/ngày cho tài khoản mẫu,100/ngày cho tài khoản cá nhân. Tổng toàn app mặc định50/ngày qua AI_DAILY_LIMIT. Đây là số lần thử của app, không phải số lượt còn lại trong OpenRouter; lỗi dịch vụ vẫn có thể tiêu thụ hạn mức. Ngày được tính theoUTC. Chế độ mẫu không tiêu thụ quota AI.
- Giới hạn được lưu trong database và cập nhật nguyên tử, không mất khi khởi động lại. Login tối đa5 lần thử/email và20 lần/nhóm mạng trong mỗi cửa sổ10 phút;register5 lần/nhóm mạng/giờ. Khi đạt giới hạn, trả429 với Retry-After. Mật khẩu mới tối thiểu8 ký tự,tối đa72 byteUTF-8; tài khoản cũ dùng mật khẩu ngắn vẫn đăng nhập được.
- Mặc định không tin x-forwarded-for; trên local các lượt được tính chung trong nhóm mạng local. Chỉ bật TRUST_PROXY=true khi proxy của bạn ghi đè header này. Khi triển khai, đặt APP_ORIGIN đúng miềnHTTPS và thiết lập proxy trước khi áp dụng quota theoIP. Đây là bản mẫu local, chưa triển khai public hay kiểm thử tải lớn.
- Mặc định dữ liệu ở .data/zhongxue_db; có thể đặt ZHONGXUE_DATA_DIR thành một thư mục riêng để tránh đồng bộ OneDrive hoặc chạy QA. Mỗi tiến trình cần một thư mục dữ liệu riêng. Không chia sẻ .env.local hoặc bản sao dữ liệu tài khoản.

Kiểm tra API riêng: chạy npm run build, rồi npm run qa:start trong một cửa sổ, npm run test:improvements-api trong cửa sổ khác. QA dùnglocalhost3002,database tạm và AI bị tắt. Kiểm thử unit/database cũng dùng database tạm. Đóng QA sau khi kiểm tra. Những kiểm tra này không gửi hội thoại tới dịch vụ AI thật.

Sao lưu local: tắt app trước,rồi npm run backup:data. Script từ chối khiport3001 đang chạy hoặc dùng DATABASE_URL ngoài máy; sao chép đầy đủ thư mục,kể cả các thư mục trống PostgreSQL, vào Desktop/project management/back-up. Khi khôi phục:tắt app,giữ một bản sao thư mục dữ liệu hiện tại,chép bản sao đã kiểm tra vào thư mục mới,và đặt ZHONGXUE_DATA_DIR trỏ đến bản khôi phục trước khi mở app. Không chép đè database đang chạy. Bản ZIP đã kiểm tra khôi phục ngày12/10/2026:ZhongXue_local_data_verified_20261012_144210.zip.


## Từ điển Trung–Việt (thêm 2026-10-12)

Mở http://localhost:3001/dictionary hoặc chọn 詞典 / Từ điển trong menu.

- 122.595 mục từ duy nhất từ CVDICT; tra phồn thể, giản thể, pinyin có/không dấu hoặc số thanh điệu, và nghĩa tiếng Việt có/không dấu. Có bộ lọc Chữ Hán/Pinyin/Tiếng Việt cho truy vấn mơ hồ.
- Nghe phát âm qua giọng đọc của trình duyệt; lựa chọn kiểu chữ hiển thị.
- Nghĩa nguồn giữ riêng với ghi chú trong bài học. Ví dụ chỉ hiện khi kho bài học có câu chứa từ đang xem; không tự tạo ví dụ giả cho toàn bộ dữ liệu.
- Từ đã lưu và lịch sử nằm trong cơ sở dữ liệu, tách theo tài khoản. Danh sách hiện100 từ lưu gần nhất và12 từ đã xem gần nhất; tìm kiếm hiện20 kết quả/trang, tối đa21 trang. Tra từ cụ thể hoặc chọn bộ lọc để thu hẹp kết quả rộng.
- Tìm kiếm/định nghĩa dùng dữ liệu đi kèm app, không cần khóa AI hay gọi Hanzii. Chưa có OCR, nhận diện chữ viết tay hoặc hoạt hình thứ tự nét.

Nguồn: CVDICT, Phong Phan, https://github.com/ph0ngp/CVDICT , CC BY-SA 4.0. Dựa trên CC-CEDICT. Revision c379d909e308343a247e51619f7839a2060a271c, dữ liệu ghi ngày2024-12-02. Bộ gốc có122.596 dòng hợp lệ; adapter gộp trùng cùng chữ/pinyin thành122.595 mục. Dữ liệu gốc giữ nguyên trong data/dictionary/CVDICT.u8.gz; attribution và giấy phép ở data/dictionary/NOTICE.md, metadata.json và chân trang giao diện. Giữ attribution/CC BY-SA khi chia sẻ dữ liệu hoặc bản sửa dữ liệu.

Tác giả nguồn công bố bản dịch có hỗ trợ AI nên có thể còn lỗi. Đây là nguồn tra cứu bổ sung, không thay thế việc giáo viên duyệt20 đơn vị học trong báo cáo. Báo cáo Word/PPT chưa được thay đổi bởi việc thêm từ điển.

Chạy thêm kiểm thử API khi server đang mở: npm run test:dictionary-api. Script chỉ dùng tài khoản QA mới trên localhost3001 để kiểm tra tìm kiếm/lưu từ/lịch sử/tách tài khoản; không in cookie hoặc dùng tài khoản thật.
