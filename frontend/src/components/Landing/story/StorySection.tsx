// #landing — "Theo chân một dự án qua 7 phase" (scroll-telling).
// Desktop: cột trái là thẻ dự án dính (sticky) với mini Gantt tự vẽ dần theo chương đang đọc;
// cột phải là 7 chương, mỗi chương một vignette mô phỏng màn hình thật.
// Mobile: thanh bước 7 phase dính trên đầu thay cho thẻ dự án.
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PHASE_META } from '../../../types';
import Avatar from '../../common/Avatar';
import { useLanding } from '../../../i18n/useLanding';
import PhaseVignette from './Vignettes';

// Vị trí (% bề ngang) của từng phase trên mini Gantt — gối đầu nhẹ như dự án thật.
const SPANS: Array<[number, number]> = [[0, 13], [10, 27], [23, 43], [39, 66], [61, 81], [78, 91], [88, 100]];
const ROW = 26;

function scrollToChapter(i: number) {
  document.getElementById(`chapter-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function ProjectCard({ active }: { active: number }) {
  const { t } = useTranslation();
  const { chapters: CHAPTERS, story: STORY, project: STORY_PROJECT } = useLanding();
  const atRisk = CHAPTERS[active].phase === 'DEP';
  const pct = Math.round(((active + 0.5) / CHAPTERS.length) * 100);
  const [s, e] = SPANS[active];
  const meta = PHASE_META[CHAPTERS[active].phase];
  return (
    <div className="rounded-2xl border border-hairline bg-white shadow-xl shadow-black/[0.05] p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">{STORY.projectLabel}</div>
          <div className="text-lg font-semibold text-ink leading-tight">{STORY_PROJECT.name}</div>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted">
            <Avatar name={STORY_PROJECT.pic} className="w-5 h-5" /> PIC · {STORY_PROJECT.pic}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.span key={atRisk ? 'risk' : 'ok'}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className={`ml-auto shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full
              ${atRisk ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {atRisk ? t('projectStatus.atRisk') : t('projectStatus.onTrack')}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Mini Gantt */}
      <div className="relative" style={{ height: CHAPTERS.length * ROW }}>
        <motion.div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" aria-hidden
          initial={false} animate={{ left: `calc(2.75rem + (100% - 2.75rem) * ${(s + (e - s) * 0.6) / 100})` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
          <span className="absolute -top-4 -translate-x-1/2 text-[9px] font-semibold text-red-500 whitespace-nowrap">
            {STORY.todayLabel}
          </span>
        </motion.div>
        {CHAPTERS.map((c, i) => {
          const m = PHASE_META[c.phase];
          const [a, b] = SPANS[i];
          const done = i < active;
          const current = i === active;
          return (
            <button key={c.phase} type="button" onClick={() => scrollToChapter(i)}
              className="absolute left-0 right-0 flex items-center group" style={{ top: i * ROW, height: ROW }}
              aria-label={`${c.phase} — ${c.name || m.label}`}>
              <span className={`w-11 shrink-0 text-left text-[10px] font-bold transition-colors
                ${current ? m.color : done ? 'text-ink/60' : 'text-ink/25 group-hover:text-ink/50'}`}>
                {c.phase}
              </span>
              <span className="relative flex-1 h-full">
                <span
                  className={`absolute top-1/2 -translate-y-1/2 h-3.5 rounded-full border overflow-hidden transition-colors duration-300
                    ${current ? `${m.bg} ${m.border} ring-2 ring-offset-1 ring-black/5` : done ? `${m.border} ${m.bg}` : 'border-dashed border-stone-300 bg-transparent'}`}
                  style={{ left: `${a}%`, width: `${b - a}%` }}>
                  <motion.span className={`absolute inset-y-0 left-0 ${m.solid}`}
                    initial={false} animate={{ width: done ? '100%' : current ? '60%' : '0%' }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-hairline">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted">{STORY.progressLabel}</span>
          <span className="font-semibold text-ink">{pct}%</span>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <motion.div className="h-full bg-ink rounded-full" initial={false} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <div className="mt-3 text-xs text-muted">
          {STORY.nowLabel}: <span className={`font-semibold ${meta.color}`}>{CHAPTERS[active].phase}</span>
          <span className="text-ink"> · {meta.label}</span>
        </div>
      </div>
    </div>
  );
}

export default function StorySection() {
  const { chapters: CHAPTERS, story: STORY } = useLanding();
  const [active, setActive] = useState(0);
  // Chương xa nhất đã cuộn tới (-1 = chưa tới chương nào) → vignette chỉ chạy khi người đọc tới nơi,
  // chạy xong giữ nguyên trạng thái cuối.
  const [reached, setReached] = useState(-1);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Chương "đang đọc" = chương cắt đường giữa màn hình.
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const i = Number((entry.target as HTMLElement).dataset.index);
        setActive(i);
        setReached(r => Math.max(r, i));
      }
    }, { rootMargin: '-50% 0px -50% 0px' });
    refs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="story" className="py-24 px-6 lg:px-8 bg-surface-soft">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-10 lg:mb-4">
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted mb-4 block">{STORY.kicker}</span>
          <h2 className="text-4xl lg:text-5xl font-semibold text-ink tracking-tight mb-4 text-balance">{STORY.title}</h2>
          <p className="text-lg text-body leading-relaxed">{STORY.lead}</p>
        </div>

        {/* Mobile: thanh bước dính */}
        <div className="lg:hidden sticky top-16 z-30 -mx-6 px-6 py-3 bg-surface-soft/90 backdrop-blur border-y border-hairline">
          <div className="flex gap-1.5 overflow-x-auto">
            {CHAPTERS.map((c, i) => {
              const m = PHASE_META[c.phase];
              return (
                <button key={c.phase} type="button" onClick={() => scrollToChapter(i)}
                  className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors
                    ${i === active ? `${m.bg} ${m.color} ${m.border}` : i < active ? 'bg-white text-ink/70 border-hairline' : 'bg-transparent text-ink/30 border-transparent'}`}>
                  {i < active && <Check className="w-3 h-3" />}{c.phase}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <div className="hidden lg:block">
            <div className="sticky top-28 pt-16">
              <ProjectCard active={active} />
            </div>
          </div>

          <div>
            {CHAPTERS.map((c, i) => {
              const m = PHASE_META[c.phase];
              return (
                <article key={c.phase} id={`chapter-${i}`} data-index={i}
                  ref={el => { refs.current[i] = el; }}
                  className="min-h-[85vh] flex flex-col justify-center py-14">
                  <motion.div animate={{ opacity: i === active ? 1 : 0.35 }} transition={{ duration: 0.35 }}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${m.bg} ${m.color} ${m.border}`}>{c.phase}</span>
                      <span className="text-xs text-muted">{m.label}{c.name && ` — ${c.name}`}</span>
                      <span className="ml-auto text-xs text-muted-soft tabular-nums">{String(i + 1).padStart(2, '0')} / 07</span>
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-semibold text-ink tracking-tight mb-3 text-balance">{c.title}</h3>
                    <p className="text-base text-body leading-relaxed mb-5">{c.body}</p>
                    <ul className="space-y-2 mb-7">
                      {c.points.map(p => (
                        <li key={p} className="flex items-start gap-2.5 text-sm text-body">
                          <CheckCircle2 className="w-4 h-4 text-ink/40 mt-0.5 shrink-0" /> {p}
                        </li>
                      ))}
                    </ul>
                    <PhaseVignette phase={c.phase} play={i <= reached} />
                  </motion.div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
