// ─── User Roles ────────────────────────────────────────────────────
export type UserRole = 'PM' | 'BA' | 'SW_Architect' | 'SysOps' | 'UI_Designer' | 'GUI' | 'SW_Developer' | 'SW_Tester';

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
  email?: string;        // có khi đăng nhập thật
  isSuperuser?: boolean; // admin toàn cục (first-run setup)
}

// Cấp quyền trong workspace — độc lập với UserRole (vai trò công việc)
export type WorkspaceRole = 'owner' | 'member';

export interface Organization {
  id: string;
  name: string;
  members: User[];
  myRole?: WorkspaceRole; // cấp quyền của user hiện tại trong workspace
}

// ─── Notifications & Change Requests (khớp backend) ───────────────
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  orgId?: string | null;
  projectId?: string | null;
  phaseBlockId?: string | null;
  changeRequestId?: string | null;
  read: boolean;
  createdAt: string;
}

export type ChangeRequestAction = 'update_project' | 'delete_project';
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ChangeRequest {
  id: string;
  orgId: string;
  projectId: string;
  requestedBy: string | null;
  action: ChangeRequestAction;
  payload: Record<string, unknown>;
  status: ChangeRequestStatus;
  reviewedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

// ─── 7 Development Process Phases ─────────────────────────────────
export type DevPhase =
  | 'PA'   // Project Assessment
  | 'SA'   // SW Analysis
  | 'SD'   // SW Design
  | 'SI'   // SW Implementation
  | 'ST'   // SW Test
  | 'DEP'  // SW Deployment
  | 'OM';  // Operation & Maintenance

export const DEV_PHASES: DevPhase[] = ['PA', 'SA', 'SD', 'SI', 'ST', 'DEP', 'OM'];

export const PHASE_META: Record<DevPhase, { label: string; fullLabel: string; color: string; bg: string; border: string; solid: string; desc: string }> = {
  PA: {
    label: 'Đánh giá Dự án',
    fullLabel: 'Project Assessment',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    solid: 'bg-gray-400',
    desc: 'Xác định mục tiêu, đánh giá khả thi, thu thập yêu cầu → Báo cáo Khả thi & BRD',
  },
  SA: {
    label: 'Phân tích Phần mềm',
    fullLabel: 'Software Analysis',
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    solid: 'bg-cyan-500',
    desc: 'Xác định phạm vi, tạo WBS, quản lý rủi ro → Hiến chương Dự án & Yêu cầu Người dùng',
  },
  SD: {
    label: 'Thiết kế Phần mềm',
    fullLabel: 'Software Design',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    solid: 'bg-violet-500',
    desc: 'Wireframe, GUI, HLD/DDD, SRS → Tài liệu Thiết kế',
  },
  SI: {
    label: 'Phát triển Phần mềm',
    fullLabel: 'Software Implementation',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    solid: 'bg-blue-500',
    desc: 'Phát triển mã nguồn, thiết lập hạ tầng, test case → Mã nguồn & Test Case',
  },
  ST: {
    label: 'Kiểm thử Phần mềm',
    fullLabel: 'Software Testing',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    solid: 'bg-orange-500',
    desc: 'Kiểm thử hệ thống, hiệu năng, bảo mật → Kế hoạch & Báo cáo Kiểm thử',
  },
  DEP: {
    label: 'Triển khai Phần mềm',
    fullLabel: 'Software Deployment',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    solid: 'bg-emerald-500',
    desc: 'Lịch trình triển khai, xác nhận Go-live → Lịch bàn giao & Hướng dẫn Sử dụng',
  },
  OM: {
    label: 'Vận hành & Bảo trì',
    fullLabel: 'Operation & Maintenance',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    solid: 'bg-slate-500',
    desc: 'Quản lý sự cố PRD, giám sát, vá bảo mật → Nhật ký Sự cố & Báo cáo RCA',
  },
};

// ─── Role-based task & outcome sources per phase ───────────────────
// Nguồn checklist/outcome chuẩn cho từng phase, gắn với role tương ứng.
export const PHASE_ROLE_TASKS: Record<DevPhase, Array<{ role: UserRole; tasks: string[] }>> = {
  PA: [
    { role: 'PM', tasks: ['Define goals and objectives', 'Check feasibilities', 'Produce Feasibility Report'] },
    { role: 'BA', tasks: ['Elicit requirements', 'Produce BRD (Need Assessment)'] },
  ],
  SA: [
    { role: 'PM', tasks: ['Define project scope', 'Create WBS', 'Create risk management plan', 'Produce Project Charter'] },
    { role: 'BA', tasks: ['Elicit & analyze requirements'] },
    { role: 'SysOps', tasks: ['Estimate server config'] },
  ],
  SD: [
    { role: 'UI_Designer', tasks: ['Design wireframes'] },
    { role: 'GUI', tasks: ['Design UI (GUI)'] },
    { role: 'SW_Architect', tasks: ['Create HLD', 'Create Detailed Design'] },
    { role: 'BA', tasks: ['Produce SRS', 'Document requirements'] },
  ],
  SI: [
    { role: 'SW_Developer', tasks: ['Develop source code', 'Guarantee SW quality', 'Guarantee OSL legal', 'Manage change requests'] },
    { role: 'SW_Tester', tasks: ['Design system test cases'] },
    { role: 'SysOps', tasks: ['Setup STG infra'] },
  ],
  ST: [
    { role: 'SW_Tester', tasks: ['Conduct system test', 'Performance testing', 'Create test report', 'Support UAT'] },
    { role: 'SysOps', tasks: ['Security verification'] },
    { role: 'SW_Developer', tasks: ['OSL verification'] },
  ],
  DEP: [
    { role: 'SysOps', tasks: ['Prepare deployment version', 'Make deployment schedule', 'Security check'] },
    { role: 'PM', tasks: ['Confirm Go-live', 'Verify PII regulation'] },
    { role: 'BA', tasks: ['Create user guide'] },
  ],
  OM: [
    { role: 'SysOps', tasks: ['Monitor system', 'Handle PRD incidents', 'Fix security vulnerabilities', 'Self-conduct security audit'] },
    { role: 'PM', tasks: ['Produce incident log', 'RCA reports'] },
  ],
};

export const PHASE_ROLE_OUTCOMES: Record<DevPhase, Array<{ role: UserRole; outcomes: string[] }>> = {
  PA: [
    { role: 'PM', outcomes: ['Feasibility Report'] },
    { role: 'BA', outcomes: ['BRD (Need Assessment)'] },
  ],
  SA: [
    { role: 'PM', outcomes: ['Project Charter'] },
    { role: 'BA', outcomes: ['User Requirements'] },
  ],
  SD: [
    { role: 'SW_Architect', outcomes: ['HLD / Detailed Design'] },
    { role: 'BA', outcomes: ['SRS'] },
    { role: 'UI_Designer', outcomes: ['Wireframes & GUI Design'] },
  ],
  SI: [
    { role: 'SW_Developer', outcomes: ['Source Code'] },
    { role: 'SW_Tester', outcomes: ['System Test Cases'] },
  ],
  ST: [
    { role: 'SW_Tester', outcomes: ['Test Plan', 'Test Report'] },
  ],
  DEP: [
    { role: 'SysOps', outcomes: ['Release Schedule'] },
    { role: 'BA', outcomes: ['User Guide'] },
  ],
  OM: [
    { role: 'SysOps', outcomes: ['Incident Log'] },
    { role: 'PM', outcomes: ['RCA Reports'] },
  ],
};

// Sinh checklist mặc định (theo role) cho một phase
export function buildDefaultChecklist(phase: DevPhase, idPrefix = `chk-${Date.now()}`): ChecklistItem[] {
  let i = 0;
  return PHASE_ROLE_TASKS[phase].flatMap(({ role, tasks }) =>
    tasks.map(text => ({ id: `${idPrefix}-${i++}`, text, done: false, role }))
  );
}

// Sinh outcome mặc định (theo role) cho một phase
export function buildDefaultOutcomes(phase: DevPhase, idPrefix = `out-${Date.now()}`): ChecklistItem[] {
  let i = 0;
  return PHASE_ROLE_OUTCOMES[phase].flatMap(({ role, outcomes }) =>
    outcomes.map(text => ({ id: `${idPrefix}-${i++}`, text, done: false, role }))
  );
}

export type ProjectStatus = 'On Track' | 'At Risk' | 'Delayed';

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  targetDate: string;
  progress: number; // 0-100
  createdBy: string; // userId
}

