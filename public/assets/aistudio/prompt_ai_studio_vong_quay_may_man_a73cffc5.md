# Prompt Tạo Web Vòng Quay May Mắn & Trao Thưởng (Google AI Studio)

Dưới đây là bản **Mega-Prompt hoàn chỉnh** được thiết kế tối ưu cho **Google AI Studio** (hỗ trợ cả chế độ *Build Web App* hoặc xuất *Single-File HTML/CSS/JS* chạy trực tiếp ngay trên trình duyệt). Bạn chỉ cần sao chép toàn bộ nội dung trong khối dưới đây và dán vào AI Studio.

---

## Nội dung Prompt (Sao chép toàn bộ phần bên dưới)

### 1. Vai trò & Mục tiêu (Role & Objective)
Bạn là một **Senior Frontend Architect & Creative UI/UX Developer**. Hãy viết code hoàn chỉnh từ A-Z (không viết tắt, không để lại comment `// TODO`) cho một ứng dụng web **"Vòng Quay May Mắn & Trao Thưởng Sự Kiện (Lucky Wheel & Prize Award Studio)"**.
- **Mục tiêu cốt lõi:** Quay vòng quay có danh sách người tham gia; kim dừng ở người nào thì người đó trúng giải thưởng đang chọn, hiển thị màn hình vinh danh hoành tráng, lưu vào bảng vàng trao thưởng và quản lý danh sách/giải thưởng chặt chẽ.
- **Định dạng đầu ra:** Một file `index.html` duy nhất (Single-File Web Application) tích hợp đầy đủ HTML5, CSS3 (Tailwind CSS CDN), và Vanilla JavaScript (ES6+), chạy mượt mà ngay lập tức mà không cần cài đặt môi trường hay tài nguyên âm thanh bên ngoài.

---

### 2. Ngôn ngữ Thiết kế & Giao diện (UI/UX Design System)
- **Phong cách chủ đạo:** Modern Cyber-Glass / iOS Glassmorphism kết hợp không khí lễ hội – sự kiện sang trọng (`backdrop-filter: blur(16px)`, viền sáng tinh tế, đổ bóng sâu).
- **Chủ đề màu sắc (Theme Switcher):** Hỗ trợ chuyển đổi mượt mà giữa 3 giao diện:
  1. *Cyber Dark (Mặc định):* Nền tối sâu (`#0B0F19`), điểm nhấn Neon Cyan & Gold rực rỡ.
  2. *Festival Gala (Đỏ - Vàng):* Tông đỏ rượu vang và vàng kim sang trọng cho sự kiện Year End Party / Tết.
  3. *Clean Light (Sáng hiện đại):* Tông trắng bạc tinh tế cho môi trường văn phòng/hội thảo.
- **Bố cục (Responsive Layout & Projector Mode):**
  - **Cột trái / Trung tâm (60% - 65% màn hình):** Khu vực sân khấu chính gồm Tiêu đề sự kiện (có thể click để sửa trực tiếp), Thanh chọn Giải thưởng đang quay, Vòng quay Canvas kích thước lớn độ nét cao (Retina/HiDPI), Nút **QUAY NGAY (SPIN)** ở tâm vòng quay, và thanh điều khiển nhanh (Bật/tắt âm thanh, Chế độ toàn màn hình Fullscreen cho máy chiếu, Tốc độ quay).
  - **Cột phải (35% - 40% màn hình - Có thể thu gọn khi trình chiếu):** Hệ thống Tab quản lý thông minh gồm 3 tab:
    - **Tab 1: Người tham gia** (Danh sách tên, thêm/sửa/xóa, nhập hàng loạt).
    - **Tab 2: Cơ cấu Giải thưởng** (Danh sách phần thưởng, số lượng giải còn lại).
    - **Tab 3: Bảng vàng Trúng thưởng** (Lịch sử người đã nhận thưởng, xuất file).

---

### 3. Yêu cầu Kỹ thuật Chi tiết cho từng Phân hệ (Core Modules)

