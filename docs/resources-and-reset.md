# Tài nguyên và reset Wordgarden

## Đo ngày 20/11/2026

Đây là số đo khi ứng dụng đang nhàn rỗi, không phải giới hạn tối đa:

| Thành phần | RAM | CPU |
| --- | --- | --- |
| Web | 120,2 MiB | 0,00% |
| PostgreSQL | 45,6 MiB | 0,00% |
| Tổng hai container đang chạy | 165,8 MiB | gần 0% |

RAM trên chưa gồm Docker Desktop/WSL, trình duyệt và bộ nhớ đệm của hệ điều hành. Build dùng nhiều CPU/RAM hơn lúc chạy. Tab đang hiển thị tải lại dữ liệu mỗi 30 giây; tab ẩn bỏ qua việc này. Đóng tab không dừng Docker; chạy `docker compose stop` để dừng ứng dụng và database mà vẫn giữ dữ liệu.

| Dung lượng | Số đo |
| --- | --- |
| Thư mục mã nguồn, thư viện và build trên Windows | khoảng 898 MiB |
| `node_modules` | khoảng 700 MiB |
| `.next` | khoảng 197 MiB |
| Database logic | khoảng 7,7 MiB (1 từ tại thời điểm đo) |
| Thư mục PostgreSQL, gồm WAL và tệp hệ thống | khoảng 46,4 MiB |
| Image `wordgarden-web` | 522 MB |
| Image `wordgarden-migrate` (môi trường build) | 1,97 GB |
| Image `postgres:17-alpine` | 424 MB, có thể dùng chung |
| Docker build cache của toàn máy | 7,799 GB; Docker báo 4,73 GB có thể thu hồi |

Image dùng chung layer nên không cộng các số trên để suy ra dung lượng đĩa thực tế. Build cache là của toàn máy, gồm các dự án khác. Tệp đĩa ảo Docker/WSL có thể không tự nhỏ lại khi xóa dữ liệu bên trong. Không tự xóa cache toàn Docker hoặc tác động các dự án khác.

Đo lại bằng `docker stats --no-stream`, `docker system df` và `docker compose exec -T db psql -U wordgarden -d wordgarden -c "SELECT pg_size_pretty(pg_database_size(current_database()));"`.

## Reset trong ứng dụng

Vào **Thiết lập & hướng dẫn → Reset toàn bộ dữ liệu**, nhập `RESET WORDGARDEN`, rồi chọn **Xóa vĩnh viễn**. Thao tác xóa tài khoản dữ liệu hiện tại cùng từ, nội dung, thư mục và lịch ôn qua cascade trong database; không ảnh hưởng tài khoản khác. Lần mở tiếp theo tạo lại không gian mặc định với ID mới; token extension cũ không dùng được. Đóng các tab Wordgarden khác trước khi reset để tránh ghi thêm trong lúc xóa.

App không lưu tệp nhập, PDF, CSV hay JSON xuất trên server: tệp nhập được đọc để đưa dữ liệu vào database, tệp xuất được gửi trực tiếp cho trình duyệt, trang in được tạo trong tab. Reset dữ liệu không gỡ ứng dụng hoặc giải phóng thư viện/image. PostgreSQL có thể giữ vùng đã dùng để tái sử dụng; đây không phải xóa an toàn dữ liệu vật lý.

## Dừng, dọn cache hoặc xóa toàn bộ bản local

Chạy PowerShell từ thư mục dự án:

```powershell
# Dừng CPU/RAM của hai dịch vụ, giữ dữ liệu
.\scripts\cleanup.ps1 -Action Stop

# Xem trước việc dọn cache/build; không xóa gì
.\scripts\cleanup.ps1 -Action Clean -WhatIf

# Chỉ xóa .next, tsconfig.tsbuildinfo, test-results
.\scripts\cleanup.ps1 -Action Clean

# Xem trước reset toàn bộ bản local; không xóa gì
.\scripts\cleanup.ps1 -Action Reset -WhatIf

# Xóa database Docker, container, image riêng do Compose tạo,
# backups trong dự án, node_modules và build; yêu cầu nhập RESET WORDGARDEN
.\scripts\cleanup.ps1 -Action Reset

# Tạo lại ứng dụng sạch
docker compose up -d --build
```

`Clean` phù hợp khi chạy bản Docker; dừng dev server trên máy trước khi xóa `.next`. `Reset` giữ mã nguồn, tài liệu, cấu hình `.env`, image PostgreSQL dùng chung và build cache dùng chung. Nếu dùng database bên ngoài qua `DATABASE_URL`, script không xóa database bên ngoài đó. Database dev riêng và bản sao lưu đã chuyển ra ngoài cũng cần dọn riêng.

Script chỉ dùng danh sách đường dẫn cố định bên trong dự án, kiểm tra đường dẫn và từ chối đích hoặc thư mục cha là junction/symlink. Với liên kết bên trong thư mục build, chỉ xóa liên kết, không đi vào thư mục đích. Không dùng `docker system prune` hoặc quét/xóa thư mục Downloads.

## Các tệp và dữ liệu cần dọn riêng

- Trong popup extension chọn **Xóa dữ liệu extension…** để xóa token, thư mục mặc định, kết quả gần nhất và từ chờ thử lại; đồng thời hủy script tự bật trên website. Tải lại các trang đang mở để gỡ nút đã chèn. Có thể gỡ extension khỏi Chrome/Edge để xóa cả cài đặt và quyền.
- Xóa JSON/CSV/PDF và SQL đã xuất hoặc sao chép ra Downloads, thư mục khác, ổ đĩa khác hay cloud. Chỉ xóa các tệp bạn nhận ra là của Wordgarden.
- Nếu cần xóa cache/cookie của trang, dùng phần dữ liệu website của trình duyệt cho `http://localhost:3080`. App hiện không lưu thư viện trong localStorage/IndexedDB hoặc cài service worker offline.

Log Docker được giới hạn 5 MB × 2 tệp cho mỗi dịch vụ, tránh log tăng vô hạn. Không tự sinh bản sao lưu theo lịch.
