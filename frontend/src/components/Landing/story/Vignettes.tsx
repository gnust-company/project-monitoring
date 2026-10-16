// #landing: minh hoạ động cho từng chương của phần "Hành trình". Mỗi vignette mô phỏng
// một màn hình THẬT của app (dữ liệu checklist/outcome lấy từ nguồn mặc định chung với
// backend), chạy theo các bước khi chương được cuộn tới (`play`). Tôn trọng
// prefers-reduced-motion: nhảy thẳng tới trạng thái cuối.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Check, Lock, Paperclip, Bell, Megaphone, UserRound, MessageSquare,
  Eye, Hand, SquarePen, FileText,
} from 'lucide-react';
import {
  DEV_PHASES, PHASE_META, PHASE_PALETTE, PHASE_ROLE_TASKS, PHASE_ROLE_OUTCOMES,
  RACI_META, RACI_ROLES, type DevPhase, type RaciRole,
} from '../../../types';
import { ROLE_LABELS } from '../../../data/mockData';
import Avatar from '../../common/Avatar';
import { useLanding } from '../../../i18n/useLanding';

// Màu mặc định của vai trò — khớp backend app/domain/roles.py (DEFAULT_ROLES).
const ROLE_COLOR: Record<string, string> = {
  PM: 'blue', BA: 'amber', SW_Architect: 'violet', SysOps: 'slate',
  UI_Designer: 'rose', GUI: 'cyan', SW_Developer: 'emerald', SW_Tester: 'orange',
};

/** Đếm bước 0 → `steps` (mỗi `every` ms) kể từ khi `play` bật. */
function useSequence(play: boolean, steps: number, every = 900): number {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!play || reduce) return;
    const timers = Array.from({ length: steps }, (_, i) =>
      setTimeout(() => setStep(i + 1), (i + 1) * every));
    return () => timers.forEach(clearTimeout);
  }, [play, reduce, steps, every]);
  return reduce ? steps : step;
}

