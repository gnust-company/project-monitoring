// ─── User Roles ────────────────────────────────────────────────────
export type UserRole = 'PM' | 'BA' | 'SW_Architect' | 'SysOps' | 'UI_Designer' | 'GUI' | 'SW_Developer' | 'SW_Tester';

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
}

export interface Organization {
  id: string;
  name: string;
  members: User[];
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

export const PHASE_META: Record<DevPhase, { label: string; color: string; bg: string; border: string; desc: string }> = {
  PA: {
    label: 'Đánh giá Dự án',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    desc: 'Xác định mục tiêu, đánh giá khả thi, thu thập yêu cầu → Báo cáo Khả thi & BRD',
  },
  SA: {
    label: 'Phân tích Phần mềm',
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    desc: 'Xác định phạm vi, tạo WBS, quản lý rủi ro → Hiến chương Dự án & Yêu cầu Người dùng',
  },
  SD: {
    label: 'Thiết kế Phần mềm',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    desc: 'Wireframe, GUI, HLD/DDD, SRS → Tài liệu Thiết kế',
  },
  SI: {
    label: 'Phát triển Phần mềm',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    desc: 'Phát triển mã nguồn, thiết lập hạ tầng, test case → Mã nguồn & Test Case',
  },
  ST: {
    label: 'Kiểm thử Phần mềm',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    desc: 'Kiểm thử hệ thống, hiệu năng, bảo mật → Kế hoạch & Báo cáo Kiểm thử',
  },
  DEP: {
    label: 'Triển khai Phần mềm',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: 'Lịch trình triển khai, xác nhận Go-live → Lịch bàn giao & Hướng dẫn Sử dụng',
  },
  OM: {
    label: 'Vận hành & Bảo trì',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    desc: 'Quản lý sự cố PRD, giám sát, vá bảo mật → Nhật ký Sự cố & Báo cáo RCA',
  },
};

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
  participants: string[]; // userIds
  checklist: ChecklistItem[];
  comments: Comment[];
  attachments: Attachment[];
  activityLog: ActivityItem[];
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
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

export type WorkspaceView = 'dashboard' | 'pipeline' | 'team';

export type ZoomLevel = 'week' | 'month' | 'quarter';
