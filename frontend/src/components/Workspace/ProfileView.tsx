import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import Avatar from '../common/Avatar';
import { participantUserIds } from '../../types';
import { FolderKanban, GitBranch, CheckSquare, ListTodo, ChevronRight, Settings2, ShieldCheck } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

// #26 mảng B: hồ sơ TRONG workspace — thống kê chi tiết của user ở workspace này + tự
// đổi vai trò. Cài đặt tài khoản (tên/avatar/mật khẩu…) tách sang ProfileModal toàn cục.
export default function ProfileView() {
  const {
    currentUser, selectedOrg, orgProjects, phaseBlocks, orgRoles,
    assignMemberRole, getPhaseMeta, setWorkspaceView, openPhaseDetail, openProfileModal,
  } = useApp();

  const meId = currentUser?.id ?? '';
  const myJobRole = selectedOrg?.members.find(m => m.id === meId)?.jobRole ?? '';

  const assignedBlocks = useMemo(
    () => phaseBlocks.filter(pb => pb.assignee === meId || participantUserIds(pb).includes(meId)),
    [phaseBlocks, meId],
  );

  const stats = useMemo(() => {
    const projectIds = new Set(assignedBlocks.map(pb => pb.projectId));
    let done = 0, open = 0;
    for (const pb of assignedBlocks) {
      for (const c of pb.checklist) { if (c.done) done++; else open++; }
    }
    const total = done + open;
    return {
      projects: projectIds.size,
      phases: assignedBlocks.length,
      openTasks: open,
      completion: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [assignedBlocks]);

  if (!currentUser || !selectedOrg) return null;

  const statCards = [
    { label: 'Dự án tham gia', value: stats.projects, icon: FolderKanban },
    { label: 'Phase được giao', value: stats.phases, icon: GitBranch },
    { label: 'Đầu việc đang mở', value: stats.openTasks, icon: ListTodo },
    { label: 'Hoàn thành', value: `${stats.completion}%`, icon: CheckSquare },
  ];

  const projectName = (id: string) => orgProjects.find(p => p.id === id)?.name ?? '';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 max-w-4xl mx-auto">
        {/* Identity (read-only) + self role */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-surface-card rounded-2xl border border-hairline p-6 mb-6">
          <div className="flex items-center gap-5 flex-wrap">
            <Avatar name={currentUser.name} src={currentUser.avatar} className="w-20 h-20 rounded-2xl text-2xl" />
            <div className="flex-1 min-w-[220px]">
              <h1 className="text-xl font-bold text-ink mb-0.5">{currentUser.name}</h1>
              <div className="text-xs text-stone-500 mb-3">{currentUser.email}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                <span className="text-xs text-stone-500">Vai trò trong {selectedOrg.name}:</span>
                <select value={myJobRole}
                  onChange={e => assignMemberRole(meId, e.target.value || null)}
                  className="text-xs text-stone-700 bg-white border border-stone-200 rounded-md px-2 py-1
                             focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink">
                  <option value="">— chưa có vai trò —</option>
                  {orgRoles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={openProfileModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg hover:border-stone-300 hover:bg-white transition-colors">
              <Settings2 className="w-3.5 h-3.5" /> Sửa tài khoản
            </button>
          </div>
        </motion.div>

        {/* Workspace stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((s, i) => (
            <motion.div key={s.label} custom={i + 1} variants={fadeUp} initial="hidden" animate="visible"
              className="bg-surface-card rounded-xl border border-hairline p-4">
              <s.icon className="w-4 h-4 text-stone-400 mb-2" />
              <div className="text-2xl font-semibold text-ink tracking-tight">{s.value}</div>
              <div className="text-[10px] text-stone-500 font-light">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Assigned phases trong workspace này */}
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-surface-card rounded-2xl border border-hairline p-6">
          <h2 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> Phase được giao ({assignedBlocks.length})
          </h2>
          {assignedBlocks.length === 0 ? (
            <p className="text-sm text-stone-400">Bạn chưa được giao phase nào trong workspace này.</p>
          ) : (
            <div className="space-y-1.5">
              {assignedBlocks.map(pb => {
                const meta = getPhaseMeta(pb.phaseType);
                const done = pb.checklist.filter(c => c.done).length;
                const pct = pb.checklist.length > 0 ? Math.round((done / pb.checklist.length) * 100) : 0;
                return (
                  <button key={pb.id}
                    onClick={() => { setWorkspaceView('pipeline'); openPhaseDetail(pb.id); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-hairline bg-white text-left
                               hover:border-stone-300 hover:shadow-sm transition-all group">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${meta.bg} ${meta.color} flex-shrink-0`}>
                      {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{pb.title}</div>
                      <div className="text-[10px] text-muted-soft">{projectName(pb.projectId)} · {pct}% hoàn thành</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500" />
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
