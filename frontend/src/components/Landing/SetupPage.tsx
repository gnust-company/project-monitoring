import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { Layers, Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

export default function SetupPage() {
  const { setupSuperuser } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = `w-full pl-10 pr-4 py-3 bg-white border border-hairline rounded-lg text-sm
                       text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink transition-all`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await setupSuperuser(email, password, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-soft p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md bg-white rounded-2xl border border-hairline shadow-sm p-8"
      >
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 bg-ink rounded-xl flex items-center justify-center">
            <Layers className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-semibold text-lg text-ink tracking-tight">ProjectHub</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] text-emerald-700 font-medium mb-4">
          <ShieldCheck className="w-3.5 h-3.5" /> Thiết lập lần đầu
        </div>

        <h1 className="text-2xl font-semibold text-ink tracking-tight">Tạo tài khoản quản trị</h1>
        <p className="text-sm text-muted mt-1.5 mb-6">
          Hệ thống chưa có tài khoản nào. Tài khoản đầu tiên sẽ là <strong className="text-ink">admin toàn quyền</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Họ tên" required className={inputClass} />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" required className={inputClass} />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mật khẩu (tối thiểu 6 ký tự)" required minLength={6} className={inputClass} />
          </div>

          {error && <p className="text-[11px] text-error">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-ink text-white text-sm font-semibold rounded-lg
                       hover:bg-[#242424] active:scale-[0.98] disabled:opacity-60
                       transition-all flex items-center justify-center gap-2 mt-2">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <>Tạo & bắt đầu <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
