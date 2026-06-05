import { useApp } from '../../context/AppContext';
import { PHASE_META, DEV_PHASES } from '../../types';
import {
  FolderKanban, CheckCircle2, AlertTriangle, TrendingUp,
  Users, ArrowUpRight, GitBranch
} from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';
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
  'On Track': { color: 'text-emerald-600', bg: 'bg-emerald-50' },
  'At Risk': { color: 'text-amber-600', bg: 'bg-amber-50' },
  'Delayed': { color: 'text-red-600', bg: 'bg-red-50' },
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

  const recentProjects = useMemo(() => {
    return [...orgProjects]
      .sort((a, b) => differenceInDays(parseISO(b.startDate), parseISO(a.startDate)))
      .slice(0, 5);
  }, [orgProjects]);

  if (!selectedOrg) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">{selectedOrg.name}</p>
          </div>
          <div className="flex -space-x-2">
            {selectedOrg.members.slice(0, 4).map(m => (
              <img key={m.id} src={m.avatar} alt={m.name}
                className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" title={m.name} />
            ))}
            {selectedOrg.members.length > 4 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 
                              flex items-center justify-center text-xs text-gray-500">
                +{selectedOrg.members.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-7xl">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Projects', value: stats.total, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'On Track', value: stats.onTrack, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'At Risk', value: stats.atRisk, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
          ].map((stat, i) => (
            <motion.div key={stat.label} custom={i} variants={fadeUp} initial="hidden" animate="visible"
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Phase Distribution */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible"
            className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-5">Phase Distribution (7 Dev Phases)</h2>
            <div className="space-y-2.5">
              {phaseDistribution.map(({ phase, meta, count }) => {
                const pct = phaseBlocks.length > 0 ? (count / phaseBlocks.length) * 100 : 0;
                return (
                  <div key={phase} className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 w-40 shrink-0">
                      <span className={`w-2.5 h-2.5 rounded-full ${meta.bg.replace('bg-', 'bg-').replace('50', '400')}`} />
                      <span className="text-xs font-medium text-gray-700">{phase} · {meta.label}</span>
                    </div>
                    <div className="flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden relative">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                        className={`h-full ${meta.bg} rounded-lg`} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-700">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Quick Actions + Status */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible"
            className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button onClick={() => setWorkspaceView('pipeline')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100 
                           hover:border-gray-200 transition-all group">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GitBranch className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-slate-900">View Pipeline</div>
                  <div className="text-xs text-gray-500">{phaseBlocks.length} phase blocks</div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-slate-600" />
              </button>
              <button onClick={() => setWorkspaceView('team')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100 
                           hover:border-gray-200 transition-all group">
                <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4 text-violet-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-slate-900">Team</div>
                  <div className="text-xs text-gray-500">{selectedOrg.members.length} members</div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-slate-600" />
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Status</h3>
              {(['On Track', 'At Risk', 'Delayed'] as const).map(status => {
                const cfg = statusConfig[status];
                const count = status === 'On Track' ? stats.onTrack : status === 'At Risk' ? stats.atRisk : stats.delayed;
                return (
                  <div key={status} className="flex items-center gap-2.5 mb-2">
                    <div className={`w-2 h-2 rounded-full ${cfg.bg.replace('bg-', 'bg-').replace('50', '500')}`} />
                    <span className="text-sm text-gray-600 flex-1">{status}</span>
                    <span className="text-sm font-semibold text-slate-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Recent Projects */}
        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible"
          className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Projects</h2>
            <button onClick={() => setWorkspaceView('pipeline')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">View pipeline</button>
          </div>
          <div className="space-y-1">
            {recentProjects.map(project => {
              const daysLeft = differenceInDays(parseISO(project.targetDate), new Date());
              const cfg = statusConfig[project.status];
              const pbCount = phaseBlocks.filter(pb => pb.projectId === project.id).length;
              return (
                <div key={project.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                    <FolderKanban className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{project.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>
                        {project.status}
                      </span>
                      <span className="text-[10px] text-gray-400">{pbCount} phases</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-slate-900">{project.progress}%</div>
                    <div className={`text-[10px] ${daysLeft < 7 ? 'text-red-500' : 'text-gray-400'}`}>
                      {daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d overdue`}
                    </div>
                  </div>
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-700 rounded-full" style={{ width: `${project.progress}%` }} />
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
