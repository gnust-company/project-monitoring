import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS } from '../../data/mockData';
import type { UserRole } from '../../types';
import { X, Mail, Shield, Camera, Check, Lock, Trash2, AlertTriangle, User as UserIcon } from 'lucide-react';
import Dropdown from '../common/Dropdown';

const ROLE_OPTIONS: UserRole[] = ['PM', 'BA', 'SW_Architect', 'SysOps', 'UI_Designer', 'GUI', 'SW_Developer', 'SW_Tester'];

type Tab = 'profile' | 'password' | 'account';

export default function ProfileModal() {
  const {
    profileModalOpen, closeProfileModal,
    currentUser, currentUserEmail, updateCurrentUser, uploadAvatar,
    changePassword, deleteAccount,
  } = useApp();

  const [tab, setTab] = useState<Tab>('profile');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // name edit
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  // password
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdOk, setPwdOk] = useState(false);

  // delete account
  const [confirmDelete, setConfirmDelete] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  if (!profileModalOpen || !currentUser) return null;

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar(file);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const saveName = () => {
    if (!nameDraft.trim()) return;
    updateCurrentUser({ name: nameDraft.trim() });
    setEditingName(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null); setPwdOk(false);
    if (newPwd.length < 6) { setPwdError('Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Xác nhận mật khẩu không khớp'); return; }
    setPwdBusy(true);
    try {
      await changePassword(curPwd, newPwd);
      setPwdOk(true);
      setCurPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại');
    } finally {
      setPwdBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDelError(null);
    setDelBusy(true);
    try {
      await deleteAccount();
      closeProfileModal();
    } catch (err) {
      setDelError(err instanceof Error ? err.message : 'Xóa tài khoản thất bại');
      setDelBusy(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof UserIcon }[] = [
    { id: 'profile', label: 'Hồ sơ', icon: UserIcon },
    { id: 'password', label: 'Mật khẩu', icon: Lock },
    { id: 'account', label: 'Tài khoản', icon: AlertTriangle },
  ];

  const inputCls = 'w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
        onClick={closeProfileModal}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-hairline flex-shrink-0">
            <h2 className="text-base font-bold text-ink">Tài khoản của tôi</h2>
            <button onClick={closeProfileModal} className="p-1 hover:bg-stone-100 rounded-lg">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-3 pt-3 flex-shrink-0">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${tab === t.id ? 'bg-stone-100 text-ink' : 'text-stone-500 hover:bg-stone-50'}`}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          <div className="p-5 overflow-y-auto">
            {tab === 'profile' && (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => avatarInputRef.current?.click()}
                    title="Đổi ảnh đại diện"
                    className="relative w-16 h-16 rounded-2xl overflow-hidden group/avatar flex-shrink-0">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt="" className="w-16 h-16 rounded-2xl bg-stone-200 object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-stone-200 flex items-center justify-center">
                        <span className="text-xl font-bold text-stone-500">{currentUser.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
                  <div className="flex-1 min-w-0">
                    {editingName ? (
                      <div className="flex items-center gap-2">
                        <input type="text" value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                          autoFocus className="text-base font-bold text-ink bg-white border border-stone-300 rounded-lg px-2 py-1 w-full
                                     focus:outline-none focus:ring-2 focus:ring-ink/15" />
                        <button onClick={saveName} className="p-1.5 bg-ink text-white rounded-lg hover:bg-[#242424] flex-shrink-0">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button className="text-base font-bold text-ink hover:underline"
                        onClick={() => { setNameDraft(currentUser.name); setEditingName(true); }}>
                        {currentUser.name}
                      </button>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                      <Mail className="w-3 h-3" /> {currentUserEmail}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-stone-400" /> Vai trò
                  </label>
                  <Dropdown
                    className="w-full"
                    value={currentUser.role}
                    onChange={v => updateCurrentUser({ role: v as UserRole })}
                    options={ROLE_OPTIONS.map(r => ({ value: r, label: ROLE_LABELS[r] ?? r }))}
                  />
                </div>
              </div>
            )}

            {tab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 mb-1 block">Mật khẩu hiện tại</label>
                  <input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 mb-1 block">Mật khẩu mới</label>
                  <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 mb-1 block">Xác nhận mật khẩu mới</label>
                  <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required className={inputCls} />
                </div>
                {pwdError && <p className="text-[11px] text-error">{pwdError}</p>}
                {pwdOk && <p className="text-[11px] text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> Đã đổi mật khẩu thành công</p>}
                <button type="submit" disabled={pwdBusy}
                  className="w-full py-2.5 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-[#242424] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" /> Đổi mật khẩu
                </button>
              </form>
            )}

            {tab === 'account' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-error/30 bg-error/5 p-4">
                  <div className="flex items-center gap-2 text-error font-semibold text-sm mb-1">
                    <AlertTriangle className="w-4 h-4" /> Xóa tài khoản
                  </div>
                  <p className="text-xs text-stone-600 mb-3">
                    Hành động này không thể hoàn tác. Toàn bộ dữ liệu liên kết với tài khoản sẽ bị gỡ bỏ.
                    Nhập <strong className="text-ink">XÓA</strong> để xác nhận.
                  </p>
                  <input type="text" value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)}
                    placeholder="Nhập XÓA" className={inputCls + ' mb-2'} />
                  {delError && <p className="text-[11px] text-error mb-2">{delError}</p>}
                  <button onClick={handleDeleteAccount} disabled={confirmDelete !== 'XÓA' || delBusy}
                    className="w-full py-2.5 bg-error text-white text-sm font-semibold rounded-lg hover:bg-error/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" /> Xóa tài khoản vĩnh viễn
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
