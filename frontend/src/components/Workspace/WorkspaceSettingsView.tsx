import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS } from '../../data/mockData';
import {
  Settings, Users, Trash2, Check, AlertTriangle, UserPlus, X, Mail,
} from 'lucide-react';
import Avatar from '../common/Avatar';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function WorkspaceSettingsView() {
  const {
    selectedOrg, currentUser, orgProjects, phaseBlocks, isOwner,
    updateOrganization, deleteOrganization, addOrgMember, removeOrgMember,
    goToWorkspaceSelector,
  } = useApp();

  const [nameDraft, setNameDraft] = useState(selectedOrg?.name ?? '');
  const [descDraft, setDescDraft] = useState(selectedOrg?.description ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNameDraft(selectedOrg?.name ?? '');
    setDescDraft(selectedOrg?.description ?? '');
    setConfirmDelete(false);
  }, [selectedOrg?.id]);

  if (!selectedOrg) return null;

  if (!isOwner) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Settings className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500">Chỉ chủ workspace mới truy cập được Cài đặt.</p>
        </div>
      </div>
    );
  }

  const nameDirty = nameDraft.trim() !== selectedOrg.name && nameDraft.trim().length > 0;
  const descDirty = descDraft !== (selectedOrg.description ?? '');

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteOrganization(selectedOrg.id);
    goToWorkspaceSelector();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setError(null);
    try {
      await addOrgMember(selectedOrg.id, inviteEmail.trim());
      setInviteEmail('');
      setShowAddMember(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không mời được thành viên');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 max-w-3xl mx-auto">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="mb-6">
          <h1 className="text-xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5" /> Cài đặt Workspace
          </h1>
          <p className="text-sm text-stone-500 mt-0.5 font-light">
            {selectedOrg.name} · {orgProjects.length} dự án · {phaseBlocks.length} phase · {selectedOrg.members.length} thành viên
            {!isOwner && <span className="ml-2 text-amber-600">· chỉ owner mới chỉnh sửa được</span>}
          </p>
        </motion.div>

        {/* General */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-surface-card rounded-2xl border border-hairline p-6 mb-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Thông tin chung</h2>
          <label className="text-xs font-semibold text-stone-700 mb-1 block">Tên workspace</label>
          <div className="flex gap-2">
            <input type="text" value={nameDraft} onChange={e => setNameDraft(e.target.value)}
              disabled={!isOwner}
              onKeyDown={e => { if (e.key === 'Enter' && nameDirty) updateOrganization(selectedOrg.id, { name: nameDraft.trim() }); }}
              className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm disabled:bg-stone-50 disabled:text-stone-400
                         focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
            <button
              onClick={() => updateOrganization(selectedOrg.id, { name: nameDraft.trim() })}
              disabled={!nameDirty || !isOwner}
              className="px-4 py-2 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-[#242424]
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Lưu
            </button>
          </div>

          {/* #26: mô tả workspace */}
          <label className="text-xs font-semibold text-stone-700 mb-1 mt-4 block">Mô tả</label>
          <textarea value={descDraft} onChange={e => setDescDraft(e.target.value)} rows={3}
            disabled={!isOwner}
            placeholder="Mô tả ngắn về workspace (hiển thị ở trang Tổng quan)…"
            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm resize-none disabled:bg-stone-50 disabled:text-stone-400
                       focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => updateOrganization(selectedOrg.id, { description: descDraft })}
              disabled={!descDirty || !isOwner}
              className="px-4 py-2 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-[#242424]
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Lưu mô tả
            </button>
          </div>
        </motion.div>

        {/* Members */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-surface-card rounded-2xl border border-hairline p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Users className="w-4 h-4" /> Thành viên ({selectedOrg.members.length})
            </h2>
            {isOwner && (
              <button onClick={() => setShowAddMember(!showAddMember)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white text-xs font-semibold rounded-lg hover:bg-[#242424] transition-colors">
                <UserPlus className="w-3.5 h-3.5" /> Mời thành viên
              </button>
            )}
          </div>

          {showAddMember && isOwner && (
            <div className="mb-4 p-3 bg-white border border-stone-200 rounded-xl">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                Mời qua email (người dùng phải đã có tài khoản)
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
                    placeholder="email@company.com" autoFocus
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs
                               focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
                </div>
                <button onClick={handleInvite}
                  className="px-3 py-1.5 bg-ink text-white text-xs font-semibold rounded-lg hover:bg-[#242424]">
                  Mời
                </button>
              </div>
              {error && <p className="text-[11px] text-error mt-2">{error}</p>}
            </div>
          )}

          <div className="space-y-1">
            {selectedOrg.members.map(m => {
              const isSelf = currentUser?.id === m.id;
              return (
                <div key={m.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-hairline group">
                  <Avatar name={m.name} src={m.avatar} className="w-7 h-7" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate">
                      {m.name} {isSelf && <span className="text-[10px] text-stone-400 font-normal">(bạn)</span>}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-stone-500 px-2 py-0.5 bg-stone-100 rounded-md">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                  {!isSelf && isOwner && (
                    <button onClick={() => removeOrgMember(selectedOrg.id, m.id)}
                      title="Xóa khỏi workspace"
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all">
                      <X className="w-3.5 h-3.5 text-stone-400 hover:text-red-500" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Danger zone (owner only) */}
        {isOwner && (
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible"
            className="bg-red-50/40 rounded-2xl border border-red-200 p-6">
            <h2 className="text-sm font-semibold text-red-600 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Vùng nguy hiểm
            </h2>
            <p className="text-xs text-stone-500 mb-4">
              Xóa workspace sẽ xóa vĩnh viễn {orgProjects.length} dự án và toàn bộ phase blocks bên trong. Không thể hoàn tác.
            </p>
            <button onClick={handleDelete}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                ${confirmDelete ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white text-red-500 border border-red-200 hover:border-red-400'}`}>
              {confirmDelete
                ? (<><AlertTriangle className="w-4 h-4" /> Click lần nữa để xóa vĩnh viễn</>)
                : (<><Trash2 className="w-4 h-4" /> Xóa workspace này</>)}
            </button>
            {confirmDelete && (
              <button onClick={() => setConfirmDelete(false)}
                className="ml-3 text-xs text-stone-500 hover:text-stone-700">Hủy</button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
