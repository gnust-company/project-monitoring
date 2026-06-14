import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  Organization, Project, PhaseBlock, WorkspaceView, DevPhase, ProjectStatus, ZoomLevel,
  User, UserRole, Notification, ChangeRequest,
} from '../types';
import {
  auth, usersApi, orgsApi, projectsApi, phaseBlocksApi, notificationsApi, changeRequestsApi,
  type CreatePhaseBody,
} from '../api';
import { getToken } from '../api/client';
import { registerUsers } from '../data/mockData';

export interface PhaseBlockUI extends PhaseBlock {}

type AppView = 'landing' | 'login' | 'setup' | 'workspace-selector' | 'workspace';

interface AppState {
  currentView: AppView;
  selectedOrgId: string | null;
  workspaceView: WorkspaceView;
  currentUserEmail: string | null;
  searchQuery: string;
  phaseFilter: DevPhase | 'All';
  statusFilter: ProjectStatus | 'All';
  zoomLevel: ZoomLevel;
  selectedProjectIds: string[] | null;
  selectedPhaseBlockId: string | null;
  phaseDetailOpen: boolean;
  selectedProjectDetailId: string | null;
  projectDetailOpen: boolean;
  createProjectOpen: boolean;
  createPhaseOpen: boolean;
  createPhaseProjectId: string | null;
  createPhaseDates: { startDate: string; endDate: string } | null;
  createWorkspaceOpen: boolean;
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
  authReady: boolean;
  needsSetup: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  setupSuperuser: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => void;
  currentUser: User | null;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;

  // Filters
  setSearchQuery: (q: string) => void;
  setPhaseFilter: (p: DevPhase | 'All') => void;
  setStatusFilter: (s: ProjectStatus | 'All') => void;
  setZoomLevel: (z: ZoomLevel) => void;
  setSelectedProjectIds: (ids: string[] | null) => void;
  toggleProjectSelection: (projectId: string) => void;
  selectAllProjects: () => void;

  // Modals
  openPhaseDetail: (phaseBlockId: string) => void;
  closePhaseDetail: () => void;
  openProjectDetail: (projectId: string) => void;
  closeProjectDetail: () => void;
  openCreateProject: () => void;
  closeCreateProject: () => void;
  openCreatePhase: (projectId?: string, dates?: { startDate: string; endDate: string }) => void;
  closeCreatePhase: () => void;
  openCreateWorkspace: () => void;
  closeCreateWorkspace: () => void;
  toggleSidebar: () => void;

  // Project actions
  addProject: (project: Project) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<{ pending: boolean }>;
  deleteProject: (id: string) => Promise<{ pending: boolean }>;

  // Phase block actions
  addPhaseBlock: (pb: PhaseBlockUI) => Promise<void>;
  updatePhaseBlock: (id: string, updates: Partial<PhaseBlockUI>) => Promise<void>;
  deletePhaseBlock: (id: string) => Promise<void>;
  // granular phase sub-resources
  addPhaseItem: (blockId: string, kind: 'checklist' | 'outcome', text: string, role?: UserRole) => Promise<void>;
  updatePhaseItem: (blockId: string, itemId: string, updates: { text?: string; done?: boolean }) => Promise<void>;
  deletePhaseItem: (blockId: string, itemId: string) => Promise<void>;
  addPhaseComment: (blockId: string, content: string) => Promise<void>;
  addPhaseLink: (blockId: string, fileName: string, url: string) => Promise<void>;
  uploadPhaseFile: (blockId: string, file: File) => Promise<void>;
  deletePhaseAttachment: (blockId: string, attachmentId: string) => Promise<void>;

  // Org actions
  addOrganization: (name: string) => Promise<void>;
  updateOrganization: (id: string, updates: Partial<Organization>) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  addOrgMember: (orgId: string, email: string) => Promise<void>;
  removeOrgMember: (orgId: string, userId: string) => Promise<void>;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  loadNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Change requests (owner)
  pendingChangeRequests: ChangeRequest[];
  loadChangeRequests: () => Promise<void>;
  approveChangeRequest: (id: string) => Promise<void>;
  rejectChangeRequest: (id: string) => Promise<void>;

