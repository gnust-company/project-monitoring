import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, Users, FolderKanban, Calendar, Crown, ChevronDown } from 'lucide-react';
import { formatDate } from '../../i18n/format';
import type { AdminWorkspaceInfo } from '../../types';
import Avatar from '../common/Avatar';

interface Props {
  workspaces: AdminWorkspaceInfo[];
  loading: boolean;
}

function fmtDate(iso: string | null): string {
  return iso ? formatDate(iso) : '—';
}

export default function AdminWorkspaces({ workspaces, loading }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(w =>
      w.name.toLowerCase().includes(q) ||
      w.owners.some(o => o.name.toLowerCase().includes(q) || (o.email ?? '').toLowerCase().includes(q)));
  }, [workspaces, query]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t('admin.tabs.workspaces')}</h2>
          <p className="text-xs text-muted mt-0.5">{t('admin.workspaces.count', { count: workspaces.length })}</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-soft" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t('admin.workspaces.search')}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-hairline bg-white text-sm text-ink
                       focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/30 transition-all" />
        </div>
      </div>

      {loading && (
        <div className="py-12 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-stone-200 border-t-ink rounded-full animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-soft">{t('admin.workspaces.empty')}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((w, idx) => {
          const open = expanded === w.id;
          return (
            <motion.div key={w.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.3) }}
              className="bg-white rounded-2xl border border-hairline overflow-hidden">
              <button
                onClick={() => setExpanded(open ? null : w.id)}
                className="w-full text-left p-5 hover:bg-surface-soft/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-surface-card flex items-center justify-center flex-shrink-0">
                      <span className="text-base font-semibold text-ink">{w.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{w.name}</p>
                      <p className="text-[11px] text-muted-soft flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> {t('admin.workspaces.created', { date: fmtDate(w.createdAt) })}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-soft flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>

                {/* Quick metrics */}
                <div className="flex items-center gap-4 mt-4">
                  <Metric icon={Users} value={w.memberCount} label={t('admin.workspaces.members', { count: w.memberCount })} />
                  <Metric icon={FolderKanban} value={w.projectCount} label={t('admin.workspaces.projects', { count: w.projectCount })} />
                  <Metric icon={Crown} value={w.owners.length} label={t('admin.workspaces.owners', { count: w.owners.length })} />
                </div>
              </button>

              {open && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden border-t border-hairline-soft">
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-semibold text-muted-soft uppercase tracking-wide mb-2.5">{t('admin.workspaces.ownersTitle')}</p>
                    {w.owners.length === 0 ? (
                      <p className="text-xs text-muted-soft">{t('admin.workspaces.noOwners')}</p>
                    ) : (
                      <div className="space-y-2">
                        {w.owners.map(o => (
                          <div key={o.id} className="flex items-center gap-2.5">
                            <Avatar name={o.name} src={o.avatar} className="w-7 h-7" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-ink truncate">{o.name}</p>
                              <p className="text-[10px] text-muted-soft truncate">{o.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-soft" />
      <span className="text-sm font-semibold text-ink tabular-nums">{value}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );
}
