# Roadmap & Issue Tracking

Theo dõi tiến độ các issue đã verify + breakdown. Tick `[x]` khi hoàn thành.
Repo: <https://github.com/gnust-company/project-monitoring>

> Cập nhật lần cuối: 2026-06-18

## Quyết định nền tảng (đã chốt)
- **Phân quyền PIC** ([#11](https://github.com/gnust-company/project-monitoring/issues/11)): bỏ hẳn cơ chế approve `change_requests`. PIC = người tạo (project đổi PIC được trong detail; phase PIC = creator). Chỉ PIC sửa/xóa **metadata** project/phase. Checklist & outcome thì người khác vẫn note được + hiện log.
- **Bỏ ngày kết thúc dự án** ([#20](https://github.com/gnust-company/project-monitoring/issues/20)): kéo theo redesign `computeProjectStatus` + dashboard deadline (chuyển deadline sang dựa phase `endDate`).

---

## Tiến độ tổng quan

| Wave | Issue | Trạng thái |
|---|---|---|
| 1 | #4, #6, #16, #19, #17(phần bỏ viết tắt) | ✅ Xong (#17 phần "cho sửa" còn ở Wave 3) |
| 2 | #5, #11, #13, #20 | ✅ Xong |
| 3 | #10, #9, #8, #12, #17 | ⬜ Chưa bắt đầu |
| 4 | #14, #18, #15 | ⬜ Chưa bắt đầu |

Chú thích: ⬜ chưa bắt đầu · 🟡 đang làm · ✅ xong

---

## Wave 1 — Quick wins (không đụng schema)

- [x] [#4 — Đăng ký người dùng (fix "Email đã được đăng ký")](https://github.com/gnust-company/project-monitoring/issues/4)
  - Root cause: `auth.register` lưu token OK rồi `afterAuth → orgsApi.list()` lỗi ném ngược làm UI kẹt ở form; bấm lại → email đã tồn tại.
  - Tách `afterAuth` khỏi transaction đăng ký · try/catch riêng · thêm `finally setLoading(false)` · phòng vệ 409 → auto login.
- [x] [#6 — View Pipeline bất đồng bộ (sidebar tick full)](https://github.com/gnust-company/project-monitoring/issues/6)
  - Sidebar tick theo tập hiển thị hiệu dụng (`statusFilter` ∩ `selectedProjectIds`); nút "Tất cả" reset cả hai.
- [x] [#16 — Dashboard: Phân bổ Phase viết đầy đủ tên](https://github.com/gnust-company/project-monitoring/issues/16)
  - Bổ sung tên đầy đủ vào `PHASE_META`, hiển thị "MÃ — Tên đầy đủ".
- [x] [#19 — Phase detail modal: click ngoài không đóng](https://github.com/gnust-company/project-monitoring/issues/19)
  - Bỏ `onClick={closePhaseDetail}` ở backdrop; cân nhắc bỏ Esc-to-close.
- [x] [#17 — Cho sửa Phase Type + bỏ viết tắt](https://github.com/gnust-company/project-monitoring/issues/17) *(chỉ phần bỏ viết tắt ở Wave 1; phần cho sửa thuộc Wave 3)*

## Wave 2 — Backend nền tảng

- [x] [#5 — Giới hạn Domain Email (allowlist)](https://github.com/gnust-company/project-monitoring/issues/5)
  - Setting `allowed_email_domains` (CSV, env-only); chặn ở `/auth/register` (422), KHÔNG chặn `/auth/setup`. List rỗng = không giới hạn.
- [x] [#11 — Phân quyền theo PIC, bỏ approval queue](https://github.com/gnust-company/project-monitoring/issues/11) ⚠️ *breaking change*
  - Thêm `Project.pic_user_id` (migration additive); viết lại `authz.py` (`can_edit_project`/`can_edit_phase`); deprecate `change_requests` (giữ bảng, FE gỡ UI duyệt); endpoint `PATCH /projects/{id}/pic`; gate edit phase metadata theo PIC; cập nhật docs.
- [x] [#13 — Bỏ assignee, creator là PIC, participant chỉ là note](https://github.com/gnust-company/project-monitoring/issues/13)
  - `assignee` nullable (cùng migration); bỏ dropdown assignee ở Phase/Create modal; PIC phase = `createdBy`.
- [x] [#20 — Bỏ ngày kết thúc dự án + redesign status](https://github.com/gnust-company/project-monitoring/issues/20) ⚠️ *ảnh hưởng rộng*
  - `target_date` nullable (cùng migration); redesign `computeProjectStatus` (Delayed/At Risk/On Track theo phase); dashboard "đến hạn"/"Deadline" + ProjectDetail dựa phase `endDate`; CreateProject chọn `startDate`, bỏ `targetDate`.

## Wave 3 — Phụ thuộc Wave 2

- [ ] [#10 — Cải tổ Team View (PIC, bỏ workload, email thật)](https://github.com/gnust-company/project-monitoring/issues/10) *(phụ thuộc #11)*
  - Bỏ email bịa `@projecthub.io`; "đang tham gia" → dự án làm PIC chính; bỏ workload → tổng task mở/assign; rút gọn ở mức phase; thêm tiến độ dự án PIC.
- [ ] [#9 — Outcome bắt buộc có document/link mới mark done](https://github.com/gnust-company/project-monitoring/issues/9) *(tiền đề cho #8)*
  - Gắn attachment/link theo outcome item (migration); checkbox done disabled khi chưa có attachment.
- [ ] [#8 — Tiến độ phase tính cả Outcome](https://github.com/gnust-company/project-monitoring/issues/8) *(làm sau #9)*
  - `phaseBlockProgress` gộp checklist + outcomes; đồng bộ FE/BE.
- [ ] [#12 — Xem & sửa participants sau khi tạo phase](https://github.com/gnust-company/project-monitoring/issues/12)
  - UI add/remove participants trong PhaseDetailModal + log; quyền theo PIC.
- [ ] [#17 — Cho sửa Phase Type](https://github.com/gnust-company/project-monitoring/issues/17) *(phần cho sửa; phụ thuộc #16, #14, #11)*

## Wave 4 — UX staged-save

- [ ] [#14 — Nút Save cho mọi edit + lý do & log khi xóa](https://github.com/gnust-company/project-monitoring/issues/14)
  - Edit metadata → draft + Save; xóa cần lý do; log vào thành phần cha (phase→project, project→workspace).
- [ ] [#18 — View mode: kéo-thả cần Save mới áp dụng](https://github.com/gnust-company/project-monitoring/issues/18) *(dùng chung cơ chế staged-save với #14)*
  - Kéo/resize/tạo phase là draft; thanh "N thay đổi chưa lưu — Lưu / Hủy".
- [ ] [#15 — Pipeline: filter theo người & theo khoảng thời gian](https://github.com/gnust-company/project-monitoring/issues/15)
  - Nút "Chỉ dự án tôi tham gia"; filter time range, ẩn hàng trống ngoài range.

---

## Phụ thuộc chéo quan trọng
- **PIC** ([#11](https://github.com/gnust-company/project-monitoring/issues/11)) là nền cho [#10](https://github.com/gnust-company/project-monitoring/issues/10), [#13](https://github.com/gnust-company/project-monitoring/issues/13), [#12](https://github.com/gnust-company/project-monitoring/issues/12), [#17](https://github.com/gnust-company/project-monitoring/issues/17).
- **Bỏ targetDate** ([#20](https://github.com/gnust-company/project-monitoring/issues/20)) phá `computeProjectStatus` + dashboard "đến hạn 7 ngày" / "Deadline sắp tới".
- **Outcome** ([#9](https://github.com/gnust-company/project-monitoring/issues/9)) đổi schema → làm trước [#8](https://github.com/gnust-company/project-monitoring/issues/8).
- **Staged-save** dùng chung giữa [#14](https://github.com/gnust-company/project-monitoring/issues/14) và [#18](https://github.com/gnust-company/project-monitoring/issues/18).

## Liên kết
- Epic: [#7 — Listing Issue, góp ý từ user (#8–#20)](https://github.com/gnust-company/project-monitoring/issues/7)
- Tổng hợp: [#3 — Tổng hợp Issue](https://github.com/gnust-company/project-monitoring/issues/3)
