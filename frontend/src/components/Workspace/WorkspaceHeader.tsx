import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { Bell, ChevronRight } from 'lucide-react';
import UserMenu from '../common/UserMenu';

export default function WorkspaceHeader() {
  const {
    selectedOrg, workspaceView, goToWorkspaceSelector,
    notifications, unreadCount, markNotificationRead, markAllNotificationsRead,
  } = useApp();

  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const viewLabel: Record<string, string> = {
    dashboard: 'Dashboard', pipeline: 'Pipeline', team: 'Nhóm',
    profile: 'Hồ sơ', settings: 'Cài đặt Workspace',
  };

  const relTime = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    return `${Math.floor(h / 24)} ngày trước`;
  };

  return (
    <header className="h-14 bg-white border-b border-hairline flex items-center justify-between px-6 flex-shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={goToWorkspaceSelector}
          className="text-muted hover:text-ink transition-colors font-medium">
          Workspaces
        </button>
        {selectedOrg && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-body font-medium">{selectedOrg.name}</span>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <span className="text-ink font-medium">{viewLabel[workspaceView] || workspaceView}</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button onClick={() => setShowNotif(!showNotif)}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center
                       hover:bg-surface-soft transition-colors text-muted hover:text-ink">
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-ink text-white text-[9px] font-bold
                               rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showNotif && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-hairline
                           shadow-xl shadow-black/[0.06] overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-hairline-soft flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Thông báo</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold text-ink">{unreadCount} mới</span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-muted-soft">Chưa có thông báo</div>
                  ) : notifications.map(n => (
                    <button key={n.id}
                      onClick={() => { if (!n.read) markNotificationRead(n.id); }}
                      className={`w-full text-left px-4 py-3 border-b border-hairline-soft last:border-0 transition-colors
                        ${n.read ? 'bg-white hover:bg-surface-soft' : 'bg-ink/[0.02] hover:bg-ink/[0.04]'}`}>
                      <div className="flex items-start gap-2.5">
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-ink flex-shrink-0 mt-1.5" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-body leading-relaxed">{n.title}</p>
                          {n.body && <p className="text-[11px] text-muted mt-0.5">{n.body}</p>}
                          <p className="text-[10px] text-muted-soft mt-0.5">{relTime(n.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {unreadCount > 0 && (
                  <div className="px-4 py-2.5 border-t border-hairline-soft">
                    <button onClick={() => markAllNotificationsRead()}
                      className="text-xs text-ink hover:text-[#242424] font-medium transition-colors w-full text-center">
                      Đánh dấu tất cả đã đọc
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User menu (dùng chung mọi view) */}
        <UserMenu />
      </div>
    </header>
  );
}
