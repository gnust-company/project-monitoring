import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { PHASE_META, DEV_PHASES } from '../../types';
import {
  BarChart3, Layers, Users, Zap, ArrowRight,
  Sparkles, Shield, Globe, Clock, TrendingUp, CheckCircle2
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const features = [
  { icon: Layers, title: '7-Phase Pipeline', desc: 'Project Assessment → SW Analysis → Design → Implementation → Test → Deployment → O&M. Every phase block tracks through all 7 stages.', color: 'bg-blue-50' },
  { icon: BarChart3, title: 'Visual Timeline', desc: 'Drag, drop, and resize phase blocks on an interactive timeline. Zoom by week, month, or year. Pan with your mouse.', color: 'bg-emerald-50' },
  { icon: Users, title: 'Team Collaboration', desc: 'Checklists, comments, attachments, and activity logs — all organized per phase block with full team visibility.', color: 'bg-violet-50' },
  { icon: Clock, title: 'Today Marker', desc: 'A clear red vertical line marks the current day across all projects, keeping everyone aligned on progress.', color: 'bg-amber-50' },
  { icon: Shield, title: 'Role-Based Process', desc: 'Each phase defines clear roles and responsibilities: PM, BA, SW Architect, Developer, Tester, SysOps, Designer.', color: 'bg-rose-50' },
  { icon: Zap, title: 'Fast & Interactive', desc: 'Built for speed. Drag to reorder, resize to change dates, click for detail — all in real-time.', color: 'bg-cyan-50' },
];

const stats = [
  { label: 'Active Projects', value: '17+', icon: Layers },
  { label: 'Team Members', value: '12', icon: Users },
  { label: 'Workspaces', value: '3', icon: Globe },
  { label: 'Dev Phases', value: '7', icon: TrendingUp },
];

export default function LandingPage() {
  const { goToWorkspaceSelector } = useApp();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">ProjectHub</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#phases" className="text-sm text-gray-600 hover:text-slate-900 transition-colors hidden sm:block">Phases</a>
            <a href="#features" className="text-sm text-gray-600 hover:text-slate-900 transition-colors hidden sm:block">Features</a>
            <button onClick={goToWorkspaceSelector}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 
                         transition-colors flex items-center gap-1.5">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-50" />
        </div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-700 mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Software Development Process Pipeline
            </motion.div>
            <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="visible"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
              Track every phase with{' '}
              <span className="bg-slate-900 text-white px-2 py-1 rounded-lg">precision</span>
            </motion.h1>
            <motion.p custom={2} variants={fadeUp} initial="hidden" animate="visible"
              className="text-lg text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
              A 7-phase development pipeline: Assessment, Analysis, Design, Implementation, Testing, Deployment, and O&M. 
              Drag, drop, and manage phase blocks across projects in one unified timeline.
            </motion.p>
            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="flex items-center justify-center gap-3">
              <button onClick={goToWorkspaceSelector}
                className="px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 
                           transition-all hover:shadow-lg flex items-center gap-2 text-sm">
                Launch Dashboard <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#phases" className="px-6 py-3 bg-white text-slate-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 text-sm">
                Explore Phases
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center">
                <stat.icon className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 Phases */}
      <section id="phases" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">7 Development Phases</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Every project feature goes through these structured phases. Each phase has defined roles, deliverables, and responsibilities.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {DEV_PHASES.map((phase, i) => {
              const meta = PHASE_META[phase];
              return (
                <motion.div key={phase} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  className={`${meta.bg} border ${meta.border} rounded-xl p-5 hover:shadow-lg transition-all`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-lg font-bold ${meta.color}`}>{phase}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-sm font-medium text-slate-700">{meta.label}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{meta.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pipeline Preview */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 -z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Visual pipeline. Total control.</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              See all your projects and their phase blocks laid out on a draggable timeline.
            </p>
          </motion.div>
          <motion.div custom={1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              {DEV_PHASES.map(phase => {
                const meta = PHASE_META[phase];
                return (
                  <span key={phase} className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-md ${meta.bg} ${meta.color}`}>
                    {phase}
                  </span>
                );
              })}
            </div>
            {/* Sample rows */}
            {[
              { name: 'Cloud Migration', phases: ['PA', 'SA', 'SD', 'SI', 'ST'] },
              { name: 'Portal Redesign', phases: ['PA', 'SA', 'SD', 'SI', 'ST', 'DEP'] },
              { name: 'Payment Gateway', phases: ['PA', 'SA', 'SD', 'SI', 'ST', 'DEP', 'OM'] },
              { name: 'AI Dashboard', phases: ['PA', 'SA', 'SD'] },
              { name: 'Mobile App v3', phases: ['PA', 'SA'] },
            ].map((row, idx) => (
              <motion.div key={row.name}
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: idx * 0.1 + 0.3 }}
                className="grid grid-cols-[140px_1fr] gap-4 mb-3 items-center">
                <div className="text-sm text-white font-medium truncate">{row.name}</div>
                <div className="flex gap-1">
                  {DEV_PHASES.map(p => {
                    const inRow = row.phases.includes(p);
                    const meta = PHASE_META[p];
                    return (
                      <div key={p} className="flex-1 h-7 rounded-md flex items-center justify-center"
                        style={{
                          backgroundColor: inRow ? meta.bg.replace('bg-', '').replace('50', '400').replace('gray-100', '#d1d5db') : 'rgba(255,255,255,0.05)',
                          opacity: inRow ? 1 : 0.3,
                        }}>
                        {inRow && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
            {/* Today marker */}
            <div className="relative mt-4 pt-2 border-t border-white/10">
              <div className="absolute left-1/3 top-0 bottom-0 flex flex-col items-center">
                <span className="text-[9px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded mb-1">TODAY</span>
                <div className="w-px flex-1 bg-red-500/40 min-h-[20px]" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything you need</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From 7-phase pipeline to task-level detail, ProjectHub covers the full development lifecycle.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:border-gray-300 transition-all">
                <div className={`w-11 h-11 ${f.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-5 h-5 text-slate-700" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="bg-gray-50 rounded-3xl p-12 lg:p-16 text-center border border-gray-100">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Ready to streamline your dev process?</h2>
            <p className="text-gray-500 mb-8 max-w-lg mx-auto">Jump into a workspace with sample data and see the 7-phase pipeline in action.</p>
            <button onClick={goToWorkspaceSelector}
              className="px-8 py-3.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 
                         transition-all hover:shadow-xl inline-flex items-center gap-2 text-sm">
              Launch ProjectHub <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-sm text-slate-900">ProjectHub</span>
          </div>
          <p className="text-xs text-gray-400">7-Phase Software Development Process Pipeline</p>
        </div>
      </footer>
    </div>
  );
}
