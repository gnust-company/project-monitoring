// ─── User Roles ────────────────────────────────────────────────────
// #26 mảng B: role công việc nay theo workspace (workspace_roles). UserRole chỉ còn
// dùng cho landing/demo + bộ 8 mặc định; code role thực tế là string tùy biến.
export type UserRole = 'PM' | 'BA' | 'SW_Architect' | 'SysOps' | 'UI_Designer' | 'GUI' | 'SW_Developer' | 'SW_Tester';

export interface User {
  id: string;
  name: string;
  avatar: string;
  email?: string;        // có khi đăng nhập thật
  isSuperuser?: boolean; // admin toàn cục (first-run setup)
  jobRole?: string;      // #26 mảng B: code role công việc trong workspace (khi list theo org)
}

// #26 mảng B: định nghĩa role công việc theo workspace
export interface WorkspaceRoleDef {
  id: string;
  orgId: string;
  code: string;
  name: string;
  color: string;       // khóa palette (dùng chung PHASE_PALETTE) — màu badge/role ở view Nhóm
  position: number;
}

// Cấp quyền trong workspace — độc lập với role công việc
export type WorkspaceRole = 'owner' | 'member';

export interface Organization {
  id: string;
  name: string;
  description?: string; // #26: mô tả workspace
  members: User[];
  myRole?: WorkspaceRole; // cấp quyền của user hiện tại trong workspace
}

// ─── Admin (superuser toàn cục) ───────────────────────────────────
export interface AdminStats {
  userCount: number;
  superuserCount: number;
  workspaceCount: number;
  projectCount: number;
  phaseBlockCount: number;
}

export interface AdminUserInfo {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  isSuperuser: boolean;
  createdAt: string | null;
  workspaceCount: number;
}

export interface AdminWorkspaceInfo {
  id: string;
  name: string;
  createdAt: string | null;
  memberCount: number;
  projectCount: number;
  owners: User[];
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

// #27: thông báo broadcast từ admin (markdown body + time-range hiển thị)
export interface Announcement {
  id: string;
  title: string;
  body: string;
  startsAt: string | null;
  endsAt: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type DismissScope = 'day' | 'week';

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
    label: 'Project Assessment',
    fullLabel: 'Project Assessment',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    solid: 'bg-gray-400',
    desc: 'Define objectives, assess feasibility, gather requirements → Feasibility Report & BRD',
  },
  SA: {
    label: 'Software Analysis',
    fullLabel: 'Software Analysis',
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    solid: 'bg-cyan-500',
    desc: 'Define scope, build WBS, manage risks → Project Charter & User Requirements',
  },
  SD: {
    label: 'Software Design',
    fullLabel: 'Software Design',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    solid: 'bg-violet-500',
    desc: 'Wireframe, GUI, HLD/DDD, SRS → Design Documents',
  },
  SI: {
    label: 'Software Implementation',
    fullLabel: 'Software Implementation',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    solid: 'bg-blue-500',
    desc: 'Develop source code, set up infrastructure, test cases → Source Code & Test Cases',
  },
  ST: {
    label: 'Software Testing',
    fullLabel: 'Software Testing',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    solid: 'bg-orange-500',
    desc: 'System, performance and security testing → Test Plan & Test Report',
  },
  DEP: {
    label: 'Software Deployment',
    fullLabel: 'Software Deployment',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    solid: 'bg-emerald-500',
    desc: 'Deployment schedule, Go-live confirmation → Handover Schedule & User Guide',
  },
  OM: {
    label: 'Operation & Maintenance',
    fullLabel: 'Operation & Maintenance',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    solid: 'bg-slate-500',
    desc: 'PRD incident management, monitoring, security patching → Incident Log & RCA Report',
  },
};