function Frame({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-hairline bg-white shadow-xl shadow-black/[0.05] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-hairline bg-surface-soft">
        <span className="flex gap-1 shrink-0" aria-hidden>
          <span className="w-2 h-2 rounded-full bg-stone-300" />
          <span className="w-2 h-2 rounded-full bg-stone-300" />
          <span className="w-2 h-2 rounded-full bg-stone-300" />
        </span>
        <span className="text-[11px] font-medium text-muted truncate">{title}</span>
        {right && <span className="ml-auto shrink-0">{right}</span>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const pal = PHASE_PALETTE[ROLE_COLOR[role] ?? 'gray'];
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${pal.bg} ${pal.color}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function Tick({ done }: { done: boolean }) {
  return (
    <motion.span
      animate={{ backgroundColor: done ? '#10b981' : '#ffffff', borderColor: done ? '#10b981' : '#d6d3d1' }}
      className="w-4 h-4 rounded border flex items-center justify-center shrink-0">
      {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </motion.span>
  );
}

function Bar({ pct, color = '#10b981' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
      <motion.div className="h-full rounded-full" style={{ background: color }}
        initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

const pop = {
  initial: { opacity: 0, scale: 0.9, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 28 },
};

// ── PA: workspace + quy trình tuỳ biến + PIC ─────────────────────────
function ProcessVignette({ play }: { play: boolean }) {
  const step = useSequence(play, 3, 750);
  const { project: STORY_PROJECT, vignettes: { process: L } } = useLanding();
  const roles = ['PM', 'BA', 'SW_Architect', 'SW_Developer', 'SW_Tester'];
  return (
    <Frame title={L.frame}>
      <div className="flex items-center gap-1.5 mb-4 text-[10px] font-semibold">
        {L.steps.map((s, i) => (
          <span key={s} className={`px-2 py-1 rounded-md ${i === 2 ? 'bg-ink text-white' : 'bg-stone-100 text-stone-500'}`}>
            {i + 1}. {s}
          </span>
        ))}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">{L.phases}</div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {DEV_PHASES.flatMap(code => {
          const m = PHASE_META[code];
          const chip = (
            <span key={code} className={`text-[11px] font-semibold px-2 py-1 rounded-md border ${m.bg} ${m.color} ${m.border}`}>
              {code}
            </span>
          );
          if (code !== 'ST' || step < 2) return [chip];
          const rose = PHASE_PALETTE.rose;
          return [chip, (
            <motion.span key="UAT" {...pop}
              className={`text-[11px] font-semibold px-2 py-1 rounded-md border border-dashed ${rose.bg} ${rose.color} ${rose.border}`}>
              UAT <span className="font-normal opacity-70">· {L.customPhase}</span>
            </motion.span>
          )];
        })}
      </div>
      <AnimatePresence>
        {step >= 1 && (
          <motion.div key="roles" {...pop} className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">{L.roles}</div>
            <div className="flex flex-wrap gap-1.5">
              {roles.map(r => <RoleBadge key={r} role={r} />)}
              <span className="text-[10px] text-muted px-1 py-0.5">+3</span>
            </div>
          </motion.div>
        )}
        {step >= 3 && (
          <motion.div key="pic" {...pop}
            className="flex items-center gap-2 rounded-lg border border-hairline px-3 py-2">
            <span className="text-[11px] text-muted">{L.projectPic}</span>
            <Avatar name={STORY_PROJECT.pic} className="w-5 h-5" />
            <span className="text-xs font-medium text-ink">{STORY_PROJECT.pic}</span>
            <span className="ml-auto text-[10px] text-muted">{STORY_PROJECT.name}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Frame>
  );
}

// ── SA: checklist tự sinh theo vai trò ───────────────────────────────
function ChecklistVignette({ play }: { play: boolean }) {
  const groups = PHASE_ROLE_TASKS.SA;
  const outcomes = PHASE_ROLE_OUTCOMES.SA.reduce((n, g) => n + g.outcomes.length, 0);
  const flat = groups.flatMap(g => g.tasks.map(t => `${g.role}:${t}`));
  const step = useSequence(play, 4, 650);
  const { project: STORY_PROJECT, vignettes: { checklist: L } } = useLanding();
  const done = new Set(flat.slice(0, step));
  const pct = Math.round((done.size / (flat.length + outcomes)) * 100);
  const m = PHASE_META.SA;
  return (
    <Frame title={`[SA] ${m.label} · ${STORY_PROJECT.name}`}
      right={<span className={`text-[10px] font-bold ${m.color}`}>{pct}%</span>}>
      <div className="mb-3"><Bar pct={pct} /></div>
      <div className="space-y-3">
        {groups.map(g => (
          <div key={g.role}>
            <RoleBadge role={g.role} />
            <ul className="mt-1.5 space-y-1.5">
              {g.tasks.map(t => (
                <li key={t} className="flex items-center gap-2 text-[12px] text-body">
                  <Tick done={done.has(`${g.role}:${t}`)} />
                  <span className={done.has(`${g.role}:${t}`) ? 'line-through text-muted' : ''}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-hairline text-[11px] text-muted">
        {L.defaultOutcomes(outcomes, PHASE_ROLE_OUTCOMES.SA.flatMap(g => g.outcomes).join(', '))}
      </div>
    </Frame>
  );
}

// ── SD: RACI, có người ngoài nền tảng ────────────────────────────────
type RaciPerson = { raci: RaciRole; name: string; role?: string; external?: boolean };

function RaciVignette({ play }: { play: boolean }) {
  const { t } = useTranslation();
  const { team: TEAM, vignettes: { raci: L } } = useLanding();
  const people: RaciPerson[] = [
    { raci: 'R', name: TEAM.ui, role: 'UI_Designer' },
    { raci: 'R', name: TEAM.architect, role: 'SW_Architect' },
    { raci: 'A', name: TEAM.pm, role: 'PM' },
    { raci: 'I', name: TEAM.ba, role: 'BA' },
    { raci: 'C', name: TEAM.external, external: true },
  ];
  const step = useSequence(play, people.length, 550);
  const shown = people.slice(0, step);
  return (
    <Frame title={`[SD] ${PHASE_META.SD.label} · ${L.frame}`}>
      <div className="space-y-2">
        {RACI_ROLES.map(r => {
          const meta = RACI_META[r].chip;
          return (
            <div key={r} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-h-[28px]">
              <div className="sm:w-36 shrink-0 flex items-center gap-1.5">
                <span className={`inline-flex w-5 h-5 items-center justify-center rounded text-[10px] font-bold border ${meta}`}>{r}</span>
                <span className="text-[11px] text-muted whitespace-nowrap">{t(`raci.${r}.label`)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 min-w-0">
                <AnimatePresence>
                  {shown.filter(p => p.raci === r).map(p => (
                    <motion.span key={p.name} {...pop}
                      className={`inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full border text-[11px] max-w-full ${meta}
                        ${p.external ? 'ring-2 ring-violet-300/60' : ''}`}>
                      {p.external
                        ? <UserRound className="w-3.5 h-3.5 opacity-60" />
                        : <Avatar name={p.name} className="w-4 h-4" />}
                      <span className="whitespace-nowrap truncate">{p.name}</span>
                      {p.external && <span className="text-[9px] opacity-60">{L.external}</span>}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

// ── SI: Pipeline — Sắp xếp (kéo/giãn) → Lưu ──────────────────────────
function TimelineVignette({ play }: { play: boolean }) {
  const { t } = useTranslation();
  const { vignettes: { timeline: L } } = useLanding();
  const step = useSequence(play, 4, 900);
  const mode = step >= 1 ? 'layout' : 'readonly';
  const si = PHASE_META.SI;
  const st = PHASE_META.ST;
  const moved = step >= 2;
  const modes = [
    { key: 'readonly', label: t('pipeline.mode.readonly'), Icon: Eye },
    { key: 'layout', label: t('pipeline.mode.layout'), Icon: Hand },
    { key: 'create', label: t('pipeline.mode.create'), Icon: SquarePen },
  ];
  return (
    <Frame title={L.frame}>
      <div className="flex items-center bg-stone-100 rounded-lg p-0.5 w-fit mb-3">
        {modes.map(({ key, label, Icon }) => (
          <span key={key}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md whitespace-nowrap transition-colors
              ${mode === key ? 'bg-white text-ink shadow-sm' : 'text-stone-500'}`}>
            <Icon className="w-3 h-3" /> {label}
          </span>
        ))}
      </div>
      <div className="relative rounded-lg border border-hairline overflow-hidden">
        <div className="grid grid-cols-6 border-b border-hairline bg-surface-soft">
          {['W40', 'W41', 'W42', 'W43', 'W44', 'W45'].map(w => (
            <span key={w} className="text-[9px] font-semibold text-stone-500 text-center py-1 border-r border-hairline last:border-r-0">{w}</span>
          ))}
        </div>
        <div className="relative h-[108px]">
          <div className="absolute inset-0 grid grid-cols-6" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => <span key={i} className="border-r border-hairline-soft last:border-r-0" />)}
          </div>
          <span className="absolute top-0 bottom-0 w-px bg-red-400" style={{ left: '38%' }} aria-hidden />
          <div className={`absolute h-7 rounded-md border px-2 flex items-center text-[10px] font-semibold ${si.bg} ${si.border} ${si.color}`}
            style={{ top: 8, left: '3%', width: '46%' }}>[SI] Develop source code</div>
          <div className={`absolute h-7 rounded-md border px-2 flex items-center text-[10px] font-semibold ${si.bg} ${si.border} ${si.color}`}
            style={{ top: 40, left: '20%', width: '26%' }}>[SI] Setup STG</div>
          <motion.div
            className={`absolute h-7 rounded-md border px-2 flex items-center text-[10px] font-semibold whitespace-nowrap overflow-hidden
              ${st.bg} ${st.border} ${st.color} ${mode === 'layout' ? 'ring-2 ring-ink/20' : ''}`}
            style={{ top: 72 }}
            initial={false}
            animate={{ left: moved ? '58%' : '50%', width: moved ? '38%' : '30%' }}
            transition={{ type: 'spring', stiffness: 160, damping: 22 }}>
            [ST] System test
          </motion.div>
        </div>
      </div>
      <div className="h-9 mt-3">
        <AnimatePresence mode="wait">
          {step === 3 && (
            <motion.div key="dirty" {...pop}
              className="flex items-center gap-2 rounded-lg bg-ink text-white px-3 py-2 text-[11px]">
              <span>{L.unsaved}</span>
              <span className="ml-auto px-2 py-0.5 rounded bg-white/10">{t('common.cancel')}</span>
              <span className="px-2 py-0.5 rounded bg-white text-ink font-semibold">{t('common.save')}</span>
            </motion.div>
          )}
          {step >= 4 && (
            <motion.div key="saved" {...pop}
              className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium px-1 py-2">
              <Check className="w-3.5 h-3.5" /> {L.saved}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Frame>
  );
}

// ── ST: outcome cần tài liệu mới được tick ───────────────────────────
function OutcomeVignette({ play }: { play: boolean }) {
  const step = useSequence(play, 3, 1100);
  const { team: TEAM, vignettes: { outcome: L } } = useLanding();
  const m = PHASE_META.ST;
  const reportDone = step >= 2;
  return (
    <Frame title={`[ST] ${m.label} · Outcomes`}
      right={<span className={`text-[10px] font-bold ${m.color}`}>{reportDone ? 2 : 1}/2</span>}>
      <ul className="space-y-3">
        <li className="flex items-start gap-2">
          <Tick done />
          <div className="min-w-0">
            <div className="text-[12px] text-ink font-medium">Test Plan</div>
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-body bg-stone-100 rounded px-1.5 py-0.5">
              <FileText className="w-3 h-3" /> test-plan.pdf
            </span>
          </div>
        </li>
        <li className="flex items-start gap-2">
          {reportDone ? <Tick done /> : (
            <span className="w-4 h-4 rounded border border-stone-300 bg-stone-50 flex items-center justify-center shrink-0" title={L.needsDoc}>
              <Lock className="w-2.5 h-2.5 text-stone-400" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-ink font-medium">Test Report</div>
            {step < 1 && <div className="text-[10px] text-amber-600 mt-0.5">{L.needsDocHint}</div>}
            {step >= 1 && (
              <motion.div {...pop} className="mt-1 max-w-[220px]">
                <span className="inline-flex items-center gap-1 text-[10px] text-body bg-stone-100 rounded px-1.5 py-0.5">
                  <Paperclip className="w-3 h-3" /> test-report-v2.pdf
                </span>
                <div className="mt-1"><Bar pct={100} color="#f97316" /></div>
              </motion.div>
            )}
          </div>
        </li>
      </ul>
      <AnimatePresence>
        {step >= 3 && (
          <motion.div {...pop} className="mt-4 flex items-start gap-2 rounded-lg bg-surface-soft border border-hairline p-2.5">
            <Avatar name={TEAM.tester} className="w-5 h-5" />
            <div className="text-[11px] text-body">
              <span className="font-semibold text-ink">{TEAM.tester}</span>{' '}
              <MessageSquare className="inline w-3 h-3 text-muted -mt-0.5" />{' '}
              {L.comment(TEAM.architect.split(' ').pop() ?? TEAM.architect)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Frame>
  );
}

// ── DEP: trạng thái tự chuyển "Có rủi ro" ────────────────────────────
function HealthVignette({ play }: { play: boolean }) {
  const { t } = useTranslation();
  const { project: STORY_PROJECT, vignettes: { health: L } } = useLanding();
  const step = useSequence(play, 2, 1200);
  const atRisk = step >= 1;
  const schedule = step >= 1 ? 78 : 55;
  const actual = 64;
  const kpis = [
    { label: L.total, value: 12, color: 'text-ink' },
    { label: t('projectStatus.onTrack'), value: atRisk ? 8 : 9, color: 'text-emerald-600' },
    { label: t('projectStatus.atRisk'), value: atRisk ? 3 : 2, color: 'text-amber-600' },
    { label: t('projectStatus.delayed'), value: 1, color: 'text-red-600' },
  ];
  return (
    <Frame title="Dashboard">
      <div className="grid grid-cols-4 gap-2 mb-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-lg bg-surface-soft border border-hairline px-2 py-2">
            <motion.div key={k.value} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className={`text-lg font-semibold leading-none ${k.color}`}>{k.value}</motion.div>
            <div className="text-[9px] text-muted mt-1 leading-tight">{k.label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-hairline p-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[12px] font-semibold text-ink truncate">{STORY_PROJECT.name}</span>
          <AnimatePresence mode="wait">
            <motion.span key={atRisk ? 'risk' : 'ok'} {...pop}
              className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap
                ${atRisk ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {atRisk ? t('projectStatus.atRisk') : t('projectStatus.onTrack')}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="space-y-2 text-[10px] text-muted">
          <div>
            <div className="flex justify-between mb-1"><span>{L.schedule}</span><span>{schedule}%</span></div>
            <Bar pct={schedule} color="#a8a29e" />
          </div>
          <div>
            <div className="flex justify-between mb-1"><span>{L.actual}</span><span>{actual}%</span></div>
            <Bar pct={actual} color={atRisk ? '#f59e0b' : '#10b981'} />
          </div>
        </div>
        <div className="mt-3 h-4 text-[10px]">
          {atRisk && <motion.span {...pop} className="text-amber-600">{L.explain}</motion.span>}
        </div>
      </div>
    </Frame>
  );
}

// ── OM: lịch sử thay đổi + thông báo ─────────────────────────────────
function ActivityVignette({ play }: { play: boolean }) {
  const { project: STORY_PROJECT, vignettes: { activity: L } } = useLanding();
  const LOG = L.log;
  const step = useSequence(play, LOG.length, 700);
  return (
    <Frame title={`${STORY_PROJECT.name} · ${L.frame}`}
      right={(
        <span className="relative inline-flex">
          <Bell className="w-3.5 h-3.5 text-muted" />
          {step > 0 && (
            <motion.span key={step} {...pop}
              className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-1 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
              {step}
            </motion.span>
          )}
        </span>
      )}>
      <div className="flex items-center gap-2 rounded-lg bg-surface-dark text-white px-3 py-2 mb-3 text-[11px]">
        <Megaphone className="w-3.5 h-3.5 shrink-0 text-white/70" />
        <span className="truncate">{L.announcement}</span>
      </div>
      <ul className="space-y-2.5 min-h-[136px]">
        <AnimatePresence>
          {LOG.slice(0, step).map(l => (
            <motion.li key={l.who} {...pop} className="flex items-start gap-2">
              <Avatar name={l.who} className="w-5 h-5" />
              <div className="text-[11px] text-body leading-snug min-w-0">
                <span className="font-semibold text-ink">{l.who}</span> {l.text}
                <span className="text-muted"> — {l.detail}</span>
                <div className="text-[9px] text-muted-soft">{l.when}</div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Frame>
  );
}

const VIGNETTES: Record<DevPhase, (p: { play: boolean }) => React.ReactElement> = {
  PA: ProcessVignette,
  SA: ChecklistVignette,
  SD: RaciVignette,
  SI: TimelineVignette,
  ST: OutcomeVignette,
  DEP: HealthVignette,
  OM: ActivityVignette,
};

/** Vignette của một phase trong phần "Hành trình". */
export default function PhaseVignette({ phase, play }: { phase: DevPhase; play: boolean }) {
  const Vignette = VIGNETTES[phase];
  return <Vignette play={play} />;
}
