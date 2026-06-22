import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PHASE_PALETTE, PHASE_COLOR_KEYS, resolvePhaseMeta } from '../../types';
import type { PhaseDefinition, WorkspaceRoleDef } from '../../types';
import { phaseDefsApi, rolesApi, type PhaseDefBody } from '../../api';
import { ApiError } from '../../api/client';
import {
  Layers, Plus, Trash2, Check, ChevronUp, ChevronDown, CheckSquare, Target, AlertTriangle,
} from 'lucide-react';

type DraftItem = { role?: string; text: string };
type Draft = {
  code: string; name: string; description: string; color: string;
  checklist: DraftItem[]; outcomes: DraftItem[];
};

function toDraft(def: PhaseDefinition): Draft {
  return {
    code: def.code, name: def.name, description: def.description, color: def.color,
    checklist: def.checklist.map(i => ({ role: i.role, text: i.text })),
    outcomes: def.outcomes.map(i => ({ role: i.role, text: i.text })),
  };
}

// Editor cho 1 nhóm item (checklist hoặc outcome) — role select + text + xóa, kèm nút thêm.
function ItemEditor({ items, setItems, icon, label, roleOptions }: {
  items: DraftItem[];
  setItems: (next: DraftItem[]) => void;
  icon: React.ReactNode;
  label: string;
  roleOptions: WorkspaceRoleDef[];
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-stone-700 mb-1.5 block flex items-center gap-1.5">
        {icon} {label} ({items.length})
      </label>
      <div className="space-y-1.5">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-center gap-1.5 group">
            <select value={it.role ?? ''}
              onChange={e => { const v = e.target.value; const next = [...items]; next[idx] = { ...next[idx], role: v || undefined }; setItems(next); }}
              className="px-1.5 py-1 bg-white border border-stone-200 rounded-md text-[11px] text-stone-600 w-28 flex-shrink-0
                         focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink">
              <option value="">Chung</option>
              {roleOptions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              {it.role && !roleOptions.some(r => r.code === it.role) && <option value={it.role}>{it.role}</option>}
            </select>
            <input type="text" value={it.text}
              onChange={e => { const next = [...items]; next[idx] = { ...next[idx], text: e.target.value }; setItems(next); }}
              className="flex-1 px-2.5 py-1 bg-white border border-stone-200 rounded-md text-xs text-stone-700
                         focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink" />
            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-stone-100 rounded">
              <Trash2 className="w-3 h-3 text-stone-400" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setItems([...items, { text: '', role: undefined }])}
          className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-ink px-1 py-0.5">
          <Plus className="w-3 h-3" /> Thêm mục
        </button>
      </div>
    </div>
  );
}

