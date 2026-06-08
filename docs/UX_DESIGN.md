# ProjectHub — UX Design Document

> Thiết kế từ góc nhìn USER, không phải từ góc nhìn CODE.
> Mỗi screen phải trả lời: **User cần gì ở đây? Họ muốn làm gì tiếp theo?**

---

## 1. LANDING PAGE

### 1.1. Mục đích
Landing Page có 1 job duy nhất: **Thuyết phục visitor rằng ProjectHub giải quyết đúng vấn đề của họ, và họ nên thử.**

Target: PM, Team Lead đang đau đầu vì quản lý nhiều dự án, không thấy big picture.

### 1.2. Thông tin cần show (theo thứ tự scroll)

#### Section 1: Hero — "Hook trong 3 giây"
- **Headline mạnh**, nói thẳng pain point: *"Quản lý quy trình phát triển phần mềm — Trực quan hóa toàn bộ lifecycle trong 1 màn hình"*
- **Sub-headline**: *"7 phase chuẩn, drag & drop timeline, realtime tracking — Biết ngay dự án đang ở đâu"*
- **2 CTA buttons**:
  - `Dùng thử miễn phí` (primary, coral) → navigate to Register
  - `Xem demo` (secondary, outline) → scroll xuống demo section
- **Hero visual**: Screenshot/mockup thật của Pipeline Timeline — cho user thấy ngay product nhìn thế nào
- **Social proof nhỏ**: "Đang được 50+ teams sử dụng" (hoặc similar)

#### Section 2: Vấn đề — "Đúng, đó là vấn đề của tôi"
- 3-4 pain point cards, mỗi cái 1 icon + 1 câu mô tả:
  - 📊 *"Nhiều dự án, không thấy cái nào đang落后"*
  - ⏰ *"Deadline đến mà không ai biết phase trước xong chưa"*
  - 🔥 *"Status meeting mỗi tuần chỉ để hỏi 'Đâu rồi?'"*
  - 📋 *"Checklist rải rác Excel, Jira, Slack — không tập trung"*
- Layout: 2x2 grid hoặc horizontal scroll

#### Section 3: Giải pháp — "Đây là cách ProjectHub giải quyết"
- **Feature blocks**, mỗi feature có:
  - Short headline
  - 1-2 câu mô tả
  - Visual (screenshot/illustration cụ thể)
- Features phải show theo thứ tự:
  1. **Pipeline Timeline** — "Thấy toàn bộ 7 phase của mọi dự án trên 1 Gantt chart"
  2. **Drag & Drop** — "Kéo phase để điều chỉnh timeline. Resize để đổi deadline. Cứ vậy."
  3. **Zoom Levels** — "Week để chi tiết. Month để tổng quan. Quarter để planning."
  4. **Realtime Status** — "On Track ✅ At Risk ⚠️ Delayed 🔴 — Biết ngay cái nào cần attention"

#### Section 4: 7 Phase Process — "Quy trình chuẩn hóa"
- Visual diagram hiển thị 7 phase: PA → SA → SD → SI → ST → DEP → OM
- Mỗi phase có: icon, tên, 1 câu mô tả ngắn
- Layout: Horizontal flow (mũi tên nối giữa các phase)
- Message: "Không cần tự nghĩ quy trình. 7 phase đã chuẩn hóa cho bạn."

#### Section 5: How it Works — "3 bước bắt đầu"
- 3 steps lớn, numbered:
  1. **Tạo Workspace** → "Thêm tổ chức, mời team"
  2. **Tạo Dự án & Phase** → "Chọn dự án, tạo phase blocks trên timeline"
  3. **Track & Collaborate** → "Kéo thả, comment, checklist — Tất cả trong 1 chỗ"
- Mỗi step có illustration nhỏ

#### Section 6: Social Proof / Trust
- Testimonials (2-3 quotes giả định)
- Logo strip: "Trusted by teams at..."

