import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, LayoutDashboard, Building2, Users, ArrowLeft, LogOut, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { adminApi } from '../../api';
import type { AdminStats, AdminUserInfo, AdminWorkspaceInfo } from '../../types';
import Avatar from '../common/Avatar';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminWorkspaces from './AdminWorkspaces';
import ResetPasswordModal from './ResetPasswordModal';
import GrantAdminModal from './GrantAdminModal';

type AdminTab = 'overview' | 'workspaces' | 'users';

const TABS: { key: AdminTab; label: string; icon: typeof Users }[] = [
  { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'workspaces', label: 'Workspaces', icon: Building2 },
  { key: 'users', label: 'Người dùng', icon: Users },
];

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function AdminLayout() {
  const { currentUser, goToWorkspaceSelector, logout } = useApp();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUserInfo | null>(null);
  const [adminTarget, setAdminTarget] = useState<AdminUserInfo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, u, w] = await Promise.all([
        adminApi.stats(), adminApi.users(), adminApi.workspaces(),
      ]);
      setStats(s); setUsers(u); setWorkspaces(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu quản trị');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Bảo vệ phía client: chỉ superuser mới thấy khu vực này
  if (!currentUser?.isSuperuser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-error" />
        </div>
        <p className="text-sm text-muted">Bạn không có quyền truy cập khu vực quản trị.</p>
        <button onClick={goToWorkspaceSelector}
          className="h-9 px-4 rounded-lg bg-ink text-white text-sm font-medium hover:bg-[#242424] transition-colors">
          Về Workspaces
        </button>
      </div>
    );
  }

  const userName = currentUser.name || 'Admin';

  return (
    <div className="min-h-screen bg-surface-soft/30 flex flex-col">
      {/* Header */}
      <header className="h-14 bg-white border-b border-hairline flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={goToWorkspaceSelector}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:bg-surface-soft hover:text-ink transition-colors"
            title="Về Workspaces">
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-ink">Bảng quản trị</p>
              <p className="text-[10px] text-muted-soft">Toàn hệ thống</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={userName} src={currentUser.avatar} className="w-7 h-7" />
            <span className="text-sm font-medium text-ink max-w-[140px] truncate hidden sm:block">{userName}</span>
          </div>
          <button onClick={logout}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:bg-error/5 hover:text-error transition-colors"
            title="Đăng xuất">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-hairline flex-shrink-0 sticky top-14 z-30">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-1">
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                  ${active ? 'text-ink' : 'text-muted hover:text-body'}`}>
                <t.icon className="w-4 h-4" /> {t.label}
                {active && (
                  <motion.div layoutId="adminTab"
                    className="absolute left-0 right-0 -bottom-px h-0.5 bg-ink rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {error ? (
          <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col items-center gap-3">
            <AlertCircle className="w-8 h-8 text-error" />
            <p className="text-sm text-muted">{error}</p>
            <button onClick={load}
              className="h-9 px-4 rounded-lg border border-hairline text-sm font-medium text-body hover:bg-surface-soft transition-colors">
              Thử lại
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} variants={pageVariants} initial="initial" animate="animate" exit="exit">
              {tab === 'overview' && (
                <AdminDashboard
                  stats={stats} users={users} workspaces={workspaces}
                  onSeeUsers={() => setTab('users')} onSeeWorkspaces={() => setTab('workspaces')} />
              )}
              {tab === 'workspaces' && <AdminWorkspaces workspaces={workspaces} loading={loading} />}
              {tab === 'users' && (
                <AdminUsers
                  users={users} loading={loading} currentUserId={currentUser.id}
                  onReset={setResetTarget} onToggleAdmin={setAdminTarget} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} onDone={load} />
      <GrantAdminModal user={adminTarget} onClose={() => setAdminTarget(null)} onDone={load} />
    </div>
  );
}
