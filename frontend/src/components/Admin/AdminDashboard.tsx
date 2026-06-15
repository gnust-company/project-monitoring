import { motion } from 'framer-motion';
import { Users, Building2, FolderKanban, Layers, ShieldCheck, Crown, ArrowRight } from 'lucide-react';
import type { AdminStats, AdminUserInfo, AdminWorkspaceInfo } from '../../types';
import Avatar from '../common/Avatar';

interface Props {
  stats: AdminStats | null;
  users: AdminUserInfo[];
  workspaces: AdminWorkspaceInfo[];
  onSeeUsers: () => void;
  onSeeWorkspaces: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } }),
};

function StatCard({ icon: Icon, label, value, sub, i }: {
  icon: typeof Users; label: string; value: number; sub?: string; i: number;
}) {
  return (
    <motion.div custom={i} variants={fadeUp} initial="hidden" animate="visible"
      className="bg-white rounded-2xl border border-hairline p-5 hover:shadow-lg hover:shadow-black/[0.04] transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface-soft flex items-center justify-center">
          <Icon className="w-5 h-5 text-ink" />
        </div>
        {sub && <span className="text-[11px] font-medium text-muted-soft">{sub}</span>}
      </div>
      <div className="text-3xl font-semibold text-ink tracking-tight tabular-nums">{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </motion.div>
  );
}

export default function AdminDashboard({ stats, users, workspaces, onSeeUsers, onSeeWorkspaces }: Props) {
  const topWorkspaces = [...workspaces].sort((a, b) => b.projectCount - a.projectCount).slice(0, 5);
  const recentUsers = [...users]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard i={0} icon={Users} label="Người dùng" value={stats?.userCount ?? 0}
          sub={stats ? `${stats.superuserCount} admin` : undefined} />
        <StatCard i={1} icon={Building2} label="Workspace" value={stats?.workspaceCount ?? 0} />
        <StatCard i={2} icon={FolderKanban} label="Dự án" value={stats?.projectCount ?? 0} />
        <StatCard i={3} icon={Layers} label="Phase block" value={stats?.phaseBlockCount ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top workspaces */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-white rounded-2xl border border-hairline overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-hairline-soft">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted" />
              <h3 className="text-sm font-semibold text-ink">Workspace nổi bật</h3>
            </div>
            <button onClick={onSeeWorkspaces}
              className="text-xs text-muted hover:text-ink font-medium flex items-center gap-1 transition-colors">
              Tất cả <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-hairline-soft">
            {topWorkspaces.length === 0 && (
              <div className="px-5 py-8 text-center text-xs text-muted-soft">Chưa có workspace</div>
            )}
            {topWorkspaces.map(w => (
              <div key={w.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-surface-card flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-ink">{w.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{w.name}</p>
                    <p className="text-[11px] text-muted-soft">{w.memberCount} thành viên</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-body flex-shrink-0">{w.projectCount} dự án</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent users */}
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-white rounded-2xl border border-hairline overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-hairline-soft">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted" />
              <h3 className="text-sm font-semibold text-ink">Người dùng mới</h3>
            </div>
            <button onClick={onSeeUsers}
              className="text-xs text-muted hover:text-ink font-medium flex items-center gap-1 transition-colors">
              Tất cả <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-hairline-soft">
            {recentUsers.length === 0 && (
              <div className="px-5 py-8 text-center text-xs text-muted-soft">Chưa có người dùng</div>
            )}
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.name} src={u.avatar} className="w-8 h-8" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate flex items-center gap-1.5">
                      {u.name}
                      {u.isSuperuser && <Crown className="w-3 h-3 text-amber-500" />}
                    </p>
                    <p className="text-[11px] text-muted-soft truncate">{u.email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-muted px-2 py-0.5 rounded-md bg-surface-soft flex-shrink-0">{u.role}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Superuser note */}
      <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible"
        className="flex items-center gap-3 p-4 rounded-xl bg-surface-soft border border-hairline-soft">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <p className="text-xs text-muted leading-relaxed">
          Bạn đang ở khu vực quản trị toàn hệ thống. Mọi thao tác (xem thông tin, đặt lại mật khẩu)
          chỉ dành cho tài khoản <strong className="text-body">superuser</strong>.
        </p>
      </motion.div>
    </div>
  );
}
