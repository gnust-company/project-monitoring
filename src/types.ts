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
    label: 'Project Assessment',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    desc: 'Define goals, check feasibility, elicit requirements, produce Need Assessment (BRD)',
  },
  SA: {
    label: 'SW Analysis',
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    desc: 'Define scope, create WBS, risk management, produce Project Charter & User Requirements',
  },
  SD: {
    label: 'SW Design',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    desc: 'Wireframe, GUI design, HLD/DDD, produce SRS & Design Documents',
  },
  SI: {
    label: 'SW Implementation',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    desc: 'Code development, quality assurance, infra setup, produce Source Code & Test Cases',
  },
  ST: {
    label: 'SW Test',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    desc: 'System testing, performance test, security verification, produce Test Plans & Reports',
  },
  DEP: {
    label: 'SW Deployment',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: 'Deployment scheduling, go-live confirmation, produce Deliverable Schedule & User Guide',
  },
  OM: {
    label: 'O & M',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    desc: 'PRD incident management, monitoring, security patches, produce Incident Log & RCA',
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

// ─── Phase Block ──────────────────────────────────────────────────
// A project has multiple phase blocks (features/modules), each going through 7 phases
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface PhaseBlock {
  id: string;
  projectId: string;
  phaseType: DevPhase;
  title: string;
  description: string;
  startDate: string; // ISO
  endDate: string;   // ISO
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
