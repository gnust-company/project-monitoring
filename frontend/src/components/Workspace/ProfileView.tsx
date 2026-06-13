import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS } from '../../data/mockData';
import { PHASE_META, PHASE_TAG_META } from '../../types';
import type { UserRole } from '../../types';
import {
  Mail, Shield, FolderKanban, GitBranch, CheckSquare, Layers,
  Pencil, Check, ChevronRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Dropdown from '../common/Dropdown';

const ROLE_OPTIONS: UserRole[] = ['PM', 'BA', 'SW_Architect', 'SysOps', 'UI_Designer', 'GUI', 'SW_Developer', 'SW_Tester'];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function ProfileView() {
  const {
    currentUser, currentUserEmail, updateCurrentUser,
    organizations, phaseBlocks, orgProjects,
    setWorkspaceView, openPhaseDetail,
  } = useApp();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  // Thống kê cá nhân — tính từ phase blocks trong workspace hiện tại
  const stats = useMemo(() => {
    if (!currentUser) return { workspaces: 0, projects: 0, assignedPhases: 0, openTasks: 0 };
    const myPbs = phaseBlocks.filter(pb =>
      pb.assignee === currentUser.id || pb.participants.includes(currentUser.id));
    const projectIds = new Set(myPbs.map(pb => pb.projectId));
    const assignedPhases = phaseBlocks.filter(pb => pb.assignee === currentUser.id);
    const openTasks = myPbs
      .filter(pb => ['Backlog', 'Todo', 'Inprogress'].includes(pb.tag))
      .reduce((sum, pb) => sum + pb.checklist.filter(c => !c.done).length, 0);
    return {
      workspaces: organizations.filter(o => o.members.some(m => m.id === currentUser.id)).length,
      projects: projectIds.size,
      assignedPhases: assignedPhases.length,
      openTasks,
    };
  }, [currentUser, phaseBlocks, organizations]);

  const assignedBlocks = useMemo(() => {
    if (!currentUser) return [];
    return phaseBlocks
      .filter(pb => pb.assignee === currentUser.id)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [currentUser, phaseBlocks]);

  if (!currentUser) return null;

  const saveName = () => {
    if (!nameDraft.trim()) return;
    updateCurrentUser({ name: nameDraft.trim() });
    setEditingName(false);
  };

  const statCards = [
    { label: 'Workspace', value: stats.workspaces, icon: Layers },
    { label: 'Dự án tham gia', value: stats.projects, icon: FolderKanban },
    { label: 'Phase được giao', value: stats.assignedPhases, icon: GitBranch },
    { label: 'Task đang mở', value: stats.openTasks, icon: CheckSquare },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 max-w-4xl mx-auto">
        {/* Identity card */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-surface-card rounded-2xl border border-hairline p-6 mb-6">
          <div className="flex items-center gap-5 flex-wrap">
            <img src={currentUser.avatar} alt=""
              className="w-20 h-20 rounded-2xl bg-stone-200 object-cover" />
            <div className="flex-1 min-w-[220px]">
              {editingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input type="text" value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                    autoFocus
                    className="text-xl font-bold text-ink bg-white border border-stone-300 rounded-lg px-3 py-1
                               focus:outline-none focus:ring-2 focus:ring-ink/15" />
                  <button onClick={saveName} className="p-1.5 bg-ink text-white rounded-lg hover:bg-[#242424]">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer mb-1"
                  onClick={() => { setNameDraft(currentUser.name); setEditingName(true); }}>
                  <h1 className="text-xl font-bold text-ink">{currentUser.name}</h1>
                  <Pencil className="w-3.5 h-3.5 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
                <Mail className="w-3 h-3" /> {currentUserEmail}
              </div>
              {/* Role — đổi được, BE thật: PATCH /users/me */}
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                <Dropdown
                  className="w-52"
                  value={currentUser.role}
                  onChange={v => updateCurrentUser({ role: v as UserRole })}
                  options={ROLE_OPTIONS.map(r => ({ value: r, label: ROLE_LABELS[r] ?? r }))}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((s, i) => (
            <motion.div key={s.label} custom={i + 1} variants={fadeUp} initial="hidden" animate="visible"
              className="bg-surface-card rounded-xl border border-hairline p-4">
              <div className="flex items-center gap-2 text-[10px] text-stone-400 font-medium mb-1.5">
                <s.icon className="w-3.5 h-3.5" /> {s.label}
              </div>
              <div className="text-2xl font-semibold text-ink tracking-tight">{s.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Assigned phases */}
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-surface-card rounded-2xl border border-hairline p-6">
          <h2 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> Phase được giao ({assignedBlocks.length})
          </h2>
          {assignedBlocks.length === 0 ? (
            <div className="text-sm text-stone-400 text-center py-8">
              Chưa có phase nào được giao cho bạn trong workspace này
            </div>
          ) : (
            <div className="space-y-1.5">
              {assignedBlocks.map(pb => {
                const meta = PHASE_META[pb.phaseType];
                const tagMeta = PHASE_TAG_META[pb.tag];
                const project = orgProjects.find(p => p.id === pb.projectId);
                const done = pb.checklist.filter(c => c.done).length;
                const pct = pb.checklist.length > 0 ? Math.round((done / pb.checklist.length) * 100) : 0;
                return (
                  <button key={pb.id}
                    onClick={() => { setWorkspaceView('pipeline'); openPhaseDetail(pb.id); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-hairline bg-white
                               hover:border-stone-300 hover:shadow-sm transition-all text-left group">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${meta.bg} ${meta.color} flex-shrink-0`}>
                      {pb.phaseType}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{pb.title}</div>
                      <div className="text-[10px] text-stone-400">
                        {project?.name} · {format(parseISO(pb.startDate), 'dd/MM')} – {format(parseISO(pb.endDate), 'dd/MM/yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${tagMeta.bg} ${tagMeta.color}`}>
                        {tagMeta.label}
                      </span>
                      <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden hidden sm:block">
                        <div className={`h-full ${meta.solid} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-stone-500 w-8 text-right">{pct}%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-500 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