#### Phân hệ 1: Vòng quay Vật lý HTML5 Canvas (Physics-Based Wheel Engine)
1. **Độ phân giải cao (HiDPI Canvas):** Tự động nhân tỷ lệ `window.devicePixelRatio` để chữ và nét vẽ trên vòng quay sắc nét tuyệt đối trên màn hình 2K/4K và máy chiếu.
2. **Thiết kế múi quay (Slices) & Typography thông minh:**
   - Tự động phối màu các múi quay hài hòa, bắt mắt và không bị trùng màu giữa 2 múi kề nhau (kể cả khi số lượng người lẻ).
   - Tự động điều chỉnh cỡ chữ (`font-size`) và cắt gọn thông minh nếu danh sách từ 2 người đến hơn 100 người. Chữ xoay hướng tâm rõ ràng, có viền/bóng nhẹ để dễ đọc trên mọi nền màu.
   - Viền ngoài vòng quay có dải đèn LED nhấp nháy (Chasing LED lights) tạo hiệu ứng sân khấu thực tế.
3. **Chuyển động Vật lý & Công bằng Ngẫu nhiên:**
   - Sử dụng `window.crypto.getRandomValues()` kết hợp thuật toán góc quay để đảm bảo kết quả ngẫu nhiên, minh bạch 100%.
   - Áp dụng hàm gia tốc giảm dần mượt mà (Cubic-Bezier / Quartic Ease-Out deceleration) kéo dài theo thời gian cấu hình (mặc định 6 giây, tùy chỉnh được từ 3s – 15s) tạo cảm giác hồi hộp đến giây cuối cùng khi kim nhích qua từng vạch.
   - **Hiệu ứng Kim chỉ (Pointer Physics):** Kim chỉ đặt ở vị trí 12 giờ (hoặc 3 giờ) có hiệu ứng bật nẩy cơ học mỗi khi đinh ghim (peg) giữa các múi quẹt qua.
   - Hỗ trợ phím tắt `Space` hoặc `Enter` để bắt đầu quay khi đang ở chế độ trình chiếu.

#### Phân hệ 2: Hệ thống Âm thanh Tổng hợp (Procedural Web Audio API)
- **Không dùng file MP3 ngoài (tránh lỗi link chết):** Viết bộ phát âm thanh trực tiếp bằng `Web Audio API` (`AudioContext`):
  - **Tiếng "Tạch... Tạch" (Tick Sound):** Phát ra mỗi khi ranh giới giữa 2 múi tên đi qua kim chỉ; tần số phát tự động nhanh ở đầu vòng quay và thưa dần khi vòng quay sắp dừng.
  - **Nhạc Chiến thắng (Fanfare / Ta-da Chord):** Chuỗi hợp âm Synthesizer tươi vui vang lên cùng lúc khi vòng quay dừng hẳn và mở bảng vinh danh.
  - Có nút Mute/Unmute âm thanh trực quan trên giao diện.

#### Phân hệ 3: Quản lý Cơ cấu Giải thưởng & Chế độ Trao thưởng (Prize & Award System)
1. **Danh sách Giải thưởng mặc định & Tùy chỉnh:**
   - Khởi tạo sẵn bộ giải thưởng mẫu (VD: *Giải Đặc Biệt - 1 giải*, *Giải Nhất - 1 giải*, *Giải Nhì - 2 giải*, *Giải Ba - 3 giải*, *Giải May Mắn - 5 giải* kèm mô tả phần thưởng/số tiền).
   - Cho phép người dùng **Thêm giải mới, Sửa tên giải, Sửa phần thưởng (VD: "1.000.000 VNĐ" hoặc "Tai nghe AirPods"), và Chỉnh số lượng giải**.
2. **Liên kết Giải thưởng với Lượt quay:**
   - Phía trên vòng quay có bộ chọn **"Đang quay cho giải: [Tên Giải Thưởng] (Còn X/Y giải)"**.
   - Khi một giải đã hết số lượng (`0/Y`), hệ thống tự động thông báo và gợi ý chuyển sang giải tiếp theo (hoặc cho phép quay thêm giải phụ).

#### Phân hệ 4: Quản lý Danh sách Người chơi (Participant Manager)
1. **Nhập liệu linh hoạt:**
   - Ô `Textarea` cho phép dán nhanh danh sách tên (mỗi người 1 dòng) từ Excel/Word/Zalo.
   - Nút **Nhập từ file CSV / TXT** đọc trực tiếp trên trình duyệt.
   - Nút **Tự động lọc trùng tên**, **Xáo trộn ngẫu nhiên (Shuffle)**, **Sắp xếp A-Z**, và **Khôi phục danh sách gốc**.
