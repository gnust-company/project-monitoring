import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { WorkspaceView } from '../types';

// Đồng bộ trạng thái view ↔ URL (history API) để nút Back/Forward hoạt động
// và URL đọc được: /home, /login, /register, /workspace/{orgId}/{view}.
const WS_VIEWS: WorkspaceView[] = ['dashboard', 'pipeline', 'team', 'profile', 'settings'];

export function useUrlSync() {
  const {
    currentView, selectedOrgId, workspaceView, authReady, currentUser,
    goToLanding, goToLogin, goToWorkspaceSelector, selectOrg, setWorkspaceView,
  } = useApp();

  const restoring = useRef(false);
  const initialized = useRef(false);
  const initialPath = useRef(typeof window !== 'undefined' ? window.location.pathname : '/');

  const computePath = (): string => {
    switch (currentView) {
      case 'landing': return '/';
      case 'login': return window.location.pathname === '/register' ? '/register' : '/login';
      case 'setup': return '/setup';
      case 'workspace-selector': return '/home';
      case 'workspace': return selectedOrgId ? `/workspace/${selectedOrgId}/${workspaceView}` : '/home';
      default: return '/';
    }
  };

  const applyPath = (path: string) => {
    restoring.current = true;
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'workspace' && parts[1]) {
      const orgId = parts[1];
      const view = (WS_VIEWS as string[]).includes(parts[2]) ? (parts[2] as WorkspaceView) : 'pipeline';
      selectOrg(orgId);
      setWorkspaceView(view);
    } else if (parts[0] === 'home') {
      goToWorkspaceSelector();
    } else if (parts[0] === 'login' || parts[0] === 'register') {
      goToLogin();
    } else {
      goToLanding();
    }
    setTimeout(() => { restoring.current = false; }, 0);
  };

  // state → URL (chỉ sau khi đã khôi phục lần đầu, tránh ghi đè URL khi F5)
  useEffect(() => {
    if (restoring.current || !initialized.current) return;
    const target = computePath();
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, selectedOrgId, workspaceView]);

  // Back/Forward
  useEffect(() => {
    const onPop = () => applyPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep-link lần đầu sau khi xác định phiên (đọc URL gốc, trước khi sync ghi đè)
  useEffect(() => {
    if (initialized.current || !authReady) return;
    const path = initialPath.current;
    const parts = path.split('/').filter(Boolean);
    restoring.current = true;
    if (currentUser) {
      if (parts[0] === 'workspace' && parts[1]) applyPath(path);
      else if (parts[0] === 'home') goToWorkspaceSelector();
      else goToLanding();
    } else if (parts[0] === 'login' || parts[0] === 'register') {
      goToLogin();
    }
    initialized.current = true;
    // mở khóa sync sau khi state đã ổn định + ghi đúng URL gốc
    setTimeout(() => {
      restoring.current = false;
      if (window.location.pathname !== path) window.history.replaceState({}, '', path);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, currentUser]);
}
