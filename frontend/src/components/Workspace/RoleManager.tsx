import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { WorkspaceRoleDef } from '../../types';
import { rolesApi, type RoleBody } from '../../api';
import { ApiError } from '../../api/client';
import { Users, Plus, Trash2, ChevronUp, ChevronDown, Check, AlertTriangle, X } from 'lucide-react';

// Mỗi dòng role: đổi tên inline + sắp xếp + xóa (xóa kéo theo checklist/outcome mặc định).
function RoleRow({ role, idx, total, onRename, onMove, onDelete }: {
  role: WorkspaceRoleDef;
  idx: number;
  total: number;
  onRename: (name: string) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(role.name);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { setName(role.name); }, [role.name]);

  const commit = () => { const v = name.trim(); if (v && v !== role.name) onRename(v); else setName(role.name); };

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-2 py-1.5">
      <span className="font-mono text-[10px] text-stone-400 w-16 truncate flex-shrink-0" title={role.code}>{role.code}</span>
      <input value={name} onChange={e => setName(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="flex-1 min-w-0 px-2 py-1 bg-white border border-stone-200 rounded-md text-xs text-stone-700
                   focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink" />
      <div className="flex flex-col flex-shrink-0">
        <button onClick={() => onMove(-1)} disabled={idx === 0} className="p-0.5 hover:bg-stone-100 rounded disabled:opacity-20"><ChevronUp className="w-3 h-3 text-stone-400" /></button>
        <button onClick={() => onMove(1)} disabled={idx === total - 1} className="p-0.5 hover:bg-stone-100 rounded disabled:opacity-20"><ChevronDown className="w-3 h-3 text-stone-400" /></button>
      </div>
      {confirm ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onDelete} title="Xóa role (kéo theo checklist/outcome mặc định)"
            className="p-1 rounded bg-red-500 text-white hover:bg-red-600"><Check className="w-3 h-3" /></button>
          <button onClick={() => setConfirm(false)} className="p-1 rounded hover:bg-stone-100"><X className="w-3 h-3 text-stone-400" /></button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)} disabled={total <= 1}
          title={total <= 1 ? 'Cần ít nhất 1 role' : 'Xóa role'}
          className="p-1 hover:bg-stone-100 rounded flex-shrink-0 disabled:opacity-30">
          <Trash2 className="w-3.5 h-3.5 text-stone-400 hover:text-red-500" />
        </button>
      )}
    </div>
  );
}

// orgId: nếu truyền (wizard), quản lý role của workspace đó qua API (local); bỏ trống = workspace đang chọn.
export default function RoleManager({ orgId }: { orgId?: string } = {}) {
  const ctx = useApp();
  const standalone = !!orgId;
  const [localRoles, setLocalRoles] = useState<WorkspaceRoleDef[]>([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!standalone || !orgId) return;
    let alive = true;
    rolesApi.list(orgId).then(r => { if (alive) setLocalRoles(r); }).catch(() => { /* ignore */ });
    return () => { alive = false; };
  }, [standalone, orgId]);

  const byPos = (a: WorkspaceRoleDef, b: WorkspaceRoleDef) => a.position - b.position;
  const roles = standalone ? localRoles : ctx.orgRoles;
  const add = standalone
    ? async (b: RoleBody) => { const c = await rolesApi.create(orgId!, b); setLocalRoles(p => [...p, c].sort(byPos)); return c; }
    : ctx.addRole;
  const update = standalone
    ? async (id: string, b: Partial<RoleBody>) => { const u = await rolesApi.update(orgId!, id, b); setLocalRoles(p => p.map(x => x.id === id ? u : x).sort(byPos)); }
    : ctx.updateRole;
  const del = standalone
    ? async (id: string) => { await rolesApi.remove(orgId!, id); setLocalRoles(p => p.filter(x => x.id !== id)); }
    : ctx.deleteRole;
  const reorder = standalone
    ? async (ids: string[]) => { setLocalRoles(await rolesApi.reorder(orgId!, ids)); }
    : ctx.reorderRoles;

  const handleAdd = async () => {
    const v = newName.trim();
    if (!v) return;
    setError(null);
    try { await add({ name: v }); setNewName(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thêm được role'); }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...roles];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    await reorder(next.map(r => r.id));
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try { await del(id); }
    catch (e) {
      setError(e instanceof ApiError ? e.detail : (e instanceof Error ? e.message : 'Xóa thất bại'));
    }
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink flex items-center gap-2 mb-1">
        <Users className="w-4 h-4" /> Vai trò công việc ({roles.length})
      </h2>
      <p className="text-[11px] text-stone-500 mb-3">
        Bộ role của workspace (gán cho thành viên + checklist/outcome theo role). Xóa role sẽ
        xóa luôn các đầu việc/sản phẩm mặc định gắn role đó.
      </p>

      <div className="space-y-1.5 max-w-lg">
        {roles.map((r, idx) => (
          <RoleRow key={r.id} role={r} idx={idx} total={roles.length}
            onRename={name => update(r.id, { name })}
            onMove={dir => void move(idx, dir)}
            onDelete={() => void handleDelete(r.id)} />
        ))}

        <div className="flex items-center gap-1.5 pt-1">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAdd(); } }}
            placeholder="Thêm vai trò mới…"
            className="flex-1 px-2.5 py-1.5 bg-stone-50/60 border border-dashed border-stone-200 rounded-md text-xs
                       focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink focus:bg-white" />
          <button onClick={() => void handleAdd()}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-ink text-white text-xs font-semibold rounded-md hover:bg-[#242424]">
            <Plus className="w-3.5 h-3.5" /> Thêm
          </button>
        </div>
        {error && <p className="text-[11px] text-error flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {error}</p>}
      </div>
    </div>
  );
}
