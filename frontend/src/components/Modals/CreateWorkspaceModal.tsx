import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { X, Building2, ArrowRight, Check, Layers } from 'lucide-react';
import PhaseManager from '../Workspace/PhaseManager';

// Wizard 2 bước (#26): B1 = tên + mô tả → tạo workspace (seed 7 phase mặc định);
// B2 = tùy chỉnh phase cho workspace vừa tạo (dùng lại PhaseManager với orgId).
export default function CreateWorkspaceModal() {
  const { createWorkspaceOpen, closeCreateWorkspace, addOrganization } = useApp();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep(1); setName(''); setDescription(''); setCreatedId(null); setError(null); setBusy(false);
  };
  const close = () => { reset(); closeCreateWorkspace(); };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const org = await addOrganization(name.trim(), description.trim());
      setCreatedId(org.id);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo workspace thất bại');
    } finally {
      setBusy(false);
    }
  };

  if (!createWorkspaceOpen) return null;

  const StepDot = ({ n, label }: { n: 1 | 2; label: string }) => (
    <div className="flex items-center gap-2">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
        ${step >= n ? 'bg-ink text-white' : 'bg-stone-200 text-stone-500'}`}>
        {step > n ? <Check className="w-3 h-3" /> : n}
      </span>
      <span className={`text-xs font-medium ${step >= n ? 'text-ink' : 'text-stone-400'}`}>{label}</span>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
        onClick={close}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`bg-white rounded-xl shadow-2xl w-full mx-4 overflow-hidden max-h-[90vh] flex flex-col
            ${step === 2 ? 'max-w-3xl' : 'max-w-md'}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-hairline flex-shrink-0">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-stone-500" />
              <h2 className="text-base font-bold text-ink">Tạo Workspace</h2>
            </div>
            <button onClick={close} className="p-1 hover:bg-stone-100 rounded-lg">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-hairline bg-surface-card flex-shrink-0">
            <StepDot n={1} label="Thông tin" />
            <div className="flex-1 h-px bg-stone-200" />
            <StepDot n={2} label="Tùy chỉnh phase" />
          </div>

          {step === 1 && (
            <form onSubmit={handleNext} className="p-5 space-y-4 overflow-y-auto">
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
                Bạn sẽ là <strong className="text-stone-600">chủ workspace</strong>. Bước sau tùy chỉnh các phase;
                thêm thành viên trong Cài đặt sau khi tạo.
              </p>
              {error && <p className="text-[11px] text-error">{error}</p>}
              <button type="submit" disabled={busy}
                className="w-full py-2.5 bg-ink text-white text-sm font-semibold rounded-lg
                           hover:bg-[#242424] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                Tiếp tục <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 2 && createdId && (
            <>
              <div className="p-5 overflow-y-auto">
                <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-3">
                  <Layers className="w-3.5 h-3.5" />
                  Workspace <strong className="text-ink">{name}</strong> đã tạo với 7 phase mặc định — tùy chỉnh thêm nếu muốn.
                </div>
                <PhaseManager orgId={createdId} />
              </div>
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-hairline flex-shrink-0">
                <button onClick={close}
                  className="px-4 py-2 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-[#242424] transition-colors flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Hoàn tất
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
