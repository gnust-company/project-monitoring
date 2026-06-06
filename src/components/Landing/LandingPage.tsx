import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { PHASE_META, DEV_PHASES } from '../../types';
import type { DevPhase } from '../../types';
import {
  BarChart3, Layers, Users, Zap, ArrowRight,
  Shield, Clock, TrendingUp, CheckCircle2,
  ChevronRight, AlertTriangle, FolderKanban,
  FileText, Code2, TestTube, Rocket, Wrench,
} from 'lucide-react';
import LivePipelinePreview from './LivePipelinePreview';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
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
  const target = el.getBoundingClientRect().top + window.scrollY - 80;
  const distance = target - start;
  if (Math.abs(distance) < 5) return;
  const duration = 600;
  const startTime = performance.now();
  const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const animate = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, start + distance * ease(progress));
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
};

// ── 7-phase detail data ──────────────────────────────────────
const phaseDetail: Record<DevPhase, {
  deliverables: string[];
  roles: string[];
  icon: typeof FileText;
}> = {
  PA: { deliverables: ['BRD (Business Requirement Document)', 'Feasibility Report', 'Project Charter Draft'], roles: ['PM', 'BA'], icon: FileText },
  SA: { deliverables: ['Project Charter', 'User Requirements', 'WBS (Work Breakdown Structure)'], roles: ['BA', 'SW Architect'], icon: FolderKanban },
  SD: { deliverables: ['SRS Document', 'HLD/DDD', 'Wireframes & GUI Design'], roles: ['UI Designer', 'SW Architect'], icon: Layers },
  SI: { deliverables: ['Source Code', 'Unit Test Cases', 'Infrastructure Setup'], roles: ['SW Developer', 'SysOps'], icon: Code2 },
  ST: { deliverables: ['Test Plans', 'Test Reports', 'Performance & Security Audit'], roles: ['SW Tester', 'SW Developer'], icon: TestTube },
  DEP: { deliverables: ['Deployment Schedule', 'User Guide', 'Go-live Checklist'], roles: ['SysOps', 'PM'], icon: Rocket },
  OM: { deliverables: ['Incident Log', 'RCA Reports', 'Monitoring Dashboard'], roles: ['SysOps', 'SW Developer'], icon: Wrench },
};

const features = [
  { icon: Layers, title: '7-Phase Pipeline', desc: 'Từ đánh giá dự án đến vận hành — mọi giai đoạn được theo dõi chi tiết qua 7 bước chuẩn.' },
  { icon: BarChart3, title: 'Timeline Trực Quan', desc: 'Kéo thả, resize phase blocks. Zoom theo tuần, tháng, quý — linh hoạt theo nhu cầu.' },
  { icon: Users, title: 'Hợp Tác Nhóm', desc: 'Checklists, bình luận, tệp đính kèm — tất cả trong một phase block duy nhất.' },
  { icon: Clock, title: 'Today Marker', desc: 'Đường kẻ đỏ đánh dấu ngày hiện tại, biết ngay mọi thứ đang đi trước hay sau.' },
  { icon: Shield, title: '7 Vai Trò Rõ Ràng', desc: 'PM, BA, Architect, Developer, Tester, SysOps, Designer — ai làm gì, rõ ràng.' },
  { icon: Zap, title: 'Nhanh & Mượt', desc: 'Drag để sắp xếp, resize để đổi ngày, click để xem chi tiết — tất cả real-time.' },
];