#### Section 7: Final CTA — "Đừng nghe, thử đi"
- Dark background
- Headline: *"Bắt đầu quản lý quy trình tốt hơn — Miễn phí"*
- CTA button: `Bắt đầu ngay` → navigate to Register
- Nhỏ: "Không cần credit card"

### 1.3. Navigation
- Top nav bar (sticky): Logo | Features | Pricing | → `Đăng nhập` | `Dùng thử` buttons
- Smooth scroll giữa các sections

### 1.4. Thiếu hiện tại
- **Không có pain point section** — Chưa nói cho user biết "hiểu bạn"
- **Không có "How it Works"** — User không biết bắt đầu thế nào
- **Không có social proof** — Thiếu trust
- **Hero visual là abstract** — Cần show REAL screenshot của product
- **CTA mờ nhạt** — Chỉ 1 button, không có "Xem demo" alternative

---

## 2. LOGIN PAGE

### 2.1. Mục đích
**Xác thực người dùng, nhanh nhất có thể.** Login page KHÔNG phải là marketing page.

### 2.2. Layout

```
┌─────────────────────────────────────────────────┐
│ ┌───────────────────┐ ┌───────────────────────┐ │
│ │                   │ │                       │ │
│ │   LEFT PANEL      │ │   RIGHT PANEL         │ │
│ │   (Branding)      │ │   (Login Form)        │ │
│ │                   │ │                       │ │
│ │   ProjectHub      │ │   ─────────────────── │ │
│ │   logo + tagline  │ │   Chào mừng trở lại   │ │
│ │                   │ │                       │ │
│ │   Background      │ │   [  Email          ] │ │
│ │   pattern +       │ │   [  Mật khẩu       ] │ │
│ │   illustration    │ │                       │ │
│ │                   │ │   ☐ Ghi nhớ đăng nhập│ │
│ │                   │ │       Quên mật khẩu?  │ │
│ │                   │ │                       │ │
│ │                   │ │   [  Đăng nhập      ] │ │
│ │                   │ │                       │ │
│ │                   │ │   ── hoặc ─────────── │ │
│ │                   │ │                       │ │
│ │                   │ │   [G] [M] SSO buttons │ │
│ │                   │ │                       │ │
│ │                   │ │   Chưa có tài khoản?  │ │
│ │                   │ │   Đăng ký ngay →      │ │
│ └───────────────────┘ └───────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 2.3. Thiếu hiện tại
- **Không có SSO options** (Google, Microsoft) — Cần có dù chỉ là UI
- **Không có "Quên mật khẩu"** flow
- **Không có "Đăng ký"** link
- **Không có error states** — Sai mật khẩu thì show gì?

---

## 3. WORKSPACE SELECTOR

### 3.1. Mục đích
User có thể thuộc nhiều tổ chức → chọn đúng workspace trước khi vào app.

### 3.2. UX requirements
- Hiển thị tất cả workspace user thuộc về dạng **card grid**
- Mỗi card: Logo/initial + Tên workspace + Số members + Số projects
- **Sort theo recent activity** — workspace user dùng gần nhất lên đầu
- **Tạo workspace mới** — Button rõ ràng, luôn visible
- **User avatar** — Góc phải trên, dropdown để logout/settings
- **Quick search** — Nếu user thuộc nhiều workspace (>5), cần search

### 3.3. Thiếu hiện tại
- **Không có user avatar** — User không biết mình đang login bằng ai
- **Không có sort/recent** — Workspace hiện theo thứ tự random
- **Không có search** — OK nếu ít workspace, nhưng cần khi scale

---

## 4. WORKSPACE LAYOUT (Shell)

### 4.1. Mục đích
Shell là "nhà" của user — Sidebar + Header + Content area. User sẽ ở đây 90% thời gian.

### 4.2. Layout

```
┌──────┬─────────────────────────────────────────────┐
│      │  HEADER BAR                                 │
│      │  [Breadcrumb]              [🔔] [Avatar▼]  │
│  S   ├─────────────────────────────────────────────┤
│  I   │                                             │
│  D   │                                             │
│  E   │         CONTENT AREA                        │
│  B   │         (Dashboard / Pipeline / Team)       │
│  A   │                                             │
│  R   │                                             │
│      │                                             │
└──────┴─────────────────────────────────────────────┘
```

### 4.3. Sidebar

```
┌─────────────────────┐
│  [Logo] ProjectHub  │
│                     │
│  ─── WORKSPACE ──── │
│  📊 Dashboard       │
│  📋 Pipeline        │
│  👥 Nhóm            │
│                     │
│  ─── DỰ ÁN ──────── │
│  🔴 Cloud Migration │
│  🟢 Portal Redesign │
│  🟡 AI Dashboard    │
│  + Tạo dự án       │
│                     │
│                     │
│  ─── CÁ NHÂN ────── │
│  ⚙️ Cài đặt         │
│  🚪 Đăng xuất       │
│                     │
│  ┌─────────────────┐│
│  │ [Avatar] Tên    ││
│  │ Role • Workspace ││
│  └─────────────────┘│
└─────────────────────┘
```

**Sidebar rules:**
- **Active state rõ ràng** — Background highlight + left border accent
- **Section grouping** — WORKSPACE, DỰ ÁN, CÁ NHÂN — để user biết context
- **Project list** — Shortcut đến từng dự án, filter trên Pipeline
- **User info ở bottom** — Avatar + tên + role, luôn visible
- **Collapse/expand** — Cho user muốn content area rộng hơn

### 4.4. Header Bar

```
┌─────────────────────────────────────────────────────┐
│  Workspace: TechNova Solutions  >  Dashboard        │
│                                                     │
│                          🔔 3    [Avatar ▼]         │
└─────────────────────────────────────────────────────┘
```

**Header rules:**
- **Breadcrumb** — User biết mình đang ở đâu trong hierarchy
- **Notification bell** — 🔔 với badge count, click mở notification dropdown
- **User avatar** — Click mở dropdown: Profile, Settings, Logout
- **Notification dropdown** — Hiển thị:
  - "Dự án X vừa chuyển sang phase SI"
  - "Deadline phase ST còn 2 ngày"
  - "@Bạn được mention trong comment"
  - "Yêu cầu tạo workspace mới được duyệt"

### 4.5. Thiếu hiện tại
- **KHÔNG có Header** — Không có breadcrumb, notification, avatar
- **Sidebar thiếu sections** — Không phân nhóm rõ ràng
- **Sidebar thiếu user info** — Không biết user là ai
- **Sidebar thiếu project shortcuts** — Phải vào Pipeline rồi mới filter
- **Không có notification** — Zero notification system
- **Không có breadcrumb** — Lost trong navigation

---

## 5. DASHBOARD VIEW

### 5.1. Mục đích
Dashboard là **"bức tranh toàn cảnh"** của workspace. User mở app lên → Dashboard → biết ngay:
- Dự án nào đang OK, cái nào cần cứu
- Deadline nào sắp tới
- Phase nào đang bottleneck
- Cần làm gì hôm nay

### 5.2. Layout

```
┌──────────────────────────────────────────────────────────┐
│  Dashboard                                    [Tạo dự án]│
│  "Tổng quan workspace TechNova Solutions"                 │
├──────────┬──────────┬──────────┬─────────────────────────┤
│ 12       │ 8        │ 3        │ 1                       │
│ Dự án    │ On Track │ At Risk  │ Delayed                 │
│ tổng     │ ✅       │ ⚠️       │ 🔴                      │
├──────────┴──────────┴──────────┴─────────────────────────┤
│                                                          │
│  ┌─── Deadline sắp tới ──────────────────────────────┐  │
│  │ 🔴 Payment Gateway — Phase ST — Còn 2 ngày       │  │
│  │ 🟡 AI Dashboard — Phase SD — Còn 5 ngày          │  │
│  │ 🟢 Mobile App v3 — Phase SA — Còn 12 ngày        │  │
│  │                     [Xem tất cả →]                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─── Hoạt động gần đây ────────────────────────────┐  │
│  │ 👤 Nguyễn Văn A đã hoàn thành "Define BRD"       │  │
│  │ 👤 Trần Thị B đã comment trên Phase SD           │  │
│  │ 📎 File "SRS_v2.pdf" được đính kèm               │  │
│  │ 🔄 Portal Redesign chuyển từ SA → SD             │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─── Dự án gần đây ───────────────────────────────┐   │
│  │ ┌─────────────┐ ┌─────────────┐ ┌────────────┐  │   │
│  │ │ Cloud       │ │ Portal      │ │ AI         │  │   │
│  │ │ Migration   │ │ Redesign    │ │ Dashboard  │  │   │
│  │ │ ████████░░  │ │ ██████░░░░  │ │ ███░░░░░░  │  │   │
│  │ │ 78% • SI    │ │ 62% • SD    │ │ 35% • SA   │  │   │
│  │ │ On Track ✅ │ │ At Risk ⚠️  │ │ On Track ✅│  │   │
│  │ └─────────────┘ └─────────────┘ └────────────┘  │   │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─── Phase Distribution ────────────────────────────┐  │
│  │  PA  SA  SD  SI  ST  DEP  OM                      │  │
│  │  ██  ██  ███ █████ ████ ██   █                    │  │
│  │  3   4   5    8    6   3   1                      │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 5.3. Section chi tiết

