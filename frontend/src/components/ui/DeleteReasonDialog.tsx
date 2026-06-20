// #14: hộp thoại xác nhận xóa + bắt buộc nhập lý do (log vào activity thành phần cha).
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function DeleteReasonDialog({
  title, message, onCancel, onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 3;

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Lý do xóa <span className="text-red-500">*</span>
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} autoFocus
              placeholder="Nhập lý do (sẽ được ghi vào lịch sử)…"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700
                         focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-200 transition-colors">
            Hủy
          </button>
          <button onClick={() => valid && onConfirm(reason.trim())} disabled={!valid}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-red-500 rounded-lg
                       hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Trash2 className="w-3.5 h-3.5" /> Xóa
          </button>
        </div>
      </motion.div>
    </div>
  );
}
