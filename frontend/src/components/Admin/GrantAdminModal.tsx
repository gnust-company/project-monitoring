import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldPlus, ShieldMinus, X, AlertTriangle } from 'lucide-react';
import type { AdminUserInfo } from '../../types';
import { adminApi } from '../../api';
import Avatar from '../common/Avatar';

interface Props {
  user: AdminUserInfo | null;  // user mục tiêu; grant nếu chưa admin, revoke nếu đang admin
  onClose: () => void;
  onDone: () => void;
}

export default function GrantAdminModal({ user, onClose, onDone }: Props) {
  // State reset tự nhiên nhờ remount theo key={user.id} ở nơi mount (AdminLayout) —
  // không cần effect đồng bộ (tránh react-hooks/set-state-in-effect).
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const granting = user ? !user.isSuperuser : true; // true = cấp quyền, false = thu hồi

  // Tailwind cần class tĩnh (không nội suy) → chọn sẵn theo grant/revoke
  const s = granting
    ? { iconWrap: 'bg-emerald-50', icon: 'text-emerald-600', box: 'bg-emerald-50 border-emerald-200',
        boxIcon: 'text-emerald-600', boxText: 'text-emerald-800', btn: 'bg-emerald-600 hover:bg-emerald-700' }
    : { iconWrap: 'bg-amber-50', icon: 'text-amber-600', box: 'bg-amber-50 border-amber-200',
        boxIcon: 'text-amber-600', boxText: 'text-amber-800', btn: 'bg-amber-600 hover:bg-amber-700' };

  const handleConfirm = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.setSuperuser(user.id, granting);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật quyền thất bại');
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {user && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl border border-hairline shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-hairline-soft">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.iconWrap}`}>
                  {granting
                    ? <ShieldPlus className={`w-4.5 h-4.5 ${s.icon}`} />
                    : <ShieldMinus className={`w-4.5 h-4.5 ${s.icon}`} />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {granting ? 'Cấp quyền Admin' : 'Thu hồi quyền Admin'}
                  </h3>
                  <p className="text-[11px] text-muted-soft">Thao tác này cần xác nhận</p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-surface-soft hover:text-ink transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-soft">
                <Avatar name={user.name} src={user.avatar} className="w-10 h-10" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{user.name}</p>
                  <p className="text-[11px] text-muted truncate">{user.email}</p>
                </div>
              </div>

              <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${s.box}`}>
                <AlertTriangle className={`w-4 h-4 ${s.boxIcon} flex-shrink-0 mt-0.5`} />
                <p className={`text-[12px] leading-relaxed ${s.boxText}`}>
                  {granting ? (
                    <>Sau khi cấp quyền, <strong>{user.name}</strong> trở thành <strong>superuser</strong> —
                    toàn quyền quản trị hệ thống (xem mọi workspace/user, đặt lại mật khẩu, cấp quyền admin).</>
                  ) : (
                    <><strong>{user.name}</strong> sẽ mất toàn bộ quyền quản trị và không truy cập được
                    khu vực admin nữa.</>
                  )}
                </p>
              </div>

              {error && <p className="text-xs text-error">{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-hairline-soft bg-surface-soft/40">
              <button onClick={onClose}
                className="h-9 px-4 rounded-lg text-sm font-medium text-body hover:bg-surface-soft transition-colors">
                Hủy
              </button>
              <button onClick={handleConfirm} disabled={submitting}
                className={`h-9 px-4 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed ${s.btn}`}>
                {granting ? <ShieldPlus className="w-4 h-4" /> : <ShieldMinus className="w-4 h-4" />}
                {submitting ? 'Đang lưu…' : granting ? 'Xác nhận cấp quyền' : 'Xác nhận thu hồi'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
