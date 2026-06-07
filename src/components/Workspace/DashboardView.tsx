import { useApp } from '../../context/AppContext';
import { PHASE_META, DEV_PHASES } from '../../types';
import {
  FolderKanban, CheckCircle2, AlertTriangle, TrendingUp,
  Users, ArrowUpRight, GitBranch, Clock, MessageSquare,
  FileText, Activity, ChevronRight,
} from 'lucide-react';
import { parseISO, differenceInDays, format } from 'date-fns';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const statusConfig = {
  'On Track': { color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', icon: CheckCircle2 },
  'At Risk': { color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500', icon: AlertTriangle },
  'Delayed': { color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', icon: Clock },
};

export default function DashboardView() {
  const { selectedOrg, orgProjects, phaseBlocks, setWorkspaceView } = useApp();

  const stats = useMemo(() => {
    const total = orgProjects.length;
    const onTrack = orgProjects.filter(p => p.status === 'On Track').length;
    const atRisk = orgProjects.filter(p => p.status === 'At Risk').length;
    const delayed = orgProjects.filter(p => p.status === 'Delayed').length;
    const avgProgress = total > 0 ? Math.round(orgProjects.reduce((s, p) => s + p.progress, 0) / total) : 0;
    return { total, onTrack, atRisk, delayed, avgProgress };
  }, [orgProjects]);

  const phaseDistribution = useMemo(() => {
    return DEV_PHASES.map(phase => ({
      phase,
      meta: PHASE_META[phase],
      count: phaseBlocks.filter(pb => pb.phaseType === phase).length,
    }));
  }, [phaseBlocks]);

  // Deadline items — phase blocks sorted by end date
  const deadlines = useMemo(() => {
    return phaseBlocks
      .map(pb => {
        const daysLeft = differenceInDays(parseISO(pb.endDate), new Date());
        const project = orgProjects.find(p => p.id === pb.projectId);
        return { ...pb, daysLeft, projectName: project?.name || '' };
      })
      .filter(pb => pb.daysLeft >= -5) // show up to 5 days overdue
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [phaseBlocks, orgProjects]);

  // Recent activity — aggregate from all phase blocks
  const recentActivity = useMemo(() => {
    return phaseBlocks
      .flatMap(pb => pb.activityLog.map(log => ({ ...log, phaseTitle: pb.title })))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [phaseBlocks]);

  // Recent projects with more detail
  const recentProjects = useMemo(() => {
    return [...orgProjects]
      .sort((a, b) => differenceInDays(parseISO(b.startDate), parseISO(a.startDate)))
      .slice(0, 4);
  }, [orgProjects]);

  if (!selectedOrg) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Dự án', value: stats.total, icon: FolderKanban, sub: `${phaseBlocks.length} phase blocks` },
            { label: 'Đúng tiến độ', value: stats.onTrack, icon: CheckCircle2, sub: `${Math.round((stats.onTrack / Math.max(stats.total, 1)) * 100)}%` },
            { label: 'Có rủi ro', value: stats.atRisk, icon: AlertTriangle, sub: 'Cần chú ý' },
            { label: 'Tiến độ TB', value: `${stats.avgProgress}%`, icon: TrendingUp, sub: 'Tất cả dự án' },
          ].map((stat, i) => (
            <motion.div key={stat.label} custom={i} variants={fadeUp} initial="hidden" animate="visible"
              className="bg-surface-card rounded-xl border border-hairline p-5 card-hover">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#11111108', color: '#111111' }}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-semibold text-ink tracking-tight">{stat.value}</div>
              <div className="text-xs text-body mt-0.5 font-medium">{stat.label}</div>
              <div className="text-[10px] text-muted-soft mt-1">{stat.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Deadline + Phase Distribution row */}
        <div className="grid lg:grid-cols-5 gap-6 mb-8">
          {/* Deadline sắp tới */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible"
            className="lg:col-span-3 bg-surface-card rounded-xl border border-hairline p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Clock className="w-4 h-4 text-ink" />
                Deadline sắp tới
              </h2>
              <button onClick={() => setWorkspaceView('pipeline')}
                className="text-xs text-ink hover:text-[#242424] font-medium transition-colors flex items-center gap-1">
                Xem Pipeline <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {deadlines.length === 0 ? (
              <div className="text-sm text-muted text-center py-8">
                Không có deadline sắp tới
              </div>
            ) : (
              <div className="space-y-2">
                {deadlines.map(pb => {
                  const urgency = pb.daysLeft < 0 ? 'overdue' : pb.daysLeft < 3 ? 'urgent' : pb.daysLeft < 7 ? 'warning' : 'ok';
                  const urgencyStyles = {
                    overdue: 'border-red-200 bg-red-50/50',
                    urgent: 'border-red-100 bg-red-50/30',
                    warning: 'border-amber-100 bg-amber-50/30',
                    ok: 'border-hairline bg-white',
                  };
                  const urgencyText = {
                    overdue: { text: `${Math.abs(pb.daysLeft)} ngày quá hạn`, class: 'text-red-500' },
                    urgent: { text: `Còn ${pb.daysLeft} ngày`, class: 'text-red-500' },
                    warning: { text: `Còn ${pb.daysLeft} ngày`, class: 'text-amber-600' },
                    ok: { text: `Còn ${pb.daysLeft} ngày`, class: 'text-muted-soft' },
                  };
                  const meta = PHASE_META[pb.phaseType];
                  const uText = urgencyText[urgency];
                  return (
                    <div key={pb.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${urgencyStyles[urgency]}`}>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${meta.bg} ${meta.color} flex-shrink-0`}>
                        {pb.phaseType}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{pb.title}</div>
                        <div className="text-[10px] text-muted-soft">{pb.projectName}</div>
                      </div>
                      <span className={`text-xs font-semibold flex-shrink-0 ${uText.class}`}>
                        {uText.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Phase Distribution */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible"
            className="lg:col-span-2 bg-surface-card rounded-xl border border-hairline p-6">
            <h2 className="text-sm font-semibold text-ink mb-5">Phân bổ Phase</h2>
            <div className="space-y-2.5">
              {phaseDistribution.map(({ phase, meta, count }) => {
                const pct = phaseBlocks.length > 0 ? (count / phaseBlocks.length) * 100 : 0;
                return (
                  <div key={phase} className="flex items-center gap-2.5">
                    <span className="text-[10px] font-semibold w-6 text-muted">{phase}</span>
                    <div className="flex-1 h-6 bg-surface-soft rounded-lg overflow-hidden relative">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                        className={`h-full ${meta.bg} rounded-lg`} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-ink">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Activity Feed + Quick Actions row */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Activity Feed */}
          <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible"
            className="lg:col-span-2 bg-surface-card rounded-xl border border-hairline p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Activity className="w-4 h-4 text-ink" />
                Hoạt động gần đây
              </h2>
            </div>
            {recentActivity.length === 0 ? (
              <div className="text-sm text-muted text-center py-6">Chưa có hoạt động</div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((act, i) => {
                  const user = selectedOrg.members.find(m => m.id === act.userId);
                  const timeAgo = (() => {
                    const diff = differenceInDays(new Date(), new Date(act.timestamp));
                    if (diff === 0) return 'Hôm nay';
                    if (diff === 1) return 'Hôm qua';
                    return `${diff} ngày trước`;
                  })();
                  return (
                    <div key={act.id} className="flex items-start gap-3">
                      {user ? (
                        <img src={user.avatar} alt="" className="w-7 h-7 rounded-full bg-surface-card flex-shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-surface-card flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-semibold text-muted">{act.userId.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-body leading-relaxed">
                          <span className="font-medium text-ink">{user?.name || act.userId}</span>
                          {' '}{act.action}
                          <span className="text-muted-soft"> — {act.target}</span>
                        </p>
                        <p className="text-[10px] text-muted-soft mt-0.5">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible"
            className="bg-surface-card rounded-xl border border-hairline p-6">
            <h2 className="text-sm font-semibold text-ink mb-4">Thao tác nhanh</h2>
            <div className="space-y-2">
              <button onClick={() => setWorkspaceView('pipeline')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-soft border border-hairline
                           hover:border-gray-300 transition-all group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: '#11111108', color: '#111111' }}>
                  <GitBranch className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-ink">Xem Pipeline</div>
                  <div className="text-xs text-muted">{phaseBlocks.length} phase blocks</div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted ml-auto group-hover:text-ink" />
              </button>
              <button onClick={() => setWorkspaceView('team')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-soft border border-hairline
                           hover:border-gray-300 transition-all group">
                <div className="w-9 h-9 bg-surface-soft rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4 text-ink" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-ink">Nhóm</div>
                  <div className="text-xs text-muted">{selectedOrg.members.length} thành viên</div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted ml-auto group-hover:text-ink" />
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-hairline-soft">
              <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">Trạng thái</h3>
              {(['On Track', 'At Risk', 'Delayed'] as const).map(status => {
                const cfg = statusConfig[status];
                const count = status === 'On Track' ? stats.onTrack : status === 'At Risk' ? stats.atRisk : stats.delayed;
                return (
                  <div key={status} className="flex items-center gap-2.5 mb-2.5">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-sm text-body flex-1">{status}</span>
                    <span className="text-sm font-semibold text-ink">{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Recent Projects */}
        <motion.div custom={8} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-surface-card rounded-xl border border-hairline p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-ink">Dự án gần đây</h2>
            <button onClick={() => setWorkspaceView('pipeline')}
              className="text-xs text-ink hover:text-[#242424] font-medium transition-colors">
              Xem tất cả
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentProjects.map(project => {
              const daysLeft = differenceInDays(parseISO(project.targetDate), new Date());
              const cfg = statusConfig[project.status];
              const pbCount = phaseBlocks.filter(pb => pb.projectId === project.id).length;
              // Find current phase (latest active phase block)
              const latestPhase = phaseBlocks
                .filter(pb => pb.projectId === project.id)
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
              const latestPhaseMeta = latestPhase ? PHASE_META[latestPhase.phaseType] : null;
              return (
                <div key={project.id}
                  onClick={() => {
                    setWorkspaceView('pipeline');
                  }}
                  className="bg-white rounded-xl border border-hairline p-5 card-hover cursor-pointer group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-surface-card rounded-lg flex items-center justify-center">
                      <FolderKanban className="w-4 h-4 text-muted group-hover:text-ink transition-colors" />
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${cfg.color} ${cfg.bg}`}>
                      {project.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-ink truncate mb-1">{project.name}</h3>
                  <div className="flex items-center gap-2 mb-4">
                    {latestPhaseMeta && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${latestPhaseMeta.bg} ${latestPhaseMeta.color}`}>
                        {latestPhase?.phaseType}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-soft">{pbCount} phase</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted font-medium">Tiến độ</span>
                      <span className="text-xs font-semibold text-ink">{project.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-soft rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${project.progress}%`,
                          background: project.status === 'On Track' ? '#10b981' : project.status === 'At Risk' ? '#f59e0b' : '#ef4444',
                        }} />
                    </div>
                  </div>
                  <div className={`text-[10px] ${daysLeft < 7 ? 'text-red-500' : 'text-muted-soft'}`}>
                    {daysLeft > 0 ? `Còn ${daysLeft} ngày` : `${Math.abs(daysLeft)} ngày quá hạn`}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
