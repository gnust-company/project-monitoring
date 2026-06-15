import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { useUrlSync } from './hooks/useUrlSync';
import LandingPage from './components/Landing/LandingPage';
import LoginPage from './components/Landing/LoginPage';
import SetupPage from './components/Landing/SetupPage';
import WorkspaceSelector from './components/OrgSelector/WorkspaceSelector';
import WorkspaceLayout from './components/Workspace/WorkspaceLayout';
import AdminLayout from './components/Admin/AdminLayout';

function AppContent() {
  const { currentView, authReady, needsSetup } = useApp();
  useUrlSync();

  useEffect(() => {
    document.title = 'ProjectHub — Development Process Pipeline';
    document.documentElement.lang = 'vi';
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-stone-200 border-t-ink rounded-full animate-spin" />
      </div>
    );
  }

  // First-run: chưa có tài khoản nào → bắt buộc tạo super-user trước
  if (needsSetup && currentView !== 'workspace' && currentView !== 'workspace-selector') {
    return <SetupPage />;
  }

  return (
    <>
      {currentView === 'landing' && <LandingPage />}
      {currentView === 'login' && <LoginPage />}
      {currentView === 'setup' && <SetupPage />}
      {currentView === 'workspace-selector' && <WorkspaceSelector />}
      {currentView === 'workspace' && <WorkspaceLayout />}
      {currentView === 'admin' && <AdminLayout />}
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
