// Landing page — kể chuyện "một dự án đi qua 7 phase" (StorySection). Toàn bộ chữ nằm ở
// landingContent.ts (chuẩn bị cho song ngữ #29); chỉ mô tả tính năng đang có thật.
import { motion, MotionConfig } from 'framer-motion';
import {
  Layers, ArrowRight, ArrowDown, FolderKanban, CalendarRange, Workflow, ClipboardCheck,
  UserCheck, Activity, ShieldCheck, Terminal, Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import LivePipelinePreview from './LivePipelinePreview';
import StorySection from './story/StorySection';
import UserMenu from '../common/UserMenu';
import { NAV, HERO, FEATURES, DEPLOY, CTA, FOOTER } from './landingContent';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

// ── Custom RAF smooth scroll ────────────────────────────────────
const smoothScrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const start = window.scrollY;
  const target = el.getBoundingClientRect().top + window.scrollY - 64;
  const distance = target - start;
  if (Math.abs(distance) < 5) return;
  const duration = 600;
  const startTime = performance.now();
  const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const animate = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, start + distance * ease(progress));
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
};

const YEAR = new Date().getFullYear();

const FEATURE_ICONS: Record<string, typeof Layers> = {
  pipeline: CalendarRange,
  process: Workflow,
  phase: ClipboardCheck,
  pic: UserCheck,
  health: Activity,
  admin: ShieldCheck,
};

