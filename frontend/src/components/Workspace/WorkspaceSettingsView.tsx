import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { users as allUsers, ROLE_LABELS } from '../../data/mockData';
import {
  Settings, Users, Trash2, Check, AlertTriangle, UserPlus, X,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function WorkspaceSettingsView() {
  const {
    selectedOrg, currentUser, orgProjects, phaseBlocks,
    updateOrganization, deleteOrganization, addOrgMember, removeOrgMember,
    goToWorkspaceSelector,
  } = useApp();

  const [nameDraft, setNameDraft] = useState(selectedOrg?.name ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    setNameDraft(selectedOrg?.name ?? '');
    setConfirmDelete(false);
  }, [selectedOrg?.id]);

  // User mẫu chưa thuộc workspace — nguồn để "mời" (BE thật: mời qua email)
  const invitableUsers = useMemo(() => {
    if (!selectedOrg) return [];
    return allUsers.filter(u => !selectedOrg.members.some(m => m.id === u.id));
  }, [selectedOrg]);

  if (!selectedOrg) return null;

  const nameDirty = nameDraft.trim() !== selectedOrg.name && nameDraft.trim().length > 0;

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteOrganization(selectedOrg.id);
    goToWorkspaceSelector();
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
          </p>
        </motion.div>

        {/* General */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-surface-card rounded-2xl border border-hairline p-6 mb-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Thông tin chung</h2>
          <label className="text-xs font-semibold text-stone-700 mb-1 block">Tên workspace</label>
          <div className="flex gap-2">
            <input type="text" value={nameDraft} onChange={e => setNameDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && nameDirty) updateOrganization(selectedOrg.id, { name: nameDraft.trim() }); }}
              className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
            <button
              onClick={() => updateOrganization(selectedOrg.id, { name: nameDraft.trim() })}
              disabled={!nameDirty}
              className="px-4 py-2 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-[#242424]
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Lưu
            </button>
          </div>
        </motion.div>

        {/* Members */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-surface-card rounded-2xl border border-hairline p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Users className="w-4 h-4" /> Thành viên ({selectedOrg.members.length})
            </h2>
            <button onClick={() => setShowAddMember(!showAddMember)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white text-xs font-semibold rounded-lg
                         hover:bg-[#242424] transition-colors">
              <UserPlus className="w-3.5 h-3.5" /> Mời thành viên
            </button>
          </div>

          {showAddMember && (
            <div className="mb-4 p-3 bg-white border border-stone-200 rounded-xl">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                Chọn người để mời (BE thật: mời qua email)
              </div>
              {invitableUsers.length === 0 ? (
                <div className="text-xs text-stone-400 py-2">Tất cả user mẫu đã trong workspace</div>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {invitableUsers.map(u => (
                    <button key={u.id}
                      onClick={() => addOrgMember(selectedOrg.id, u)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-stone-50 transition-colors text-left">
                      <img src={u.avatar} className="w-6 h-6 rounded-full" alt="" />
                      <span className="text-xs font-medium text-stone-700 flex-1 truncate">{u.name}</span>
                      <span className="text-[10px] text-stone-400">{ROLE_LABELS[u.role] ?? u.role}</span>
                      <UserPlus className="w-3 h-3 text-stone-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            {selectedOrg.members.map(m => {
              const isSelf = currentUser?.id === m.id;
              return (
                <div key={m.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-hairline group">
                  <img src={m.avatar} className="w-7 h-7 rounded-full" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate">
                      {m.name} {isSelf && <span className="text-[10px] text-stone-400 font-normal">(bạn)</span>}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-stone-500 px-2 py-0.5 bg-stone-100 rounded-md">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                  {!isSelf && (
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

        {/* Danger zone */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-red-50/40 rounded-2xl border border-red-200 p-6">
          <h2 className="text-sm font-semibold text-red-600 mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Vùng nguy hiểm
          </h2>
          <p className="text-xs text-stone-500 mb-4">
            Xóa workspace sẽ xóa vĩnh viễn {orgProjects.length} dự án và toàn bộ phase blocks bên trong. Không thể hoàn tác.
          </p>
          <button onClick={handleDelete}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${confirmDelete
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-white text-red-500 border border-red-200 hover:border-red-400'}`}>
            {confirmDelete
              ? (<><AlertTriangle className="w-4 h-4" /> Click lần nữa để xóa vĩnh viễn</>)
              : (<><Trash2 className="w-4 h-4" /> Xóa workspace này</>)}
          </button>
          {confirmDelete && (
            <button onClick={() => setConfirmDelete(false)}
              className="ml-3 text-xs text-stone-500 hover:text-stone-700">Hủy</button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
