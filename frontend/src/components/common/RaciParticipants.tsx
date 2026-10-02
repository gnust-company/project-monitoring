// #34: chọn/hiển thị người tham gia phase theo ma trận RACI.
// Mỗi dòng R/A/C/I liệt kê chip người tham gia; "+" mở popover chọn thành viên workspace
// HOẶC gõ tên người ngoài nền tảng (text thuần, chỉ để ghi nhận). Một người chỉ ở 1 vai trò.
import { useState } from 'react';
import { Plus, X, UserRound } from 'lucide-react';
import {
  RACI_META, RACI_ROLES, participantKey,
  type PhaseParticipant, type RaciRole, type User,
} from '../../types';
import Avatar from './Avatar';

const MAX_NAME = 120; // khớp backend phase_participants.display_name

interface Props {
  value: PhaseParticipant[];
  onChange: (next: PhaseParticipant[]) => void;
  members: User[];
  getUserById: (id: string) => User | undefined;
  readOnly?: boolean;
}

export default function RaciParticipants({ value, onChange, members, getUserById, readOnly }: Props) {
  const [openRole, setOpenRole] = useState<RaciRole | null>(null);
  const [freeName, setFreeName] = useState('');

  const taken = new Set(value.map(participantKey));
  const addable = members.filter(m => !taken.has(m.id));

  const close = () => { setOpenRole(null); setFreeName(''); };
  const add = (p: PhaseParticipant) => onChange([...value, p]);
  const remove = (p: PhaseParticipant) => onChange(value.filter(x => x !== p));

  const addFree = (raci: RaciRole) => {
    const name = freeName.trim().slice(0, MAX_NAME);
    if (!name || taken.has(name.toLowerCase())) return;
    add({ userId: null, name, raci });
    setFreeName('');
  };

  return (
    <div className="space-y-1.5">
      {RACI_ROLES.map(role => {
        const meta = RACI_META[role];
        const rows = value.filter(p => p.raci === role);
        return (
          <div key={role} className="flex items-start gap-2">
            <div className="w-40 shrink-0 pt-1 whitespace-nowrap" title={`${meta.en} — ${meta.hint}`}>
              <span className={`inline-flex w-5 h-5 items-center justify-center rounded text-[10px] font-bold border ${meta.chip}`}>
                {role}
              </span>
              <span className="ml-1.5 text-[11px] text-gray-500">{meta.label}</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 min-h-[26px]">
              {rows.map(p => {
                const u = p.userId ? getUserById(p.userId) : undefined;
                const label = p.userId ? (u?.name ?? 'Người dùng') : (p.name ?? '');
                return (
                  <span key={participantKey(p)}
                    className={`inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full border text-[11px] ${meta.chip}`}
                    title={p.userId ? label : `${label} (ngoài nền tảng)`}>
                    {p.userId
                      ? <Avatar name={u?.name} src={u?.avatar} className="w-4 h-4" />
                      : <UserRound className="w-3.5 h-3.5 opacity-60" />}
                    <span className="max-w-[10rem] truncate">{label}</span>
                    {!p.userId && <span className="text-[9px] opacity-60">ngoài</span>}
                    {!readOnly && (
                      <button type="button" onClick={() => remove(p)} title={`Xóa ${label}`}
                        className="ml-0.5 opacity-50 hover:opacity-100 hover:text-red-600 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                );
              })}
              {rows.length === 0 && readOnly && <span className="text-[11px] text-gray-300">—</span>}

              {!readOnly && (
                <div className="relative">
                  <button type="button" onClick={() => (openRole === role ? close() : setOpenRole(role))}
                    title={`Thêm người (${meta.label})`}
                    className="w-6 h-6 rounded-full border border-dashed border-gray-300 text-gray-400
                      hover:border-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                  {openRole === role && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={close} />
                      <div className="absolute left-0 top-full mt-1 z-40 w-60 bg-white rounded-lg border border-gray-200 shadow-lg">
                        <div className="max-h-40 overflow-y-auto py-1">
                          {addable.length === 0 ? (
                            <p className="px-3 py-2 text-[11px] text-gray-400">Đã thêm đủ thành viên workspace.</p>
                          ) : addable.map(m => (
                            <button key={m.id} type="button"
                              onClick={() => { add({ userId: m.id, name: null, raci: role }); close(); }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 text-left">
                              <Avatar name={m.name} src={m.avatar} className="w-5 h-5" />
                              <span className="text-xs text-slate-700 truncate">{m.name}</span>
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-100 p-2">
                          <label className="block text-[10px] text-gray-400 mb-1">
                            Người ngoài nền tảng — nhập tên
                          </label>
                          <div className="flex gap-1.5">
                            <input value={freeName} maxLength={MAX_NAME} autoFocus
                              onChange={e => setFreeName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); addFree(role); }
                                if (e.key === 'Escape') { e.stopPropagation(); close(); }
                              }}
                              placeholder="VD: Nguyễn Văn A (khách hàng)"
                              className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 rounded-md
                                focus:outline-none focus:ring-1 focus:ring-slate-300" />
                            <button type="button" onClick={() => addFree(role)} disabled={!freeName.trim()}
                              className="px-2 py-1 text-xs font-medium bg-slate-800 text-white rounded-md
                                disabled:opacity-40 hover:bg-slate-700 transition-colors">
                              Thêm
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
