# ZhongXue — hệ thống thiết kế v1

Nguồn: dự án Stitch mới `2903986656935197250`, tài nguyên `3654364562696609871`. Không kế thừa mã nguồn hay thiết kế của ứng dụng cũ.

Tài nguyên Stitch đã được tải vào `.stitch/designs/`, cùng metadata nguồn tại `.stitch/metadata.json`:

| Màn hình | Stitch screen ID | HTML / ảnh tham chiếu |
|---|---|---|
| Dashboard desktop | `c99a66d06eac47f68d389f501cef8d4b` | `dashboard.html` / `dashboard.png` |
| Bài học gọi trà sữa mobile | `3cad9fa38ecf42b4b45d5b1ae13263a4` | `lesson-mobile.html` / `lesson-mobile.png` |

Ảnh giao diện triển khai tại `docs/desktop-preview.png` và `docs/mobile-preview.png` đã được điều phối xem trực tiếp; mobile không tràn ngang trong lượt kiểm tra này. Ảnh Stitch là thiết kế tham chiếu, ảnh trong `docs/` là bản ứng dụng chạy thực tế.

## Tinh thần

Một cuốn sổ học thân thiện, yên tĩnh: nền giấy ấm, màu xanh rừng cho hành động chính, đất nung cho điểm nhấn. Giao diện tiếng Việt giúp người mới học dễ hiểu, còn chữ Hoa phồn thể được dành đủ khoảng trống để đọc.

| Token | Giá trị | Vai trò |
|---|---|---|
| Paper | `#F6F4EC` | Nền chính |
| Forest | `#176B55` | Nút chính, tiến độ, mục đang chọn |
| Terracotta | `#C55B3D` | Nhấn mạnh, nhãn học tập |
| Display | Newsreader, serif | Tiêu đề có tính biên tập |
| Body | Be Vietnam Pro, sans-serif | Văn bản và điều khiển tiếng Việt |

Dùng font dự phòng hệ thống khi không tải được font ngoài. Chữ Hoa phải có font dự phòng hỗ trợ phồn thể.

## Bố cục và tương tác

Desktop dùng điều hướng bên trái và nội dung chính rộng, có bảng học tiếp, mục tiêu và bài học. Mobile chuyển sang điều hướng gọn và xếp nội dung thành một cột. Khoảng trắng và phân cấp chữ làm rõ bài tiếp theo cần học; không nhồi quá nhiều huy hiệu.

Điều khiển có nhãn rõ, vùng bấm đủ rộng và trạng thái focus nhìn thấy được. Trạng thái đúng/sai luôn có chữ giải thích, không chỉ dựa vào màu. Tôn trọng tùy chọn giảm chuyển động. Mọi trạng thái tiến độ, XP và lịch ôn phải phản ánh dữ liệu học thực tế.
