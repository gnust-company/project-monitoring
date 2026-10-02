import { useApp } from '../../context/AppContext';
import { Mail, Shield, FolderKanban, Crown, ListTodo } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { ProjectStatus } from '../../types';
import { resolveRoleColor, participantUserIds } from '../../types';
import Avatar from '../common/Avatar';
import { computeProjectStatus, projectPhaseProgress } from '../../lib/projectStatus';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const statusStyle: Record<ProjectStatus, { text: string; bar: string }> = {
  'On Track': { text: 'text-emerald-600', bar: '#10b981' },
  'At Risk':  { text: 'text-amber-600',  bar: '#f59e0b' },
  'Delayed':  { text: 'text-red-500',    bar: '#ef4444' },
};

interface PicProject { id: string; name: string; status: ProjectStatus; progress: number; }

export default function TeamView() {
  const { selectedOrg, phaseBlocks, orgProjects, getRoleName, orgRoles } = useApp();

  // #10: dự án member làm PIC chính (Project.picUserId ?? createdBy).
  const picProjectsByMember = useMemo(() => {
    const map = new Map<string, PicProject[]>();
    if (!selectedOrg) return map;
    selectedOrg.members.forEach(member => {
      const list = orgProjects
        .filter(p => (p.picUserId ?? p.createdBy) === member.id)
        .map<PicProject>(p => ({
          id: p.id,
          name: p.name,
          status: computeProjectStatus(p, phaseBlocks),
          progress: Math.round(projectPhaseProgress(phaseBlocks.filter(b => b.projectId === p.id)) * 100),
        }));
      map.set(member.id, list);
    });
    return map;
  }, [selectedOrg, orgProjects, phaseBlocks]);

  // #10: danh sách dự án member đang tham gia + thống kê task mở/được giao (tổng).
  const involvementByMember = useMemo(() => {
    const map = new Map<string, { items: string[]; openTasks: number; assignedTasks: number }>();
    if (!selectedOrg) return map;
    selectedOrg.members.forEach(member => {
      const items: string[] = [];
      let openTasks = 0;
      let assignedTasks = 0;
      phaseBlocks.forEach(pb => {
        const involved = participantUserIds(pb).includes(member.id) || pb.createdBy === member.id;
        if (!involved) return;
        const project = orgProjects.find(p => p.id === pb.projectId);
        if (!project) return;
        if (!items.includes(project.name)) items.push(project.name);
        assignedTasks += pb.checklist.length;
        openTasks += pb.checklist.filter(c => !c.done).length;
      });
      map.set(member.id, { items, openTasks, assignedTasks });
    });
    return map;
  }, [selectedOrg, phaseBlocks, orgProjects]);

  if (!selectedOrg) return null;

  const members = selectedOrg.members;
  const roleGroups = members.reduce<Record<string, typeof members>>((acc, m) => {
    const rk = m.jobRole ?? '';
    if (!acc[rk]) acc[rk] = [];
    acc[rk].push(m);
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
            const colors = resolveRoleColor(orgRoles, role || undefined);
            return (
              <motion.div key={role} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                className={`${colors.bg} border border-stone-200/40 rounded-2xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <span className={`text-xs font-bold ${colors.text}`}>{getRoleName(role || undefined)}</span>
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
            Tiến độ tính theo các dự án mà thành viên làm PIC chính
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member, i) => {
            const colors = resolveRoleColor(orgRoles, member.jobRole);
            const picProjects = picProjectsByMember.get(member.id) || [];
            const involvement = involvementByMember.get(member.id) || { items: [], openTasks: 0, assignedTasks: 0 };

            return (
              <motion.div key={member.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                className="bg-white rounded-2xl border border-hairline p-5 card-hover flex flex-col">
                {/* Top: Avatar + info */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={member.name} src={member.avatar} className="w-12 h-12" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{member.name}</div>
                    <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                      <Shield className="w-2.5 h-2.5" />
                      {getRoleName(member.jobRole)}
                    </div>
                  </div>
                </div>

                {/* PIC chính — dự án + tiến độ */}
                <div className="mb-4">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" /> PIC chính ({picProjects.length})
                  </div>
                  {picProjects.length === 0 ? (
                    <p className="text-[11px] text-stone-400 font-light">Chưa phụ trách dự án nào.</p>
                  ) : (
                    <div className="space-y-2">
                      {picProjects.slice(0, 4).map(p => {
                        const st = statusStyle[p.status];
                        return (
                          <div key={p.id}>
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-xs text-stone-600 truncate flex-1">{p.name}</span>
                              <span className={`text-[10px] font-semibold ${st.text} shrink-0`}>{p.progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${p.progress}%`, background: st.bar }} />
                            </div>
                          </div>
                        );
                      })}
                      {picProjects.length > 4 && (
                        <div className="text-[10px] text-stone-400">+{picProjects.length - 4} dự án khác</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Dự án đang tham gia */}
                {involvement.items.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Dự án đang tham gia</div>
                    <div className="space-y-1.5">
                      {involvement.items.slice(0, 3).map(projectName => (
                        <div key={projectName} className="flex items-center gap-2">
                          <FolderKanban className="w-3 h-3 text-stone-400 flex-shrink-0" />
                          <span className="text-xs text-stone-600 truncate">{projectName}</span>
                        </div>
                      ))}
                      {involvement.items.length > 3 && (
                        <div className="text-[10px] text-stone-400 pl-5">+{involvement.items.length - 3} dự án khác</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Task stat — icon + nhãn bên trái, x/y (tổng mở/được giao) căn phải */}
                <div className="mt-auto flex items-center gap-1.5 text-[11px] text-stone-500 pt-3 border-t border-stone-100">
                  <ListTodo className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                  <span className="text-stone-400 truncate">checklist mở/được giao</span>
                  <span className="font-bold text-ink tabular-nums ml-auto">{involvement.openTasks}/{involvement.assignedTasks}</span>
                </div>

                {/* Email thật */}
                <div className="flex items-center gap-2 text-xs text-stone-400 font-light pt-2">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{member.email || '—'}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
