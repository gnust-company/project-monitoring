# ProjectHub — UX Design Reference

> Thiết kế từ góc nhìn USER, không phải từ góc nhìn CODE.
> Mỗi screen phải trả lời: **User cần gì ở đây? Họ muốn làm gì tiếp theo?**

> **Phạm vi tài liệu**: đây là tài liệu **nguyên tắc thiết kế** — mô tả mục đích và quy tắc UX của từng màn hình, không tracking trạng thái implement. Tính năng còn thiếu / cải tiến đề xuất → tạo **GitHub Issue**, không liệt kê ở đây (tránh outdated).

---

## 1. Landing Page

**Job duy nhất**: thuyết phục visitor rằng ProjectHub giải quyết đúng vấn đề của họ. Target: PM/Team Lead đau đầu vì quản lý nhiều dự án mà không thấy big picture.

Thứ tự scroll chuẩn: Hero (headline pain-point + CTA + screenshot thật) → Pain points → Giải pháp (feature blocks có visual) → 7 Phase Process diagram → How it Works (3 bước) → Social proof → Final CTA.

Quy tắc: hero visual phải là screenshot thật của Pipeline; luôn có 2 CTA (primary "Dùng thử" + secondary "Xem demo").

## 2. Login

**Xác thực nhanh nhất có thể** — không phải marketing page. Layout 2 panel: branding trái, form phải. Phải có: error state inline khi sai credential, link đăng ký, quên mật khẩu (SSO là nice-to-have).

## 3. Workspace Selector

User thuộc nhiều tổ chức → chọn đúng workspace trước khi vào app. Card grid, mỗi card: initial + tên + số members/projects. Luôn có nút tạo workspace mới. Khi >5 workspace cần search + sort theo recent.

## 4. Workspace Shell (Sidebar + Header)

Shell là "nhà" của user — 90% thời gian ở đây.

**Sidebar**: active state rõ ràng; nhóm section (Workspace nav / Dự án / User); project list là shortcut + filter cho Pipeline; user info ở đáy; thu gọn được về icon-rail (toggle đặt ở đáy, vị trí đồng nhất giữa 2 trạng thái).

**Header**: breadcrumb cho biết đang ở đâu; notification + avatar dropdown bên phải.

## 5. Dashboard

**Bức tranh toàn cảnh** — mở app lên là biết: dự án nào OK/cần cứu, deadline nào sắp tới, phase nào bottleneck.

Cấu trúc: stat cards (tổng / On Track / At Risk / Delayed) → deadline sắp tới (color-code theo độ gấp: đỏ <3 ngày, vàng <7) → activity feed → project cards (progress + phase hiện tại + status, click mở chi tiết) → phase distribution.

Quy tắc: stat phải có context, không chỉ con số; mọi card clickable đến detail tương ứng.

## 6. Pipeline Timeline

**Trái tim của ProjectHub** — nơi user spend 80% thời gian. Nguyên tắc: mọi thứ visual, mọi thứ kéo-thả được, user luôn cảm thấy "control".

Quy tắc tương tác đã chốt qua quá trình build:
- **2 chế độ board**: *Xem* (kéo = pan lịch) và *Tạo phase* (kéo ngang trên hàng dự án = vẽ phase mới, dự án + ngày tự điền) — tách bạch để pan không xung đột với tạo.
- **Kéo block** = di chuyển lịch; **kéo 2 mép** = resize. Block bị va chạm **xuống dòng mới tinh**, tuyệt đối không tự dịch ngang làm lệch lịch của block khác.
- **Tooltip** bám con trỏ, luôn nổi trên mọi khung, tự kẹp trong viewport (sát mép thì lật vào trong). Tên phase giữ tiếng Anh.
- **Progress trên block** = % checklist hoàn thành.
- **Legend** chú thích 7 phase luôn hiển thị (góc dưới-phải).
- Click tên dự án (panel trái) → Project Detail Modal.

## 7. Team View

Xem **ai đang làm gì** — không chỉ danh sách. Mỗi member card: avatar + tên + role (label tiếng Việt) + dự án/phase đang tham gia + workload.

## 8. Modals

Quy tắc chung: modal tạo/detail của **dự án** mở giữa màn hình; detail của **phase** trượt từ phải (panel rộng `max-w-2xl`). Esc / click nền để đóng. Xóa luôn xác nhận 2 bước, không dùng `alert()`.

- **Phase Detail**: tag trạng thái, sửa inline, checklist & outcomes nhóm theo role (mặc định thu gọn), Document (file + link), comments, activity.
- **Create Phase**: checklist/outcomes tự sinh từ nguồn theo loại phase × role, sửa được trước khi tạo; khi mở từ kéo-thả thì khóa dự án và prefill ngày.
- **Project Detail**: sửa inline tên/mô tả/status/ngày/tiến độ; stats nhanh; xóa cascade phase blocks.

## 9. Visual Consistency Rules

1. **User presence** — avatar hiển thị ở ít nhất 2 chỗ (header + sidebar)
2. Click project ở sidebar → filter Pipeline; click project ở nơi khác → mở detail
3. Mọi card clickable → navigate đến detail tương ứng
4. Mọi list phải có empty state — không bao giờ show blank space
5. Mọi form validate inline — không dùng `alert()`
6. Labels tiếng Việt, technical terms (Phase, Pipeline, Dashboard) giữ tiếng Anh
