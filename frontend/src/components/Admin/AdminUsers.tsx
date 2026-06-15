import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Crown, KeyRound, Mail, Briefcase, Building2, Calendar, ShieldPlus, ShieldMinus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { AdminUserInfo } from '../../types';
import Avatar from '../common/Avatar';

interface Props {
  users: AdminUserInfo[];
  loading: boolean;
  currentUserId: string;
  onReset: (user: AdminUserInfo) => void;
  onToggleAdmin: (user: AdminUserInfo) => void;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'dd/MM/yyyy'); } catch { return '—'; }
}

export default function AdminUsers({ users, loading, currentUserId, onReset, onToggleAdmin }: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q));
  }, [users, query]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Người dùng</h2>
          <p className="text-xs text-muted mt-0.5">{users.length} tài khoản trong hệ thống</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-soft" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Tìm theo tên, email, vai trò…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-hairline bg-white text-sm text-ink
                       focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/30 transition-all" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-hairline overflow-hidden">
        {/* Header row */}
        <div className="hidden md:grid grid-cols-[1fr_140px_120px_110px_180px] gap-3 px-5 py-3 border-b border-hairline-soft bg-surface-soft/50 text-[11px] font-semibold text-muted uppercase tracking-wide">
          <span>Người dùng</span>
          <span>Vai trò</span>
          <span>Workspace</span>
          <span>Ngày tạo</span>
          <span className="text-right">Hành động</span>
        </div>

        {loading && (
          <div className="px-5 py-12 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-stone-200 border-t-ink rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-muted-soft">Không tìm thấy người dùng nào</div>
        )}

        <div className="divide-y divide-hairline-soft">
          {filtered.map((u, idx) => (
            <motion.div key={u.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(idx * 0.02, 0.3) }}>
              <div
                className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_140px_120px_110px_180px] gap-3 px-5 py-3 items-center hover:bg-surface-soft/40 transition-colors cursor-pointer"
                onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
                {/* User */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.name} src={u.avatar} className="w-9 h-9" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate flex items-center gap-1.5">
                      {u.name}
                      {u.isSuperuser && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          <Crown className="w-2.5 h-2.5" /> Admin
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-soft truncate">{u.email}</p>
                  </div>
                </div>
                {/* Role */}
                <span className="hidden md:inline-flex text-[11px] font-medium text-body px-2 py-1 rounded-md bg-surface-soft w-fit">{u.role}</span>
                {/* Workspace count */}
                <span className="hidden md:block text-sm text-body tabular-nums">{u.workspaceCount}</span>
                {/* Created */}
                <span className="hidden md:block text-xs text-muted tabular-nums">{fmtDate(u.createdAt)}</span>
                {/* Action */}
                <div className="flex justify-end items-center gap-1.5">
                  {u.id === currentUserId ? (
                    <span className="text-[10px] font-medium text-muted-soft px-2 py-1 rounded-md bg-surface-soft">Bạn</span>
                  ) : u.isSuperuser ? (
                    <button
                      onClick={e => { e.stopPropagation(); onToggleAdmin(u); }}
                      title="Thu hồi quyền Admin"
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-amber-700
                                 border border-amber-200 hover:bg-amber-50 transition-colors">
                      <ShieldMinus className="w-3.5 h-3.5" /> Thu hồi
                    </button>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); onToggleAdmin(u); }}
                      title="Cấp quyền Admin"
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-emerald-700
                                 border border-emerald-200 hover:bg-emerald-50 transition-colors">
                      <ShieldPlus className="w-3.5 h-3.5" /> Admin
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onReset(u); }}
                    title="Đặt lại mật khẩu"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-body
                               border border-hairline hover:border-ink/30 hover:bg-surface-soft transition-colors">
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded detail (mobile-friendly full info) */}
              {expanded === u.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden bg-surface-soft/40 border-t border-hairline-soft">
                  <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Detail icon={Mail} label="Email" value={u.email} />
                    <Detail icon={Briefcase} label="Vai trò" value={u.role} />
                    <Detail icon={Building2} label="Workspace" value={String(u.workspaceCount)} />
                    <Detail icon={Calendar} label="Tham gia" value={fmtDate(u.createdAt)} />
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-soft uppercase tracking-wide mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className="text-sm text-ink truncate">{value}</p>
    </div>
  );
}
