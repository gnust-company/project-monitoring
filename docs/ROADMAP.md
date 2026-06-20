# Roadmap & Issue Tracking

Theo dõi tiến độ các issue đã verify + breakdown. Tick `[x]` khi hoàn thành.
Repo: <https://github.com/gnust-company/project-monitoring>

> Cập nhật lần cuối: 2026-06-20

## Quyết định nền tảng (đã chốt)
- **Phân quyền PIC** ([#11](https://github.com/gnust-company/project-monitoring/issues/11)): bỏ hẳn cơ chế approve `change_requests`. PIC = người tạo (project đổi PIC được trong detail; phase PIC = creator). Chỉ PIC sửa/xóa **metadata** project/phase. Checklist & outcome thì người khác vẫn note được + hiện log.
- **Bỏ ngày kết thúc dự án** ([#20](https://github.com/gnust-company/project-monitoring/issues/20)): kéo theo redesign `computeProjectStatus` + dashboard deadline (chuyển deadline sang dựa phase `endDate`).

---

## Tiến độ tổng quan

| Wave | Issue | Trạng thái |
|---|---|---|
| 1 | #4, #6, #16, #19, #17(phần bỏ viết tắt) | ✅ Xong (#17 phần "cho sửa" còn ở Wave 3) |
| 2 | #5, #11, #13, #20 | ✅ Xong |
| 3 | #10, #9, #8, #12, #17 | ✅ Xong |
| 4 | #15, #25, #23, #14, #18 | ✅ Xong |
| 5 | #21, #22, #24, #26 | ⬜ Chưa bắt đầu (issue mới từ user) |

Chú thích: ⬜ chưa bắt đầu · 🟡 đang làm · ✅ xong

> **Trạng thái GitHub**: #8, #9, #10, #12, #14, #15, #17, #18, #23, #25 đã đóng (2026-06-20).
> Còn OPEN: Wave 5 (#21, #22, #24, #26).

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

- [x] [#10 — Cải tổ Team View (PIC, bỏ workload, email thật)](https://github.com/gnust-company/project-monitoring/issues/10) *(phụ thuộc #11)*
  - Bỏ email bịa `@projecthub.io`; "đang tham gia" → dự án làm PIC chính (`picUserId ?? createdBy`); bỏ workload → tổng task mở/assign; rút gọn ở mức phase; thêm tiến độ dự án PIC.
- [x] [#9 — Outcome bắt buộc có document/link mới mark done](https://github.com/gnust-company/project-monitoring/issues/9) *(tiền đề cho #8)*
  - Migration 0004 thêm `attachments.outcome_item_id` (FK → `phase_items`); BE chặn `done=true` nếu chưa có attachment (422); FE disabled checkbox + optimistic revert.
- [x] [#8 — Tiến độ phase tính cả Outcome](https://github.com/gnust-company/project-monitoring/issues/8) *(làm sau #9)*
  - `phaseBlockProgress` gộp checklist + outcomes; đồng bộ FE/BE (`progress_pct`).
- [x] [#12 — Xem & sửa participants sau khi tạo phase](https://github.com/gnust-company/project-monitoring/issues/12)
  - UI add/remove participants trong PhaseDetailModal + activity log ("added/removed participant"); quyền theo PIC.
- [x] [#17 — Cho sửa Phase Type](https://github.com/gnust-company/project-monitoring/issues/17) *(phần cho sửa; phụ thuộc #16, #14, #11)*
  - Dropdown chọn phaseType (tên đầy đủ) trong PhaseDetailModal; PIC-gated (`can_edit_phase`).

## Wave 4 — Pipeline UX + staged-save

- [x] [#15 — Pipeline: filter theo người & theo khoảng thời gian](https://github.com/gnust-company/project-monitoring/issues/15)
  - Filter "Chỉ dự án của tôi" (chỉ PIC + phase mình tham gia, creator-đã-giao-PIC không tính); filter khoảng thời gian snap về tuần (A→B) + mở rộng cho phase bị cắt 2 đầu (A'→B'); gộp 2 filter vào 1 popover "Bộ lọc".
  - Filter dùng chung `lib/filterProjects.ts` (`useProjectFilter`) → sidebar auto-đồng bộ với timeline.
- [x] [#25 — Pipeline: không để hàng trống sau kéo-thả](https://github.com/gnust-company/project-monitoring/issues/25) *(làm cùng #15)*
  - Nén hàng (row compaction) ở `layoutMap` + `rowCount`: chỉ tính block trong tầm nhìn, remap row về liên tục `0,1,2…`; không dồn khi đang kéo (thả tay mới dồn). Kèm animation 280ms khi đổi filter/zoom.
- [x] [#23 — Pipeline: default view kéo về hôm nay](https://github.com/gnust-company/project-monitoring/issues/23)
  - Đã có sẵn: lần load đầu/đổi zoom tự scroll về `todayPos` (`hasScrolled` ref ở PipelineTimeline).
- [x] [#14 — Nút Save cho mọi edit + lý do & log khi xóa](https://github.com/gnust-company/project-monitoring/issues/14)
  - Modal phase/project: gom mọi edit metadata (title, desc, dates, phaseType, PIC, participants) vào 1 draft `meta`, chỉ áp khi bấm Lưu (bỏ auto-apply).
  - `DeleteReasonDialog`: xóa phase/project bắt nhập lý do (≥3 ký tự). BE log activity vào cha kèm lý do (phase→project, project→workspace) trước khi xóa.
  - Migration 0005: `activity_log.org_id` (FK orgs CASCADE, indexed) + `project_id` → nullable/SET NULL để giữ log workspace sau khi xóa dự án. UI xem changelog workspace để [#26].
- [x] [#18 — View mode: kéo-thả cần Save mới áp dụng](https://github.com/gnust-company/project-monitoring/issues/18) *(dùng chung cơ chế staged-save với #14)*
  - Pipeline 3 mode: **Chỉ xem** (chỉ pan) · **Sắp xếp** (kéo/giãn) · **Tạo phase**. Kéo/resize là draft trong `pendingLayout`; thanh "N thay đổi chưa lưu — Lưu / Hủy", Lưu mới persist.

## Wave 5 — Issue mới từ user (#21–#26)

- [ ] [#21 — Dư thừa artifact (xóa kéo theo file MinIO)](https://github.com/gnust-company/project-monitoring/issues/21)
  - Xóa phase/dự án/workspace → xóa luôn object trên MinIO (tránh phình store). Rà cascade ở BE storage layer.
- [ ] [#22 — Tăng cường upload file (progress + multi-file modal)](https://github.com/gnust-company/project-monitoring/issues/22)
  - Modal kéo-thả/chọn nhiều file, progress bar từng file, thêm/sửa/xóa trước khi confirm mới upload.
- [ ] [#24 — Rà soát changelog (ẩn UUID, format dễ đọc)](https://github.com/gnust-company/project-monitoring/issues/24)
  - Changelog phase đang show kèm raw ID (vd "added participant — 9c1008f1…"); cần map ID → tên người/đối tượng, format gọn.
- [ ] [#26 — Mở rộng người dùng: phase tùy biến theo workspace](https://github.com/gnust-company/project-monitoring/issues/26) ⚠️ *lớn — đổi schema*
  - Phase (tên/màu/role/checklist/outcome) thành **default sửa được** theo workspace (không hard-code 7 phase). Tạo workspace 2 step (mời thành viên + tùy chỉnh phase); view Overview (description + changelog workspace-level); cảnh báo block khi xóa phase đang dùng.

---

## Phụ thuộc chéo quan trọng
- **PIC** ([#11](https://github.com/gnust-company/project-monitoring/issues/11)) là nền cho [#10](https://github.com/gnust-company/project-monitoring/issues/10), [#13](https://github.com/gnust-company/project-monitoring/issues/13), [#12](https://github.com/gnust-company/project-monitoring/issues/12), [#17](https://github.com/gnust-company/project-monitoring/issues/17).
- **Bỏ targetDate** ([#20](https://github.com/gnust-company/project-monitoring/issues/20)) phá `computeProjectStatus` + dashboard "đến hạn 7 ngày" / "Deadline sắp tới".
- **Outcome** ([#9](https://github.com/gnust-company/project-monitoring/issues/9)) đổi schema → làm trước [#8](https://github.com/gnust-company/project-monitoring/issues/8).
- **Staged-save** dùng chung giữa [#14](https://github.com/gnust-company/project-monitoring/issues/14) và [#18](https://github.com/gnust-company/project-monitoring/issues/18).
- **Row compaction** ([#25](https://github.com/gnust-company/project-monitoring/issues/25)) đã làm ở tầng hiển thị → khi làm staged-save ([#18](https://github.com/gnust-company/project-monitoring/issues/18)) lưu ý `commitLayout` vẫn persist `displayRow` thô (gap được che ở render, chưa nén trong DB).
- **Phase tùy biến** ([#26](https://github.com/gnust-company/project-monitoring/issues/26)) đụng `phase_templates` + enum `DevPhase` hard-code → ảnh hưởng cả FE `PHASE_META`/`PHASE_ROLE_TASKS` và BE seed; cần plan riêng.

## Liên kết
- Epic: [#7 — Listing Issue, góp ý từ user (#8–#20)](https://github.com/gnust-company/project-monitoring/issues/7)
- Tổng hợp: [#3 — Tổng hợp Issue](https://github.com/gnust-company/project-monitoring/issues/3)
- Issue mới (Wave 5): [#21](https://github.com/gnust-company/project-monitoring/issues/21), [#22](https://github.com/gnust-company/project-monitoring/issues/22), [#24](https://github.com/gnust-company/project-monitoring/issues/24), [#26](https://github.com/gnust-company/project-monitoring/issues/26)