export default function LandingPage() {
  const { goToLogin, goToWorkspaceSelector } = useApp();
  const [activePhase, setActivePhase] = useState<DevPhase>('PA');

  return (
    <div className="min-h-screen bg-white">
      {/* ═══ Navbar ═══════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-hairline">
        <div className="px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-ink rounded-xl flex items-center justify-center">
                <Layers className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-semibold text-lg text-ink tracking-tight">ProjectHub</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => smoothScrollToId('phases')} className="text-sm text-muted hover:text-ink transition-colors font-medium">Quy trình</button>
              <button onClick={() => smoothScrollToId('features')} className="text-sm text-muted hover:text-ink transition-colors font-medium">Tính năng</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goToLogin}
              className="text-sm text-muted hover:text-ink transition-colors font-medium px-4 py-2">
              Đăng nhập
            </button>
            <button onClick={goToWorkspaceSelector}
              className="px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-lg
                         hover:bg-[#242424] transition-all">
              Bắt đầu ngay
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ Hero ════════════════════════════════════════════════ */}
      <section className="pt-28 pb-20 lg:pt-36 lg:pb-28 px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-8">
          {/* Left — Text */}
          <div className="lg:w-[38%] xl:w-[40%] flex-shrink-0 lg:sticky lg:top-28">
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink/[0.04] border border-ink/[0.08] rounded-full text-xs font-semibold text-ink mb-6">
              <Zap className="w-3.5 h-3.5" /> 7-Phase Development Pipeline
            </motion.div>
            <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="visible"
              className="text-5xl sm:text-6xl lg:text-[64px] font-semibold text-ink tracking-[-0.02em] leading-[1.05] mb-6">
              Visualizing the<br />
              Software Lifecycle
            </motion.h1>
            <motion.p custom={2} variants={fadeUp} initial="hidden" animate="visible"
              className="text-lg text-body leading-relaxed mb-4 max-w-md">
              Quản lý và theo dõi toàn bộ quy trình phát triển phần mềm — từ đánh giá dự án đến vận hành.
              Timeline trực quan, kéo thả mượt mà, hợp tác thời gian thực.
            </motion.p>
          </div>

          {/* Right — Live Pipeline */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible"
            className="lg:w-[62%] xl:w-[60%] min-w-0 w-full shadow-xl shadow-black/[0.06] rounded-2xl overflow-hidden border border-hairline"
            style={{ height: 560 }}>
            <LivePipelinePreview />
          </motion.div>
        </div>
      </section>

      {/* ═══ Pain Points ════════════════════════════════════════ */}
      <section className="py-24 px-8 bg-surface-soft">
        <div className="flex flex-col lg:flex-row gap-16 items-start">
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="lg:w-[380px] flex-shrink-0 lg:sticky lg:top-28">
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted mb-4 block">Vấn đề</span>
            <h2 className="text-4xl lg:text-5xl font-semibold text-ink tracking-tight mb-5 leading-tight">
              Vấn đề bạn đang gặp phải?
            </h2>
            <p className="text-body text-lg leading-relaxed">
              Quản lý dự án phần mềm truyền thống thường thiếu cái nhìn tổng thể.
              Teams phải dùng nhiều tools khác nhau, thông tin phân tán, deadline bị miss.
            </p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="flex-1 space-y-5">
            {[
              {
                icon: FolderKanban,
                title: 'Dành cho Project Managers',
                pains: [
                  'Nhiều dự án, không thấy cái nào đang落后 — thiếu dashboard tổng quan',
                  'Status meeting mỗi tuần chỉ để hỏi "Đâu rồi?" — lãng phí thời gian',
                  'Deadline đến mà phase trước chưa xong — không có cảnh báo sớm',
                ],
              },
              {
                icon: Code2,
                title: 'Dành cho Developers & QA',
                pains: [
                  'Checklist rải rác trong Excel, Jira, Slack — không tập trung',
                  'Không rõ phase mình làm nằm ở đâu trong tổng thể dự án',
                  'Handoff giữa các phase không rõ ràng — SA xong chưa để bắt đầu SI?',
                ],
              },
            ].map((card, i) => (
              <motion.div key={i} variants={fadeUp}
                className="bg-surface-card rounded-xl border border-hairline p-7 hover:border-gray-300 transition-all group">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: '#11111108', color: '#111111' }}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink">{card.title}</h3>
                </div>
                <ul className="space-y-3">
                  {card.pains.map((pain, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-body leading-relaxed">
                      <AlertTriangle className="w-4 h-4 text-muted-soft flex-shrink-0 mt-0.5" />
                      {pain}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ 7-Phase Interactive ════════════════════════════════ */}
      <section id="phases" className="py-24 px-8 bg-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="mb-16">
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted mb-4 block">Quy trình</span>
            <h2 className="text-4xl lg:text-5xl font-semibold text-ink tracking-tight mb-4">
              7 Giai đoạn chuẩn hóa
            </h2>
            <p className="text-muted max-w-lg text-lg">
              Mỗi tính năng đi qua 7 giai đoạn. Mỗi giai đoạn có vai trò và sản phẩm bàn giao rõ ràng.
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-0 lg:gap-0">
            <div className="lg:w-[280px] flex-shrink-0">
              <div className="flex flex-row lg:flex-col gap-0 overflow-x-auto lg:overflow-visible">
                {DEV_PHASES.map((phase, i) => {
                  const meta = PHASE_META[phase];
                  const isActive = activePhase === phase;
                  return (
                    <motion.button key={phase}
                      onClick={() => setActivePhase(phase)}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06 }}
                      className={`group flex items-center gap-4 px-5 py-4 text-left transition-all
                        border-b-2 lg:border-b-0 lg:border-l-2 whitespace-nowrap lg:whitespace-normal
                        ${isActive ? 'bg-surface-card border-ink' : 'border-transparent hover:bg-surface-soft'}`}>
                      <span className={`text-2xl font-semibold transition-colors
                        ${isActive ? 'text-ink' : 'text-ink/[0.12] group-hover:text-ink/30'}`}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md inline-block mb-1
                          ${isActive ? meta.bg + ' ' + meta.color : 'bg-surface-card text-muted'}`}>
                          {phase}
                        </span>
                        <div className={`text-sm font-medium transition-colors truncate
                          ${isActive ? 'text-ink' : 'text-muted group-hover:text-ink/70'}`}>
                          {meta.label}
                        </div>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-ink hidden lg:block" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 lg:pl-12 mt-6 lg:mt-0 min-h-[320px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePhase}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-surface-card rounded-xl border border-hairline p-8 h-full">
                  {(() => {
                    const meta = PHASE_META[activePhase];
                    const detail = phaseDetail[activePhase];
                    const Icon = detail.icon;
                    return (
                      <>
                        <div className="flex items-center gap-4 mb-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${meta.bg} ${meta.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-lg ${meta.bg} ${meta.color}`}>{activePhase}</span>
                              <h3 className="text-xl font-semibold text-ink">{meta.label}</h3>
                            </div>
                            <p className="text-sm text-muted mt-0.5">{meta.desc}</p>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">Sản phẩm bàn giao</h4>
                            <ul className="space-y-2">
                              {detail.deliverables.map((d, i) => (
                                <motion.li key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.08 }}
                                  className="flex items-start gap-2.5 text-sm text-body">
                                  <CheckCircle2 className="w-4 h-4 text-muted-soft flex-shrink-0 mt-0.5" />{d}
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">Vai trò chính</h4>
                            <div className="flex flex-wrap gap-2">
                              {detail.roles.map((role, i) => (
                                <motion.span key={role} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.2 + i * 0.08 }}
                                  className="px-3 py-1.5 bg-surface-card border border-hairline rounded-lg text-xs font-medium text-body">
                                  {role}
                                </motion.span>
                              ))}
                            </div>
                            <div className="mt-6 pt-4 border-t border-hairline">
                              <div className="flex items-center gap-2 text-xs text-muted">
                                <span>{activePhase}</span>
                                <ArrowRight className="w-3 h-3" />
                                <span className="text-ink">{DEV_PHASES[DEV_PHASES.indexOf(activePhase) + 1] || 'Hoàn thành'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Features ════════════════════════════════════════════ */}
      <section id="features" className="py-24 px-8 bg-white">
        <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-center mb-14">
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted mb-4 block">Tính năng</span>
          <h2 className="text-4xl lg:text-5xl font-semibold text-ink tracking-tight mb-4">Mọi thứ bạn cần</h2>
          <p className="text-muted max-w-lg mx-auto text-lg">
            Từ pipeline 7 giai đoạn đến chi tiết task-level — bao phủ toàn bộ vòng đời phát triển.
          </p>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp}
              className="group bg-surface-card rounded-xl border border-hairline p-6 hover:border-gray-300 transition-all card-hover">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#11111108', color: '#111111' }}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-ink mb-2">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══ How it Works ═══════════════════════════════════════ */}
      <section className="py-24 px-8 bg-surface-soft">
        <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-center mb-14">
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted mb-4 block">Bắt đầu</span>
          <h2 className="text-4xl lg:text-5xl font-semibold text-ink tracking-tight mb-4">3 bước để bắt đầu</h2>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { step: '01', title: 'Tạo Workspace', desc: 'Thêm tổ chức, mời team members vào workspace chung.' },
            { step: '02', title: 'Tạo Dự án & Phase', desc: 'Chọn dự án, tạo phase blocks trên timeline với drag & drop.' },
            { step: '03', title: 'Track & Collaborate', desc: 'Kéo thả, comment, checklist — Tất cả trong 1 chỗ.' },
          ].map((item, i) => (
            <motion.div key={item.step} variants={fadeUp}
              className="bg-white rounded-xl border border-hairline p-8 text-center card-hover">
              <span className="text-5xl font-semibold text-ink/[0.06] block mb-4">{item.step}</span>
              <h3 className="text-lg font-semibold text-ink mb-2">{item.title}</h3>
              <p className="text-sm text-muted">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══ CTA ═════════════════════════════════════════════════ */}
      <section className="py-24 px-8 bg-white">
        <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="max-w-4xl mx-auto bg-surface-card rounded-3xl p-12 lg:p-20 text-center">
          <h2 className="text-3xl lg:text-4xl font-semibold text-ink mb-4 tracking-tight">Sẵn sàng tối ưu quy trình?</h2>
          <p className="text-muted mb-10 max-w-md mx-auto text-lg">
            Trải nghiệm ngay pipeline 7 giai đoạn với dữ liệu mẫu. Không cần credit card.
          </p>
          <button onClick={goToWorkspaceSelector}
            className="px-10 py-4 bg-ink text-white font-semibold rounded-lg hover:bg-[#242424]
                       hover:shadow-xl hover:shadow-ink/10 transition-all inline-flex items-center gap-2.5 text-sm">
            Khởi chạy ProjectHub <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      {/* ═══ Footer — the only dark surface ═════════════════════ */}
      <footer className="bg-surface-dark py-16 px-8">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-white">ProjectHub</span>
          </div>
          <p className="text-xs text-on-dark-soft">&copy; 2026 · 7-Phase SDLC Pipeline</p>
        </div>
      </footer>
    </div>
  );
}
