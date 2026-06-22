import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { DEV_PHASES, PHASE_META } from '../../types';
import { ApiError } from '../../api/client';
import {
  Layers, Eye, EyeOff, ArrowRight, Mail, Lock, User,
  ChevronRight, Sparkles
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function LoginPage() {
  const { login, register, goToLanding } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>(
    typeof window !== 'undefined' && window.location.pathname === '/register' ? 'register' : 'login'
  );
  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    window.history.pushState({}, '', m === 'register' ? '/register' : '/login');
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirm) return;
    setLoading(true);
    setError(null);
    try {
      await register(regEmail, regPassword, regName);
    } catch (err) {
      // Phòng vệ #4.4: 409 = email đã tồn tại (thường do lần submit trước tạo user xong
      // nhưng afterAuth lỗi nên UI kẹt). Tự thử login với cùng credential thay vì báo lỗi cứng.
      if (err instanceof ApiError && err.status === 409) {
        try {
          await login(regEmail, regPassword);
          return;
        } catch (loginErr) {
          setError(loginErr instanceof Error
            ? loginErr.message
            : 'Email đã được đăng ký. Vui lòng đăng nhập.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full pl-10 pr-4 py-3 bg-white border border-hairline rounded-lg text-sm
                       text-ink placeholder:text-muted
                       focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink
                       transition-all`;

  return (
    <div className="min-h-screen flex">
      {/* ── Left — Branding (dark accent surface) ──────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] bg-surface-dark relative overflow-hidden flex-shrink-0">
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'radial-gradient(circle, #fff 0.5px, transparent 0.5px)',
          backgroundSize: '32px 32px',
        }} />
        {/* Subtle glow */}
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-white/[0.03] rounded-full blur-[100px]" />
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-white/[0.02] rounded-full blur-[80px]" />

        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.06] border border-white/[0.08] rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5 text-white/60" />
            </div>
            <div>
              <span className="font-semibold text-lg text-white tracking-tight">ProjectHub</span>
              <span className="block text-[10px] text-on-dark-soft tracking-[0.15em] uppercase">Development Pipeline</span>
            </div>
          </div>

          <div className="space-y-6">
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-[10px] text-on-dark-soft">
                <Sparkles className="w-3 h-3 text-white/40" /> 7-Phase Process Pipeline
              </div>
            </motion.div>
            <motion.h2 custom={1} variants={fadeUp} initial="hidden" animate="visible"
              className="text-3xl xl:text-4xl font-semibold text-white leading-tight tracking-tight">
              Quản lý quy trình<br />
              phát triển phần mềm<br />
              toàn diện.
            </motion.h2>
            <motion.p custom={2} variants={fadeUp} initial="hidden" animate="visible"
              className="text-sm text-on-dark-soft leading-relaxed max-w-sm">
              Từ đánh giá dự án đến vận hành — theo dõi mọi giai đoạn với timeline trực quan,
              kéo thả mượt mà, và hợp tác nhóm.
            </motion.p>

            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
              className="flex flex-wrap gap-1.5 pt-2">
              {DEV_PHASES.map(phase => {
                const meta = PHASE_META[phase];
                return (
                  <span key={phase}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${meta.bg} ${meta.color}`}>
                    {phase}
                  </span>
                );
              })}
            </motion.div>
          </div>

          <div className="text-[11px] text-on-dark-soft">
            &copy; 2026 ProjectHub
          </div>
        </div>
      </div>

      {/* ── Right — Form ───────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-white p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-ink rounded-xl flex items-center justify-center">
              <Layers className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-semibold text-lg text-ink tracking-tight">ProjectHub</span>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold text-ink tracking-tight">Đăng nhập</h1>
                  <p className="text-sm text-muted mt-1.5">Chào mừng trở lại! Nhập thông tin để tiếp tục.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-body mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="you@company.com" required className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-body mb-1.5 block">Mật khẩu</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input type={showPassword ? 'text' : 'password'}
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" required className={`${inputClass} pr-11`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button type="button" onClick={() => setRemember(!remember)}
                        className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all
                          ${remember ? 'bg-ink border-ink' : 'border-gray-300 bg-white'}`}>
                        {remember && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className="text-xs text-body">Ghi nhớ đăng nhập</span>
                    </label>
                    <button type="button" className="text-xs text-ink hover:text-[#242424] font-medium transition-colors">
                      Quên mật khẩu?
                    </button>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 bg-ink text-white text-sm font-semibold rounded-lg
                               hover:bg-[#242424] active:scale-[0.98]
                               disabled:opacity-60 disabled:cursor-not-allowed
                               transition-all flex items-center justify-center gap-2 mt-2">
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Đăng nhập <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-hairline" />
                  <span className="text-[11px] text-muted-soft">hoặc</span>
                  <div className="flex-1 h-px bg-hairline" />
                </div>

                <button onClick={() => switchMode('register')}
                  className="w-full py-3 bg-white text-body text-sm font-semibold rounded-lg
                             border border-hairline hover:bg-surface-soft hover:border-gray-300
                             transition-all flex items-center justify-center gap-2">
                  Tạo tài khoản mới
                </button>
              </motion.div>
            ) : (
              <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold text-ink tracking-tight">Đăng ký</h1>
                  <p className="text-sm text-muted mt-1.5">Tạo tài khoản để bắt đầu sử dụng ProjectHub.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-body mb-1.5 block">Họ tên</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input type="text" value={regName} onChange={e => setRegName(e.target.value)}
                        placeholder="Nguyễn Văn A" required className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-body mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                        placeholder="you@company.com" required className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-body mb-1.5 block">Mật khẩu</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input type={showPassword ? 'text' : 'password'}
                        value={regPassword} onChange={e => setRegPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự" required minLength={6} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-body mb-1.5 block">Xác nhận mật khẩu</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input type={showPassword ? 'text' : 'password'}
                        value={regConfirm} onChange={e => setRegConfirm(e.target.value)}
                        placeholder="Nhập lại mật khẩu" required
                        className={`${inputClass} ${regConfirm && regConfirm !== regPassword ? '!border-error !focus:border-error !focus:ring-error/15' : ''}`} />
                    </div>
                    {regConfirm && regConfirm !== regPassword && (
                      <p className="text-[11px] text-error mt-1">Mật khẩu không khớp</p>
                    )}
                  </div>

                  <button type="submit" disabled={loading || (regConfirm !== regPassword)}
                    className="w-full py-3.5 bg-ink text-white text-sm font-semibold rounded-lg
                               hover:bg-[#242424] active:scale-[0.98]
                               disabled:opacity-60 disabled:cursor-not-allowed
                               transition-all flex items-center justify-center gap-2 mt-2">
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Đăng ký <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-hairline" />
                  <span className="text-[11px] text-muted-soft">hoặc</span>
                  <div className="flex-1 h-px bg-hairline" />
                </div>

                <button onClick={() => switchMode('login')}
                  className="w-full py-3 bg-white text-body text-sm font-semibold rounded-lg
                             border border-hairline hover:bg-surface-soft hover:border-gray-300
                             transition-all flex items-center justify-center gap-2">
                  Đã có tài khoản? Đăng nhập
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p className="text-[12px] text-error text-center mt-4 bg-error/5 border border-error/20 rounded-lg py-2 px-3">
              {error}
            </p>
          )}

          <button onClick={goToLanding}
            className="w-full mt-5 py-2 text-xs text-muted hover:text-ink transition-colors flex items-center justify-center gap-1">
            <ChevronRight className="w-3 h-3 rotate-180" />
            Về trang chủ
          </button>
        </motion.div>
      </div>
    </div>
  );
}
