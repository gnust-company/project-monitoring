import { useApp } from '../../context/AppContext';
import WorkspaceSidebar from './WorkspaceSidebar';
import WorkspaceHeader from './WorkspaceHeader';
import DashboardView from './DashboardView';
import TeamView from './TeamView';
import PipelineTimeline from '../Pipeline/PipelineTimeline';
import CreateProjectModal from '../Modals/CreateProjectModal';
import CreateWorkspaceModal from '../Modals/CreateWorkspaceModal';

export default function WorkspaceLayout() {
  const { workspaceView } = useApp();

  return (
    <div className="h-screen flex bg-white">
      <WorkspaceSidebar />
      <main className="flex-1 flex flex-col overflow-hidden ml-60">
        <WorkspaceHeader />
        {workspaceView === 'dashboard' && <DashboardView />}
        {workspaceView === 'pipeline' && <PipelineTimeline />}
        {workspaceView === 'team' && <TeamView />}
      </main>
      <CreateProjectModal />
      <CreateWorkspaceModal />
    </div>
  );
}
