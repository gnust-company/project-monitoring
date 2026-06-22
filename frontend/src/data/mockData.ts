import type { User, Organization, Project, PhaseBlock, ActivityItem, PhaseTag, ChecklistItem, DevPhase } from '../types';
import { DEV_PHASES, PHASE_ROLE_TASKS, PHASE_ROLE_OUTCOMES } from '../types';

const today = new Date('2026-06-02');

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─── Users ─────────────────────────────────────────────────────────
export const users: User[] = [
  { id: 'u1', name: 'Sarah Chen', avatar: 'https://i.pravatar.cc/150?u=u1', jobRole: 'PM' },
  { id: 'u2', name: 'Mike Ross', avatar: 'https://i.pravatar.cc/150?u=u2', jobRole: 'PM' },
  { id: 'u3', name: 'Alex Kim', avatar: 'https://i.pravatar.cc/150?u=u3', jobRole: 'SW_Developer' },
  { id: 'u4', name: 'Jordan Lee', avatar: 'https://i.pravatar.cc/150?u=u4', jobRole: 'BA' },
  { id: 'u5', name: 'Taylor Swift', avatar: 'https://i.pravatar.cc/150?u=u5', jobRole: 'UI_Designer' },
  { id: 'u6', name: 'Casey Park', avatar: 'https://i.pravatar.cc/150?u=u6', jobRole: 'SW_Tester' },
  { id: 'u7', name: 'Riley Johnson', avatar: 'https://i.pravatar.cc/150?u=u7', jobRole: 'SW_Architect' },
  { id: 'u8', name: 'Morgan Blake', avatar: 'https://i.pravatar.cc/150?u=u8', jobRole: 'GUI' },
  { id: 'u9', name: 'Drew Patel', avatar: 'https://i.pravatar.cc/150?u=u9', jobRole: 'SysOps' },
  { id: 'u10', name: 'Sam Wilson', avatar: 'https://i.pravatar.cc/150?u=u10', jobRole: 'PM' },
  { id: 'u11', name: 'Jamie Torres', avatar: 'https://i.pravatar.cc/150?u=u11', jobRole: 'SW_Developer' },
  { id: 'u12', name: 'Avery Brooks', avatar: 'https://i.pravatar.cc/150?u=u12', jobRole: 'SW_Tester' },
];

// ─── Organizations ─────────────────────────────────────────────────
export const organizations: Organization[] = [
  {
    id: 'org1', name: 'TechNova Solutions',
    members: [users[0], users[2], users[3], users[4], users[5], users[6], users[8]],
  },
  {
    id: 'org2', name: 'GreenWave Digital',
    members: [users[1], users[3], users[4], users[6], users[7], users[8], users[10]],
  },
  {
    id: 'org3', name: 'Apex Innovations',
    members: [users[9], users[2], users[5], users[7], users[0], users[11]],
  },
];

