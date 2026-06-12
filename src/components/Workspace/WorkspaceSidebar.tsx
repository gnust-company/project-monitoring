import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard, GitBranch, Users, Layers, Plus,
  Check, ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import type { WorkspaceView } from '../../types';

const navItems: { view: WorkspaceView; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'pipeline', label: 'Pipeline', icon: GitBranch },
  { view: 'team', label: 'Nhóm', icon: Users },
];

export default function WorkspaceSidebar() {
  const {
    selectedOrg, workspaceView, setWorkspaceView,
    goToWorkspaceSelector, openCreateProject,
    orgProjects, phaseBlocks, currentUserEmail, organizations,
    selectedProjectIds,
    selectAllProjects, toggleProjectSelection,
    sidebarCollapsed, toggleSidebar,
  } = useApp();

  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const wsMenuRef = useRef<HTMLDivElement>(null);

  const projectCount = orgProjects.length;

  const allMembers = organizations.flatMap(o => o.members);
  const currentUser = currentUserEmail
    ? allMembers.find(m => currentUserEmail.includes(m.name.toLowerCase().replace(' ', '.')))
    : null;

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
        </nav>

        <div className="flex-1" />

        <div className="p-2 border-t border-white/[0.06] flex flex-col items-center gap-2">
          {currentUser && (
            <img src={currentUser.avatar} alt="" title={currentUser.name}
              className="w-7 h-7 rounded-full bg-white/10" />
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
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-dark border border-white/[0.08] rounded-lg shadow-xl overflow-hidden z-50">
                {organizations.filter(o => o.id !== selectedOrg.id).map(org => (
                  <button key={org.id}
                    onClick={() => { setShowWorkspaceMenu(false); goToWorkspaceSelector(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-on-dark-soft hover:bg-white/[0.06] hover:text-white transition-colors">
                    <div className="w-5 h-5 bg-white/[0.08] rounded flex items-center justify-center">
                      <span className="text-[9px] font-semibold text-white/60">{org.name.charAt(0)}</span>
                    </div>
                    <span className="truncate">{org.name}</span>
                  </button>
                ))}
                <div className="border-t border-white/[0.06]">
                  <button
                    onClick={() => { setShowWorkspaceMenu(false); goToWorkspaceSelector(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/40 hover:bg-white/[0.06] hover:text-white transition-colors">
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

      {/* Nav */}
      <nav className="px-3 py-2 space-y-0.5">
        {navItems.map(item => (
          <button key={item.view}
            onClick={() => setWorkspaceView(item.view)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                       ${workspaceView === item.view
                         ? 'bg-white/[0.08] text-white'
                         : 'text-on-dark-soft hover:text-white hover:bg-white/[0.04]'
                       }`}>
            <item.icon className={`w-4 h-4 ${workspaceView === item.view ? 'text-white' : 'text-white/30 group-hover:text-white/50'}`} />
            <span>{item.label}</span>
            {item.view === 'pipeline' && (
              <span className="ml-auto text-[10px] bg-white/[0.06] text-on-dark-soft px-1.5 py-0.5 rounded-full">
                {phaseBlocks.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Project Checklist */}
      {orgProjects.length > 0 && (
        <div className="px-3 pt-2 flex-1 overflow-y-auto min-h-0">
          <div className="px-3 pt-3 pb-1.5 text-[10px] font-bold text-on-dark-soft uppercase tracking-wider flex items-center justify-between">
            <span>Dự án ({projectCount})</span>
            <button onClick={selectAllProjects}
              className={`text-[9px] font-bold rounded-md px-2 py-0.5 transition-colors normal-case tracking-normal
                ${selectedProjectIds === null
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/30 hover:text-white'}`}>
              Tất cả
            </button>
          </div>
          <div className="space-y-0.5">
            {orgProjects.map(project => {
              const isSelected = selectedProjectIds === null || selectedProjectIds.includes(project.id);
              const statusColors = {
                'On Track': 'bg-emerald-400',
                'At Risk': 'bg-amber-400',
                'Delayed': 'bg-red-400',
              };
              return (
                <button key={project.id}
                  onClick={() => toggleProjectSelection(project.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all group truncate
                    ${isSelected
                      ? 'text-on-dark-soft hover:text-white hover:bg-white/[0.04]'
                      : 'text-white/20 hover:text-white/40 hover:bg-white/[0.02]'}`}>
                  <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
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
        </div>
      )}

      {/* User info — chỉ hiện info, không có buttons */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="px-3 py-1.5 text-[10px] text-on-dark-soft">
          {projectCount} dự án · {phaseBlocks.length} phase
        </div>
        {currentUser && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <img src={currentUser.avatar} alt="" className="w-7 h-7 rounded-full bg-white/10" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-on-dark-soft truncate">{currentUserEmail}</div>
            </div>
          </div>
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
