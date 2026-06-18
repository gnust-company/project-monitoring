import { useApp } from '../../context/AppContext';
import { PHASE_META, DEV_PHASES } from '../../types';
import type { ProjectStatus } from '../../types';
import {
  FolderKanban, CheckCircle2, AlertTriangle, Clock,
  Users, ArrowUpRight, GitBranch, Activity, ChevronRight, Gauge,
} from 'lucide-react';
import { parseISO, differenceInDays, format } from 'date-fns';
import { motion } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';
import Avatar from '../common/Avatar';
import { computeProjectStatus, projectPhaseProgress } from '../../lib/projectStatus';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const statusConfig = {
  'On Track': { color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', bar: '#10b981', icon: CheckCircle2 },
  'At Risk': { color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500', bar: '#f59e0b', icon: AlertTriangle },
  'Delayed': { color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', bar: '#ef4444', icon: Clock },
};

// ─── Count-up: số chạy mượt từ 0 lên target khi mount ────────────────
function useCountUp(target: number, duration = 0.9) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const v = useCountUp(value);
  return <>{v}{suffix}</>;
}

// ─── Progress ring: vòng tiến độ SVG, animate stroke ─────────────────
function ProgressRing({ pct, size = 150, stroke = 11 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#f1f0ee" strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - pct / 100) }}
        transition={{ duration: 1.2, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

export default function DashboardView() {
  const {
    selectedOrg, orgProjects, phaseBlocks,
    setWorkspaceView, openProjectDetail, setStatusFilter,
  } = useApp();

  // Trạng thái & tiến độ auto (derived) cho từng dự án
  const statusOf = useMemo(() => {
    const m = new Map<string, ProjectStatus>();
    orgProjects.forEach(p => m.set(p.id, computeProjectStatus(p, phaseBlocks)));
    return m;
  }, [orgProjects, phaseBlocks]);

  const progressOf = useMemo(() => {
    const m = new Map<string, number>();
    orgProjects.forEach(p => {
      const pct = Math.round(projectPhaseProgress(phaseBlocks.filter(b => b.projectId === p.id)) * 100);
      m.set(p.id, pct);
    });
    return m;
  }, [orgProjects, phaseBlocks]);

  const stats = useMemo(() => {
    const total = orgProjects.length;
    const onTrack = orgProjects.filter(p => statusOf.get(p.id) === 'On Track').length;
    const atRisk = orgProjects.filter(p => statusOf.get(p.id) === 'At Risk').length;
    const delayed = orgProjects.filter(p => statusOf.get(p.id) === 'Delayed').length;
    const avgProgress = total > 0 ? Math.round(orgProjects.reduce((s, p) => s + (progressOf.get(p.id) ?? 0), 0) / total) : 0;
    const inProgressPhases = phaseBlocks.filter(pb => pb.tag === 'Inprogress').length;
    const allTasks = phaseBlocks.reduce((s, pb) => s + pb.checklist.length, 0);
    const doneTasks = phaseBlocks.reduce((s, pb) => s + pb.checklist.filter(c => c.done).length, 0);
    const dueIn7 = orgProjects.filter(p => {
      const d = differenceInDays(parseISO(p.targetDate), new Date());
      return d >= 0 && d <= 7;
    }).length;
    return { total, onTrack, atRisk, delayed, avgProgress, inProgressPhases, allTasks, doneTasks, dueIn7 };
  }, [orgProjects, phaseBlocks, statusOf, progressOf]);

  const phaseDistribution = useMemo(() => {
    return DEV_PHASES.map(phase => ({
      phase,
      meta: PHASE_META[phase],
      count: phaseBlocks.filter(pb => pb.phaseType === phase).length,
    }));
  }, [phaseBlocks]);

  const maxPhaseCount = Math.max(1, ...phaseDistribution.map(p => p.count));

  // Deadline items — phase blocks sorted by end date
  const deadlines = useMemo(() => {
    return phaseBlocks
      .map(pb => {
        const daysLeft = differenceInDays(parseISO(pb.endDate), new Date());
        const project = orgProjects.find(p => p.id === pb.projectId);
        return { ...pb, daysLeft, projectName: project?.name || '' };
      })
      .filter(pb => pb.daysLeft >= -5 && pb.tag !== 'Complete' && pb.tag !== 'Canceled')
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

  // Click KPI → nhảy sang Pipeline đã lọc đúng trạng thái đó
  const goToFiltered = (status: ProjectStatus | 'All') => {
    setStatusFilter(status);
    setWorkspaceView('pipeline');
  };

  const taskPct = stats.allTasks > 0 ? Math.round((stats.doneTasks / stats.allTasks) * 100) : 0;

  const kpis: Array<{
    label: string; value: number; sub: string; icon: typeof FolderKanban;
    accent?: string; barColor?: string; share?: number; status: ProjectStatus | 'All';
  }> = [
    { label: 'Tổng dự án', value: stats.total, sub: `${phaseBlocks.length} phase blocks`, icon: FolderKanban, status: 'All' },
    { label: 'Đúng tiến độ', value: stats.onTrack, sub: 'On Track', icon: CheckCircle2, accent: 'text-emerald-600', barColor: '#10b981', share: stats.total ? (stats.onTrack / stats.total) * 100 : 0, status: 'On Track' },
    { label: 'Có rủi ro', value: stats.atRisk, sub: 'At Risk — cần chú ý', icon: AlertTriangle, accent: 'text-amber-600', barColor: '#f59e0b', share: stats.total ? (stats.atRisk / stats.total) * 100 : 0, status: 'At Risk' },
    { label: 'Chậm tiến độ', value: stats.delayed, sub: 'Delayed — cần xử lý', icon: Clock, accent: 'text-red-600', barColor: '#ef4444', share: stats.total ? (stats.delayed / stats.total) * 100 : 0, status: 'Delayed' },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6">
        {/* Greeting */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
          className="flex items-end justify-between flex-wrap gap-2 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-ink tracking-tight">Tổng quan — {selectedOrg.name}</h1>
            <p className="text-sm text-stone-500 mt-0.5 font-light">
              {format(new Date(), 'EEEE, dd/MM/yyyy')} · {stats.dueIn7 > 0
                ? <span className="text-amber-600 font-medium">{stats.dueIn7} dự án đến hạn trong 7 ngày tới</span>
                : 'Không có dự án nào đến hạn trong 7 ngày tới'}
            </p>
          </div>
        </motion.div>

        {/* KPI Row — click để lọc Pipeline */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((kpi, i) => (
            <motion.button key={kpi.label} custom={i} variants={fadeUp} initial="hidden" animate="visible"
              onClick={() => goToFiltered(kpi.status)}
              whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
              className="bg-surface-card rounded-xl border border-hairline p-5 text-left card-hover cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-ink/[0.03] ${kpi.accent ?? 'text-ink'}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className={`text-3xl font-semibold tracking-tight ${kpi.accent ?? 'text-ink'}`}>
                <CountUp value={kpi.value} />
              </div>
              <div className="text-xs text-body mt-0.5 font-medium">{kpi.label}</div>
              <div className="text-[10px] text-muted-soft mt-1">{kpi.sub}</div>
              {/* Share bar — tỷ trọng trong tổng dự án */}
              {kpi.share !== undefined && (
                <div className="mt-2.5 h-1 bg-stone-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${kpi.share}%` }}
                    transition={{ duration: 0.9, delay: 0.4 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full" style={{ background: kpi.barColor }} />
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Health row: Ring + Deadline */}
        <div className="grid lg:grid-cols-5 gap-6 mb-6">
          {/* Tiến độ trung bình */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible"
            className="lg:col-span-2 bg-surface-card rounded-xl border border-hairline p-6 flex flex-col">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4" /> Sức khỏe workspace
            </h2>
            <div className="flex-1 flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <ProgressRing pct={stats.avgProgress} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-semibold text-ink tracking-tight">
                    <CountUp value={stats.avgProgress} suffix="%" />
                  </span>
                  <span className="text-[10px] text-stone-400">tiến độ TB</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {(['On Track', 'At Risk', 'Delayed'] as const).map(status => {
                  const cfg = statusConfig[status];
                  const count = status === 'On Track' ? stats.onTrack : status === 'At Risk' ? stats.atRisk : stats.delayed;
                  const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <button key={status} onClick={() => goToFiltered(status)}
                      className="w-full group text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span className="text-xs text-body flex-1 group-hover:text-ink transition-colors">{status}</span>
                        <span className="text-xs font-semibold text-ink">{count} · {pct}%</span>
                      </div>
                      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full" style={{ background: cfg.bar }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Deadline sắp tới */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible"
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
                {deadlines.map((pb, i) => {
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
                    <motion.div key={pb.id}
                      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.07, duration: 0.35 }}
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
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* Phase Distribution + Quick stats */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible"
            className="lg:col-span-2 bg-surface-card rounded-xl border border-hairline p-6">
            <h2 className="text-sm font-semibold text-ink mb-1">Phân bổ Phase</h2>
            <p className="text-[10px] text-muted-soft mb-4">Phase nào dồn nhiều block nhất = bottleneck tiềm năng</p>
            <div className="space-y-2.5">
              {phaseDistribution.map(({ phase, meta, count }, i) => {
                const pct = (count / maxPhaseCount) * 100;
                return (
                  <div key={phase} className="flex items-center gap-2.5">
                    <div className="w-48 flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} flex-shrink-0`}>{phase}</span>
                      <span className="text-[11px] text-body truncate" title={`${phase} — ${meta.fullLabel}`}>{meta.fullLabel}</span>
                    </div>
                    <div className="flex-1 h-6 bg-surface-soft rounded-lg overflow-hidden relative">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        className={`h-full ${meta.solid} opacity-80 rounded-lg`} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-ink">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Quick stats */}
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible"
            className="bg-surface-card rounded-xl border border-hairline p-6 flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 text-[10px] text-stone-400 font-medium mb-1">
                <Users className="w-3.5 h-3.5" /> Thành viên
              </div>
              <div className="text-2xl font-semibold text-ink tracking-tight">
                <CountUp value={selectedOrg.members.length} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] text-stone-400 font-medium mb-1">
                <GitBranch className="w-3.5 h-3.5" /> Phase đang In progress
              </div>
              <div className="text-2xl font-semibold text-amber-600 tracking-tight">
                <CountUp value={stats.inProgressPhases} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium mb-1.5">
                <span>Task toàn workspace</span>
                <span className="text-ink font-semibold">{stats.doneTasks}/{stats.allTasks} · {taskPct}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${taskPct}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full bg-emerald-500 rounded-full" />
              </div>
            </div>
            <button onClick={() => setWorkspaceView('team')}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-hairline
                         text-xs font-medium text-body hover:bg-surface-soft hover:text-ink transition-all">
              Xem Nhóm <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </div>

        {/* Activity Feed + Recent projects */}
        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div custom={8} variants={fadeUp} initial="hidden" animate="visible"
            className="bg-surface-card rounded-xl border border-hairline p-6">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2 mb-5">
              <Activity className="w-4 h-4 text-ink" />
              Hoạt động gần đây
            </h2>
            {recentActivity.length === 0 ? (
              <div className="text-sm text-muted text-center py-6">Chưa có hoạt động</div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(act => {
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
                        <Avatar name={user.name} src={user.avatar} className="w-7 h-7 flex-shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-surface-card flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-semibold text-muted">{act.userId.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-body leading-relaxed">
                          <span className="font-medium text-ink">{user?.name || act.userId}</span>
                          {' '}{act.action}
                          <span className="text-muted-soft"> — {act.phaseTitle}</span>
                        </p>
                        <p className="text-[10px] text-muted-soft mt-0.5">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Recent Projects */}
          <motion.div custom={9} variants={fadeUp} initial="hidden" animate="visible"
            className="lg:col-span-2 bg-surface-card rounded-xl border border-hairline p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-ink">Dự án gần đây</h2>
              <button onClick={() => setWorkspaceView('pipeline')}
                className="text-xs text-ink hover:text-[#242424] font-medium transition-colors">
                Xem tất cả
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {recentProjects.map(project => {
                const daysLeft = differenceInDays(parseISO(project.targetDate), new Date());
                const status = statusOf.get(project.id) ?? project.status;
                const progress = progressOf.get(project.id) ?? project.progress;
                const cfg = statusConfig[status];
                const pbCount = phaseBlocks.filter(pb => pb.projectId === project.id).length;
                const latestPhase = phaseBlocks
                  .filter(pb => pb.projectId === project.id)
                  .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
                const latestPhaseMeta = latestPhase ? PHASE_META[latestPhase.phaseType] : null;
                return (
                  <div key={project.id}
                    onClick={() => openProjectDetail(project.id)}
                    className="bg-white rounded-xl border border-hairline p-5 card-hover cursor-pointer group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-surface-card rounded-lg flex items-center justify-center">
                        <FolderKanban className="w-4 h-4 text-muted group-hover:text-ink transition-colors" />
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${cfg.color} ${cfg.bg}`}>
                        {status}
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
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted font-medium">Tiến độ</span>
                        <span className="text-xs font-semibold text-ink">{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-soft rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full"
                          style={{ background: cfg.bar }} />
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
    </div>
  );
}
