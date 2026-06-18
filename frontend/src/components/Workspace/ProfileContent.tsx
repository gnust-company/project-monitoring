import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS } from '../../data/mockData';
import { PHASE_META } from '../../types';
import type { UserRole } from '../../types';
import { isPhaseComplete } from '../../lib/projectStatus';
import {
  Mail, Shield, FolderKanban, GitBranch, CheckSquare, Layers,
  Pencil, Check, ChevronRight, Camera, Lock, Trash2, AlertTriangle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Dropdown from '../common/Dropdown';

const ROLE_OPTIONS: UserRole[] = ['PM', 'BA', 'SW_Architect', 'SysOps', 'UI_Designer', 'GUI', 'SW_Developer', 'SW_Tester'];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

// Thân hồ sơ dùng chung cho ProfileView (trong workspace) và ProfileModal (toàn cục).
// onOpenPhase: điều hướng khi bấm 1 phase được giao (chỉ có khi đang ở trong workspace).
export default function ProfileContent({ onOpenPhase }: { onOpenPhase?: (phaseId: string) => void }) {
  const {
    currentUser, currentUserEmail, updateCurrentUser, uploadAvatar,
    organizations, phaseBlocks, orgProjects,
    changePassword, deleteAccount,
  } = useApp();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar(file);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  // Đổi mật khẩu
  const [showPwd, setShowPwd] = useState(false);
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdOk, setPwdOk] = useState(false);

  // Xóa tài khoản
  const [confirmDelete, setConfirmDelete] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (!currentUser) return { workspaces: 0, projects: 0, assignedPhases: 0, openTasks: 0 };
    const myPbs = phaseBlocks.filter(pb =>
      pb.assignee === currentUser.id || pb.participants.includes(currentUser.id));
    const projectIds = new Set(myPbs.map(pb => pb.projectId));
    const assignedPhases = phaseBlocks.filter(pb => pb.assignee === currentUser.id);
    const openTasks = myPbs
      .filter(pb => !isPhaseComplete(pb))
      .reduce((sum, pb) => sum + pb.checklist.filter(c => !c.done).length, 0);
    return {
      workspaces: organizations.filter(o => o.members.some(m => m.id === currentUser.id)).length,
      projects: projectIds.size,
      assignedPhases: assignedPhases.length,
      openTasks,
    };
  }, [currentUser, phaseBlocks, organizations]);

  const assignedBlocks = useMemo(() => {
    if (!currentUser) return [];
    return phaseBlocks
      .filter(pb => pb.assignee === currentUser.id)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [currentUser, phaseBlocks]);

  if (!currentUser) return null;

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
    } catch (err) {
      setDelError(err instanceof Error ? err.message : 'Xóa tài khoản thất bại');
      setDelBusy(false);
    }
  };

  const statCards = [
    { label: 'Workspace', value: stats.workspaces, icon: Layers },
    { label: 'Dự án tham gia', value: stats.projects, icon: FolderKanban },
    { label: 'Phase được giao', value: stats.assignedPhases, icon: GitBranch },
    { label: 'Task đang mở', value: stats.openTasks, icon: CheckSquare },
  ];

  const inputCls = 'w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Identity card */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
        className="bg-surface-card rounded-2xl border border-hairline p-6 mb-6">
        <div className="flex items-center gap-5 flex-wrap">
          <button type="button" onClick={() => avatarInputRef.current?.click()}
            title="Đổi ảnh đại diện"
            className="relative w-20 h-20 rounded-2xl overflow-hidden group/avatar flex-shrink-0">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="" className="w-20 h-20 rounded-2xl bg-stone-200 object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-stone-200 flex items-center justify-center">
                <span className="text-2xl font-bold text-stone-500">{currentUser.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
          <div className="flex-1 min-w-[220px]">
            {editingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input type="text" value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  autoFocus
                  className="text-xl font-bold text-ink bg-white border border-stone-300 rounded-lg px-3 py-1
                             focus:outline-none focus:ring-2 focus:ring-ink/15" />
                <button onClick={saveName} className="p-1.5 bg-ink text-white rounded-lg hover:bg-[#242424]">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer mb-1"
                onClick={() => { setNameDraft(currentUser.name); setEditingName(true); }}>
                <h1 className="text-xl font-bold text-ink">{currentUser.name}</h1>
                <Pencil className="w-3.5 h-3.5 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
              <Mail className="w-3 h-3" /> {currentUserEmail}
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
              <Dropdown
                className="w-52"
                value={currentUser.role}
                onChange={v => updateCurrentUser({ role: v as UserRole })}
                options={ROLE_OPTIONS.map(r => ({ value: r, label: ROLE_LABELS[r] ?? r }))}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <motion.div key={s.label} custom={i + 1} variants={fadeUp} initial="hidden" animate="visible"
            className="bg-surface-card rounded-xl border border-hairline p-4">
            <div className="flex items-center gap-2 text-[10px] text-stone-400 font-medium mb-1.5">
              <s.icon className="w-3.5 h-3.5" /> {s.label}
            </div>
            <div className="text-2xl font-semibold text-ink tracking-tight">{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Assigned phases */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible"
        className="bg-surface-card rounded-2xl border border-hairline p-6 mb-6">
        <h2 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
          <GitBranch className="w-4 h-4" /> Phase được giao ({assignedBlocks.length})
        </h2>
        {assignedBlocks.length === 0 ? (
          <div className="text-sm text-stone-400 text-center py-8">
            Chưa có phase nào được giao cho bạn
          </div>
        ) : (
          <div className="space-y-1.5">
            {assignedBlocks.map(pb => {
              const meta = PHASE_META[pb.phaseType];
              const project = orgProjects.find(p => p.id === pb.projectId);
              const done = pb.checklist.filter(c => c.done).length;
              const pct = pb.checklist.length > 0 ? Math.round((done / pb.checklist.length) * 100) : 0;
              const clickable = !!onOpenPhase;
              return (
                <button key={pb.id}
                  onClick={() => onOpenPhase?.(pb.id)}
                  disabled={!clickable}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border border-hairline bg-white text-left group
                    ${clickable ? 'hover:border-stone-300 hover:shadow-sm transition-all' : 'cursor-default'}`}>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${meta.bg} ${meta.color} flex-shrink-0`}>
                    {pb.phaseType}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{pb.title}</div>
                    <div className="text-[10px] text-stone-400">
                      {project?.name} · {format(parseISO(pb.startDate), 'dd/MM')} – {format(parseISO(pb.endDate), 'dd/MM/yyyy')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${pct >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'}`}>
                      {pct >= 100 ? 'Hoàn thành' : `${pct}%`}
                    </span>
                    <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden hidden sm:block">
                      <div className={`h-full ${meta.solid} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-stone-500 w-8 text-right">{pct}%</span>
                    {clickable && <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-500 transition-colors" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Bảo mật: đổi mật khẩu */}
      <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible"
        className="bg-surface-card rounded-2xl border border-hairline p-6 mb-6">
        <button onClick={() => setShowPwd(v => !v)}
          className="w-full flex items-center justify-between text-sm font-semibold text-ink">
          <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Đổi mật khẩu</span>
          <span className="text-stone-400 text-xs">{showPwd ? '▲' : '▼'}</span>
        </button>
        {showPwd && (
          <form onSubmit={handleChangePassword} className="space-y-3 mt-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Mật khẩu hiện tại</label>
              <input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} required className={inputCls} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">Mật khẩu mới</label>
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block">Xác nhận mật khẩu mới</label>
                <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required className={inputCls} />
              </div>
            </div>
            {pwdError && <p className="text-[11px] text-error">{pwdError}</p>}
            {pwdOk && <p className="text-[11px] text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> Đã đổi mật khẩu thành công</p>}
            <button type="submit" disabled={pwdBusy}
              className="py-2.5 px-4 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-[#242424] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Đổi mật khẩu
            </button>
          </form>
        )}
      </motion.div>

      {/* Vùng nguy hiểm: xóa tài khoản */}
      <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible"
        className="bg-red-50/40 rounded-2xl border border-red-200 p-6">
        <h2 className="text-sm font-semibold text-red-600 mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Xóa tài khoản
        </h2>
        <p className="text-xs text-stone-600 mb-3">
          Hành động này không thể hoàn tác. Nhập <strong className="text-ink">XÓA</strong> để xác nhận.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="text" value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)}
            placeholder="Nhập XÓA" className={inputCls + ' max-w-[200px]'} />
          <button onClick={handleDeleteAccount} disabled={confirmDelete !== 'XÓA' || delBusy}
            className="py-2.5 px-4 bg-error text-white text-sm font-semibold rounded-lg hover:bg-error/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Xóa tài khoản vĩnh viễn
          </button>
        </div>
        {delError && <p className="text-[11px] text-error mt-2">{delError}</p>}
      </motion.div>
    </div>
  );
}
