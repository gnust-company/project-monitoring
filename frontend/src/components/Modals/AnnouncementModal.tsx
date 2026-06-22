import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X, Calendar, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { announcementsApi } from '../../api';
import type { Announcement, DismissScope } from '../../types';
import { Markdown } from '../../lib/markdown';

function fmt(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/**
 * #27: modal thông báo từ admin, tự bật khi user đăng nhập nếu có thông báo đang
 * hiệu lực chưa tự ẩn. Trái = danh sách, phải = chi tiết (markdown). Dưới có nút
 * "không hiển thị lại hôm nay / tuần này".
 */
export default function AnnouncementModal() {
  const { currentUser } = useApp();
  const [items, setItems] = useState<Announcement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let alive = true;
    announcementsApi.active().then(list => {
      if (!alive || list.length === 0) return;
      setItems(list);
      setSelectedId(list[0].id);
      setOpen(true);
    }).catch(() => { /* im lặng — thông báo không phải tính năng chặn */ });
    return () => { alive = false; };
  }, [currentUser]);

  const removeFromView = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(a => a.id !== id);
      if (next.length === 0) setOpen(false);
      else setSelectedId(cur => (cur === id ? next[0].id : cur));
      return next;
    });
  }, []);

  const dismiss = async (id: string, scope: DismissScope) => {
    removeFromView(id);
    try { await announcementsApi.dismiss(id, scope); } catch { /* best-effort */ }
  };

  const selected = items.find(a => a.id === selectedId) ?? null;

  return (
    <AnimatePresence>
      {open && selected && currentUser && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[min(560px,85vh)] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-hairline flex-shrink-0">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> Thông báo
                {items.length > 1 && <span className="text-[11px] font-medium text-muted">({items.length})</span>}
              </h2>
              <button onClick={() => setOpen(false)} title="Đóng"
                className="p-1 hover:bg-stone-100 rounded-lg"><X className="w-4 h-4 text-stone-500" /></button>
            </div>

            <div className="flex-1 flex min-h-0">
              {/* Trái: danh sách */}
              <div className="w-56 border-r border-hairline overflow-y-auto flex-shrink-0 bg-stone-50/40">
                {items.map(a => (
                  <button key={a.id} onClick={() => setSelectedId(a.id)}
                    className={`w-full text-left px-4 py-3 border-b border-hairline/60 transition-colors
                      ${a.id === selectedId ? 'bg-white' : 'hover:bg-white/60'}`}>
                    <div className={`text-sm font-semibold truncate ${a.id === selectedId ? 'text-ink' : 'text-stone-600'}`}>{a.title}</div>
                    <div className="flex items-center gap-1 text-[10px] text-muted mt-0.5">
                      <Calendar className="w-2.5 h-2.5" /> {fmt(a.startsAt)}
                    </div>
                  </button>
                ))}
              </div>

              {/* Phải: chi tiết */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <h3 className="text-lg font-bold text-ink mb-1">{selected.title}</h3>
                  <div className="flex items-center gap-1 text-[11px] text-muted mb-4">
                    <Calendar className="w-3 h-3" /> {fmt(selected.startsAt)} → {fmt(selected.endsAt)}
                  </div>
                  <Markdown source={selected.body} />
                </div>

                {/* Footer: dismiss */}
                <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-hairline flex-shrink-0">
                  <button onClick={() => dismiss(selected.id, 'day')}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink px-3 py-1.5 rounded-lg hover:bg-surface-soft transition-colors">
                    <Check className="w-3.5 h-3.5" /> Không hiện lại hôm nay
                  </button>
                  <button onClick={() => dismiss(selected.id, 'week')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-ink px-3 py-1.5 rounded-lg hover:bg-[#242424] transition-colors">
                    <Check className="w-3.5 h-3.5" /> Không hiện lại tuần này
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