  // Derived
  selectedOrg: Organization | null;
  organizations: Organization[];
  orgProjects: Project[];
  orgPhaseBlocks: PhaseBlockUI[];
  selectedPhaseBlock: PhaseBlockUI | null;
  selectedProjectDetail: Project | null;
  isOwner: boolean;
  getUserById: (id: string) => User | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

const INITIAL_STATE: AppState = {
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
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [pbState, setPbState] = useState<PhaseBlockUI[]>([]);
  const [projectsState, setProjectsState] = useState<Project[]>([]);
  const [orgsState, setOrgsState] = useState<Organization[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingChangeRequests, setPendingChangeRequests] = useState<ChangeRequest[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  // Đăng ký user vào registry để getUserById (mockData) tra cứu real users
  const syncRegistry = useCallback((orgs: Organization[], me: User | null) => {
    const all: User[] = [...orgs.flatMap(o => o.members), ...(me ? [me] : [])];
    registerUsers(all);
  }, []);

  // ─── Bootstrap: có token thì khôi phục phiên ─────────────────────
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (token) {
        try {
          const me = await auth.me();
          const orgs = await orgsApi.list();
          setCurrentUser(me);
          setOrgsState(orgs);
          syncRegistry(orgs, me);
          setState(prev => ({ ...prev, currentView: 'workspace-selector', currentUserEmail: me.email ?? null }));
          setAuthReady(true);
          return;
        } catch {
          auth.logout();
        }
      }
      // chưa đăng nhập → kiểm tra first-run
      try {
        setNeedsSetup(await auth.setupStatus());
      } catch { /* backend chưa sẵn sàng */ }
      setAuthReady(true);
    })();
  }, [syncRegistry]);

  const afterAuth = useCallback(async (me: User) => {
    const orgs = await orgsApi.list();
    setCurrentUser(me);
    setOrgsState(orgs);
    syncRegistry(orgs, me);
    setState(prev => ({ ...prev, currentView: 'workspace-selector', currentUserEmail: me.email ?? null }));
  }, [syncRegistry]);

  // ─── Navigation ──────────────────────────────────────────────────
  const goToLanding = useCallback(() => setState(prev => ({ ...INITIAL_STATE, currentView: 'landing', currentUserEmail: prev.currentUserEmail })), []);
  const goToLogin = useCallback(() => setState(prev => ({ ...prev, currentView: 'login' })), []);
  const goToWorkspaceSelector = useCallback(() => setState(prev => ({ ...prev, currentView: 'workspace-selector', selectedOrgId: null })), []);

  const selectOrg = useCallback(async (orgId: string) => {
    setState(prev => ({
      ...prev, selectedOrgId: orgId, currentView: 'workspace', workspaceView: 'pipeline',
      searchQuery: '', phaseFilter: 'All', statusFilter: 'All', selectedProjectIds: null,
    }));
    try {
      const [projects, blocks] = await Promise.all([
        projectsApi.listByOrg(orgId),
        phaseBlocksApi.listByOrg(orgId),
      ]);
      setProjectsState(projects);
      setPbState(blocks);
    } catch { /* ignore */ }
  }, []);

  const setWorkspaceView = useCallback((view: WorkspaceView) => setState(prev => ({ ...prev, workspaceView: view })), []);

  // ─── Auth ────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const me = await auth.login(email, password);
    await afterAuth(me);
  }, [afterAuth]);

  const register = useCallback(async (email: string, password: string, name: string, role: UserRole) => {
    setAuthError(null);
    const me = await auth.register(email, password, name, role);
    await afterAuth(me);
  }, [afterAuth]);

  const setupSuperuser = useCallback(async (email: string, password: string, name: string, role: UserRole) => {
    setAuthError(null);
    const me = await auth.setup(email, password, name, role);
    setNeedsSetup(false);
    await afterAuth(me);
  }, [afterAuth]);

  const logout = useCallback(() => {
    auth.logout();
    setCurrentUser(null);
    setOrgsState([]);
    setProjectsState([]);
    setPbState([]);
    setNotifications([]);
    setUnreadCount(0);
    setState({ ...INITIAL_STATE, currentView: 'login' });
  }, []);

  const updateCurrentUser = useCallback(async (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = await usersApi.updateProfile({ name: updates.name, role: updates.role });
    setCurrentUser(updated);
    setOrgsState(prev => {
      const next = prev.map(org => ({ ...org, members: org.members.map(m => m.id === updated.id ? updated : m) }));
      syncRegistry(next, updated);
      return next;
    });
  }, [currentUser, syncRegistry]);

  const uploadAvatar = useCallback(async (file: File) => {
    const updated = await usersApi.uploadAvatar(file);
    setCurrentUser(updated);
    setOrgsState(prev => prev.map(org => ({ ...org, members: org.members.map(m => m.id === updated.id ? updated : m) })));
  }, []);

  // ─── Filters / selection ─────────────────────────────────────────
  const setSearchQuery = useCallback((q: string) => setState(prev => ({ ...prev, searchQuery: q })), []);
  const setPhaseFilter = useCallback((p: DevPhase | 'All') => setState(prev => ({ ...prev, phaseFilter: p })), []);
  const setStatusFilter = useCallback((s: ProjectStatus | 'All') => setState(prev => ({ ...prev, statusFilter: s })), []);
  const setZoomLevel = useCallback((z: ZoomLevel) => setState(prev => ({ ...prev, zoomLevel: z })), []);
  const setSelectedProjectIds = useCallback((ids: string[] | null) => setState(prev => ({ ...prev, selectedProjectIds: ids })), []);
  const toggleProjectSelection = useCallback((projectId: string) => {
    setState(prev => {
      const current = prev.selectedProjectIds;
      if (current === null) return { ...prev, selectedProjectIds: [projectId] };
      if (current.includes(projectId)) {
        const next = current.filter(id => id !== projectId);
        return { ...prev, selectedProjectIds: next.length === 0 ? null : next };
      }
      return { ...prev, selectedProjectIds: [...current, projectId] };
    });
  }, []);
  const selectAllProjects = useCallback(() => setState(prev => ({ ...prev, selectedProjectIds: null })), []);

  // ─── Phase detail (fetch full block on open) ─────────────────────
  const openPhaseDetail = useCallback(async (phaseBlockId: string) => {
    setState(prev => ({ ...prev, selectedPhaseBlockId: phaseBlockId, phaseDetailOpen: true }));
    try {
      const [full, activity] = await Promise.all([
        phaseBlocksApi.get(phaseBlockId),
        phaseBlocksApi.activity(phaseBlockId),
      ]);
      full.activityLog = activity;
      setPbState(prev => prev.map(pb => pb.id === phaseBlockId ? full : pb));
    } catch { /* ignore */ }
  }, []);
  const closePhaseDetail = useCallback(() => setState(prev => ({ ...prev, selectedPhaseBlockId: null, phaseDetailOpen: false })), []);

  const openProjectDetail = useCallback((projectId: string) => setState(prev => ({ ...prev, selectedProjectDetailId: projectId, projectDetailOpen: true })), []);
  const closeProjectDetail = useCallback(() => setState(prev => ({ ...prev, selectedProjectDetailId: null, projectDetailOpen: false })), []);

  const openCreateProject = useCallback(() => setState(prev => ({ ...prev, createProjectOpen: true })), []);
  const closeCreateProject = useCallback(() => setState(prev => ({ ...prev, createProjectOpen: false })), []);
  const openCreatePhase = useCallback((projectId?: string, dates?: { startDate: string; endDate: string }) => setState(prev => ({ ...prev, createPhaseOpen: true, createPhaseProjectId: projectId || null, createPhaseDates: dates || null })), []);
  const closeCreatePhase = useCallback(() => setState(prev => ({ ...prev, createPhaseOpen: false, createPhaseProjectId: null, createPhaseDates: null })), []);
  const toggleSidebar = useCallback(() => setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed })), []);
  const openCreateWorkspace = useCallback(() => setState(prev => ({ ...prev, createWorkspaceOpen: true })), []);
  const closeCreateWorkspace = useCallback(() => setState(prev => ({ ...prev, createWorkspaceOpen: false })), []);

  // ─── Projects ─────────────────────────────────────────────────────
  const addProject = useCallback(async (project: Project) => {
    const created = await projectsApi.create(project.orgId, {
      name: project.name, description: project.description,
      startDate: project.startDate, targetDate: project.targetDate, status: project.status,
    });
    setProjectsState(prev => [...prev, created]);
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const res = await projectsApi.update(id, updates);
    if (!res.pending && res.project) {
      setProjectsState(prev => prev.map(p => p.id === id ? res.project! : p));
    }
    return { pending: res.pending };
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const res = await projectsApi.remove(id);
    if (!res.pending) {
      setProjectsState(prev => prev.filter(p => p.id !== id));
      setPbState(prev => prev.filter(pb => pb.projectId !== id));
      setState(prev => ({ ...prev, selectedProjectIds: prev.selectedProjectIds?.filter(pid => pid !== id) ?? null }));
    }
    return { pending: res.pending };
  }, []);

  // ─── Phase blocks ─────────────────────────────────────────────────
  const addPhaseBlock = useCallback(async (pb: PhaseBlockUI) => {
    const body: CreatePhaseBody = {
      phaseType: pb.phaseType, title: pb.title, startDate: pb.startDate, endDate: pb.endDate,
      tag: pb.tag, description: pb.description, assignee: pb.assignee || undefined,
      participantIds: pb.participants,
      checklist: pb.checklist.map(c => ({ text: c.text, role: c.role, done: c.done })),
      outcomes: pb.outcomes.map(o => ({ text: o.text, role: o.role, done: o.done })),
    };
    const created = await phaseBlocksApi.create(pb.projectId, body);
    setPbState(prev => [...prev, created]);
  }, []);

  const updatePhaseBlock = useCallback(async (id: string, updates: Partial<PhaseBlockUI>) => {
    // chỉ gửi các field scalar PATCH chấp nhận
    const body: Record<string, unknown> = {};
    for (const k of ['title', 'description', 'tag', 'phaseType', 'startDate', 'endDate', 'actualEndDate', 'displayRow', 'assignee'] as const) {
      if (k in updates && updates[k] !== undefined) body[k] = updates[k];
    }
    if ('participants' in updates && updates.participants) body.participantIds = updates.participants;
    // optimistic
    setPbState(prev => prev.map(pb => pb.id === id ? { ...pb, ...updates } : pb));
    if (Object.keys(body).length === 0) return;
    try {
      const updated = await phaseBlocksApi.update(id, body);
      setPbState(prev => prev.map(pb => pb.id === id ? { ...updated, comments: pb.comments, attachments: pb.attachments, activityLog: pb.activityLog } : pb));
    } catch { /* ignore */ }
  }, []);

  const deletePhaseBlock = useCallback(async (id: string) => {
    await phaseBlocksApi.remove(id);
    setPbState(prev => prev.filter(pb => pb.id !== id));
  }, []);

  // refetch 1 block (đồng bộ items/comments/attachments sau mutation con)
  const refetchBlock = useCallback(async (blockId: string) => {
    try {
      const [full, activity] = await Promise.all([
        phaseBlocksApi.get(blockId), phaseBlocksApi.activity(blockId),
      ]);
      full.activityLog = activity;
      setPbState(prev => prev.map(pb => pb.id === blockId ? full : pb));
    } catch { /* ignore */ }
  }, []);

  const addPhaseItem = useCallback(async (blockId: string, kind: 'checklist' | 'outcome', text: string, role?: UserRole) => {
    await phaseBlocksApi.addItem(blockId, kind, text, role);
    await refetchBlock(blockId);
  }, [refetchBlock]);

  const updatePhaseItem = useCallback(async (blockId: string, itemId: string, updates: { text?: string; done?: boolean }) => {
    await phaseBlocksApi.updateItem(blockId, itemId, updates);
    await refetchBlock(blockId);
  }, [refetchBlock]);

  const deletePhaseItem = useCallback(async (blockId: string, itemId: string) => {
    await phaseBlocksApi.deleteItem(blockId, itemId);
    await refetchBlock(blockId);
  }, [refetchBlock]);

  const addPhaseComment = useCallback(async (blockId: string, content: string) => {
    await phaseBlocksApi.addComment(blockId, content);
    await refetchBlock(blockId);
  }, [refetchBlock]);

  const addPhaseLink = useCallback(async (blockId: string, fileName: string, url: string) => {
    await phaseBlocksApi.addLink(blockId, fileName, url);
    await refetchBlock(blockId);
  }, [refetchBlock]);

  const uploadPhaseFile = useCallback(async (blockId: string, file: File) => {
    await phaseBlocksApi.uploadFile(blockId, file);
    await refetchBlock(blockId);
  }, [refetchBlock]);

  const deletePhaseAttachment = useCallback(async (blockId: string, attachmentId: string) => {
    await phaseBlocksApi.deleteAttachment(blockId, attachmentId);
    await refetchBlock(blockId);
  }, [refetchBlock]);

  // ─── Organizations ────────────────────────────────────────────────
  const reloadOrgs = useCallback(async (me: User | null) => {
    const orgs = await orgsApi.list();
    setOrgsState(orgs);
    syncRegistry(orgs, me);
    return orgs;
  }, [syncRegistry]);

  const addOrganization = useCallback(async (name: string) => {
    await orgsApi.create(name);
    await reloadOrgs(currentUser);
  }, [reloadOrgs, currentUser]);

  const updateOrganization = useCallback(async (id: string, updates: Partial<Organization>) => {
    if (updates.name) {
      const updated = await orgsApi.rename(id, updates.name);
      setOrgsState(prev => prev.map(o => o.id === id ? updated : o));
    }
  }, []);

  const deleteOrganization = useCallback(async (id: string) => {
    await orgsApi.remove(id);
    setOrgsState(prev => prev.filter(o => o.id !== id));
  }, []);

  const addOrgMember = useCallback(async (orgId: string, email: string) => {
    await orgsApi.addMember(orgId, email);
    await reloadOrgs(currentUser);
  }, [reloadOrgs, currentUser]);

  const removeOrgMember = useCallback(async (orgId: string, userId: string) => {
    await orgsApi.removeMember(orgId, userId);
    await reloadOrgs(currentUser);
  }, [reloadOrgs, currentUser]);

  // ─── Notifications ────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([notificationsApi.list(), notificationsApi.unreadCount()]);
      setNotifications(list);
      setUnreadCount(count);
    } catch { /* ignore */ }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // poll notifications khi đã đăng nhập
  useEffect(() => {
    if (!currentUser) return;
    loadNotifications();
    const t = setInterval(loadNotifications, 30000);
    return () => clearInterval(t);
  }, [currentUser, loadNotifications]);

  // ─── Change requests ──────────────────────────────────────────────
  const loadChangeRequests = useCallback(async () => {
    if (!state.selectedOrgId) { setPendingChangeRequests([]); return; }
    try {
      setPendingChangeRequests(await changeRequestsApi.listPending(state.selectedOrgId));
    } catch { setPendingChangeRequests([]); }
  }, [state.selectedOrgId]);

  const approveChangeRequest = useCallback(async (id: string) => {
    await changeRequestsApi.approve(id);
    setPendingChangeRequests(prev => prev.filter(c => c.id !== id));
    if (state.selectedOrgId) {
      const projects = await projectsApi.listByOrg(state.selectedOrgId);
      setProjectsState(projects);
    }
  }, [state.selectedOrgId]);

  const rejectChangeRequest = useCallback(async (id: string) => {
    await changeRequestsApi.reject(id);
    setPendingChangeRequests(prev => prev.filter(c => c.id !== id));
  }, []);

  // owner xem change requests khi vào workspace
  useEffect(() => {
    const org = orgsState.find(o => o.id === state.selectedOrgId);
    if (org && (org.myRole === 'owner' || currentUser?.isSuperuser)) loadChangeRequests();
  }, [state.selectedOrgId, orgsState, currentUser, loadChangeRequests]);

  // ─── Derived ──────────────────────────────────────────────────────
  const selectedOrg = state.selectedOrgId ? orgsState.find(o => o.id === state.selectedOrgId) ?? null : null;
  const orgProjects = projectsState;
  const orgPhaseBlocks = pbState;
  const selectedPhaseBlock = state.selectedPhaseBlockId ? pbState.find(pb => pb.id === state.selectedPhaseBlockId) ?? null : null;
  const selectedProjectDetail = state.selectedProjectDetailId ? projectsState.find(p => p.id === state.selectedProjectDetailId) ?? null : null;
  const isOwner = !!(currentUser?.isSuperuser || selectedOrg?.myRole === 'owner');

  const getUserById = useCallback((id: string): User | undefined => {
    if (currentUser?.id === id) return currentUser;
    for (const o of orgsState) {
      const m = o.members.find(u => u.id === id);
      if (m) return m;
    }
    return undefined;
  }, [orgsState, currentUser]);

  return (
    <AppContext.Provider value={{
      ...state,
      phaseBlocks: pbState,
      setPhaseBlocks: setPbState,
      goToLanding, goToLogin, goToWorkspaceSelector, selectOrg, setWorkspaceView,
      authReady, needsSetup, authError, login, register, setupSuperuser, logout,
      currentUser, updateCurrentUser, uploadAvatar,
      setSearchQuery, setPhaseFilter, setStatusFilter, setZoomLevel,
      setSelectedProjectIds, toggleProjectSelection, selectAllProjects,
      openPhaseDetail, closePhaseDetail, openProjectDetail, closeProjectDetail,
      openCreateProject, closeCreateProject, openCreatePhase, closeCreatePhase,
      openCreateWorkspace, closeCreateWorkspace, toggleSidebar,
      addProject, updateProject, deleteProject,
      addPhaseBlock, updatePhaseBlock, deletePhaseBlock,
      addPhaseItem, updatePhaseItem, deletePhaseItem,
      addPhaseComment, addPhaseLink, uploadPhaseFile, deletePhaseAttachment,
      addOrganization, updateOrganization, deleteOrganization, addOrgMember, removeOrgMember,
      notifications, unreadCount, loadNotifications, markNotificationRead, markAllNotificationsRead,
      pendingChangeRequests, loadChangeRequests, approveChangeRequest, rejectChangeRequest,
      selectedOrg, organizations: orgsState, orgProjects, orgPhaseBlocks,
      selectedPhaseBlock, selectedProjectDetail, isOwner, getUserById,
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