export default function LandingPage() {
  const { goToLogin, goToWorkspaceSelector, currentUser } = useApp();

  // CTA: chưa đăng nhập → tới đăng nhập; đã đăng nhập → vào danh sách workspace
  const goStart = currentUser ? goToWorkspaceSelector : goToLogin;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-white">
        {/* ═══ Navbar ═══════════════════════════════════════════════ */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-hairline">
          <div className="px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-ink rounded-xl flex items-center justify-center">
                  <Layers className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="font-semibold text-lg text-ink tracking-tight">ProjectHub</span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                {([['story', NAV.story], ['features', NAV.features], ['deploy', NAV.deploy]] as const).map(([id, label]) => (
                  <button key={id} onClick={() => smoothScrollToId(id)}
                    className="text-sm text-muted hover:text-ink transition-colors font-medium">{label}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentUser ? (
                <>
                  <button onClick={goToWorkspaceSelector}
                    className="hidden sm:inline-flex px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-lg
                               hover:bg-[#242424] transition-all items-center gap-2 whitespace-nowrap">
                    <FolderKanban className="w-4 h-4" /> {NAV.workspaces}
                  </button>
                  <UserMenu />
                </>
              ) : (
                <>
                  <button onClick={goToLogin}
                    className="text-sm text-muted hover:text-ink transition-colors font-medium px-3 py-2 whitespace-nowrap">
                    {NAV.login}
                  </button>
                  <button onClick={goStart}
                    className="px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-[#242424] transition-all whitespace-nowrap">
                    {NAV.start}
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* ═══ Hero ════════════════════════════════════════════════ */}
        <section className="pt-28 pb-20 lg:pt-36 lg:pb-24 px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-10">
            <div className="lg:w-[40%] flex-shrink-0 lg:sticky lg:top-28">
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
                className="inline-flex items-center gap-2 px-4 py-2 bg-ink/[0.04] border border-ink/[0.08] rounded-full text-xs font-semibold text-ink mb-6">
                <Layers className="w-3.5 h-3.5" /> {HERO.badge}
              </motion.div>
              <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="visible"
                className="text-4xl sm:text-5xl xl:text-[56px] font-semibold text-ink tracking-[-0.02em] leading-[1.08] mb-6">
                {HERO.title[0]}<br />
                {HERO.title[1]}<br />
                <span className="text-ink/45">{HERO.title[2]}</span>
              </motion.h1>
              <motion.p custom={2} variants={fadeUp} initial="hidden" animate="visible"
                className="text-lg text-body leading-relaxed mb-8 max-w-lg">
                {HERO.lead}
              </motion.p>
              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
                className="flex flex-wrap items-center gap-3">
                <button onClick={goStart}
                  className="px-6 py-3 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-[#242424]
                             transition-all inline-flex items-center gap-2 whitespace-nowrap">
                  {currentUser ? NAV.workspaces : HERO.ctaPrimary} <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => smoothScrollToId('story')}
                  className="px-5 py-3 text-sm font-semibold text-ink rounded-lg border border-hairline
                             hover:bg-surface-soft transition-all inline-flex items-center gap-2 whitespace-nowrap">
                  {HERO.ctaSecondary} <ArrowDown className="w-4 h-4" />
                </button>
              </motion.div>
            </div>

            <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="lg:flex-1 min-w-0 w-full">
              <div className="shadow-xl shadow-black/[0.06] rounded-2xl overflow-hidden border border-hairline" style={{ height: 540 }}>
                <LivePipelinePreview />
              </div>
              <p className="mt-3 text-xs text-muted text-center">{HERO.previewHint}</p>
            </motion.div>
          </div>
        </section>

        {/* ═══ Hành trình 7 phase ═══════════════════════════════════ */}
        <StorySection />

        {/* ═══ Tính năng ════════════════════════════════════════════ */}
        <section id="features" className="py-24 px-6 lg:px-8 bg-white">
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-14">
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted mb-4 block">{FEATURES.kicker}</span>
            <h2 className="text-4xl lg:text-5xl font-semibold text-ink tracking-tight text-balance">{FEATURES.title}</h2>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {FEATURES.items.map(f => {
              const Icon = FEATURE_ICONS[f.key] ?? Layers;
              return (
                <motion.div key={f.key} variants={fadeUp}
                  className="group bg-surface-card rounded-xl border border-hairline p-6 hover:border-gray-300 transition-all">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-ink/[0.04] text-ink
                                  transition-transform group-hover:scale-110">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-ink mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* ═══ Triển khai ═══════════════════════════════════════════ */}
        <section id="deploy" className="py-24 px-6 lg:px-8 bg-surface-dark">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-on-dark-soft mb-4 block">{DEPLOY.kicker}</span>
              <h2 className="text-4xl lg:text-5xl font-semibold text-white tracking-tight mb-5 text-balance">{DEPLOY.title}</h2>
              <p className="text-lg text-on-dark-soft leading-relaxed mb-6">{DEPLOY.lead}</p>
              <ul className="space-y-2.5">
                {DEPLOY.points.map(p => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-white/80">
                    <Check className="w-4 h-4 mt-0.5 text-white/50 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div custom={1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="rounded-xl border border-white/10 bg-surface-dark-elevated overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 text-[11px] text-on-dark-soft">
                <Terminal className="w-3.5 h-3.5" /> terminal
              </div>
              <pre className="p-5 text-[13px] leading-7 font-mono overflow-x-auto">
                {DEPLOY.code.map(line => (
                  <div key={line.cmd} className="whitespace-pre">
                    <span className="text-white/40">$ </span>
                    <span className="text-white">{line.cmd}</span>
                    <span className="text-white/35">  {line.note}</span>
                  </div>
                ))}
              </pre>
            </motion.div>
          </div>
        </section>

        {/* ═══ CTA ═════════════════════════════════════════════════ */}
        <section className="py-24 px-6 lg:px-8 bg-white">
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="max-w-4xl mx-auto bg-surface-card rounded-3xl p-10 lg:p-16 text-center">
            <h2 className="text-3xl lg:text-4xl font-semibold text-ink mb-4 tracking-tight text-balance">{CTA.title}</h2>
            <p className="text-muted mb-10 max-w-md mx-auto text-lg text-balance">{CTA.lead}</p>
            <button onClick={goStart}
              className="px-10 py-4 bg-ink text-white font-semibold rounded-lg hover:bg-[#242424]
                         hover:shadow-xl hover:shadow-ink/10 transition-all inline-flex items-center gap-2.5 text-sm">
              {currentUser ? NAV.workspaces : CTA.button} <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </section>

        {/* ═══ Footer ══════════════════════════════════════════════ */}
        <footer className="bg-surface-dark border-t border-white/5 py-12 px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm text-white">ProjectHub</span>
            </div>
            <p className="text-xs text-on-dark-soft">&copy; {YEAR} ProjectHub · {FOOTER.tagline}</p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
