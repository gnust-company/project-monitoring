// Landing page content (English) — same shape as ../vi/landing.ts (checked by the type).
import type { LandingContent } from '../vi/landing';

const TEAM = {
  pm: 'Minh Anh',
  ba: 'Hoang Lan',
  architect: 'Quoc Huy',
  ui: 'Thu Trang',
  dev: 'Duc Long',
  tester: 'Bao Ngoc',
  sysops: 'Van Tai',
};

const landing: LandingContent = {
  nav: {
    story: 'Journey',
    features: 'Features',
    deploy: 'Self-hosting',
    login: 'Sign in',
    start: 'Get started',
    workspaces: 'Go to workspaces',
  },

  hero: {
    badge: 'Software development process tracking',
    title: ['Every project,', 'every phase,', 'on one timeline.'],
    lead:
      'ProjectHub lays out each software project on a Gantt timeline, phase by phase — from assessment to operations. '
      + 'Checklists split by role, a clear owner for everything, and a status that warns you as soon as a project starts to slip.',
    ctaPrimary: 'Get started',
    ctaSecondary: 'Follow a project through 7 phases',
    previewHint: 'A live demo running in your browser — try dragging the phases.',
    loginLead:
      'Role-based checklists, clear ownership, and a status that warns you '
      + 'as soon as a project starts to slip — from assessment to operations.',
  },

  project: {
    name: 'Clinic booking app',
    pic: TEAM.pm,
  },
  team: {
    ...TEAM,
    external: 'Dr. Hanh (client)',
    externalShort: 'Dr. Hanh',
  },

  story: {
    kicker: 'Journey',
    title: 'Follow one project through 7 phases',
    lead:
      'Scroll down to watch the “Clinic booking app” go from idea to operations — '
      + 'and see how ProjectHub helps at every stage.',
    projectLabel: 'Project',
    progressLabel: 'Progress',
    nowLabel: 'Now in',
    todayLabel: 'Today',
  },

  chapters: [
    {
      phase: 'PA',
      name: '',
      title: 'A process that matches how your team works',
      body:
        'Set up a workspace in 3 steps: details, roles, phases. The seven phases PA → OM are there as a starting point — '
        + 'rename them, recolor them, reorder them or add your own. Every project has a PIC: the person in charge.',
      points: [
        'Phases and job roles are customizable per workspace',
        'Each phase comes with default checklists and outcomes for every role',
        'Only the PIC edits project details — everyone can contribute',
      ],
    },
    {
      phase: 'SA',
      name: '',
      title: 'Checklists that write themselves, for the right people',
      body:
        'Create a phase and its task list is already there, split by role: the PM defines scope and the WBS, the BA analyzes '
        + 'requirements, SysOps estimates server sizing. The process doesn’t live in anyone’s head — it lives in the phase.',
      points: [
        'Phase progress = tasks and outcomes completed',
        'Add tasks for a specific role, or shared items',
        'Anyone can tick off tasks — every action is logged',
      ],
    },
    {
      phase: 'SD',
      name: '',
      title: 'Who does what — clear with a RACI matrix',
      body:
        'Phase participants are assigned one of four roles: Responsible, Accountable, Consulted, Informed. '
        + 'Client or partner without an account? Just type their name — they still appear in the phase and in its history.',
      points: [
        'Add people from outside the system by name',
        'RACI role changes are recorded in the change history',
        'Find projects by name or by PIC right from the Pipeline',
      ],
    },
    {
      phase: 'SI',
      name: '',
      title: 'A plan that lives on the timeline',
      body:
        'The Pipeline is a Gantt chart of every project in the workspace. Switch to Arrange mode to drag and resize phases — '
        + 'changes only apply when you hit Save. Overlapping phases drop to a new row instead of pushing anyone’s dates.',
      points: [
        'Three modes: View only · Arrange · Create phase',
        'Zoom by 3 days, week, month or quarter',
        'Filter by status, date range, or only my projects',
      ],
    },
    {
      phase: 'ST',
      name: '',
      title: 'Outcomes need evidence',
      body:
        'An outcome such as a Test Report can only be marked done once a document is attached — an uploaded file or a link '
        + 'to wherever your team keeps it. Discussion happens right in the phase, not lost across chat groups.',
      points: [
        'Attach files (with a progress bar) or document links',
        'Comments per phase, with notifications for the people involved',
        'Documents stay attached to the outcome that needs them',
      ],
    },
    {
      phase: 'DEP',
      name: '',
      title: 'Know a project is slipping before it’s late',
      body:
        'Project status is derived from its phases: actual progress behind the scheduled progress means At risk, '
        + 'and a phase past its end date that isn’t finished means Delayed. Nobody has to update it by hand — the Dashboard always reflects reality.',
      points: [
        'Dashboard: KPIs, workspace health, upcoming deadlines',
        'Phase distribution and recent activity across the workspace',
        'Team page: each person’s open workload',
      ],
    },
    {
      phase: 'OM',
      name: '',
      title: 'Every change leaves a trail',
      body:
        'Date changes, a new PIC, completed tasks, added people — all recorded as plain sentences in the phase and project history. '
        + 'Deleting requires a reason. The people involved get notified; admins can broadcast announcements when needed.',
      points: [
        'Change history at both phase and project level',
        'In-app notifications; scheduled system announcements',
        'Admin panel: workspaces, users, admin rights',
      ],
    },
  ],

  vignettes: {
    process: {
      frame: 'New workspace · step 3/3 — Phases',
      steps: ['Details', 'Roles', 'Phases'],
      phases: 'Workspace phases',
      customPhase: 'custom phase',
      roles: 'Job roles',
      projectPic: 'Project PIC',
    },
    checklist: {
      defaultOutcomes: (count: number, list: string) => `+ ${count} default outcome${count === 1 ? '' : 's'}: ${list}`,
    },
    raci: {
      frame: 'Participants (RACI)',
      external: 'external',
    },
    timeline: {
      frame: 'Pipeline · Week',
      unsaved: '1 unsaved change',
      saved: 'Saved — overlapping phases moved to a new row, dates untouched',
    },
    outcome: {
      needsDoc: 'A document is required',
      needsDocHint: 'Attach a document before marking this done',
      comment: (reviewer: string) => `Report attached — ${reviewer}, could you take a look?`,
    },
    health: {
      total: 'Total projects',
      schedule: 'Scheduled progress',
      actual: 'Actual progress (checklist + outcomes)',
      explain: 'Actual progress is behind schedule → switched to “At risk” automatically',
    },
    activity: {
      frame: 'Activity history',
      announcement: 'System announcement: server maintenance Saturday 22:00',
      log: [
        { who: TEAM.dev, text: 'completed item', detail: 'Develop source code', when: 'just now' },
        { who: TEAM.pm, text: 'changed the end date', detail: 'Oct 12 → Oct 19', when: '5 minutes ago' },
        { who: TEAM.architect, text: 'added participant Dr. Hanh', detail: 'Consulted', when: '1 hour ago' },
        { who: TEAM.sysops, text: 'uploaded file', detail: 'incident-log-oct.xlsx', when: 'yesterday' },
      ],
    },
  },

  features: {
    kicker: 'Features',
    title: 'Everything in one place',
    items: [
      { key: 'pipeline', title: 'Gantt pipeline', desc: 'Every project in the workspace on one timeline; drag to create, drag or resize, then Save.' },
      { key: 'process', title: 'Custom process', desc: 'Phases, roles, default checklists and outcomes — one set per workspace.' },
      { key: 'phase', title: 'Phases are where work happens', desc: 'Role-based checklists, outcomes backed by evidence, documents, comments.' },
      { key: 'pic', title: 'Clear ownership', desc: 'Every project and phase has a PIC; participants are organized by RACI.' },
      { key: 'health', title: 'Automatic health', desc: 'On track · At risk · Delayed — calculated from the phases.' },
      { key: 'admin', title: 'Simple administration', desc: 'Workspaces, users, admin rights, system announcements.' },
    ],
  },

  deploy: {
    kicker: 'Self-hosting',
    title: 'Runs on your own server',
    lead:
      'The whole system ships as a Docker Compose stack — React, FastAPI, PostgreSQL, MinIO. '
      + 'Configuration lives in a single .env file, and your data never leaves your infrastructure.',
    code: [
      { cmd: 'cp .env.example .env', note: '# set ports, passwords, IP address' },
      { cmd: 'docker compose up -d', note: '# web :5173 · API :8000' },
    ],
    points: [
      'The first admin is created on the first-run setup screen',
      'Sign-up can be restricted to your company email domain',
      'The database upgrades itself on startup',
    ],
  },

  cta: {
    title: 'Put your next project on the timeline',
    lead: 'Create a workspace, add your teammates and start with the first phase.',
    button: 'Get started now',
  },

  footer: {
    tagline: 'Phase-based software development process tracking',
  },
};

export default landing;
