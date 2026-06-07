import { useApp } from '../../context/AppContext';
import WorkspaceSidebar from './WorkspaceSidebar';
import WorkspaceHeader from './WorkspaceHeader';
import DashboardView from './DashboardView';
import TeamView from './TeamView';
import PipelineTimeline from '../Pipeline/PipelineTimeline';
import CreateProjectModal from '../Modals/CreateProjectModal';
import CreateWorkspaceModal from '../Modals/CreateWorkspaceModal';
import { AnimatePresence, motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export default function WorkspaceLayout() {
  const { workspaceView } = useApp();

  return (
    <div className="h-screen flex bg-white">
      <WorkspaceSidebar />
      <main className="flex-1 flex flex-col overflow-hidden ml-60">
        <WorkspaceHeader />
        <AnimatePresence mode="wait">
          {workspaceView === 'dashboard' && (
            <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col overflow-hidden">
              <DashboardView />
            </motion.div>
          )}
          {workspaceView === 'pipeline' && (
            <motion.div key="pipeline" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col overflow-hidden">
              <PipelineTimeline />
            </motion.div>
          )}
          {workspaceView === 'team' && (
            <motion.div key="team" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col overflow-hidden">
              <TeamView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <CreateProjectModal />
      <CreateWorkspaceModal />
    </div>
  );
}