#### Row 1: Stat Cards (4 cards)
- **Dự án tổng** — Tổng số dự án trong workspace
- **On Track** ✅ — Số dự án đúng tiến độ (xanh)
- **At Risk** ⚠️ — Số dự án có rủi ro (vàng)
- **Delayed** 🔴 — Số dự án trễ (đỏ)
- Mỗi card: Big number + label + trend indicator (↑ ↓ →)

#### Row 2: Deadline sắp tới (Left) + Phase Distribution (Right)
- **Deadline panel**: List các deadline sắp tới, sort by urgency
  - Mỗi item: Icon trạng thái + Tên dự án + Tên phase + "Còn X ngày"
  - Color-coded: 🔴 < 3 ngày, 🟡 < 7 ngày, 🟢 > 7 ngày
  - CTA: "Xem tất cả →" → navigate Pipeline + filter
- **Phase Distribution**: Bar chart ngang
  - 7 bars cho 7 phases
  - Show số phase blocks đang active ở mỗi phase
  - Bar color match phase color

#### Row 3: Hoạt động gần đây (Activity Feed)
- Timeline-style list các hoạt động mới nhất:
  - Avatar + Tên user + Action + Target + Time
  - Example: "👤 Nguyễn Văn A đã hoàn thành task 'Define BRD' — 5 phút trước"
