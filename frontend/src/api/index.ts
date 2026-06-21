// Endpoint functions + ánh xạ DTO (backend camelCase) → type frontend.
import { api, setToken, clearToken } from './client';
import type {
  User, Organization, Project, PhaseBlock, ChecklistItem, Comment, Attachment,
  ActivityItem, Notification, UserRole, DevPhase, PhaseTag, ProjectStatus,
  AdminStats, AdminUserInfo, AdminWorkspaceInfo,
} from '../types';

// ─── DTO shapes (chỉ field cần dùng) ─────────────────────────────────
interface UserDTO { id: string; email: string; name: string; role: UserRole; avatar: string | null; isSuperuser: boolean; }
interface OrgDTO { id: string; name: string; members: UserDTO[]; myRole: 'owner' | 'member' | null; }
interface PhaseItemDTO { id: string; text: string; done: boolean; role: UserRole | null; }
interface PhaseBlockDTO {
  id: string; projectId: string; phaseType: DevPhase; tag: PhaseTag; title: string; description: string;
  startDate: string; endDate: string; actualEndDate: string | null; displayRow: number | null;
  createdBy: string | null; assignee: string; participantIds: string[]; progressPct: number;
  checklist: PhaseItemDTO[]; outcomes: PhaseItemDTO[];
  comments?: CommentDTO[] | null; attachments?: AttachmentDTO[] | null;
}
interface CommentDTO { id: string; authorId: string | null; content: string; createdAt: string; }
interface AttachmentDTO { id: string; kind: 'file' | 'link'; fileName: string; url: string; outcomeItemId: string | null; uploadedAt: string; }
interface ActivityDTO { id: string; projectId: string; phaseBlockId: string | null; userId: string | null; action: string; target: string; createdAt: string; }

// ─── Mappers ─────────────────────────────────────────────────────────
export function mapUser(d: UserDTO): User {
  return { id: d.id, name: d.name, avatar: d.avatar || '', role: d.role, email: d.email, isSuperuser: d.isSuperuser };
}
function mapOrg(d: OrgDTO): Organization {
  return { id: d.id, name: d.name, members: (d.members ?? []).map(mapUser), myRole: d.myRole ?? undefined };
}
function mapItem(d: PhaseItemDTO): ChecklistItem {
  return { id: d.id, text: d.text, done: d.done, role: d.role ?? undefined };
}
function mapComment(d: CommentDTO): Comment {
  return { id: d.id, authorId: d.authorId ?? '', content: d.content, createdAt: d.createdAt };
}
function mapAttachment(d: AttachmentDTO): Attachment {
  return { id: d.id, kind: d.kind, fileName: d.fileName, url: d.url,
           outcomeItemId: d.outcomeItemId ?? null, uploadedAt: d.uploadedAt };
}
export function mapActivity(d: ActivityDTO): ActivityItem {
  return { id: d.id, userId: d.userId ?? '', action: d.action, target: d.target, timestamp: d.createdAt, phaseBlockId: d.phaseBlockId };
}
export function mapPhaseBlock(d: PhaseBlockDTO): PhaseBlock {
  return {
    id: d.id, projectId: d.projectId, phaseType: d.phaseType, tag: d.tag, title: d.title,
    description: d.description, startDate: d.startDate, endDate: d.endDate,
    actualEndDate: d.actualEndDate ?? undefined, createdBy: d.createdBy ?? '', assignee: d.assignee,
    participants: d.participantIds ?? [], checklist: (d.checklist ?? []).map(mapItem),
    outcomes: (d.outcomes ?? []).map(mapItem),
    comments: (d.comments ?? []).map(mapComment), attachments: (d.attachments ?? []).map(mapAttachment),
    activityLog: [], displayRow: d.displayRow ?? undefined, progressPct: d.progressPct,
  };
}

// ─── Auth ────────────────────────────────────────────────────────────
interface TokenDTO { accessToken: string; user: UserDTO; }

export const auth = {
  async setupStatus(): Promise<boolean> {
    return (await api.get<{ needsSetup: boolean }>('/auth/setup-status')).needsSetup;
  },
  async setup(email: string, password: string, name: string, role: UserRole): Promise<User> {
    const t = await api.post<TokenDTO>('/auth/setup', { email, password, name, role });
    setToken(t.accessToken);
    return mapUser(t.user);
  },
  async register(email: string, password: string, name: string, role: UserRole): Promise<User> {
    const t = await api.post<TokenDTO>('/auth/register', { email, password, name, role });
    setToken(t.accessToken);
    return mapUser(t.user);
  },
  async login(email: string, password: string): Promise<User> {
    const t = await api.post<TokenDTO>('/auth/login', { email, password });
    setToken(t.accessToken);
    return mapUser(t.user);
  },
  async me(): Promise<User> {
    return mapUser(await api.get<UserDTO>('/auth/me'));
  },
  logout(): void {
    clearToken();
  },
};

