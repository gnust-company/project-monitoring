import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Organization, Project, PhaseBlock, WorkspaceView, DevPhase, ProjectStatus, ZoomLevel } from '../types';
import { organizations, projects, phaseBlocks } from '../data/mockData';

// Extend PhaseBlock at runtime with drag state
export interface PhaseBlockUI extends PhaseBlock {
  // runtime UI only
}

type AppView = 'landing' | 'workspace-selector' | 'workspace';

interface AppState {
  currentView: AppView;
  selectedOrgId: string | null;
  workspaceView: WorkspaceView;

  // Pipeline state
  searchQuery: string;
  phaseFilter: DevPhase | 'All';
  statusFilter: ProjectStatus | 'All';
  zoomLevel: ZoomLevel;

  // Phase detail modal
  selectedPhaseBlockId: string | null;
  phaseDetailOpen: boolean;

  // Create modals
  createProjectOpen: boolean;
  createPhaseOpen: boolean;
  createPhaseProjectId: string | null;
}

interface AppContextType extends AppState {
  phaseBlocks: PhaseBlockUI[];
  setPhaseBlocks: React.Dispatch<React.SetStateAction<PhaseBlockUI[]>>;

  // Navigation
  goToLanding: () => void;
  goToWorkspaceSelector: () => void;
  selectOrg: (orgId: string) => void;
  setWorkspaceView: (view: WorkspaceView) => void;

  // Filters
  setSearchQuery: (query: string) => void;
  setPhaseFilter: (phase: DevPhase | 'All') => void;
  setStatusFilter: (status: ProjectStatus | 'All') => void;
  setZoomLevel: (zoom: ZoomLevel) => void;

  // Phase detail
  openPhaseDetail: (phaseBlockId: string) => void;
  closePhaseDetail: () => void;

  // Create modals
  openCreateProject: () => void;
  closeCreateProject: () => void;
  openCreatePhase: (projectId?: string) => void;
  closeCreatePhase: () => void;

  // Actions
  addProject: (project: Project) => void;
  addPhaseBlock: (pb: PhaseBlockUI) => void;
  updatePhaseBlock: (id: string, updates: Partial<PhaseBlockUI>) => void;

  // Derived
  selectedOrg: Organization | null;
  orgProjects: Project[];
  orgPhaseBlocks: PhaseBlockUI[];
  selectedPhaseBlock: PhaseBlockUI | null;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [pbState, setPbState] = useState<PhaseBlockUI[]>(phaseBlocks as PhaseBlockUI[]);
  const [state, setState] = useState<AppState>({
    currentView: 'landing',
    selectedOrgId: null,
    workspaceView: 'dashboard',
    searchQuery: '',
    phaseFilter: 'All',
    statusFilter: 'All',
    zoomLevel: 'month',
    selectedPhaseBlockId: null,
    phaseDetailOpen: false,
    createProjectOpen: false,
    createPhaseOpen: false,
    createPhaseProjectId: null,
  });

  const goToLanding = useCallback(() => {
    setState({
      currentView: 'landing',
      selectedOrgId: null,
      workspaceView: 'dashboard',
      searchQuery: '',
      phaseFilter: 'All',
      statusFilter: 'All',
      zoomLevel: 'month',
      selectedPhaseBlockId: null,
      phaseDetailOpen: false,
      createProjectOpen: false,
      createPhaseOpen: false,
      createPhaseProjectId: null,
    });
  }, []);

  const goToWorkspaceSelector = useCallback(() => {
    setState(prev => ({ ...prev, currentView: 'workspace-selector', selectedOrgId: null }));
  }, []);

  const selectOrg = useCallback((orgId: string) => {
    setState(prev => ({
      ...prev, selectedOrgId: orgId, currentView: 'workspace',
      workspaceView: 'pipeline', searchQuery: '', phaseFilter: 'All', statusFilter: 'All',
    }));
  }, []);

  const setWorkspaceView = useCallback((view: WorkspaceView) => {
    setState(prev => ({ ...prev, workspaceView: view }));
  }, []);

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

  const openPhaseDetail = useCallback((phaseBlockId: string) => {
    setState(prev => ({ ...prev, selectedPhaseBlockId: phaseBlockId, phaseDetailOpen: true }));
  }, []);

  const closePhaseDetail = useCallback(() => {
    setState(prev => ({ ...prev, selectedPhaseBlockId: null, phaseDetailOpen: false }));
  }, []);

  const openCreateProject = useCallback(() => {
    setState(prev => ({ ...prev, createProjectOpen: true }));
  }, []);

  const closeCreateProject = useCallback(() => {
    setState(prev => ({ ...prev, createProjectOpen: false }));
  }, []);

  const openCreatePhase = useCallback((projectId?: string) => {
    setState(prev => ({ ...prev, createPhaseOpen: true, createPhaseProjectId: projectId || null }));
  }, []);

  const closeCreatePhase = useCallback(() => {
    setState(prev => ({ ...prev, createPhaseOpen: false, createPhaseProjectId: null }));
  }, []);

  const addProject = useCallback((project: Project) => {
    projects.push(project);
  }, []);

  const addPhaseBlock = useCallback((pb: PhaseBlockUI) => {
    setPbState(prev => [...prev, pb]);
  }, []);

  const updatePhaseBlock = useCallback((id: string, updates: Partial<PhaseBlockUI>) => {
    setPbState(prev => prev.map(pb => pb.id === id ? { ...pb, ...updates } : pb));
  }, []);

  // Derived
  const selectedOrg = state.selectedOrgId
    ? organizations.find(o => o.id === state.selectedOrgId) ?? null
    : null;

  const orgProjects = state.selectedOrgId
    ? projects.filter(p => p.orgId === state.selectedOrgId)
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
      goToWorkspaceSelector,
      selectOrg,
      setWorkspaceView,
      setSearchQuery,
      setPhaseFilter,
      setStatusFilter,
      setZoomLevel,
      openPhaseDetail,
      closePhaseDetail,
      openCreateProject,
      closeCreateProject,
      openCreatePhase,
      closeCreatePhase,
      addProject,
      addPhaseBlock,
      updatePhaseBlock,
      selectedOrg,
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
