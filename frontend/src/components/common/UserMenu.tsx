import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { ChevronDown, User, Settings, CheckCircle2, ShieldCheck, LogOut } from 'lucide-react';
import Avatar from './Avatar';

// Menu tài khoản dùng chung cho mọi view (landing / selector / workspace).
// Cùng một bộ option để trải nghiệm nhất quán; các mục phụ thuộc ngữ cảnh
// (Cài đặt Workspace) chỉ hiện khi đang ở trong một workspace.
export default function UserMenu({ align = 'right' }: { align?: 'left' | 'right' }) {
  const {
    currentUser, currentUserEmail, currentView, selectedOrgId,
    openProfileModal, setWorkspaceView, goToWorkspaceSelector, goToAdmin, logout,
  } = useApp();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!currentUser) return null;

  const name = currentUser.name || currentUserEmail?.split('@')[0] || 'User';
  const inWorkspace = currentView === 'workspace' && !!selectedOrgId;

  const item = 'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-body hover:bg-surface-soft hover:text-ink transition-colors';

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-lg hover:bg-surface-soft transition-colors">
        <Avatar name={name} src={currentUser.avatar} className="w-8 h-8" />
        <span className="text-sm font-medium text-ink max-w-[140px] truncate hidden sm:block">{name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.18 }}
            className={`absolute top-full mt-2 w-56 bg-white rounded-xl border border-hairline shadow-xl shadow-black/[0.06] overflow-hidden z-50
              ${align === 'right' ? 'right-0' : 'left-0'}`}>
            <div className="px-4 py-3 border-b border-hairline-soft">
              <p className="text-sm font-semibold text-ink truncate">{name}</p>
              <p className="text-[11px] text-muted-soft mt-0.5 truncate">{currentUserEmail}</p>
            </div>
            <div className="p-1.5">
              <button onClick={() => { setOpen(false); openProfileModal(); }} className={item}>
                <User className="w-4 h-4" /> Hồ sơ của tôi
              </button>
              {inWorkspace && (
                <button onClick={() => { setOpen(false); setWorkspaceView('settings'); }} className={item}>
                  <Settings className="w-4 h-4" /> Cài đặt Workspace
                </button>
              )}
              <button onClick={() => { setOpen(false); goToWorkspaceSelector(); }} className={item}>
                <CheckCircle2 className="w-4 h-4" /> {inWorkspace ? 'Chuyển Workspace' : 'Workspaces của tôi'}
              </button>
              {currentUser.isSuperuser && (
                <button onClick={() => { setOpen(false); goToAdmin(); }} className={item}>
                  <ShieldCheck className="w-4 h-4" /> Bảng quản trị
                </button>
              )}
            </div>
            <div className="p-1.5 border-t border-hairline-soft">
              <button onClick={() => { setOpen(false); logout(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-error hover:bg-error/5 transition-colors">
                <LogOut className="w-4 h-4" /> Đăng xuất
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