// ─── Users / profile ─────────────────────────────────────────────────
export const usersApi = {
  async updateProfile(updates: { name?: string; role?: UserRole }): Promise<User> {
    return mapUser(await api.patch<UserDTO>('/users/me', updates));
  },
  async uploadAvatar(file: File): Promise<User> {
    return mapUser(await api.upload<UserDTO>('/users/me/avatar', file));
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.patch<void>('/users/me/password', { currentPassword, newPassword });
  },
  async deleteAccount(): Promise<void> {
    await api.del('/users/me');
  },
};

// ─── Organizations ───────────────────────────────────────────────────
export const orgsApi = {
  async list(): Promise<Organization[]> {
    return (await api.get<OrgDTO[]>('/organizations')).map(mapOrg);
  },
  async create(name: string): Promise<Organization> {
    return mapOrg(await api.post<OrgDTO>('/organizations', { name }));
  },
  async rename(id: string, name: string): Promise<Organization> {
    return mapOrg(await api.patch<OrgDTO>(`/organizations/${id}`, { name }));
  },
  async remove(id: string): Promise<void> {
    await api.del(`/organizations/${id}`);
  },
  async addMember(id: string, email: string): Promise<User> {
    return mapUser(await api.post<UserDTO>(`/organizations/${id}/members`, { email }));
  },
  async removeMember(id: string, userId: string): Promise<void> {
    await api.del(`/organizations/${id}/members/${userId}`);
  },
};

// ─── Projects ────────────────────────────────────────────────────────
export const projectsApi = {
  async listByOrg(orgId: string): Promise<Project[]> {
    return await api.get<Project[]>(`/organizations/${orgId}/projects`);
  },
  async create(orgId: string, body: { name: string; description: string; startDate: string; targetDate?: string | null; status?: ProjectStatus }): Promise<Project> {
    return await api.post<Project>(`/organizations/${orgId}/projects`, body);
  },
  // #11: chỉ PIC (hoặc admin) mới sửa được — BE trả 403 nếu không phải.
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    return await api.patch<Project>(`/projects/${id}`, updates);
  },
  // #14: xóa cần lý do → BE ghi vào activity workspace.
  async remove(id: string, reason?: string): Promise<void> {
    const q = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    await api.del(`/projects/${id}${q}`);
  },
  async changePic(id: string, picUserId: string): Promise<Project> {
    return await api.patch<Project>(`/projects/${id}/pic`, { picUserId });
  },
  async activity(id: string): Promise<ActivityItem[]> {
    return (await api.get<ActivityDTO[]>(`/projects/${id}/activity`)).map(mapActivity);
  },
};

// ─── Phase blocks ────────────────────────────────────────────────────
export interface CreatePhaseBody {
  phaseType: DevPhase; title: string; startDate: string; endDate: string;
  tag?: PhaseTag; description?: string; assignee?: string | null; participantIds?: string[];
  checklist?: { text: string; role?: UserRole; done?: boolean }[] | null;
  outcomes?: { text: string; role?: UserRole; done?: boolean }[] | null;
}

