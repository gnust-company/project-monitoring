import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { users } from '../../data/mockData';
import { ROLE_LABELS } from '../../data/mockData';
import type { Organization } from '../../types';
import { X, Plus, Building2, Users, Search } from 'lucide-react';

export default function CreateWorkspaceModal() {
  const { createWorkspaceOpen, closeCreateWorkspace, addOrganization } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(['u1']);

  const toggleMember = (uid: string) => {
    setSelectedMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedMembers.length === 0) return;

    const orgMembers = users.filter(u => selectedMembers.includes(u.id));
    const org: Organization = {
      id: `org-${Date.now()}`,
      name: name.trim(),
      members: orgMembers,
    };
    addOrganization(org);
    resetAndClose();
  };

  const resetAndClose = () => {
    setName('');
    setDescription('');
    setSelectedMembers(['u1']);
    setMemberSearch('');
    closeCreateWorkspace();
  };

  if (!createWorkspaceOpen) return null;

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
        onClick={resetAndClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-hairline flex-shrink-0">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-stone-500" />
              <h2 className="text-base font-bold text-ink">Tạo Workspace</h2>
            </div>
            <button onClick={resetAndClose} className="p-1 hover:bg-stone-100 rounded-lg">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
            {/* Workspace Name */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Tên Workspace</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="VD: Công ty ABC"
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink"
                required />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Mô tả</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Mô tả ngắn về tổ chức..."
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink resize-none" />
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Thành viên ({selectedMembers.length})
                </label>
              </div>
              {/* Selected avatars */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedMembers.map(uid => {
                    const user = users.find(u => u.id === uid);
                    if (!user) return null;
                    return (
                      <span key={uid}
                        className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 bg-stone-100 rounded-full text-xs">
                        <img src={user.avatar} className="w-4 h-4 rounded-full" alt="" />
                        <span className="text-stone-700 font-medium">{user.name.split(' ')[0]}</span>
                        <button type="button" onClick={() => toggleMember(uid)}
                          className="text-stone-400 hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Search */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Tìm thành viên..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs
                             focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
              </div>
              {/* User list */}
              <div className="bg-white border border-stone-200 rounded-lg max-h-44 overflow-y-auto">
                {filteredUsers.map(user => {
                  const isSelected = selectedMembers.includes(user.id);
                  return (
                    <button key={user.id} type="button"
                      onClick={() => toggleMember(user.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                        ${isSelected ? 'bg-stone-50' : 'hover:bg-stone-50'}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                        ${isSelected ? 'bg-ink border-ink' : 'border-stone-300'}`}>
                        {isSelected && <span className="text-white text-[10px]">✓</span>}
                      </div>
                      <img src={user.avatar} className="w-6 h-6 rounded-full" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-ink truncate">{user.name}</div>
                        <div className="text-[10px] text-stone-400 font-light">{ROLE_LABELS[user.role] || user.role}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <button type="submit"
              className="w-full py-2.5 bg-ink text-white text-sm font-semibold rounded-lg
                         hover:bg-[#242424] transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Tạo Workspace
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