// orgId: nếu truyền (vd trong wizard tạo workspace), PhaseManager tự quản lý phase của
// workspace ĐÓ qua API (local state); nếu bỏ trống, dùng workspace đang chọn qua context.
export default function PhaseManager({ orgId }: { orgId?: string } = {}) {
  const ctx = useApp();
  const standalone = !!orgId;
  const [localDefs, setLocalDefs] = useState<PhaseDefinition[]>([]);
  const [localRoles, setLocalRoles] = useState<WorkspaceRoleDef[]>([]);

  useEffect(() => {
    if (!standalone || !orgId) return;
    let alive = true;
    phaseDefsApi.list(orgId).then(d => { if (alive) setLocalDefs(d); }).catch(() => { /* ignore */ });
    rolesApi.list(orgId).then(r => { if (alive) setLocalRoles(r); }).catch(() => { /* ignore */ });
    return () => { alive = false; };
  }, [standalone, orgId]);

  const byPos = (a: PhaseDefinition, b: PhaseDefinition) => a.position - b.position;
  const phaseDefs = standalone ? localDefs : ctx.phaseDefs;
  const roleOptions = standalone ? localRoles : ctx.orgRoles;
  const getPhaseMeta = (code: string) => resolvePhaseMeta(phaseDefs, code);
  const addPhaseDef = standalone
    ? async (b: PhaseDefBody) => { const c = await phaseDefsApi.create(orgId!, b); setLocalDefs(p => [...p, c].sort(byPos)); return c; }
    : ctx.addPhaseDef;
  const updatePhaseDef = standalone
    ? async (id: string, b: Partial<PhaseDefBody>) => { const u = await phaseDefsApi.update(orgId!, id, b); setLocalDefs(p => p.map(x => x.id === id ? u : x).sort(byPos)); }
    : ctx.updatePhaseDef;
  const deletePhaseDef = standalone
    ? async (id: string, force?: boolean) => { await phaseDefsApi.remove(orgId!, id, force); setLocalDefs(p => p.filter(x => x.id !== id)); }
    : ctx.deletePhaseDef;
  const reorderPhaseDefs = standalone
    ? async (ids: string[]) => { const fresh = await phaseDefsApi.reorder(orgId!, ids); setLocalDefs(fresh); }
    : ctx.reorderPhaseDefs;

  const [selectedId, setSelectedId] = useState<string | null>(phaseDefs[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cảnh báo xóa phase đang dùng: { count } → cần xác nhận force.
  const [deleteWarn, setDeleteWarn] = useState<{ count: number } | null>(null);

  const selected = phaseDefs.find(p => p.id === selectedId) ?? null;

  // Đồng bộ draft khi đổi phase đang chọn (hoặc khi danh sách phase thay đổi).
  useEffect(() => {
    const def = phaseDefs.find(p => p.id === selectedId) ?? phaseDefs[0] ?? null;
    if (def && def.id !== selectedId) setSelectedId(def.id);
    setDraft(def ? toDraft(def) : null);
    setDeleteWarn(null);
    setError(null);
  }, [selectedId, phaseDefs]);

  const dirty = !!(selected && draft && JSON.stringify(toDraft(selected)) !== JSON.stringify(draft));

  const handleAdd = async () => {
    setBusy(true); setError(null);
    try {
      const created = await addPhaseDef({ name: 'Phase mới', color: 'gray' });
      setSelectedId(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thêm được phase');
    } finally { setBusy(false); }
  };

  const handleSave = async () => {
    if (!selected || !draft) return;
    setBusy(true); setError(null);
    try {
      await updatePhaseDef(selected.id, {
        code: draft.code.trim() || selected.code,
        name: draft.name.trim() || selected.name,
        fullName: draft.name.trim() || selected.name,  // full_name mirror tên (đã bỏ ô "Tên ngắn")
        description: draft.description,
        color: draft.color,
        checklist: draft.checklist.filter(i => i.text.trim()),
        outcomes: draft.outcomes.filter(i => i.text.trim()),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại');
    } finally { setBusy(false); }
  };

  const handleDelete = async (force = false) => {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      await deletePhaseDef(selected.id, force);
      setDeleteWarn(null);
      setSelectedId(phaseDefs.find(p => p.id !== selected.id)?.id ?? null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        let count = 0;
        try { count = JSON.parse(e.detail).count ?? 0; } catch { /* detail không phải JSON */ }
        setDeleteWarn({ count });
      } else {
        setError(e instanceof Error ? e.message : 'Xóa thất bại');
      }
    } finally { setBusy(false); }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...phaseDefs];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    await reorderPhaseDefs(next.map(p => p.id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Layers className="w-4 h-4" /> Quản lý phase ({phaseDefs.length})
        </h2>
        <button onClick={handleAdd} disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white text-xs font-semibold rounded-lg hover:bg-[#242424] transition-colors disabled:opacity-50">
          <Plus className="w-3.5 h-3.5" /> Thêm phase
        </button>
      </div>
      <p className="text-[11px] text-stone-500 mb-3">
        Tùy biến các giai đoạn (phase) của workspace: tên, màu, thứ tự và checklist/outcome mặc định khi tạo phase block.
      </p>

      <div className="grid grid-cols-[200px_1fr] gap-4">
        {/* List */}
        <div className="space-y-1">
          {phaseDefs.map((def, idx) => {
            const meta = getPhaseMeta(def.code);
            const active = def.id === selectedId;
            return (
              <div key={def.id}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 cursor-pointer transition-colors
                  ${active ? 'border-ink bg-white' : 'border-hairline bg-white hover:border-stone-300'}`}
                onClick={() => setSelectedId(def.id)}>
                <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${meta.solid}`} />
                <span className="flex-1 min-w-0 text-xs font-medium text-ink truncate">{def.name}</span>
                <div className="flex flex-col">
                  <button onClick={e => { e.stopPropagation(); void move(idx, -1); }} disabled={idx === 0}
                    className="p-0.5 hover:bg-stone-100 rounded disabled:opacity-20"><ChevronUp className="w-3 h-3 text-stone-400" /></button>
                  <button onClick={e => { e.stopPropagation(); void move(idx, 1); }} disabled={idx === phaseDefs.length - 1}
                    className="p-0.5 hover:bg-stone-100 rounded disabled:opacity-20"><ChevronDown className="w-3 h-3 text-stone-400" /></button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Editor */}
        {selected && draft ? (
          <div className="bg-white border border-hairline rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 mb-1 block">Mã viết tắt</label>
                <input type="text" value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })}
                  title="Mã phase (vd PA). Đổi mã sẽ cập nhật mọi block đang dùng."
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-700 mb-1 block">Tên đầy đủ</label>
                <input type="text" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
                  placeholder="VD: Project Assessment"
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-700 mb-1 block">Màu</label>
              <div className="flex flex-wrap gap-1.5">
                {PHASE_COLOR_KEYS.map(key => (
                  <button key={key} type="button" title={PHASE_PALETTE[key].label}
                    onClick={() => setDraft({ ...draft, color: key })}
                    className={`w-6 h-6 rounded-md ${PHASE_PALETTE[key].solid} transition-transform
                      ${draft.color === key ? 'ring-2 ring-offset-1 ring-ink scale-110' : 'hover:scale-105'}`} />
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-700 mb-1 block">Mô tả</label>
              <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={2}
                className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink" />
            </div>

            <ItemEditor items={draft.checklist} setItems={next => setDraft({ ...draft, checklist: next })}
              icon={<CheckSquare className="w-3.5 h-3.5" />} label="Checklist mặc định" roleOptions={roleOptions} />
            <ItemEditor items={draft.outcomes} setItems={next => setDraft({ ...draft, outcomes: next })}
              icon={<Target className="w-3.5 h-3.5" />} label="Outcome mặc định" roleOptions={roleOptions} />

            {error && <p className="text-[11px] text-error">{error}</p>}

            {deleteWarn && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-600">
                <p className="flex items-center gap-1.5 font-semibold mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {deleteWarn.count} phase block đang dùng phase này.
                </p>
                <p className="mb-2 text-stone-600">Xóa vẫn giữ các block đó (sẽ hiển thị màu trung tính). Tiếp tục?</p>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(true)} disabled={busy}
                    className="px-2.5 py-1 bg-red-500 text-white rounded-md font-semibold hover:bg-red-600 disabled:opacity-50">Xóa vẫn tiếp tục</button>
                  <button onClick={() => setDeleteWarn(null)} className="px-2.5 py-1 text-stone-500 hover:text-stone-700">Hủy</button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-hairline">
              <button onClick={() => handleDelete(false)} disabled={busy || phaseDefs.length <= 1}
                title={phaseDefs.length <= 1 ? 'Workspace cần ít nhất 1 phase' : 'Xóa phase'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:border-red-400 disabled:opacity-40">
                <Trash2 className="w-3.5 h-3.5" /> Xóa phase
              </button>
              <button onClick={handleSave} disabled={busy || !dirty}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-ink text-white text-xs font-semibold rounded-lg hover:bg-[#242424] disabled:opacity-40">
                <Check className="w-3.5 h-3.5" /> Lưu
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl">
            Chọn hoặc thêm một phase để chỉnh sửa
          </div>
        )}
      </div>
    </div>
  );
}