// ─── #26 (mảng A): phase động per-workspace ────────────────────────
// Bảng màu cố định (an toàn với Tailwind — class tĩnh). DB lưu khóa màu (vd "cyan").
export const PHASE_PALETTE: Record<string, { label: string; color: string; bg: string; border: string; solid: string }> = {
  gray:    { label: 'Xám',           color: 'text-gray-600',    bg: 'bg-gray-100',    border: 'border-gray-200',    solid: 'bg-gray-400' },
  cyan:    { label: 'Lục lam',       color: 'text-cyan-700',    bg: 'bg-cyan-50',     border: 'border-cyan-200',    solid: 'bg-cyan-500' },
  violet:  { label: 'Tím',           color: 'text-violet-600',  bg: 'bg-violet-50',   border: 'border-violet-200',  solid: 'bg-violet-500' },
  blue:    { label: 'Xanh dương',    color: 'text-blue-600',    bg: 'bg-blue-50',     border: 'border-blue-200',    solid: 'bg-blue-500' },
  orange:  { label: 'Cam',           color: 'text-orange-600',  bg: 'bg-orange-50',   border: 'border-orange-200',  solid: 'bg-orange-500' },
  emerald: { label: 'Lục',           color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200', solid: 'bg-emerald-500' },
  slate:   { label: 'Đá',            color: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-300',   solid: 'bg-slate-500' },
  rose:    { label: 'Hồng',          color: 'text-rose-600',    bg: 'bg-rose-50',     border: 'border-rose-200',    solid: 'bg-rose-500' },
  amber:   { label: 'Hổ phách',      color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-200',   solid: 'bg-amber-500' },
  teal:    { label: 'Xanh mòng két', color: 'text-teal-600',    bg: 'bg-teal-50',     border: 'border-teal-200',    solid: 'bg-teal-500' },
};

export const PHASE_COLOR_KEYS = Object.keys(PHASE_PALETTE);

export interface PhaseDefinition {
  id: string;
  orgId: string;
  code: string;
  name: string;        // nhãn ngắn (VN)
  fullName: string;    // nhãn đầy đủ
  description: string;
  color: string;       // khóa palette
  position: number;
  checklist: { role?: string; text: string }[];  // checklist mặc định (role = code workspace role)
  outcomes: { role?: string; text: string }[];    // outcome mặc định
}

// Style + nhãn của 1 phase code, resolve từ danh sách phase definition của workspace.
// Fallback PHASE_META (7 phase mặc định) rồi tới màu xám nếu code lạ.
export interface PhaseMeta { label: string; fullLabel: string; desc: string; color: string; bg: string; border: string; solid: string; }
export function resolvePhaseMeta(defs: PhaseDefinition[], code: string): PhaseMeta {
  const def = defs.find(p => p.code === code);
  if (def) {
    const pal = PHASE_PALETTE[def.color] ?? PHASE_PALETTE.gray;
    return { ...pal, label: def.name, fullLabel: def.fullName || def.name, desc: def.description };
  }
  const fallback = (PHASE_META as Record<string, typeof PHASE_META[DevPhase]>)[code];
  if (fallback) return fallback;
  return { ...PHASE_PALETTE.gray, label: code, fullLabel: code, desc: '' };
}

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
  targetDate?: string | null; // #20: không bắt buộc (dự án có thể kéo dài không định hạn)
  progress: number; // 0-100
  createdBy: string; // userId
  picUserId?: string | null; // #11: PIC (mặc định = createdBy)
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
  role?: string; // #26 mảng B: code workspace role (đầu việc thuộc role nào trong phase)
}

// Tên hiển thị của 1 role code, resolve từ danh sách role của workspace (fallback code).
export function resolveRoleName(roles: WorkspaceRoleDef[], code: string | undefined): string {
  if (!code) return 'Chung';
  return roles.find(r => r.code === code)?.name ?? code;
}

// Style badge của 1 role code (bg + text + dot), lấy theo màu role (PHASE_PALETTE).
// Role chưa gán / code lạ → xám. Dùng chung cho view Nhóm + badge role.
export function resolveRoleColor(roles: WorkspaceRoleDef[], code: string | undefined):
  { bg: string; text: string; dot: string } {
  const key = code ? roles.find(r => r.code === code)?.color : undefined;
  const pal = PHASE_PALETTE[key ?? 'gray'] ?? PHASE_PALETTE.gray;
  return { bg: pal.bg, text: pal.color, dot: pal.solid };
}

export interface PhaseBlock {
  id: string;
  projectId: string;
  phaseType: string;  // #26: code của phase definition (per-org), không còn enum cứng
  tag: PhaseTag;
  title: string;
  description: string;
  startDate: string;        // ISO
  endDate: string;          // ISO — ngày kết thúc dự kiến
  actualEndDate?: string;   // ISO — ngày kết thúc thực tế (nếu có)
  createdBy: string; // userId — PIC phase (#11/#13)
  assignee?: string | null; // userId — giờ chỉ là "note" (#13); PIC = createdBy
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
  outcomeItemId?: string | null; // #9: đính kèm cho 1 outcome (null = cấp phase)
  uploadedAt: string;
}

export interface ActivityItem {
  id: string;
  userId: string;
  action: string;
  target: string;
  timestamp: string;
  phaseBlockId?: string | null; // phase liên quan (đổi ngày/người… của phase nào)
}

export type WorkspaceView = 'dashboard' | 'pipeline' | 'team' | 'profile' | 'settings';

export type ZoomLevel = '3day' | 'week' | 'month' | 'quarter';
