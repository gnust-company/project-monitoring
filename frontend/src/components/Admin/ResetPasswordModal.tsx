import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, X, AlertTriangle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import type { AdminUserInfo } from '../../types';
import { adminApi } from '../../api';
import Avatar from '../common/Avatar';

interface Props {
  user: AdminUserInfo | null;
  onClose: () => void;
  onDone: () => void; // báo thành công (để toast/refresh nếu cần)
}

// Sinh mật khẩu ngẫu nhiên mạnh để admin dùng nhanh
function randomPassword(len = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
  const arr = crypto.getRandomValues(new Uint32Array(len));
  return Array.from(arr, n => chars[n % chars.length]).join('');
}

export default function ResetPasswordModal({ user, onClose, onDone }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(false); // bước xác nhận thứ 2
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // State reset tự nhiên nhờ remount theo key={user.id} ở nơi mount (AdminLayout).

  const tooShort = password.length > 0 && password.length < 6;
  const canProceed = password.length >= 6 && !submitting;

  const handleSubmit = async () => {
    if (!user || !canProceed) return;
    if (!confirm) { setConfirm(true); return; } // bấm lần 1: chuyển sang xác nhận
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.resetPassword(user.id, password);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đặt lại mật khẩu thất bại');
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
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <KeyRound className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Đặt lại mật khẩu</h3>
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
              {/* Target user */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-soft">
                <Avatar name={user.name} src={user.avatar} className="w-10 h-10" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{user.name}</p>
                  <p className="text-[11px] text-muted truncate">{user.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">Mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    autoFocus
                    onChange={e => { setPassword(e.target.value); setConfirm(false); }}
                    placeholder="Tối thiểu 6 ký tự"
                    className="no-native-reveal w-full h-10 pl-3 pr-20 rounded-lg border border-hairline bg-white text-sm text-ink
                               focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/30 transition-all" />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" onClick={() => setShow(s => !s)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-surface-soft hover:text-ink transition-colors">
                      {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  {tooShort
                    ? <span className="text-[11px] text-error">Cần ít nhất 6 ký tự</span>
                    : <span className="text-[11px] text-muted-soft">Gửi mật khẩu mới cho người dùng qua kênh an toàn</span>}
                  <button type="button"
                    onClick={() => { setPassword(randomPassword()); setShow(true); setConfirm(false); }}
                    className="text-[11px] font-medium text-ink hover:underline">
                    Tạo ngẫu nhiên
                  </button>
                </div>
              </div>

              {/* Confirm warning (bước 2) */}
              <AnimatePresence>
                {confirm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden">
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[12px] text-amber-800 leading-relaxed">
                        Mật khẩu hiện tại của <strong>{user.name}</strong> sẽ bị thay thế ngay lập tức.
                        Bấm <strong>Xác nhận đặt lại</strong> để tiếp tục.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && <p className="text-xs text-error">{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-hairline-soft bg-surface-soft/40">
              <button onClick={onClose}
                className="h-9 px-4 rounded-lg text-sm font-medium text-body hover:bg-surface-soft transition-colors">
                Hủy
              </button>
              <button onClick={handleSubmit} disabled={!canProceed}
                className={`h-9 px-4 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-colors
                  ${confirm ? 'bg-amber-600 hover:bg-amber-700' : 'bg-ink hover:bg-[#242424]'}
                  disabled:opacity-40 disabled:cursor-not-allowed`}>
                {confirm ? <ShieldCheck className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                {submitting ? 'Đang đặt lại…' : confirm ? 'Xác nhận đặt lại' : 'Đặt lại mật khẩu'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