2. **Kiểm soát trạng thái từng người:**
   - Hiển thị tổng số người đang có trên vòng quay.
   - Cho phép tích chọn ẩn/hiện nhanh một cá nhân mà không cần xóa khỏi danh sách gốc.
   - Cài đặt tùy chọn Toggle: **"Tự động loại người vừa trúng khỏi các lượt quay tiếp theo"** (Mặc định: Bật).

#### Phân hệ 5: Màn hình Vinh danh & Xử lý Tình huống Sự kiện (Winner Modal & Confetti)
- Ngay khi vòng quay dừng lại:
  1. Bắn hiệu ứng pháo giấy / pháo hoa rực rỡ toàn màn hình (tích hợp thư viện `canvas-confetti` qua CDN hoặc Canvas Particle tự viết).
  2. Hiển thị **Popup Vinh Danh (Winner Celebration Card)** nổi bật giữa màn hình với:
     - Huy hiệu / Icon vương miện hoặc cúp vàng.
     - Tên Giải thưởng & Giá trị phần thưởng.
     - **Họ và Tên người trúng thưởng** cỡ chữ lớn, hiệu ứng phát sáng.
  3. **Hai nút xử lý thực tế cho MC / Người điều khiển sự kiện:**
     - **Nút 1: "✅ Xác nhận Trao thưởng"**: Ghi nhận người này vào *Bảng vàng Trúng thưởng*, trừ 1 suất của giải thưởng hiện tại, và tự động ẩn tên người này khỏi vòng quay (nếu đang bật chế độ loại người đã trúng).
     - **Nút 2: "🔄 Hủy & Quay lại (Vắng mặt)"**: Dùng khi gọi tên nhưng người trúng không có mặt tại sự kiện — không trừ số lượng giải thưởng, không ghi vào bảng vàng, và cho phép xóa (hoặc giữ) tên người đó rồi quay lại ngay.

#### Phân hệ 6: Bảng vàng Lịch sử & Lưu trữ Bền vững (History, LocalStorage & Export)
- **Lưu trữ tự động (`localStorage`):** Toàn bộ danh sách người chơi, cơ cấu giải thưởng, giao diện đã chọn và lịch sử trúng thưởng phải được lưu tự động vào `localStorage` để nếu trình duyệt bị tải lại (F5) giữa sự kiện thì không mất bất kỳ dữ liệu nào. Có nút **"Reset toàn bộ dữ liệu"** (kèm hộp thoại xác nhận chống bấm nhầm).
- **Bảng vàng Trúng thưởng:** Hiển thị danh sách những người đã trúng theo thứ tự thời gian (STT, Họ tên, Giải thưởng, Phần thưởng, Thời gian trúng, và nút Hoàn tác/Xóa nếu bấm nhầm).
- **Xuất báo cáo (Export):**
  - Nút **"📥 Xuất danh sách trúng thưởng (.CSV)"** có chèn mã UTF-8 BOM (`\uFEFF`) để mở bằng Microsoft Excel hiển thị chuẩn tiếng Việt có dấu 100%.
  - Nút **"📋 Sao chép kết quả"** để dán nhanh danh sách tổng kết người trúng thưởng vào nhóm chat Zalo/Teams/Email.

---

### 4. Yêu cầu Chất lượng Code (Code Quality Constraints)
- Viết toàn bộ trong **1 file HTML duy nhất** hoàn chỉnh, sử dụng Tailwind CSS, Google Fonts (`Plus Jakarta Sans` hoặc `Be Vietnam Pro` hỗ trợ tiếng Việt đẹp mắt), và Lucide Icons / FontAwesome CDN.
- Code sạch, chia hàm rõ ràng, xử lý tốt các trường hợp biên (Edge cases: danh sách chỉ còn 1 người, danh sách rỗng, tên người quá dài, bấm nút Quay liên tục khi vòng đang chạy).
- Khởi tạo sẵn dữ liệu mẫu (12 nhân sự mẫu và 4 hạng mục giải thưởng mẫu) để khi mở trang web lên là có thể bấm **QUAY NGAY** trải nghiệm đầy đủ tính năng ngay lập tức.