- Max 5 items + "Xem tất cả →"

#### Row 4: Dự án gần đây
- Card grid (3-4 cards), mỗi card:
  - Project name
  - Progress bar + percentage
  - Phase hiện tại (badge)
  - Status (On Track / At Risk / Delayed)
  - Click → mở Pipeline filtered to that project

### 5.4. Thiếu hiện tại
- **KHÔNG có Deadline section** — User không biết cái gì sắp tới
- **KHÔNG có Activity Feed** — Không biết team đang làm gì
- **KHÔNG có trend indicators** — Không biết tình hình tốt lên hay xấu đi
- **Cards quá đơn giản** — Chỉ show số, không show context
- **Không có "Cần làm gì hôm nay"** — Dashboard thiếu actionability
- **Không có Phase Distribution** — Không thấy bottleneck ở đâu
- **Project cards thiếu progress** — Không thấy progress bar, phase hiện tại

---

## 6. PIPELINE TIMELINE

### 6.1. Mục đích
**Trái tim của ProductHub.** Nơi user spend 80% thời gian. Phải cho user cảm giác "control" — mọi thứ kéo thả được, mọi thứ visual.

### 6.2. UX requirements (đã có, chỉ bổ sung)

#### Cần thêm:
- **Project group collapse/expand** — Click project name → collapse/expand phases
- **Phase block tooltip** — Hover → popup nhanh: Title, Status, Assignees, Progress
- **Mini progress bar** — Trong mỗi phase block, show % checklist done
- **Phase block status indicator** — Nhỏ icon hoặc color band cho biết phase đang on track hay delayed
- **Keyboard shortcuts** — Space = scroll to today, +/- = zoom, Esc = close modal
- **Empty state** — Khi chưa có phase nào: "Bắt đầu bằng cách tạo Phase đầu tiên" + CTA button
- **Breadcrumb ở header** — "TechNova Solutions > Pipeline"

