import { useApp } from '../../context/AppContext';
import { ROLE_LABELS } from '../../data/mockData';
import { Mail, Shield, FolderKanban, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { PHASE_META } from '../../types';
import Avatar from '../common/Avatar';
import { isPhaseComplete } from '../../lib/projectStatus';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

// ─── Workload ─────────────────────────────────────────────────────────
// Workload = số checklist item CHƯA XONG trong các phase ĐANG HOẠT ĐỘNG
// (Backlog / Todo / Inprogress) mà member là assignee hoặc participant.
// Quy đổi: WORKLOAD_CAPACITY item đang mở = 100% (quá tải).
const WORKLOAD_CAPACITY = 15;

const roleColors: Record<string, { bg: string; text: string; dot: string }> = {
  PM: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  BA: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  SW_Architect: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  SW_Developer: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  SW_Tester: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' },
  UI_Designer: { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-400' },
  GUI: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  SysOps: { bg: 'bg-stone-100', text: 'text-stone-700', dot: 'bg-stone-400' },
};

export default function TeamView() {
  const { selectedOrg, phaseBlocks, orgProjects } = useApp();

  // Build member assignments
  const memberAssignments = useMemo(() => {
    if (!selectedOrg) return new Map<string, { project: string; phases: string[]; taskCount: number }[]>();

    const map = new Map<string, { project: string; phases: string[]; taskCount: number }[]>();

    selectedOrg.members.forEach(member => {
      const assignments: { project: string; phases: string[]; taskCount: number }[] = [];

      phaseBlocks.forEach(pb => {
        if (!pb.participants.includes(member.id)) return;
        const project = orgProjects.find(p => p.id === pb.projectId);
        if (!project) return;

        let existing = assignments.find(a => a.project === project.name);
        if (!existing) {
          existing = { project: project.name, phases: [], taskCount: 0 };
          assignments.push(existing);
        }
        if (!existing.phases.includes(pb.phaseType)) {
          existing.phases.push(pb.phaseType);
        }
        existing.taskCount += pb.checklist.filter(c => !c.done).length;
      });

      map.set(member.id, assignments);
    });

    return map;
  }, [selectedOrg, phaseBlocks, orgProjects]);

  const memberWorkload = useMemo(() => {
    const map = new Map<string, { openTasks: number; pct: number }>();
    if (!selectedOrg) return map;

    selectedOrg.members.forEach(member => {
      const openTasks = phaseBlocks
        .filter(pb => !isPhaseComplete(pb)
          && (pb.participants.includes(member.id) || pb.assignee === member.id))
        .reduce((sum, pb) => sum + pb.checklist.filter(c => !c.done).length, 0);

      const pct = Math.min(100, Math.round((openTasks / WORKLOAD_CAPACITY) * 100));
      map.set(member.id, { openTasks, pct });
    });

    return map;
  }, [selectedOrg, phaseBlocks]);

  if (!selectedOrg) return null;

  const members = selectedOrg.members;

  const roleGroups = members.reduce<Record<string, typeof members>>((acc, m) => {
    if (!acc[m.role]) acc[m.role] = [];
    acc[m.role].push(m);
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-hairline px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink tracking-tight">Nhóm</h1>
            <p className="text-sm text-stone-500 mt-0.5 font-light">
              {selectedOrg.name} · {members.length} thành viên
            </p>
          </div>
          <div className="flex -space-x-2">
            {members.slice(0, 5).map(m => (
              <Avatar key={m.id} name={m.name} src={m.avatar}
                className="w-8 h-8 border-2 border-white" />
            ))}
            {members.length > 5 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-stone-100
                              flex items-center justify-center text-xs text-stone-500 font-medium">
                +{members.length - 5}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-6xl mx-auto">
        {/* Role Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {Object.entries(roleGroups).map(([role, group], i) => {
            const colors = roleColors[role] || { bg: 'bg-stone-50', text: 'text-stone-700', dot: 'bg-stone-400' };
            return (
              <motion.div key={role} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                className={`${colors.bg} border border-stone-200/40 rounded-2xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <span className={`text-xs font-bold ${colors.text}`}>{ROLE_LABELS[role] || role}</span>
                </div>
                <div className="text-3xl font-semibold text-ink tracking-tight">{group.length}</div>
                <div className="text-[10px] text-stone-500 font-light">thành viên</div>
              </motion.div>
            );
          })}
        </div>

        {/* Member Cards */}
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-1">
          <h2 className="text-sm font-semibold text-ink">Tất cả thành viên</h2>
          <span className="text-[10px] text-stone-400 font-light">
            Workload = task chưa xong trong phase đang hoạt động ({WORKLOAD_CAPACITY} task mở ≈ 100%)
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member, i) => {
            const colors = roleColors[member.role] || { bg: 'bg-stone-50', text: 'text-stone-700', dot: 'bg-stone-400' };
            const assignments = memberAssignments.get(member.id) || [];
            const workload = memberWorkload.get(member.id) || { openTasks: 0, pct: 0 };

            return (
              <motion.div key={member.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                className="bg-white rounded-2xl border border-hairline p-5 card-hover">
                {/* Top: Avatar + info */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={member.name} src={member.avatar} className="w-12 h-12" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{member.name}</div>
                    <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                      <Shield className="w-2.5 h-2.5" />
                      {ROLE_LABELS[member.role] || member.role}
                    </div>
                  </div>
                </div>

                {/* Assignments */}
                {assignments.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Đang tham gia</div>
                    <div className="space-y-1.5">
                      {assignments.slice(0, 3).map(a => (
                        <div key={a.project} className="flex items-center gap-2">
                          <FolderKanban className="w-3 h-3 text-stone-400 flex-shrink-0" />
                          <span className="text-xs text-stone-600 truncate flex-1">{a.project}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {a.phases.slice(0, 3).map(p => {
                              const meta = PHASE_META[p as keyof typeof PHASE_META];
                              return (
                                <span key={p} className={`text-[8px] font-bold px-1 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                                  {p}
                                </span>
                              );
                            })}
                          </div>
                          {a.taskCount > 0 && (
                            <span className="text-[10px] text-stone-400 flex-shrink-0">{a.taskCount} task</span>
                          )}
                        </div>
                      ))}
                      {assignments.length > 3 && (
                        <div className="text-[10px] text-stone-400 pl-5">+{assignments.length - 3} dự án khác</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Workload bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-stone-400 font-medium flex items-center gap-1"
                      title={`Workload = số task chưa xong trong các phase đang hoạt động (Backlog/Todo/In progress) mà thành viên tham gia hoặc được giao. ${WORKLOAD_CAPACITY} task đang mở ≈ 100%.`}>
                      Workload <Info className="w-2.5 h-2.5" />
                    </span>
                    <span className="text-[10px] font-semibold text-ink">
                      {workload.openTasks} task mở · {workload.pct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${workload.pct}%`,
                        background: workload.pct > 80 ? '#ef4444' : workload.pct > 50 ? '#f59e0b' : '#10b981',
                      }} />
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-2 text-xs text-stone-400 font-light pt-3 border-t border-stone-100">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{member.name.toLowerCase().replace(' ', '.')}@projecthub.io</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
