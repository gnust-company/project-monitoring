// #22: modal tải nhiều tệp — kéo-thả/chọn từ máy, sửa danh sách, bấm xác nhận mới upload,
// kèm thanh tiến độ từng tệp (dùng XHR progress qua uploadFn).
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, File as FileIcon, X, Check, AlertCircle, Loader2, Plus } from 'lucide-react';

type Status = 'pending' | 'uploading' | 'done' | 'error';

interface QueueItem {
  id: string;
  file: File;
  status: Status;
  progress: number;
  error?: string;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Render có điều kiện ở component cha (`{open && <FileUploadModal/>}`) — state tự reset mỗi lần mở.
export default function FileUploadModal({
  onClose, uploadFn,
}: {
  onClose: () => void;
  // tải 1 tệp, báo tiến độ 0-100 qua onProgress
  uploadFn: (file: File, onProgress: (pct: number) => void) => Promise<void>;
}) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [busy, onClose]);

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setItems(prev => [
      ...prev,
      ...arr.map(file => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file, status: 'pending' as Status, progress: 0,
      })),
    ]);
  };

  const removeItem = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const pendingCount = items.filter(i => i.status === 'pending' || i.status === 'error').length;
  const allDone = items.length > 0 && items.every(i => i.status === 'done');

  const patch = (id: string, p: Partial<QueueItem>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...p } : i));

  const handleConfirm = async () => {
    const queue = items.filter(i => i.status === 'pending' || i.status === 'error');
    if (queue.length === 0) return;
    setBusy(true);
    for (const it of queue) {
      patch(it.id, { status: 'uploading', progress: 0, error: undefined });
      try {
        await uploadFn(it.file, (pct) => patch(it.id, { progress: pct }));
        patch(it.id, { status: 'done', progress: 100 });
      } catch (err) {
        patch(it.id, { status: 'error', error: err instanceof Error ? err.message : 'Tải thất bại' });
      }
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={() => { if (!busy) onClose(); }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-4.5 h-4.5 text-slate-500" /> Tải tệp lên
              </h3>
              <button onClick={() => { if (!busy) onClose(); }} disabled={busy}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {/* Dropzone */}
              <label
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl border-2 border-dashed
                            cursor-pointer transition-colors text-center
                            ${dragOver ? 'border-slate-500 bg-slate-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}>
                <input ref={inputRef} type="file" multiple onChange={onPick} className="hidden" />
                <div className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Kéo-thả tệp vào đây, hoặc <span className="text-slate-900 underline">chọn từ máy</span>
                </p>
                <p className="text-xs text-gray-400">Có thể chọn nhiều tệp cùng lúc</p>
              </label>

              {/* Queue */}
              {items.length > 0 && (
                <div className="mt-4 space-y-2">
                  {items.map(it => (
                    <div key={it.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                        {it.status === 'done' ? <Check className="w-4 h-4 text-green-500" />
                          : it.status === 'error' ? <AlertCircle className="w-4 h-4 text-red-500" />
                          : it.status === 'uploading' ? <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                          : <FileIcon className="w-4 h-4 text-slate-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">{it.file.name}</p>
                        {it.status === 'uploading' || it.status === 'done' ? (
                          <div className="mt-1 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-150 ${it.status === 'done' ? 'bg-green-500' : 'bg-slate-700'}`}
                              style={{ width: `${it.progress}%` }} />
                          </div>
                        ) : (
                          <p className={`text-[10px] ${it.status === 'error' ? 'text-red-500' : 'text-gray-400'}`}>
                            {it.status === 'error' ? (it.error || 'Tải thất bại — bấm xác nhận để thử lại') : fmtSize(it.file.size)}
                          </p>
                        )}
                      </div>
                      {it.status === 'uploading'
                        ? <span className="text-[10px] font-semibold text-slate-500 w-9 text-right shrink-0">{it.progress}%</span>
                        : (it.status !== 'done' && (
                          <button onClick={() => removeItem(it.id)} disabled={busy}
                            className="p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-30 shrink-0" title="Bỏ">
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                {items.length > 0 && `${items.length} tệp · ${items.filter(i => i.status === 'done').length} xong`}
              </span>
              <div className="flex items-center gap-2">
                {allDone ? (
                  <button onClick={onClose}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors">
                    <Check className="w-3.5 h-3.5" /> Hoàn tất
                  </button>
                ) : (
                  <>
                    <button onClick={() => { if (!busy) onClose(); }} disabled={busy}
                      className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40">
                      Hủy
                    </button>
                    <button onClick={handleConfirm} disabled={busy || pendingCount === 0}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      {busy ? 'Đang tải…' : `Xác nhận tải lên${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
                    </button>
                  </>
                )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
