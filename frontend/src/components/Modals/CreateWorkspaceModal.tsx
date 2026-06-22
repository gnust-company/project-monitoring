import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { X, Building2, ArrowRight, Check, Layers, Users, AlertTriangle } from 'lucide-react';
import PhaseManager from '../Workspace/PhaseManager';
import RoleManager from '../Workspace/RoleManager';

// Wizard 3 bước (#26): B1 = tên + mô tả → tạo workspace (seed 8 role + 7 phase mặc định);
// B2 = tùy chỉnh role; B3 = tùy chỉnh phase. Đổi/xóa role ở B2 phản ánh sang checklist B3.
// Workspace chỉ "thật sự" có sau khi bấm Hoàn tất; click nền KHÔNG đóng; bấm X phải
// xác nhận (tránh ấn nhầm), hủy thì xóa lại workspace đang dựng dở.
export default function CreateWorkspaceModal() {
  const { createWorkspaceOpen, closeCreateWorkspace, addOrganization, deleteOrganization } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const reset = () => {
    setStep(1); setName(''); setDescription(''); setCreatedId(null);
    setError(null); setBusy(false); setConfirmCancel(false);
  };

  // Hủy hẳn: xóa workspace đang dựng dở (đã tạo ở B1) rồi đóng.
  const close = () => {
    if (createdId) void deleteOrganization(createdId).catch(() => { /* ignore */ });
    reset();
    closeCreateWorkspace();
  };
  const finish = () => { reset(); closeCreateWorkspace(); };

  // Bấm X: nếu chưa tạo gì (đang B1, chưa có workspace) thì đóng luôn; nếu đã dựng dở
  // thì hỏi xác nhận để tránh ấn nhầm mất cấu hình.
  const requestClose = () => { if (createdId) setConfirmCancel(true); else close(); };

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

  const StepDot = ({ n, label }: { n: 1 | 2 | 3; label: string }) => (
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
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`relative bg-white rounded-xl shadow-2xl w-full mx-4 overflow-hidden max-h-[90vh] flex flex-col
            ${step === 3 ? 'max-w-3xl' : step === 2 ? 'max-w-xl' : 'max-w-md'}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Xác nhận hủy (tránh ấn nhầm X) */}
          {confirmCancel && (
            <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="max-w-xs text-center">
                <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-sm font-bold text-ink mb-1">Hủy tạo workspace?</h3>
                <p className="text-xs text-stone-500 mb-4">
                  Workspace <strong className="text-stone-700">{name}</strong> và mọi cấu hình vai trò/phase
                  vừa thiết lập sẽ bị xóa.
                </p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setConfirmCancel(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50">
                    Tiếp tục cấu hình
                  </button>
                  <button onClick={close}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600">
                    Hủy, xóa workspace
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-5 py-4 border-b border-hairline flex-shrink-0">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-stone-500" />
              <h2 className="text-base font-bold text-ink">Tạo Workspace</h2>
            </div>
            <button onClick={requestClose} className="p-1 hover:bg-stone-100 rounded-lg">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-hairline bg-surface-card flex-shrink-0">
            <StepDot n={1} label="Thông tin" />
            <div className="flex-1 h-px bg-stone-200" />
            <StepDot n={2} label="Vai trò" />
            <div className="flex-1 h-px bg-stone-200" />
            <StepDot n={3} label="Phase" />
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
                  <Users className="w-3.5 h-3.5" />
                  Workspace <strong className="text-ink">{name}</strong> đã tạo với 8 vai trò mặc định — tùy chỉnh nếu muốn.
                </div>
                <RoleManager orgId={createdId} />
              </div>
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-hairline flex-shrink-0">
                <button onClick={() => setStep(3)}
                  className="px-4 py-2 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-[#242424] transition-colors flex items-center gap-1.5">
                  Tiếp tục <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 3 && createdId && (
            <>
              <div className="p-5 overflow-y-auto">
                <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-3">
                  <Layers className="w-3.5 h-3.5" />
                  Tùy chỉnh các phase (checklist/outcome theo vai trò vừa cấu hình).
                </div>
                <PhaseManager orgId={createdId} />
              </div>
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-hairline flex-shrink-0">
                <button onClick={() => setStep(2)}
                  className="px-4 py-2 text-stone-500 text-sm font-medium rounded-lg hover:bg-stone-100">
                  Quay lại
                </button>
                <button onClick={finish}
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
