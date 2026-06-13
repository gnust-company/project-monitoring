import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard, GitBranch, Users, Layers, Plus,
  Check, ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, Settings,
} from 'lucide-react';
import type { WorkspaceView } from '../../types';

const navItems: { view: WorkspaceView; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'pipeline', label: 'Pipeline', icon: GitBranch },
  { view: 'team', label: 'Nhóm', icon: Users },
];

const statusColors: Record<string, string> = {
  'On Track': 'bg-emerald-400',
  'At Risk': 'bg-amber-400',
  'Delayed': 'bg-red-400',
};

export default function WorkspaceSidebar() {
  const {
    selectedOrg, workspaceView, setWorkspaceView,
    goToWorkspaceSelector, openCreateProject,
    orgProjects, phaseBlocks, currentUserEmail, currentUser, organizations,
    selectedProjectIds,
    selectAllProjects, toggleProjectSelection,
    sidebarCollapsed, toggleSidebar,
  } = useApp();

  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  // Droplist dự án dưới Pipeline — mặc định mở
  const [projectsOpen, setProjectsOpen] = useState(true);
  const wsMenuRef = useRef<HTMLDivElement>(null);

  const projectCount = orgProjects.length;

  // Close dropdown on outside click
  useEffect(() => {
    if (!showWorkspaceMenu) return;
    const handler = (e: MouseEvent) => {
      if (wsMenuRef.current && !wsMenuRef.current.contains(e.target as Node)) setShowWorkspaceMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showWorkspaceMenu]);

  // ─── Collapsed: icon-only rail ────────────────────────────────────
  if (sidebarCollapsed) {
    return (
      <aside className="fixed left-0 top-0 bottom-0 w-16 bg-surface-dark text-white flex flex-col z-30 transition-all duration-200">
        <div className="p-3 border-b border-white/[0.06] flex flex-col items-center gap-2">
          <div className="w-8 h-8 bg-white/[0.06] rounded-lg flex items-center justify-center" title="ProjectHub">
            <Layers className="w-4 h-4 text-white/60" />
          </div>
          {selectedOrg && (
            <button onClick={goToWorkspaceSelector} title={selectedOrg.name}
              className="w-8 h-8 bg-white/[0.08] rounded-lg flex items-center justify-center hover:bg-white/[0.14] transition-colors">
              <span className="text-[11px] font-semibold text-white/70">{selectedOrg.name.charAt(0)}</span>
            </button>
          )}
        </div>

        <div className="px-2 pt-3 pb-1 flex justify-center">
          <button onClick={openCreateProject} title="Tạo Dự án"
            className="w-9 h-9 flex items-center justify-center rounded-lg
                       bg-white/[0.04] hover:bg-white/[0.08] text-on-dark-soft hover:text-white transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <nav className="px-2 py-2 space-y-1 flex flex-col items-center">
          {navItems.map(item => (
            <button key={item.view} title={item.label}
              onClick={() => setWorkspaceView(item.view)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all
                         ${workspaceView === item.view
                           ? 'bg-white/[0.08] text-white'
                           : 'text-white/30 hover:text-white hover:bg-white/[0.04]'
                         }`}>
              <item.icon className="w-4 h-4" />
            </button>
          ))}
          <button title="Cài đặt Workspace"
            onClick={() => setWorkspaceView('settings')}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all
                       ${workspaceView === 'settings'
                         ? 'bg-white/[0.08] text-white'
                         : 'text-white/30 hover:text-white hover:bg-white/[0.04]'
                       }`}>
            <Settings className="w-4 h-4" />
          </button>
        </nav>

        <div className="flex-1" />

        <div className="p-2 border-t border-white/[0.06] flex flex-col items-center gap-2">
          {currentUser && (
            <button onClick={() => setWorkspaceView('profile')} title={`${currentUser.name} — Hồ sơ`}>
              <img src={currentUser.avatar} alt="" className="w-7 h-7 rounded-full bg-white/10 hover:ring-2 hover:ring-white/30 transition-all" />
            </button>
          )}
          <button onClick={toggleSidebar} title="Mở rộng sidebar"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-surface-dark text-white flex flex-col z-30 transition-all duration-200">
      {/* Logo + Workspace Switcher */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/[0.06] rounded-lg flex items-center justify-center">
            <Layers className="w-4 h-4 text-white/60" />
          </div>
          <span className="font-semibold text-sm tracking-tight flex-1">ProjectHub</span>
        </div>
        {selectedOrg && (
          <div className="mt-3 relative" ref={wsMenuRef}>
            <button
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <div className="w-6 h-6 bg-white/[0.08] rounded-lg flex items-center justify-center">
                <span className="text-[10px] font-semibold text-white/70">{selectedOrg.name.charAt(0)}</span>
              </div>
              <span className="text-xs text-on-dark-soft truncate flex-1 text-left">{selectedOrg.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${showWorkspaceMenu ? 'rotate-180' : ''}`} />
            </button>
            {showWorkspaceMenu && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-dark border border-white/[0.08] rounded-xl shadow-xl overflow-hidden z-50 p-1">
                {organizations.filter(o => o.id !== selectedOrg.id).map(org => (
                  <button key={org.id}
                    onClick={() => { setShowWorkspaceMenu(false); goToWorkspaceSelector(); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-on-dark-soft hover:bg-white/[0.06] hover:text-white transition-colors">
                    <div className="w-5 h-5 bg-white/[0.08] rounded flex items-center justify-center">
                      <span className="text-[9px] font-semibold text-white/60">{org.name.charAt(0)}</span>
                    </div>
                    <span className="truncate">{org.name}</span>
                  </button>
                ))}
                <div className="border-t border-white/[0.06] mt-1 pt-1">
                  <button
                    onClick={() => { setShowWorkspaceMenu(false); goToWorkspaceSelector(); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors">
                    <LogOut className="w-3 h-3" /> Quản lý Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions — chỉ còn Tạo Dự án */}
      <div className="px-3 pt-3 pb-1">
        <button onClick={openCreateProject}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium
                     bg-white/[0.04] hover:bg-white/[0.08] text-on-dark-soft hover:text-white transition-all">
          <Plus className="w-3.5 h-3.5" /> Tạo Dự án
        </button>
      </div>

      {/* Nav — project list lồng dưới Pipeline */}
      <nav className="px-3 py-2 space-y-0.5 flex-1 overflow-y-auto min-h-0">
        {navItems.map(item => (
          <div key={item.view}>
            <div
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group cursor-pointer
                         ${workspaceView === item.view
                           ? 'bg-white/[0.08] text-white'
                           : 'text-on-dark-soft hover:text-white hover:bg-white/[0.04]'
                         }`}
              onClick={() => setWorkspaceView(item.view)}>
              <item.icon className={`w-4 h-4 ${workspaceView === item.view ? 'text-white' : 'text-white/30 group-hover:text-white/50'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.view === 'pipeline' && (
                <>
                  <span className="text-[10px] bg-white/[0.06] text-on-dark-soft px-1.5 py-0.5 rounded-full">
                    {phaseBlocks.length}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setProjectsOpen(!projectsOpen); }}
                    title={projectsOpen ? 'Thu gọn danh sách dự án' : 'Mở danh sách dự án'}
                    className="p-0.5 rounded hover:bg-white/[0.08] transition-colors">
                    <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${projectsOpen ? '' : '-rotate-90'}`} />
                  </button>
                </>
              )}
            </div>

            {/* Droplist dự án — lồng dưới Pipeline, default mở */}
            {item.view === 'pipeline' && projectsOpen && orgProjects.length > 0 && (
              <div className="mt-0.5 mb-1 ml-4 pl-3 border-l border-white/[0.08] space-y-0.5">
                <div className="flex items-center justify-between pr-2 py-1">
                  <span className="text-[10px] font-bold text-on-dark-soft uppercase tracking-wider">
                    Dự án ({projectCount})
                  </span>
                  <button onClick={selectAllProjects}
                    className={`text-[9px] font-bold rounded-md px-2 py-0.5 transition-colors
                      ${selectedProjectIds === null
                        ? 'bg-white/[0.08] text-white'
                        : 'text-white/30 hover:text-white'}`}>
                    Tất cả
                  </button>
                </div>
                {orgProjects.map(project => {
                  const isSelected = selectedProjectIds === null || selectedProjectIds.includes(project.id);
                  return (
                    <button key={project.id}
                      onClick={() => toggleProjectSelection(project.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all group truncate
                        ${isSelected
                          ? 'text-on-dark-soft hover:text-white hover:bg-white/[0.04]'
                          : 'text-white/20 hover:text-white/40 hover:bg-white/[0.02]'}`}>
                      <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 transition-all
                        ${isSelected
                          ? 'bg-white border-white'
                          : 'border-white/20 group-hover:border-white/40'}`}>
                        {isSelected && <Check className="w-2 h-2 text-surface-dark" />}
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColors[project.status]}`} />
                      <span className={`truncate ${isSelected ? '' : 'line-through opacity-50'}`}>{project.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer: Settings + user info + collapse */}
      <div className="p-3 border-t border-white/[0.06]">
        <button onClick={() => setWorkspaceView('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all
            ${workspaceView === 'settings'
              ? 'bg-white/[0.08] text-white'
              : 'text-on-dark-soft hover:text-white hover:bg-white/[0.04]'}`}>
          <Settings className="w-3.5 h-3.5" /> Cài đặt Workspace
        </button>
        {currentUser && (
          <button onClick={() => setWorkspaceView('profile')}
            title="Xem hồ sơ"
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left
              ${workspaceView === 'profile' ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}>
            <img src={currentUser.avatar} alt="" className="w-7 h-7 rounded-full bg-white/10" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-on-dark-soft truncate">{currentUserEmail}</div>
            </div>
          </button>
        )}
        <button onClick={toggleSidebar} title="Thu gọn sidebar"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium
                     text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
          <PanelLeftClose className="w-3.5 h-3.5" /> Thu gọn
        </button>
      </div>
    </aside>
  );
}