// ─── Phase Tags ──────────────────────────────────────────────────────
export type PhaseTag = 'Backlog' | 'Todo' | 'Inprogress' | 'Complete' | 'Canceled';

export const PHASE_TAG_META: Record<PhaseTag, { label: string; color: string; bg: string; border: string }> = {
  Backlog:    { label: 'Backlog',     color: 'text-slate-600',  bg: 'bg-slate-100',  border: 'border-slate-300' },
  Todo:       { label: 'To do',       color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  Inprogress: { label: 'In progress', color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  Complete:   { label: 'Complete',    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  Canceled:   { label: 'Canceled',    color: 'text-red-500',    bg: 'bg-red-50',     border: 'border-red-200' },
};

// ─── Phase Block ──────────────────────────────────────────────────
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  role?: UserRole; // đầu việc thuộc role nào trong phase
}

export interface PhaseBlock {
  id: string;
  projectId: string;
  phaseType: DevPhase;
  tag: PhaseTag;
  title: string;
  description: string;
  startDate: string;        // ISO
  endDate: string;          // ISO — ngày kết thúc dự kiến
  actualEndDate?: string;   // ISO — ngày kết thúc thực tế (nếu có)
  createdBy: string; // userId
  assignee: string; // userId — mặc định là người tạo, có thể đổi sang thành viên khác
  participants: string[]; // userIds
  checklist: ChecklistItem[];
  outcomes: ChecklistItem[];
  comments: Comment[];
  attachments: Attachment[];
  activityLog: ActivityItem[];
  displayRow?: number;   // hàng hiển thị trên timeline (BE lưu, FE có thể tự layout)
  progressPct?: number;  // BE tính sẵn từ checklist
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  kind: 'file' | 'link'; // file upload hoặc link tài liệu ở nền tảng khác
  fileName: string;
  url: string;
  uploadedAt: string;
}

export interface ActivityItem {
  id: string;
  userId: string;
  action: string;
  target: string;
  timestamp: string;
}

export type WorkspaceView = 'dashboard' | 'pipeline' | 'team' | 'profile' | 'settings';

export type ZoomLevel = 'week' | 'month' | 'quarter';
