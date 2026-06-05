import { useApp } from '../../context/AppContext';
import WorkspaceSidebar from './WorkspaceSidebar';
import DashboardView from './DashboardView';
import PipelineTimeline from '../Pipeline/PipelineTimeline';
import CreateProjectModal from '../Modals/CreateProjectModal';

export default function WorkspaceLayout() {
  const { workspaceView } = useApp();

  return (
    <div className="h-screen flex bg-gray-50">
      <WorkspaceSidebar />
      <main className="flex-1 flex flex-col overflow-hidden ml-60">
        {workspaceView === 'dashboard' && <DashboardView />}
        {workspaceView === 'pipeline' && <PipelineTimeline />}
        {workspaceView === 'team' && <DashboardView />}
      </main>
      <CreateProjectModal />
    </div>
  );
}
