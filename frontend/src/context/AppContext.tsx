import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Organization, Project, PhaseBlock, WorkspaceView, DevPhase, ProjectStatus, ZoomLevel, User, UserRole } from '../types';
import { organizations as seedOrgs, projects, phaseBlocks, users as allUsers } from '../data/mockData';

export interface PhaseBlockUI extends PhaseBlock {
  // runtime UI only
}

type AppView = 'landing' | 'login' | 'workspace-selector' | 'workspace';

interface AppState {
  currentView: AppView;
  selectedOrgId: string | null;
  workspaceView: WorkspaceView;

  // Auth
  currentUserEmail: string | null;

  // Pipeline state
  searchQuery: string;
  phaseFilter: DevPhase | 'All';
  statusFilter: ProjectStatus | 'All';
  zoomLevel: ZoomLevel;
  selectedProjectIds: string[] | null; // null = all selected

  // Phase detail modal
  selectedPhaseBlockId: string | null;
  phaseDetailOpen: boolean;

  // Project detail modal
  selectedProjectDetailId: string | null;
  projectDetailOpen: boolean;

  // Create modals
  createProjectOpen: boolean;
  createPhaseOpen: boolean;
  createPhaseProjectId: string | null;
  createPhaseDates: { startDate: string; endDate: string } | null;
  createWorkspaceOpen: boolean;

  // Layout
  sidebarCollapsed: boolean;
}

interface AppContextType extends AppState {
  phaseBlocks: PhaseBlockUI[];
  setPhaseBlocks: React.Dispatch<React.SetStateAction<PhaseBlockUI[]>>;

  // Navigation
  goToLanding: () => void;
  goToLogin: () => void;
  goToWorkspaceSelector: () => void;
  selectOrg: (orgId: string) => void;
  setWorkspaceView: (view: WorkspaceView) => void;

  // Auth
  login: (email: string, profile?: { name?: string; role?: UserRole }) => void;
  logout: () => void;
  currentUser: User | null;
  updateCurrentUser: (updates: Partial<User>) => void;

  // Filters
  setSearchQuery: (query: string) => void;
  setPhaseFilter: (phase: DevPhase | 'All') => void;
  setStatusFilter: (status: ProjectStatus | 'All') => void;
  setZoomLevel: (zoom: ZoomLevel) => void;
  setSelectedProjectIds: (ids: string[] | null) => void;
  toggleProjectSelection: (projectId: string) => void;
  selectAllProjects: () => void;

  // Phase detail
  openPhaseDetail: (phaseBlockId: string) => void;
  closePhaseDetail: () => void;

  // Project detail
  openProjectDetail: (projectId: string) => void;
  closeProjectDetail: () => void;

  // Create modals
  openCreateProject: () => void;
  closeCreateProject: () => void;
  openCreatePhase: (projectId?: string, dates?: { startDate: string; endDate: string }) => void;
  closeCreatePhase: () => void;
  openCreateWorkspace: () => void;
  closeCreateWorkspace: () => void;
  toggleSidebar: () => void;

  // Actions
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addPhaseBlock: (pb: PhaseBlockUI) => void;
  updatePhaseBlock: (id: string, updates: Partial<PhaseBlockUI>) => void;
  deletePhaseBlock: (id: string) => void;
  addOrganization: (org: Organization) => void;
  updateOrganization: (id: string, updates: Partial<Organization>) => void;
  deleteOrganization: (id: string) => void;
  addOrgMember: (orgId: string, user: User) => void;
  removeOrgMember: (orgId: string, userId: string) => void;

