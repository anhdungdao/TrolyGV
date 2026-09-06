# Web Quản Lý Thời Khoá Biểu & Giáo Án Cô Linh (Trợ Lý AI)

Ứng dụng web thông minh hỗ trợ giáo viên quản lý thời khoá biểu tuần, bài giảng và tích hợp lưu trữ tài liệu giáo án trên Google Drive.

---

## 🌟 Tính Năng Nổi Bật

### 1. Tab 1: Trợ Lý AI (Gemini) & Trích Xuất Lịch Tự Động Có Xác Nhận
- Tải lên ảnh chụp, file bảng tính Excel, PDF thời khoá biểu toàn trường hoặc tổ bộ môn.
- Gemini AI đọc file, tự động hỏi thêm thông tin còn thiếu (tên giáo viên, môn, khối lớp).
- **Thẻ xác nhận tương tác**: Sau khi trích xuất, AI hiển thị bảng xem trước kèm câu hỏi *"Em lên lịch cho cô như vậy đã đúng chưa ạ?"* với 2 nút:
  - `[✔ Xác nhận & Áp dụng sang Tab 2]`: Tự động lưu và chuyển sang Tab Thời khoá biểu.
  - `[💬 Chat để sửa]`: Giáo viên nhắn chỉnh sửa nhanh (vd: "Tiết 3 thứ 4 đổi sang lớp 10A2").

### 2. Tab 2: Thời Khoá Biểu Tuần & Chế Độ Xem Chi Tiết Tiết Học (Master-Detail)
- **Chế độ cả tuần (Full Week Grid)**: Lưới 6 ngày (Thứ 2 $\rightarrow$ Thứ 7), 10 tiết (Sáng 5 tiết, Chiều 5 tiết) với dải phân cách nghỉ trưa rõ ràng.
- **Chế độ chi tiết tương tác**: Bấm vào bất kỳ tiết nào, lịch sẽ **thu gọn sang sidebar bên trái** (danh sách tiết trong ngày), phần lớn màn hình bên phải mở rộng để **soạn tên bài, mục tiêu bài học, ghi chú** và quản lý tài liệu.
- **Lưu trữ phân cấp Năm học & Học kỳ**: Dữ liệu lưu có hệ thống theo từng năm học (vd: `2025-2026/HK1`).
- **Kho lưu trữ các kỳ cũ (Archive)**: Bấm nút `📁 Kho lưu trữ các kỳ cũ` để xem lại lịch các kỳ trước hoặc bấm `📋 Tái sử dụng` để sao chép toàn bộ giáo án sang kỳ mới chỉ với 1 click!

### 3. Tìm Kiếm Giáo Án Trực Tiếp Trong Google Drive
- Ô tìm kiếm ngay trong phần chi tiết bài giảng: Gõ từ khoá (vd: `van`, `slide`, `kiem tra`...) hệ thống tự động tìm kiếm các file Slide, Docs, Sheets, PDF trên Google Drive của giáo viên.
- Bấm `[+ Gán]` để đính kèm vào tiết học.
- Nút `[↗ Mở xem]` mở trực tiếp file trên Google Docs/Drive ở tab mới để xem và chỉnh sửa.
- Nút `[⬆ Tải file lên]` cho phép tải file giáo án trực tiếp từ máy tính lên.

---

## 🚀 Hướng Dẫn Khởi Chạy

### Cách 1: Click đúp vào file `run.bat`
Chỉ cần click đúp vào file **`run.bat`** tại thư mục gốc của dự án.

### Cách 2: Chạy bằng lệnh dòng lệnh
```bash
python main.py
```
- Truy cập website tại: **http://127.0.0.1:8000**
- Xem tài liệu API tự động (Swagger UI) tại: **http://127.0.0.1:8000/docs**

---

## 🎨 Hướng Dẫn Tùy Chỉnh Giao Diện Bằng Google AI Studio

Toàn bộ frontend được viết bằng **HTML5 chuẩn + CSS hiện đại + JavaScript ES Modules**, không dùng bundler phức tạp (Webpack/Vite/TSX). Điều này giúp bạn cực kỳ dễ dàng sao chép từng file và nhờ **Google AI Studio** sửa giao diện:

| File | Chức năng | Gợi ý prompt trên Google AI Studio |
| :--- | :--- | :--- |
| `static/index.html` | Khung sườn 2 Tab, Header, Modal | *"Thêm cho tôi một nút in thời khoá biểu ra file PDF ở góc trên"* |
| `static/css/style.css` | Màu sắc, giao diện, animation | *"Đổi tone màu chủ đạo từ xanh tím sang xanh lá pastel nhẹ nhàng"* |
| `static/js/tab1-chat.js` | Khung chat AI, Thẻ xác nhận TKB | *"Sửa nút Xác nhận có thêm hiệu ứng rung và âm thanh chúc mừng"* |
| `static/js/tab2-timetable.js` | Bảng TKB 10 tiết, Master-Detail | *"Cho phép kéo thả đổi tiết giữa các ô trong bảng"* |
| `static/js/drive-search.js` | Tìm kiếm và đính kèm Google Drive | *"Hiển thị thêm dung lượng file và người chỉnh sửa trong kết quả Drive"* |
| `static/js/archive.js` | Kho lưu trữ các kỳ cũ | *"Thêm chức năng lọc kỳ học theo năm"* |

---

## 📂 Cấu Trúc Mã Nguồn

```text
GiaoanCoLinh/
├── app/
│   ├── main.py                    # Khởi tạo FastAPI, CORS và serve static
│   ├── config.py                  # Đường dẫn thư mục và cài đặt mặc định
│   ├── models/schemas.py          # Khai báo cấu trúc dữ liệu Pydantic
│   ├── routers/
│   │   ├── chat.py                # API chat AI, upload file TKB
│   │   ├── timetable.py           # API CRUD thời khoá biểu, archive
│   │   ├── drive.py               # API tìm kiếm và gán file Drive
│   │   └── settings.py            # API lưu trữ API key
│   └── services/
│       ├── gemini_service.py      # Tích hợp Gemini 1.5/2.0 Flash
│       ├── drive_service.py       # Tích hợp Google Drive v3 API
│       └── storage_service.py     # Quản lý lưu trữ JSON local-first
├── static/                        # Giao diện Frontend (Dễ sửa trên AI Studio)
│   ├── index.html                 # Giao diện chính
│   ├── css/style.css              # Bảng màu, layout, animation
│   └── js/
│       ├── app.js                 # Điều hướng và State
│       ├── tab1-chat.js           # Xử lý chat và thẻ xác nhận
│       ├── tab2-timetable.js      # Lưới 10 tiết và hiệu ứng thu gọn
│       ├── drive-search.js        # Tìm kiếm Drive trực tiếp
│       ├── archive.js             # Kho lưu trữ kỳ cũ
│       └── settings.js            # Cài đặt API key
├── data/                          # Thư mục lưu trữ dữ liệu
│   └── timetables/
├── main.py                        # Điểm khởi chạy chính
├── run.bat                        # File khởi động 1-click trên Windows
└── requirements.txt               # Danh sách thư viện Python
```
