import { useApp } from '../../context/AppContext';

import {
  LayoutDashboard, GitBranch, Users, Layers, LogOut, Plus
} from 'lucide-react';
import type { WorkspaceView } from '../../types';

const navItems: { view: WorkspaceView; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'pipeline', label: 'Pipeline', icon: GitBranch },
  { view: 'team', label: 'Team', icon: Users },
];

export default function WorkspaceSidebar() {
  const {
    selectedOrg, workspaceView, setWorkspaceView,
    goToWorkspaceSelector, openCreateProject, openCreatePhase,
    orgProjects, phaseBlocks
  } = useApp();

  const projectCount = orgProjects.length;

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-slate-900 text-white flex flex-col z-30">
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">ProjectHub</span>
        </div>
        {selectedOrg && (
          <div className="mt-2.5 flex items-center gap-2 px-1">
            <div className="w-5 h-5 bg-blue-500/20 rounded flex items-center justify-center">
              <span className="text-[10px] font-bold text-blue-400">{selectedOrg.name.charAt(0)}</span>
            </div>
            <span className="text-xs text-slate-400 truncate">{selectedOrg.name}</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-3 pt-3 pb-1 space-y-1">
        <button onClick={openCreateProject}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium
                     bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all">
          <Plus className="w-3.5 h-3.5" /> Tạo Project
        </button>
        <button onClick={() => openCreatePhase()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium
                     bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all">
          <Plus className="w-3.5 h-3.5" /> Tạo Phase
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(item => (
          <button key={item.view}
            onClick={() => setWorkspaceView(item.view)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                       transition-all group
                       ${workspaceView === item.view
                         ? 'bg-white/10 text-white'
                         : 'text-slate-400 hover:text-white hover:bg-white/5'
                       }`}>
            <item.icon className={`w-4 h-4 ${workspaceView === item.view ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
            <span>{item.label}</span>
            {item.view === 'pipeline' && (
              <span className="ml-auto text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded-full">
                {phaseBlocks.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 space-y-0.5">
        <div className="px-3 py-1.5 text-[10px] text-slate-500">
          {projectCount} projects · {phaseBlocks.length} phases
        </div>
        <button onClick={goToWorkspaceSelector}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400
                     hover:text-white hover:bg-white/5 transition-all">
          <LogOut className="w-3.5 h-3.5" /> Switch Workspace
        </button>
      </div>
    </aside>
  );
}