// ─── Projects ──────────────────────────────────────────────────────
export const projects: Project[] = [
  { id: 'p1', orgId: 'org1', name: 'Cloud Migration', description: 'Migrate infra to AWS', status: 'On Track', startDate: formatDate(addDays(today, -60)), targetDate: formatDate(addDays(today, 45)), progress: 55, createdBy: 'u1' },
  { id: 'p2', orgId: 'org1', name: 'Portal Redesign', description: 'Customer portal UX overhaul', status: 'At Risk', startDate: formatDate(addDays(today, -90)), targetDate: formatDate(addDays(today, 10)), progress: 78, createdBy: 'u1' },
  { id: 'p3', orgId: 'org1', name: 'Payment Gateway', description: 'Stripe integration', status: 'On Track', startDate: formatDate(addDays(today, -75)), targetDate: formatDate(addDays(today, 5)), progress: 92, createdBy: 'u2' },
  { id: 'p4', orgId: 'org1', name: 'AI Dashboard', description: 'Business intelligence platform', status: 'On Track', startDate: formatDate(addDays(today, -20)), targetDate: formatDate(addDays(today, 100)), progress: 25, createdBy: 'u1' },
  { id: 'p5', orgId: 'org1', name: 'Mobile App v3', description: 'Major mobile release', status: 'Delayed', startDate: formatDate(addDays(today, -10)), targetDate: formatDate(addDays(today, 140)), progress: 8, createdBy: 'u1' },
  { id: 'p6', orgId: 'org1', name: 'DevOps Pipeline', description: 'CI/CD automation', status: 'On Track', startDate: formatDate(addDays(today, -5)), targetDate: formatDate(addDays(today, 80)), progress: 15, createdBy: 'u2' },
  { id: 'p7', orgId: 'org2', name: 'E-Commerce Platform', description: 'Full-stack e-commerce', status: 'On Track', startDate: formatDate(addDays(today, -100)), targetDate: formatDate(addDays(today, 15)), progress: 82, createdBy: 'u1' },
  { id: 'p8', orgId: 'org2', name: 'AI Chatbot', description: 'LLM customer support', status: 'At Risk', startDate: formatDate(addDays(today, -35)), targetDate: formatDate(addDays(today, 50)), progress: 42, createdBy: 'u2' },
  { id: 'p9', orgId: 'org2', name: 'Microservices', description: 'Monolith to microservices', status: 'Delayed', startDate: formatDate(addDays(today, -65)), targetDate: formatDate(addDays(today, 35)), progress: 48, createdBy: 'u1' },
  { id: 'p10', orgId: 'org2', name: 'Marketing Tool', description: 'Campaign management', status: 'On Track', startDate: formatDate(addDays(today, -110)), targetDate: formatDate(addDays(today, 2)), progress: 96, createdBy: 'u2' },
  { id: 'p11', orgId: 'org3', name: 'Blockchain Supply Chain', description: 'Smart contract tracking', status: 'On Track', startDate: formatDate(today), targetDate: formatDate(addDays(today, 200)), progress: 5, createdBy: 'u10' },
  { id: 'p12', orgId: 'org3', name: 'Healthcare CRM', description: 'HIPAA patient management', status: 'On Track', startDate: formatDate(addDays(today, -20)), targetDate: formatDate(addDays(today, 85)), progress: 18, createdBy: 'u10' },
  { id: 'p13', orgId: 'org3', name: 'IoT Dashboard', description: 'Sensor monitoring', status: 'On Track', startDate: formatDate(addDays(today, -45)), targetDate: formatDate(addDays(today, 60)), progress: 52, createdBy: 'u10' },
  { id: 'p14', orgId: 'org3', name: 'FinTech Wallet', description: 'Digital wallet app', status: 'At Risk', startDate: formatDate(addDays(today, -70)), targetDate: formatDate(addDays(today, 20)), progress: 68, createdBy: 'u10' },
  { id: 'p15', orgId: 'org3', name: 'Security Audit', description: 'Compliance scanning tool', status: 'On Track', startDate: formatDate(addDays(today, -55)), targetDate: formatDate(addDays(today, 8)), progress: 90, createdBy: 'u1' },
  { id: 'p16', orgId: 'org3', name: 'HR Management', description: 'HR suite', status: 'Delayed', startDate: formatDate(addDays(today, -15)), targetDate: formatDate(addDays(today, 110)), progress: 12, createdBy: 'u10' },
  { id: 'p17', orgId: 'org3', name: 'Video Streaming', description: 'Enterprise streaming', status: 'On Track', startDate: formatDate(addDays(today, -40)), targetDate: formatDate(addDays(today, 70)), progress: 45, createdBy: 'u10' },
];

// ─── Generate Phase Blocks ────────────────────────────────────────
function generateChecklist(phase: DevPhase, pbId: number): ChecklistItem[] {
  let i = 0;
  return PHASE_ROLE_TASKS[phase].flatMap(({ role, tasks }) =>
    tasks.map(text => ({
      id: `chk-${pbId}-${i++}`,
      text,
      done: Math.random() > 0.6,
      role,
    }))
  );
}

function generateOutcomes(phase: DevPhase, pbId: number): ChecklistItem[] {
  let i = 0;
  return PHASE_ROLE_OUTCOMES[phase].flatMap(({ role, outcomes }) =>
    outcomes.map(text => ({
      id: `out-${pbId}-${i++}`,
      text,
      done: Math.random() > 0.5,
      role,
    }))
  );
}

function generateComments(count: number) {
  const texts = [
    'Looks good, proceeding with this approach.',
    'Can we adjust the timeline for this phase?',
    'Reviewed the initial draft and left feedback.',
    'Design specs updated, check latest version.',
    'Please confirm the requirements for this section.',
    'Found an issue during testing, now fixed.',
    'Great work! Ready for final review.',
    'I will pick this up after the API integration.',
    'Please include error handling for edge cases.',
    'This is blocking frontend work, need it ASAP.',
  ];
  const ids = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'];
  return texts.slice(0, count).map((content, i) => ({
    id: `cm-${i}`, authorId: ids[i % ids.length], content,
    createdAt: formatDate(addDays(today, -Math.floor(Math.random() * 21) - 1)),
  }));
}

function generateActivity(count: number): ActivityItem[] {
  const actions = ['created phase', 'updated status', 'added comment', 'uploaded file', 'changed assignee', 'completed checklist item'];
  const ids = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'];
  return actions.slice(0, count).map((action, i) => ({
    id: `act-${i}`, userId: ids[i % ids.length], action, target: `Phase Block`,
    timestamp: formatDate(addDays(today, -Math.floor(Math.random() * 14))),
  }));
}

