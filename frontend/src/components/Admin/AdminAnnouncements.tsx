import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Plus, Pencil, Trash2, X, AlertCircle, Eye, Calendar } from 'lucide-react';
import { announcementsApi, type AnnouncementBody } from '../../api';
import { ApiError } from '../../api/client';
import type { Announcement } from '../../types';
import { Markdown } from '../../lib/markdown';

// ISO (UTC) → giá trị cho <input type="datetime-local"> (giờ địa phương).
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
// datetime-local (giờ địa phương) → ISO UTC.
function localInputToIso(v: string): string {
  return new Date(v).toISOString();
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type Phase = 'active' | 'upcoming' | 'expired';
function phaseOf(a: Announcement, now: number): Phase {
  const s = a.startsAt ? new Date(a.startsAt).getTime() : 0;
  const e = a.endsAt ? new Date(a.endsAt).getTime() : 0;
  if (now < s) return 'upcoming';
  if (now > e) return 'expired';
  return 'active';
}
const phaseBadge: Record<Phase, { label: string; cls: string }> = {
  active:   { label: 'Đang hiển thị', cls: 'bg-emerald-50 text-emerald-700' },
  upcoming: { label: 'Sắp tới',       cls: 'bg-amber-50 text-amber-700' },
  expired:  { label: 'Đã hết hạn',    cls: 'bg-stone-100 text-stone-500' },
};

interface FormState { id: string | null; title: string; body: string; startsAt: string; endsAt: string; }
const emptyForm = (): FormState => {
  const now = new Date();
  const later = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  return { id: null, title: '', body: '', startsAt: isoToLocalInput(now.toISOString()), endsAt: isoToLocalInput(later.toISOString()) };
};

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [preview, setPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(await announcementsApi.listAll()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được thông báo'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm()); setPreview(false); };
  const openEdit = (a: Announcement) => {
    setForm({ id: a.id, title: a.title, body: a.body, startsAt: isoToLocalInput(a.startsAt), endsAt: isoToLocalInput(a.endsAt) });
    setPreview(false);
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) { setError('Cần tiêu đề'); return; }
    if (!form.startsAt || !form.endsAt) { setError('Cần khoảng thời gian hiển thị'); return; }
    if (new Date(form.startsAt) >= new Date(form.endsAt)) { setError('Thời điểm bắt đầu phải trước kết thúc'); return; }
    setSaving(true); setError(null);
    const body: AnnouncementBody = {
      title: form.title.trim(), body: form.body,
      startsAt: localInputToIso(form.startsAt), endsAt: localInputToIso(form.endsAt),
    };
    try {
      if (form.id) await announcementsApi.update(form.id, body);
      else await announcementsApi.create(body);
      setForm(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : (e instanceof Error ? e.message : 'Lưu thất bại'));
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try { await announcementsApi.remove(deleteTarget.id); setDeleteTarget(null); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Xóa thất bại'); }
    finally { setSaving(false); }
  };

  const now = Date.now();

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-ink flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> Thông báo hệ thống
          </h1>
          <p className="text-sm text-muted mt-0.5">Gửi thông báo tới mọi người dùng trong một khoảng thời gian.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-[#242424] transition-colors">
          <Plus className="w-4 h-4" /> Tạo thông báo
        </button>
      </div>

      {error && !form && (
        <div className="mb-4 flex items-center gap-2 text-sm text-error"><AlertCircle className="w-4 h-4" /> {error}</div>
      )}

      {loading ? (
        <p className="text-sm text-muted py-12 text-center">Đang tải…</p>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-hairline rounded-xl py-16 flex flex-col items-center gap-2 text-muted">
          <Megaphone className="w-8 h-8 text-stone-300" />
          <p className="text-sm">Chưa có thông báo nào.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(a => {
            const ph = phaseBadge[phaseOf(a, now)];
            return (
              <div key={a.id} className="bg-white border border-hairline rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink truncate">{a.title}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ph.cls}`}>{ph.label}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted mt-1">
                    <Calendar className="w-3 h-3" /> {fmt(a.startsAt)} → {fmt(a.endsAt)}
                  </div>
                </div>
                <button onClick={() => openEdit(a)} title="Sửa"
                  className="p-2 rounded-lg text-muted hover:bg-surface-soft hover:text-ink transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteTarget(a)} title="Xóa"
                  className="p-2 rounded-lg text-muted hover:bg-error/5 hover:text-error transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Form tạo/sửa */}
      <AnimatePresence>
        {form && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
            onClick={() => !saving && setForm(null)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> {form.id ? 'Sửa thông báo' : 'Tạo thông báo'}
                </h2>
                <button onClick={() => !saving && setForm(null)} className="p-1 hover:bg-stone-100 rounded-lg">
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                <div>
                  <label className="text-xs font-semibold text-stone-600 mb-1 block">Tiêu đề</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-stone-600 mb-1 block">Bắt đầu hiển thị</label>
                    <input type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone-600 mb-1 block">Kết thúc hiển thị</label>
                    <input type="datetime-local" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-600">Nội dung (Markdown)</label>
                    <button onClick={() => setPreview(p => !p)}
                      className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded ${preview ? 'bg-ink text-white' : 'text-muted hover:bg-surface-soft'}`}>
                      <Eye className="w-3 h-3" /> {preview ? 'Soạn thảo' : 'Xem trước'}
                    </button>
                  </div>
                  {preview ? (
                    <div className="min-h-[160px] px-3 py-2 border border-stone-200 rounded-lg bg-stone-50/40">
                      <Markdown source={form.body || '_(trống)_'} />
                    </div>
                  ) : (
                    <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                      rows={7} placeholder="# Tiêu đề&#10;**Đậm**, *nghiêng*, [link](https://…)&#10;- gạch đầu dòng"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink resize-y" />
                  )}
                </div>

                {error && <p className="text-xs text-error flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
              </div>

              <div className="flex gap-2 px-5 py-4 border-t border-hairline">
                <button onClick={() => setForm(null)} disabled={saving}
                  className="flex-1 py-2.5 border border-stone-200 text-sm font-semibold rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-60">
                  Hủy
                </button>
                <button onClick={save} disabled={saving}
                  className="flex-1 py-2.5 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-[#242424] transition-colors disabled:opacity-60">
                  {saving ? 'Đang lưu…' : (form.id ? 'Lưu thay đổi' : 'Tạo thông báo')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm xóa */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4"
            onClick={() => !saving && setDeleteTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-5 space-y-4">
                <h2 className="text-base font-bold text-ink flex items-center gap-2"><Trash2 className="w-4 h-4 text-error" /> Xóa thông báo</h2>
                <p className="text-sm text-stone-600">Xóa <strong className="text-ink">{deleteTarget.title}</strong>? Hành động không thể hoàn tác.</p>
                <div className="flex gap-2">
                  <button onClick={() => setDeleteTarget(null)} disabled={saving}
                    className="flex-1 py-2.5 border border-stone-200 text-sm font-semibold rounded-lg hover:bg-stone-50 disabled:opacity-60">Hủy</button>
                  <button onClick={confirmDelete} disabled={saving}
                    className="flex-1 py-2.5 bg-error text-white text-sm font-semibold rounded-lg hover:bg-error/90 disabled:opacity-60">
                    {saving ? 'Đang xóa…' : 'Xóa'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
