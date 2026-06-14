import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { Layers, Users, ArrowRight, ArrowLeft, Plus } from 'lucide-react';
import CreateWorkspaceModal from '../Modals/CreateWorkspaceModal';
import Avatar from '../common/Avatar';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function WorkspaceSelector() {
  const { selectOrg, goToLanding, organizations, openCreateWorkspace, currentUser } = useApp();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-hairline">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={goToLanding}
            className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
            <ArrowLeft className="w-4 h-4" /> Trang chủ
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-ink rounded-lg flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-ink">ProjectHub</span>
          </div>
          {currentUser ? (
            <div className="flex items-center gap-2.5">
              <Avatar name={currentUser.name} src={currentUser.avatar} className="w-7 h-7" />
              <span className="text-sm font-medium text-ink max-w-[120px] truncate hidden sm:block">{currentUser.name}</span>
            </div>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="text-center mb-12">
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted mb-3 block">Workspace</span>
          <h1 className="text-4xl font-semibold text-ink mb-2 tracking-tight">Chọn Workspace</h1>
          <p className="text-muted">Chọn tổ chức để quản lý dự án của bạn</p>
        </motion.div>

        <div className="space-y-4">
          {organizations.map((org, i) => {
            const memberCount = org.members.length;
            const pmCount = org.members.filter(m => m.role === 'PM').length;
            const devCount = org.members.filter(m => m.role === 'SW_Developer').length;

            return (
              <motion.button key={org.id} custom={i + 1} variants={fadeUp} initial="hidden" animate="visible"
                onClick={() => selectOrg(org.id)}
                className="w-full flex items-center gap-5 bg-surface-card rounded-xl border border-hairline
                           p-5 text-left hover:shadow-lg hover:shadow-black/[0.04] hover:border-gray-300
                           transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ink/15 focus:ring-offset-2 group card-hover">
                {/* Org Avatar */}
                <div className="w-14 h-14 bg-ink rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-lg font-semibold text-white">{org.name.charAt(0)}</span>
                </div>
                {/* Org Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-ink group-hover:text-ink transition-colors">
                    {org.name}
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{memberCount} thành viên</span>
                    <span className="text-gray-300">·</span>
                    <span>{pmCount} PM</span>
                    <span className="text-gray-300">·</span>
                    <span>{devCount} Dev</span>
                  </div>
                </div>
                {/* Member Avatars */}
                <div className="hidden sm:flex items-center">
                  <div className="flex -space-x-2 mr-4">
                    {org.members.slice(0, 4).map(m => (
                      <Avatar key={m.id} name={m.name} src={m.avatar}
                        className="w-8 h-8 border-2 border-white" />
                    ))}
                    {org.members.length > 4 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-card
                                      flex items-center justify-center text-xs text-muted font-medium">
                        +{org.members.length - 4}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-ink group-hover:translate-x-1 transition-all" />
                </div>
              </motion.button>
            );
          })}

          {/* Create Workspace */}
          <motion.button custom={organizations.length + 1} variants={fadeUp} initial="hidden" animate="visible"
            onClick={openCreateWorkspace}
            className="w-full flex items-center justify-center gap-2 bg-white rounded-xl border-2
                       border-dashed border-gray-300 p-5 text-muted hover:border-ink/30
                       hover:text-ink transition-all duration-300 group">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span className="text-sm font-medium">Tạo Workspace mới</span>
          </motion.button>
        </div>
      </main>
      <CreateWorkspaceModal />
    </div>
  );
}