export const phaseBlocksApi = {
  async listByOrg(orgId: string): Promise<PhaseBlock[]> {
    return (await api.get<PhaseBlockDTO[]>(`/organizations/${orgId}/phase-blocks`)).map(mapPhaseBlock);
  },
  async get(id: string): Promise<PhaseBlock> {
    return mapPhaseBlock(await api.get<PhaseBlockDTO>(`/phase-blocks/${id}`));
  },
  async create(projectId: string, body: CreatePhaseBody): Promise<PhaseBlock> {
    return mapPhaseBlock(await api.post<PhaseBlockDTO>(`/projects/${projectId}/phase-blocks`, body));
  },
  async update(id: string, updates: Record<string, unknown>): Promise<PhaseBlock> {
    return mapPhaseBlock(await api.patch<PhaseBlockDTO>(`/phase-blocks/${id}`, updates));
  },
  // #14: xóa cần lý do → BE ghi vào activity dự án.
  async remove(id: string, reason?: string): Promise<void> {
    const q = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    await api.del(`/phase-blocks/${id}${q}`);
  },
  // items
  async addItem(blockId: string, kind: 'checklist' | 'outcome', text: string, role?: UserRole): Promise<ChecklistItem> {
    return mapItem(await api.post<PhaseItemDTO>(`/phase-blocks/${blockId}/items`, { kind, text, role }));
  },
  async updateItem(blockId: string, itemId: string, updates: { text?: string; done?: boolean; role?: UserRole }): Promise<ChecklistItem> {
    return mapItem(await api.patch<PhaseItemDTO>(`/phase-blocks/${blockId}/items/${itemId}`, updates));
  },
  async deleteItem(blockId: string, itemId: string): Promise<void> {
    await api.del(`/phase-blocks/${blockId}/items/${itemId}`);
  },
  // comments
  async listComments(blockId: string): Promise<Comment[]> {
    return (await api.get<CommentDTO[]>(`/phase-blocks/${blockId}/comments`)).map(mapComment);
  },
  async addComment(blockId: string, content: string): Promise<Comment> {
    return mapComment(await api.post<CommentDTO>(`/phase-blocks/${blockId}/comments`, { content }));
  },
  // attachments
  async listAttachments(blockId: string): Promise<Attachment[]> {
    return (await api.get<AttachmentDTO[]>(`/phase-blocks/${blockId}/attachments`)).map(mapAttachment);
  },
  async addLink(blockId: string, fileName: string, url: string, outcomeItemId?: string | null): Promise<Attachment> {
    return mapAttachment(await api.post<AttachmentDTO>(`/phase-blocks/${blockId}/attachments/link`, { fileName, url, outcomeItemId }));
  },
  async uploadFile(blockId: string, file: File, outcomeItemId?: string | null, onProgress?: (pct: number) => void): Promise<Attachment> {
    const qs = outcomeItemId ? `?outcome_item_id=${outcomeItemId}` : '';
    return mapAttachment(await api.uploadWithProgress<AttachmentDTO>(`/phase-blocks/${blockId}/attachments/file${qs}`, file, onProgress));
  },
  async deleteAttachment(blockId: string, attachmentId: string): Promise<void> {
    await api.del(`/phase-blocks/${blockId}/attachments/${attachmentId}`);
  },
  // activity (phase changelog)
  async activity(blockId: string): Promise<ActivityItem[]> {
    return (await api.get<ActivityDTO[]>(`/phase-blocks/${blockId}/activity`)).map(mapActivity);
  },
};

// ─── Notifications ───────────────────────────────────────────────────
export const notificationsApi = {
  async list(): Promise<Notification[]> {
    return await api.get<Notification[]>('/notifications');
  },
  async unreadCount(): Promise<number> {
    return (await api.get<{ count: number }>('/notifications/unread-count')).count;
  },
  async markRead(id: string): Promise<void> {
    await api.post(`/notifications/${id}/read`);
  },
  async markAllRead(): Promise<void> {
    await api.post('/notifications/read-all');
  },
};

// ─── Admin (superuser) ───────────────────────────────────────────────
interface AdminWorkspaceDTO {
  id: string; name: string; createdAt: string | null;
  memberCount: number; projectCount: number; owners: UserDTO[];
}

export const adminApi = {
  async stats(): Promise<AdminStats> {
    return await api.get<AdminStats>('/admin/stats');
  },
  async users(): Promise<AdminUserInfo[]> {
    // DTO camelCase khớp AdminUserInfo 1-1
    return await api.get<AdminUserInfo[]>('/admin/users');
  },
  async workspaces(): Promise<AdminWorkspaceInfo[]> {
    return (await api.get<AdminWorkspaceDTO[]>('/admin/workspaces')).map(d => ({
      id: d.id, name: d.name, createdAt: d.createdAt,
      memberCount: d.memberCount, projectCount: d.projectCount,
      owners: (d.owners ?? []).map(mapUser),
    }));
  },
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    await api.post(`/admin/users/${userId}/reset-password`, { newPassword });
  },
  async setSuperuser(userId: string, isSuperuser: boolean): Promise<void> {
    await api.post(`/admin/users/${userId}/superuser`, { isSuperuser });
  },
  async deleteUser(userId: string): Promise<void> {
    await api.del(`/admin/users/${userId}`);
  },
};

// ─── Templates ───────────────────────────────────────────────────────
export interface PhaseTasksDTO {
  phase: DevPhase;
  checklist: { role: UserRole; tasks: string[] }[];
  outcomes: { role: UserRole; outcomes: string[] }[];
}
export const templatesApi = {
  async phaseTasks(phase: DevPhase): Promise<PhaseTasksDTO> {
    return await api.get<PhaseTasksDTO>(`/templates/phase-tasks?phase=${phase}`);
  },
};