// ─── Phase Blocks ─────────────────────────────────────────────────
let pbIdCounter = 0;
function makePb(project: Project, phaseType: string, title: string, startOffset: number, duration: number, tag?: PhaseTag): PhaseBlock {
  pbIdCounter++;
  const start = addDays(new Date(project.startDate), startOffset);
  const end = addDays(start, duration);
  const tags: PhaseTag[] = ['Backlog', 'Todo', 'Inprogress', 'Complete', 'Canceled'];
  const chosenTag = tag || tags[Math.floor(Math.random() * 4)]; // rarely Canceled
  return {
    id: `pb-${pbIdCounter}`,
    projectId: project.id,
    phaseType,
    tag: chosenTag,
    title,
    description: `${title} phase for ${project.name}.`,
    startDate: formatDate(start),
    endDate: formatDate(end),
    ...(chosenTag === 'Complete' ? { actualEndDate: formatDate(addDays(end, Math.floor(Math.random() * 5))) } : {}),
    ...(chosenTag === 'Inprogress' && Math.random() > 0.5 ? { actualEndDate: formatDate(addDays(end, Math.floor(Math.random() * 8) + 1)) } : {}),
    createdBy: project.createdBy,
    assignee: project.createdBy,
    participants: ['u1', 'u3', 'u4', 'u5'].slice(0, 2 + Math.floor(Math.random() * 3)),
    checklist: generateChecklist(phaseType as DevPhase, pbIdCounter),
    outcomes: generateOutcomes(phaseType as DevPhase, pbIdCounter),
    comments: generateComments(2 + Math.floor(Math.random() * 3)),
    attachments: [
      { id: `a-${pbIdCounter}-1`, kind: 'file' as const, fileName: `${phaseType.toLowerCase()}-doc.pdf`, url: '#', uploadedAt: formatDate(addDays(today, -10)) },
      { id: `a-${pbIdCounter}-2`, kind: 'link' as const, fileName: `Spec ${phaseType} (Google Docs)`, url: 'https://docs.google.com/', uploadedAt: formatDate(addDays(today, -7)) },
    ],
    activityLog: generateActivity(4),
  };
}

export const phaseBlocks: PhaseBlock[] = [];

projects.forEach(project => {
  const start = new Date(project.startDate);
  // #20: targetDate giờ có thể không có → fallback +90 ngày để mock phase blocks.
  const end = new Date(project.targetDate ?? start.getTime() + 90 * 24 * 60 * 60 * 1000);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const phaseDuration = Math.floor(totalDays / 7);

  // Each project gets 3-5 phase blocks
  const blockCount = 3 + Math.floor(Math.random() * 3);
  const titles = [
    ['Core Feature', 'Authentication', 'Data Layer', 'API Integration', 'Reporting'],
    ['Frontend', 'Backend', 'Database', 'Cache Layer', 'Notification'],
    ['User Module', 'Admin Panel', 'Payment Flow', 'Analytics', 'Export'],
    ['Auth Service', 'Core Engine', 'UI Components', 'Testing', 'Deployment'],
    ['Data Pipeline', 'ML Models', 'Visualization', 'Alerts', 'Integration'],
  ];
  const titleSet = titles[Math.floor(Math.random() * titles.length)];

  for (let i = 0; i < blockCount; i++) {
    const phaseIdx = Math.min(i, 6);
    const phaseType = DEV_PHASES[phaseIdx];
    const startOffset = i * phaseDuration;
    const duration = phaseDuration + Math.floor(Math.random() * 5);
    phaseBlocks.push(makePb(project, phaseType, titleSet[i % titleSet.length], startOffset, duration));
  }
});

// ─── Helpers ──────────────────────────────────────────────────────
export function getProjectsByOrgId(orgId: string): Project[] {
  return projects.filter(p => p.orgId === orgId);
}

export function getProjectById(projectId: string): Project | undefined {
  return projects.find(p => p.id === projectId);
}

// Registry user thật (do AppContext nạp khi đăng nhập). getUserById tra cứu đây
// trước, fallback về mock users — nhờ vậy các component cũ không phải đổi import.
const userRegistry = new Map<string, User>();

export function registerUsers(list: User[]): void {
  for (const u of list) userRegistry.set(u.id, u);
}

export function getUserById(userId: string): User | undefined {
  return userRegistry.get(userId) ?? users.find(u => u.id === userId);
}

export function getPhaseBlocksByProjectId(projectId: string): PhaseBlock[] {
  return phaseBlocks.filter(pb => pb.projectId === projectId);
}

export function getPhaseBlocksByOrgId(orgId: string): PhaseBlock[] {
  const orgProjectIds = projects.filter(p => p.orgId === orgId).map(p => p.id);
  return phaseBlocks.filter(pb => orgProjectIds.includes(pb.projectId));
}

export function getOrgById(orgId: string): Organization | undefined {
  return organizations.find(o => o.id === orgId);
}

export function getPhaseIndex(phase: string): number {
  return (DEV_PHASES as readonly string[]).indexOf(phase);
}

// Role labels
export const ROLE_LABELS: Record<string, string> = {
  PM: 'Project Manager',
  BA: 'Business Analyst',
  SW_Architect: 'SW Architect',
  SysOps: 'SysOps Engineer',
  UI_Designer: 'UI Designer',
  GUI: 'GUI Designer',
  SW_Developer: 'SW Developer',
  SW_Tester: 'SW Tester',
};