  // Derived
  selectedOrg: Organization | null;
  organizations: Organization[];
  orgProjects: Project[];
  orgPhaseBlocks: PhaseBlockUI[];
  selectedPhaseBlock: PhaseBlockUI | null;
  selectedProjectDetail: Project | null;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [pbState, setPbState] = useState<PhaseBlockUI[]>(phaseBlocks as PhaseBlockUI[]);
  const [projectsState, setProjectsState] = useState<Project[]>([...projects]);
  const [orgsState, setOrgsState] = useState<Organization[]>([...seedOrgs]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [state, setState] = useState<AppState>({
    currentView: 'landing',
    selectedOrgId: null,
    workspaceView: 'dashboard',
    currentUserEmail: null,
    searchQuery: '',
    phaseFilter: 'All',
    statusFilter: 'All',
    zoomLevel: 'week',
    selectedProjectIds: null,
    selectedPhaseBlockId: null,
    phaseDetailOpen: false,
    selectedProjectDetailId: null,
    projectDetailOpen: false,
    createProjectOpen: false,
    createPhaseOpen: false,
    createPhaseProjectId: null,
    createPhaseDates: null,
    createWorkspaceOpen: false,
    sidebarCollapsed: false,
  });

  // Navigation
  const goToLanding = useCallback(() => {
    setState({
      currentView: 'landing',
      selectedOrgId: null,
      workspaceView: 'dashboard',
      currentUserEmail: null,
      searchQuery: '',
      phaseFilter: 'All',
      statusFilter: 'All',
      zoomLevel: 'week',
      selectedProjectIds: null,
      selectedPhaseBlockId: null,
      phaseDetailOpen: false,
      selectedProjectDetailId: null,
      projectDetailOpen: false,
      createProjectOpen: false,
      createPhaseOpen: false,
      createPhaseProjectId: null,
      createPhaseDates: null,
      createWorkspaceOpen: false,
      sidebarCollapsed: false,
    });
  }, []);

  const goToLogin = useCallback(() => {
    setState(prev => ({ ...prev, currentView: 'login' }));
  }, []);

  const goToWorkspaceSelector = useCallback(() => {
    setState(prev => ({ ...prev, currentView: 'workspace-selector', selectedOrgId: null }));
  }, []);

  const selectOrg = useCallback((orgId: string) => {
    setState(prev => ({
      ...prev, selectedOrgId: orgId, currentView: 'workspace',
      workspaceView: 'pipeline', searchQuery: '', phaseFilter: 'All', statusFilter: 'All',
      selectedProjectIds: null,
    }));
  }, []);

  const setWorkspaceView = useCallback((view: WorkspaceView) => {
    setState(prev => ({ ...prev, workspaceView: view }));
  }, []);

  // Auth
  // Mock: khớp email với user mẫu (dạng ten.ho@...); không khớp thì tạo user mới
  // với role chọn lúc đăng ký (BE thật: POST /auth/register có field role)
  const login = useCallback((email: string, profile?: { name?: string; role?: UserRole }) => {
    const matched = allUsers.find(u => email.toLowerCase().includes(u.name.toLowerCase().replace(' ', '.')));
    const user: User = matched ?? {
      id: `u-${Date.now()}`,
      name: profile?.name || email.split('@')[0],
      avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
      role: profile?.role || 'PM',
    };
    setCurrentUser(user);
    setState(prev => ({ ...prev, currentUserEmail: email, currentView: 'workspace-selector' }));
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setState(prev => ({
      ...prev,
      currentView: 'login',
      selectedOrgId: null,
      currentUserEmail: null,
    }));
  }, []);

  const updateCurrentUser = useCallback((updates: Partial<User>) => {
    if (!currentUser) return;
    const userId = currentUser.id;
    setCurrentUser(prev => prev ? { ...prev, ...updates } : prev);
    // Đồng bộ vào member list của các workspace đang chứa user này
    setOrgsState(prev => prev.map(org => ({
      ...org,
      members: org.members.map(m => m.id === userId ? { ...m, ...updates } : m),
    })));
  }, [currentUser]);

  // Filters
  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setPhaseFilter = useCallback((phase: DevPhase | 'All') => {
    setState(prev => ({ ...prev, phaseFilter: phase }));
  }, []);

  const setStatusFilter = useCallback((status: ProjectStatus | 'All') => {
    setState(prev => ({ ...prev, statusFilter: status }));
  }, []);

  const setZoomLevel = useCallback((zoom: ZoomLevel) => {
    setState(prev => ({ ...prev, zoomLevel: zoom }));
  }, []);

  // Project selection
  const setSelectedProjectIds = useCallback((ids: string[] | null) => {
    setState(prev => ({ ...prev, selectedProjectIds: ids }));
  }, []);

  const toggleProjectSelection = useCallback((projectId: string) => {
    setState(prev => {
      const current = prev.selectedProjectIds;
      if (current === null) {
        // All selected → deselect this one (select all except this)
        return { ...prev, selectedProjectIds: [projectId] };
      }
      if (current.includes(projectId)) {
        const next = current.filter(id => id !== projectId);
        return { ...prev, selectedProjectIds: next.length === 0 ? null : next };
      }
      return { ...prev, selectedProjectIds: [...current, projectId] };
    });
  }, []);

  const selectAllProjects = useCallback(() => {
    setState(prev => ({ ...prev, selectedProjectIds: null }));
  }, []);

  // Phase detail
  const openPhaseDetail = useCallback((phaseBlockId: string) => {
    setState(prev => ({ ...prev, selectedPhaseBlockId: phaseBlockId, phaseDetailOpen: true }));
  }, []);

  const closePhaseDetail = useCallback(() => {
    setState(prev => ({ ...prev, selectedPhaseBlockId: null, phaseDetailOpen: false }));
  }, []);

  // Project detail
  const openProjectDetail = useCallback((projectId: string) => {
    setState(prev => ({ ...prev, selectedProjectDetailId: projectId, projectDetailOpen: true }));
  }, []);

  const closeProjectDetail = useCallback(() => {
    setState(prev => ({ ...prev, selectedProjectDetailId: null, projectDetailOpen: false }));
  }, []);

  // Create modals
  const openCreateProject = useCallback(() => {
    setState(prev => ({ ...prev, createProjectOpen: true }));
  }, []);

  const closeCreateProject = useCallback(() => {
    setState(prev => ({ ...prev, createProjectOpen: false }));
  }, []);

  const openCreatePhase = useCallback((projectId?: string, dates?: { startDate: string; endDate: string }) => {
    setState(prev => ({ ...prev, createPhaseOpen: true, createPhaseProjectId: projectId || null, createPhaseDates: dates || null }));
  }, []);

  const closeCreatePhase = useCallback(() => {
    setState(prev => ({ ...prev, createPhaseOpen: false, createPhaseProjectId: null, createPhaseDates: null }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  const openCreateWorkspace = useCallback(() => {
    setState(prev => ({ ...prev, createWorkspaceOpen: true }));
  }, []);

  const closeCreateWorkspace = useCallback(() => {
    setState(prev => ({ ...prev, createWorkspaceOpen: false }));
  }, []);

  // Data actions
  const addProject = useCallback((project: Project) => {
    setProjectsState(prev => [...prev, project]);
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjectsState(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  // Xóa dự án kéo theo toàn bộ phase blocks của nó
  const deleteProject = useCallback((id: string) => {
    setProjectsState(prev => prev.filter(p => p.id !== id));
    setPbState(prev => prev.filter(pb => pb.projectId !== id));
    setState(prev => ({
      ...prev,
      selectedProjectIds: prev.selectedProjectIds?.filter(pid => pid !== id) ?? null,
    }));
  }, []);

  const addPhaseBlock = useCallback((pb: PhaseBlockUI) => {
    setPbState(prev => [...prev, pb]);
  }, []);

  const updatePhaseBlock = useCallback((id: string, updates: Partial<PhaseBlockUI>) => {
    setPbState(prev => prev.map(pb => pb.id === id ? { ...pb, ...updates } : pb));
  }, []);

  const deletePhaseBlock = useCallback((id: string) => {
    setPbState(prev => prev.filter(pb => pb.id !== id));
  }, []);

  const addOrganization = useCallback((org: Organization) => {
    setOrgsState(prev => [...prev, org]);
  }, []);

  const updateOrganization = useCallback((id: string, updates: Partial<Organization>) => {
    setOrgsState(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  }, []);

  // Xóa workspace kéo theo toàn bộ dự án + phase blocks thuộc nó
  const deleteOrganization = useCallback((id: string) => {
    setProjectsState(prev => {
      const removedProjectIds = prev.filter(p => p.orgId === id).map(p => p.id);
      setPbState(pbs => pbs.filter(pb => !removedProjectIds.includes(pb.projectId)));
      return prev.filter(p => p.orgId !== id);
    });
    setOrgsState(prev => prev.filter(o => o.id !== id));
  }, []);

  const addOrgMember = useCallback((orgId: string, user: User) => {
    setOrgsState(prev => prev.map(o =>
      o.id === orgId && !o.members.some(m => m.id === user.id)
        ? { ...o, members: [...o.members, user] }
        : o
    ));
  }, []);

  const removeOrgMember = useCallback((orgId: string, userId: string) => {
    setOrgsState(prev => prev.map(o =>
      o.id === orgId ? { ...o, members: o.members.filter(m => m.id !== userId) } : o
    ));
  }, []);

  // Derived
  const selectedOrg = state.selectedOrgId
    ? orgsState.find(o => o.id === state.selectedOrgId) ?? null
    : null;

  const orgProjects = state.selectedOrgId
    ? projectsState.filter(p => p.orgId === state.selectedOrgId)
    : [];

  const orgPhaseBlocks = state.selectedOrgId
    ? pbState.filter(pb => orgProjects.some(p => p.id === pb.projectId))
    : [];

  const selectedPhaseBlock = state.selectedPhaseBlockId
    ? pbState.find(pb => pb.id === state.selectedPhaseBlockId) ?? null
    : null;

  const selectedProjectDetail = state.selectedProjectDetailId
    ? projectsState.find(p => p.id === state.selectedProjectDetailId) ?? null
    : null;

  return (
    <AppContext.Provider value={{
      ...state,
      phaseBlocks: pbState,
      setPhaseBlocks: setPbState,
      goToLanding,
      goToLogin,
      goToWorkspaceSelector,
      selectOrg,
      setWorkspaceView,
      login,
      logout,
      currentUser,
      updateCurrentUser,
      setSearchQuery,
      setPhaseFilter,
      setStatusFilter,
      setZoomLevel,
      setSelectedProjectIds,
      toggleProjectSelection,
      selectAllProjects,
      openPhaseDetail,
      closePhaseDetail,
      openProjectDetail,
      closeProjectDetail,
      openCreateProject,
      closeCreateProject,
      openCreatePhase,
      closeCreatePhase,
      openCreateWorkspace,
      closeCreateWorkspace,
      toggleSidebar,
      addProject,
      updateProject,
      deleteProject,
      addPhaseBlock,
      updatePhaseBlock,
      deletePhaseBlock,
      addOrganization,
      updateOrganization,
      deleteOrganization,
      addOrgMember,
      removeOrgMember,
      selectedOrg,
      organizations: orgsState,
      orgProjects,
      orgPhaseBlocks,
      selectedPhaseBlock,
      selectedProjectDetail,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
