// Nội dung landing page (tiếng Việt). Chỉ mô tả tính năng ĐANG CÓ trong app
// (không hứa realtime, mời thành viên…). Bản tiếng Anh: ../en/landing.ts — cùng cấu trúc.
// Landing là nội dung có cấu trúc (mảng chương, điểm nhấn…) nên không đi qua t() mà
// lấy nguyên object theo ngôn ngữ bằng useLanding().
import type { DevPhase } from '../../../types';

export interface LandingChapter {
  phase: DevPhase;
  /** Tên phase theo ngôn ngữ này; để trống nếu trùng tên chuẩn tiếng Anh (PHASE_META). */
  name: string;
  title: string;
  body: string;
  points: string[];
}

// Đội ngũ của dự án mẫu (tên hư cấu, dùng chung cho cả hai ngôn ngữ).
const TEAM = {
  pm: 'Minh Anh',
  ba: 'Hoàng Lan',
  architect: 'Quốc Huy',
  ui: 'Thu Trang',
  dev: 'Đức Long',
  tester: 'Bảo Ngọc',
  sysops: 'Văn Tài',
};

const landing = {
  nav: {
    story: 'Hành trình',
    features: 'Tính năng',
    deploy: 'Triển khai',
    login: 'Đăng nhập',
    start: 'Bắt đầu',
    workspaces: 'Vào Workspaces',
  },

  hero: {
    badge: 'Theo dõi quy trình phát triển phần mềm',
    title: ['Mọi dự án,', 'mọi phase,', 'trên một timeline.'],
    lead:
      'ProjectHub đặt từng dự án phần mềm lên một timeline Gantt theo các phase — từ đánh giá đến vận hành. '
      + 'Checklist chia theo vai trò, người chịu trách nhiệm rõ ràng, và trạng thái tự cảnh báo khi dự án bắt đầu chậm.',
    ctaPrimary: 'Bắt đầu',
    ctaSecondary: 'Xem một dự án đi qua 7 phase',
    previewHint: 'Bản demo chạy ngay trên trình duyệt — thử kéo các phase.',
    // Đoạn mô tả ngắn ở cột trái trang Đăng nhập.
    loginLead:
      'Checklist theo vai trò, người chịu trách nhiệm rõ ràng, và trạng thái tự cảnh báo '
      + 'khi dự án bắt đầu chậm — từ đánh giá đến vận hành.',
  },

  // Dự án mẫu xuyên suốt phần "Hành trình".
  project: {
    name: 'Ứng dụng đặt lịch khám',
    pic: TEAM.pm,
  },
  team: {
    ...TEAM,
    external: 'BS. Hạnh (khách hàng)',
    externalShort: 'BS. Hạnh',
  },

  story: {
    kicker: 'Hành trình',
    title: 'Theo chân một dự án qua 7 phase',
    lead:
      'Cuộn xuống để xem dự án “Ứng dụng đặt lịch khám” đi từ ý tưởng đến vận hành — '
      + 'và ProjectHub giúp gì ở mỗi chặng.',
    projectLabel: 'Dự án',
    progressLabel: 'Tiến độ',
    nowLabel: 'Đang ở',
    todayLabel: 'Hôm nay',
  },

  chapters: [
    {
      phase: 'PA',
      name: 'Đánh giá dự án',
      title: 'Một quy trình đúng cách đội bạn làm việc',
      body:
        'Tạo workspace qua 3 bước: thông tin, vai trò, phase. Bảy phase PA → OM có sẵn làm điểm xuất phát — '
        + 'đổi tên, đổi màu, sắp lại thứ tự hay thêm phase riêng tuỳ đội. Mỗi dự án có một PIC: người chịu trách nhiệm chính.',
      points: [
        'Phase và vai trò công việc tuỳ biến theo từng workspace',
        'Mỗi phase mang sẵn checklist và outcome mặc định cho từng vai trò',
        'Chỉ PIC sửa thông tin dự án — ai cũng đóng góp được',
      ],
    },
    {
      phase: 'SA',
      name: 'Phân tích',
      title: 'Checklist tự sinh, đúng người đúng việc',
      body:
        'Tạo phase là có ngay danh sách việc chia theo vai trò: PM lập phạm vi và WBS, BA phân tích yêu cầu, '
        + 'SysOps ước tính cấu hình máy chủ. Quy trình không nằm trong đầu ai — nó nằm sẵn trong phase.',
      points: [
        'Tiến độ phase = số việc và outcome đã hoàn thành',
        'Thêm việc riêng cho từng vai trò, hoặc mục chung',
        'Ai cũng tick được việc — mọi thao tác đều được ghi lại',
      ],
    },
    {
      phase: 'SD',
      name: 'Thiết kế',
      title: 'Ai làm gì — rõ theo ma trận RACI',
      body:
        'Người tham gia phase được xếp vào bốn vai: Thực hiện, Chịu trách nhiệm, Tham vấn, Được thông báo. '
        + 'Khách hàng hay đối tác chưa có tài khoản? Chỉ cần ghi tên — họ vẫn có mặt trong phase và trong lịch sử.',
      points: [
        'Thêm người ngoài hệ thống chỉ bằng tên',
        'Đổi vai trò RACI được ghi vào lịch sử thay đổi',
        'Tìm dự án theo tên hoặc theo PIC ngay trên Pipeline',
      ],
    },
    {
      phase: 'SI',
      name: 'Triển khai',
      title: 'Kế hoạch sống trên timeline',
      body:
        'Pipeline là biểu đồ Gantt cho mọi dự án trong workspace. Sang chế độ Sắp xếp để kéo, giãn phase — '
        + 'thay đổi chỉ áp dụng khi bấm Lưu. Phase trùng lịch tự xuống hàng mới, không xô lệch ngày của ai.',
      points: [
        'Ba chế độ: Chỉ xem · Sắp xếp · Tạo phase',
        'Zoom theo 3 ngày, tuần, tháng, quý',
        'Lọc theo trạng thái, khoảng thời gian, hoặc chỉ dự án của tôi',
      ],
    },
    {
      phase: 'ST',
      name: 'Kiểm thử',
      title: 'Outcome phải có bằng chứng',
      body:
        'Một outcome như Test Report chỉ được đánh dấu xong khi đã đính kèm tài liệu — file tải lên hoặc link '
        + 'tới nơi đội bạn lưu trữ. Thảo luận diễn ra ngay trong phase, không trôi mất giữa các nhóm chat.',
      points: [
        'Đính kèm file (có thanh tiến độ) hoặc link tài liệu',
        'Bình luận theo phase, người liên quan nhận thông báo',
        'Tài liệu gắn với đúng outcome cần nó',
      ],
    },
    {
      phase: 'DEP',
      name: 'Bàn giao',
      title: 'Biết dự án chậm trước khi trễ hạn',
      body:
        'Trạng thái dự án tự suy ra từ các phase: tiến độ thực chậm hơn tiến độ theo lịch là Có rủi ro, '
        + 'còn phase quá hạn chưa xong là Chậm tiến độ. Không ai phải tự cập nhật — Dashboard luôn đúng với thực tế.',
      points: [
        'Dashboard: KPI, sức khỏe workspace, deadline sắp tới',
        'Phân bổ phase và hoạt động gần đây của cả workspace',
        'Trang Nhóm: khối lượng việc đang mở của từng người',
      ],
    },
    {
      phase: 'OM',
      name: 'Vận hành',
      title: 'Mọi thay đổi đều để lại dấu vết',
      body:
        'Đổi ngày, đổi PIC, hoàn thành việc, thêm người — tất cả được ghi thành câu dễ đọc trong lịch sử của phase '
        + 'và dự án. Xoá phải nêu lý do. Người liên quan nhận thông báo; admin phát thông báo chung khi cần.',
      points: [
        'Lịch sử thay đổi ở cả cấp phase và cấp dự án',
        'Thông báo trong app; thông báo hệ thống có lịch hiển thị',
        'Bảng quản trị: workspace, người dùng, quyền admin',
      ],
    },
  ] as LandingChapter[],

  // Chữ trong các minh hoạ động của từng chương (mô phỏng màn hình thật).
  vignettes: {
    process: {
      frame: 'Tạo workspace · bước 3/3 — Phase',
      steps: ['Thông tin', 'Vai trò', 'Phase'],
      phases: 'Phase của workspace',
      customPhase: 'phase riêng',
      roles: 'Vai trò công việc',
      projectPic: 'PIC dự án',
    },
    checklist: {
      defaultOutcomes: (count: number, list: string) => `+ ${count} outcome mặc định: ${list}`,
    },
    raci: {
      frame: 'Người tham gia (RACI)',
      external: 'ngoài',
    },
    timeline: {
      frame: 'Pipeline · Tuần',
      unsaved: '1 thay đổi chưa lưu',
      saved: 'Đã lưu — phase trùng lịch tự xuống hàng, không lệch ngày',
    },
    outcome: {
      needsDoc: 'Cần đính kèm tài liệu',
      needsDocHint: 'Cần đính kèm tài liệu trước khi đánh dấu xong',
      comment: (reviewer: string) => `Đã đính kèm báo cáo, nhờ anh ${reviewer} xem giúp.`,
    },
    health: {
      total: 'Tổng dự án',
      schedule: 'Tiến độ theo lịch',
      actual: 'Tiến độ thực (checklist + outcome)',
      explain: 'Tiến độ thực chậm hơn lịch → tự chuyển “Có rủi ro”',
    },
    activity: {
      frame: 'Lịch sử hoạt động',
      announcement: 'Thông báo hệ thống: bảo trì máy chủ 22:00 thứ Bảy',
      log: [
        { who: TEAM.dev, text: 'đã hoàn thành mục', detail: 'Develop source code', when: 'vừa xong' },
        { who: TEAM.pm, text: 'đã đổi ngày kết thúc', detail: '12/10 → 19/10', when: '5 phút trước' },
        { who: TEAM.architect, text: 'đã thêm người tham gia BS. Hạnh', detail: 'Tham vấn', when: '1 giờ trước' },
        { who: TEAM.sysops, text: 'đã tải lên file', detail: 'incident-log-t10.xlsx', when: 'hôm qua' },
      ],
    },
  },

  features: {
    kicker: 'Tính năng',
    title: 'Trọn bộ trong một nơi',
    items: [
      { key: 'pipeline', title: 'Pipeline Gantt', desc: 'Mọi dự án của workspace trên một timeline; kéo để tạo, kéo/giãn rồi Lưu.' },
      { key: 'process', title: 'Quy trình tuỳ biến', desc: 'Phase, vai trò, checklist và outcome mặc định — mỗi workspace một bộ.' },
      { key: 'phase', title: 'Phase là nơi làm việc', desc: 'Checklist theo vai trò, outcome cần bằng chứng, tài liệu, bình luận.' },
      { key: 'pic', title: 'Trách nhiệm rõ ràng', desc: 'Mỗi dự án và phase có PIC; người tham gia xếp theo RACI.' },
      { key: 'health', title: 'Sức khỏe tự động', desc: 'Đúng tiến độ · Có rủi ro · Chậm tiến độ — tự tính từ phase.' },
      { key: 'admin', title: 'Quản trị gọn', desc: 'Workspace, người dùng, quyền admin, thông báo hệ thống.' },
    ],
  },

  deploy: {
    kicker: 'Triển khai',
    title: 'Chạy trên máy chủ của bạn',
    lead:
      'Toàn bộ hệ thống đóng gói bằng Docker Compose — React, FastAPI, PostgreSQL, MinIO. '
      + 'Cấu hình nằm gọn trong một file .env; dữ liệu không rời khỏi hạ tầng của bạn.',
    code: [
      { cmd: 'cp .env.example .env', note: '# chỉnh cổng, mật khẩu, địa chỉ IP' },
      { cmd: 'docker compose up -d', note: '# giao diện :5173 · API :8000' },
    ],
    points: [
      'Admin đầu tiên tạo qua màn hình thiết lập lần đầu',
      'Giới hạn đăng ký theo domain email công ty',
      'Cơ sở dữ liệu tự nâng cấp khi khởi động',
    ],
  },

  cta: {
    title: 'Đưa dự án tiếp theo lên timeline',
    lead: 'Tạo workspace, thêm đồng đội và bắt đầu từ phase đầu tiên.',
    button: 'Bắt đầu ngay',
  },

  footer: {
    tagline: 'Theo dõi quy trình phát triển phần mềm theo phase',
  },
};

export type LandingContent = typeof landing;
export default landing;
