import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { X, Plus, Building2 } from 'lucide-react';

export default function CreateWorkspaceModal() {
  const { createWorkspaceOpen, closeCreateWorkspace, addOrganization } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetAndClose = () => {
    setName(''); setDescription(''); setError(null);
    closeCreateWorkspace();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addOrganization(name.trim());
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo workspace thất bại');
    } finally {
      setBusy(false);
    }
  };

  if (!createWorkspaceOpen) return null;

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
          className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-stone-500" />
              <h2 className="text-base font-bold text-ink">Tạo Workspace</h2>
            </div>
            <button onClick={resetAndClose} className="p-1 hover:bg-stone-100 rounded-lg">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Tên Workspace</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="VD: Công ty ABC" autoFocus
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink"
                required />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Mô tả (tùy chọn)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Mô tả ngắn về tổ chức..."
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink resize-none" />
            </div>
            <p className="text-[11px] text-stone-400">
              Bạn sẽ là <strong className="text-stone-600">chủ workspace</strong>. Thêm thành viên trong Cài đặt sau khi tạo.
            </p>
            {error && <p className="text-[11px] text-error">{error}</p>}
            <button type="submit" disabled={busy}
              className="w-full py-2.5 bg-ink text-white text-sm font-semibold rounded-lg
                         hover:bg-[#242424] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              <Plus className="w-4 h-4" /> Tạo Workspace
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