---

## 7. TEAM VIEW

### 7.1. Mục đích
Xem **ai đang làm gì** trong workspace. Không chỉ là danh sách — phải show được workload và assignment.

### 7.2. Layout

```
┌──────────────────────────────────────────────────────────┐
│  Nhóm (8 thành viên)                    [Mời thành viên] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ┌──────┐                                         │   │
│  │ │Avatar│  Nguyễn Văn A                            │   │
│  │ │  NA  │  Project Manager                         │   │
│  │ └──────┘                                          │   │
│  │                                                   │   │
│  │  Đang tham gia:                                   │   │
│  │  ├── Cloud Migration (PA, SA phases) — 3 tasks   │   │
│  │  ├── Portal Redesign (SA phase) — 2 tasks        │   │
│  │  └── AI Dashboard (PA phase) — 1 task            │   │
│  │                                                   │   │
│  │  Workload: ████████░░ 80%                         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ┌──────┐                                         │   │
│  │ │Avatar│  Trần Thị B                              │   │
│  │ │  TB  │  Software Developer                      │   │
│  │ └──────┘                                          │   │
│  │                                                   │   │
│  │  Đang tham gia:                                   │   │
│  │  └── Cloud Migration (SI phase) — 5 tasks        │   │
│  │                                                   │   │
│  │  Workload: █████░░░░░ 50%                         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 7.3. Mỗi member card cần show:
- **Avatar** (ảnh thật hoặc initial badge)
- **Tên + Role** — Rõ ràng, dùng ROLE_LABELS tiếng Việt
- **Projects đang tham gia** — List project + phases + số tasks
- **Workload bar** — % checklist items assigned = visual indicator
- **Status** — Active / Away / Busy (nếu có)

### 7.4. Thiếu hiện tại
- **Chỉ hiển thị avatar + tên + role** — Không có assignment info
- **Không có workload** — Không biết ai đang quá tải
- **Không có project context** — Không biết member đang contribute ở đâu
- **Layout không centered** — Như user feedback

---

## 8. MODALS

### 8.1. Create Phase Modal
**Cần bổ sung:**
- **Template selection** — "Tạo từ template" hoặc "Tạo trống"
  - Template: Pre-fill checklist dựa trên phase type (PA template có BRD tasks, SI template có coding tasks)
- **Date range picker** — Visual calendar thay vì 2 input date riêng lẻ
- **Preview** — Trước khi tạo, preview phase block trên timeline (ghost preview)

### 8.2. Phase Detail Modal
**Cần bổ sung:**
- **Phase status** — Dropdown: Not Started / In Progress / Completed / Blocked
- **Progress bar** — Visual % hoàn thành dựa trên checklist
- **Time tracking** — "Còn X ngày" hoặc "Quá hạn X ngày"
- **Subtasks** — Checklist items có thể có sub-items

---

## 9. MISSING FEATURES (Cần thêm)

### 9.1. Notification System
- **Bell icon** ở header
- **Dropdown** hiển thị 5 notifications mới nhất
- **Types**:
  - Deadline sắp tới (còn < 3 ngày)
  - Phase status thay đổi
  - Comment mention (@user)
  - Phase assignment
  - Project status change

### 9.2. User Profile
- **Avatar** ở header + sidebar
- **Dropdown menu**: Profile, Cài đặt, Đăng xuất
- **Profile page** (future): Ảnh, tên, email, role, timezone

### 9.3. Search
- **Global search** (Cmd/Ctrl + K) — Search projects, phases, members
- **Inline search** trên Pipeline — Đã có nhưng cần tốt hơn

### 9.4. Empty States
- **Dashboard chưa có dự án**: "Tạo dự án đầu tiên để bắt đầu" + illustration
- **Pipeline chưa có phase**: "Tạo Phase đầu tiên cho dự án X" + CTA
- **Team chưa có member**: "Mời thành viên vào workspace"

### 9.5. Keyboard Shortcuts
- `T` → Scroll to Today
- `+` / `-` → Zoom in/out
- `N` → New phase
- `Esc` → Close modal
- `Cmd/Ctrl + K` → Search

---

## 10. DESIGN PRIORITY MATRIX

### Phase 1 — Must Have (UX cơ bản)
| # | Item | Impact | Effort |
|---|------|--------|--------|
| 1 | Header bar (breadcrumb + bell + avatar) | 🔴 Critical | Medium |
| 2 | Sidebar user info (avatar + name + role) | 🔴 Critical | Low |
| 3 | Notification bell + dropdown | 🟡 High | Medium |
| 4 | Dashboard: Deadline section | 🔴 Critical | Medium |
| 5 | Dashboard: Activity Feed | 🟡 High | Medium |
| 6 | Dashboard: Project cards with progress | 🟡 High | Low |
| 7 | Landing Page: Pain points + How it Works | 🟡 High | Medium |
| 8 | Login: Error states + SSO options | Medium | Low |

### Phase 2 — Should Have (UX tốt)
| # | Item | Impact | Effort |
|---|------|--------|--------|
| 9 | Team View: Assignment + Workload | 🟡 High | Medium |
| 10 | Sidebar: Project shortcuts | 🟡 High | Low |
| 11 | Phase block: Tooltip on hover | 🟡 High | Low |
| 12 | Phase block: Mini progress bar | Medium | Low |
| 13 | Empty states for all views | Medium | Low |
| 14 | Keyboard shortcuts | Medium | Medium |

### Phase 3 — Nice to Have (UX xuất sắc)
| # | Item | Impact | Effort |
|---|------|--------|--------|
| 15 | Global search (Cmd+K) | Medium | High |
| 16 | Phase templates | Medium | Medium |
| 17 | Phase status (Not Started / In Progress / Completed / Blocked) | Medium | Medium |
| 18 | Landing Page: Social proof section | Low | Low |
| 19 | Sidebar collapse/expand | Low | Medium |

---

## 11. VISUAL CONSISTENCY RULES

### Components phải có ở MỌI workspace screen:
1. ✅ **Header bar** — Luôn ở top, chứa breadcrumb + bell + avatar
2. ✅ **Sidebar** — Luôn ở left, active state rõ ràng
3. ✅ **User presence** — Avatar hiển thị ở ít nhất 2 chỗ (header + sidebar)

### Navigation rules:
- Click project trong sidebar → Mở Pipeline + auto-filter project đó
- Click breadcrumb → Navigate lên 1 level
- Bell icon → Dropdown, không navigate đi đâu
- Avatar → Dropdown: Profile / Settings / Logout

### Interaction rules:
- **Tất cả cards phải clickable** → Navigate đến detail tương ứng
- **Tất cả stat cards phải có context** — Không chỉ "12", phải là "12 dự án • +2 tháng này"
- **Tất cả list phải có empty state** — Không bao giờ show blank space
- **Tất cả form phải có validation message** — Inline error, không dùng alert()
