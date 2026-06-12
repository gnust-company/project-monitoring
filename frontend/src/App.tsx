import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './components/Landing/LandingPage';
import LoginPage from './components/Landing/LoginPage';
import WorkspaceSelector from './components/OrgSelector/WorkspaceSelector';
import WorkspaceLayout from './components/Workspace/WorkspaceLayout';

function AppContent() {
  const { currentView } = useApp();

  useEffect(() => {
    document.title = 'ProjectHub — Development Process Pipeline';
    document.documentElement.lang = 'vi';
  }, []);

  return (
    <>
      {currentView === 'landing' && <LandingPage />}
      {currentView === 'login' && <LoginPage />}
      {currentView === 'workspace-selector' && <WorkspaceSelector />}
      {currentView === 'workspace' && <WorkspaceLayout />}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
