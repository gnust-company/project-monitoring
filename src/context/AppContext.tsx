import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Organization, Project, PhaseBlock, WorkspaceView, DevPhase, ProjectStatus, ZoomLevel } from '../types';
import { organizations as seedOrgs, projects, phaseBlocks } from '../data/mockData';

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
  login: (email: string) => void;
  logout: () => void;

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
  addPhaseBlock: (pb: PhaseBlockUI) => void;
  updatePhaseBlock: (id: string, updates: Partial<PhaseBlockUI>) => void;
  deletePhaseBlock: (id: string) => void;
  addOrganization: (org: Organization) => void;

  // Derived
  selectedOrg: Organization | null;
  organizations: Organization[];
  orgProjects: Project[];
  orgPhaseBlocks: PhaseBlockUI[];
  selectedPhaseBlock: PhaseBlockUI | null;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [pbState, setPbState] = useState<PhaseBlockUI[]>(phaseBlocks as PhaseBlockUI[]);
  const [projectsState, setProjectsState] = useState<Project[]>([...projects]);
  const [orgsState, setOrgsState] = useState<Organization[]>([...seedOrgs]);
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
  const login = useCallback((email: string) => {
    setState(prev => ({ ...prev, currentUserEmail: email, currentView: 'workspace-selector' }));
  }, []);

  const logout = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentView: 'login',
      selectedOrgId: null,
      currentUserEmail: null,
    }));
  }, []);

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
      setSearchQuery,
      setPhaseFilter,
      setStatusFilter,
      setZoomLevel,
      setSelectedProjectIds,
      toggleProjectSelection,
      selectAllProjects,
      openPhaseDetail,
      closePhaseDetail,
      openCreateProject,
      closeCreateProject,
      openCreatePhase,
      closeCreatePhase,
      openCreateWorkspace,
      closeCreateWorkspace,
      toggleSidebar,
      addProject,
      addPhaseBlock,
      updatePhaseBlock,
      deletePhaseBlock,
      addOrganization,
      selectedOrg,
      organizations: orgsState,
      orgProjects,
      orgPhaseBlocks,
      selectedPhaseBlock,
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
