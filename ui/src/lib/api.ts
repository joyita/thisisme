// src/lib/api.ts
import { SectionRevision, PassportRevision } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

let tokens: AuthTokens | null = null;

// Token management
export function setTokens(newTokens: AuthTokens) {
  tokens = newTokens;
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
  }
}

export function getTokens(): AuthTokens | null {
  if (tokens) return tokens;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('auth_tokens');
    if (stored) {
      tokens = JSON.parse(stored);
      return tokens;
    }
  }
  return null;
}

export function clearTokens() {
  tokens = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('user_info');
  }
}

function isTokenExpired(): boolean {
  const t = getTokens();
  if (!t) return true;
  return new Date(t.expiresAt) <= new Date();
}

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const t = getTokens();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (t?.accessToken) {
    headers['Authorization'] = `Bearer ${t.accessToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out');
    }
    throw new ApiError(0, e.message || 'Network error');
  }
  clearTimeout(timeoutId);

  if ((response.status === 401 || response.status === 403) && t?.refreshToken) {
    // Try to refresh token
    const refreshed = await refreshTokens(t.refreshToken);
    if (refreshed) {
      headers['Authorization'] = `Bearer ${refreshed.accessToken}`;
      const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
      if (!retryResponse.ok) {
        throw new ApiError(retryResponse.status, await retryResponse.text());
      }
      return retryResponse.json();
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(response.status, error.message || 'Request failed');
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

async function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (response.ok) {
      const data = await response.json();
      const newTokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      };
      setTokens(newTokens);
      return newTokens;
    }
  } catch (e) {
    console.error('Token refresh failed:', e);
  }
  clearTokens();
  // Notify the app that the session has expired so auth state can be cleared
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:session-expired'));
  }
  return null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Auth API
export const authApi = {
  async register(name: string, email: string, password: string, consentGiven: boolean) {
    const data = await apiRequest<{
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
      userId: string;
      name: string;
      email: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, parentalResponsibilityConfirmed: consentGiven }),
    });
    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    });
    return data;
  },

  async login(email: string, password: string) {
    const data = await apiRequest<{
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
      userId: string;
      name: string;
      email: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    });
    return data;
  },

  async logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      clearTokens();
    }
  },
};

// Passport API
export const passportApi = {
  async list() {
    return apiRequest<PassportListItem[]>('/api/v1/passports');
  },

  async get(id: string) {
    return apiRequest<Passport>(`/api/v1/passports/${id}`);
  },

  async create(childFirstName: string, childDateOfBirth?: string, consentGiven?: boolean) {
    return apiRequest<Passport>('/api/v1/passports', {
      method: 'POST',
      body: JSON.stringify({ childFirstName, childDateOfBirth, consentGiven }),
    });
  },

  async update(id: string, updates: { childFirstName?: string; childDateOfBirth?: string; childAvatar?: string }) {
    return apiRequest<Passport>(`/api/v1/passports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async addSection(passportId: string, type: string, content: string, remedialSuggestion?: string, visibilityLevel?: string) {
    return apiRequest<PassportSection>(`/api/v1/passports/${passportId}/sections`, {
      method: 'POST',
      body: JSON.stringify({ type, content, remedialSuggestion, visibilityLevel }),
    });
  },

  async updateSection(passportId: string, sectionId: string, updates: { content?: string; remedialSuggestion?: string; published?: boolean; displayOrder?: number }) {
    return apiRequest<PassportSection>(`/api/v1/passports/${passportId}/sections/${sectionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteSection(passportId: string, sectionId: string) {
    return apiRequest<void>(`/api/v1/passports/${passportId}/sections/${sectionId}`, {
      method: 'DELETE',
    });
  },

  async getSectionHistory(passportId: string, sectionId: string) {
    return apiRequest<SectionRevision[]>(`/api/v2/passports/${passportId}/sections/${sectionId}/history`);
  },

  async restoreSection(passportId: string, sectionId: string, revisionId: string) {
    return apiRequest<PassportSection>(`/api/v2/passports/${passportId}/sections/${sectionId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ revisionId }),
    });
  },

  async reorderSections(passportId: string, items: { sectionId: string; displayOrder: number }[]) {
    return apiRequest<void>(`/api/v2/passports/${passportId}/sections/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    });
  },

  async getPassportHistory(passportId: string) {
    return apiRequest<PassportRevision[]>(`/api/v1/passports/${passportId}/history`);
  },
};

// Timeline API
export const timelineApi = {
  async list(passportId: string, params?: {
    page?: number;
    size?: number;
    search?: string;
    types?: string[];
    startDate?: string;
    endDate?: string;
    tags?: string[];
    pinnedOnly?: boolean;
    flaggedOnly?: boolean;
  }) {
    const p = params || {};
    const qs = new URLSearchParams();
    qs.set('page', String(p.page ?? 0));
    qs.set('size', String(p.size ?? 20));
    if (p.search) qs.set('search', p.search);
    if (p.types?.length) p.types.forEach(t => qs.append('types', t));
    if (p.startDate) qs.set('startDate', p.startDate);
    if (p.endDate) qs.set('endDate', p.endDate);
    if (p.tags?.length) p.tags.forEach(t => qs.append('tags', t));
    if (p.pinnedOnly) qs.set('pinnedOnly', 'true');
    if (p.flaggedOnly) qs.set('flaggedOnly', 'true');
    return apiRequest<TimelinePageResponse>(
      `/api/v1/passports/${passportId}/timeline?${qs.toString()}`
    );
  },

  async create(passportId: string, entry: CreateTimelineEntry) {
    return apiRequest<TimelineEntry>(`/api/v1/passports/${passportId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  async update(passportId: string, entryId: string, updates: CreateTimelineEntry) {
    return apiRequest<TimelineEntry>(`/api/v1/passports/${passportId}/timeline/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async delete(passportId: string, entryId: string) {
    return apiRequest<void>(`/api/v1/passports/${passportId}/timeline/${entryId}`, {
      method: 'DELETE',
    });
  },

  async togglePin(passportId: string, entryId: string) {
    return apiRequest<TimelineEntry>(`/api/v1/passports/${passportId}/timeline/${entryId}/pin`, {
      method: 'POST',
    });
  },

  async flag(passportId: string, entryId: string, flaggedForFollowup: boolean, followupDueDate?: string) {
    return apiRequest<TimelineEntry>(`/api/v1/passports/${passportId}/timeline/${entryId}/flag`, {
      method: 'POST',
      body: JSON.stringify({ flaggedForFollowup, followupDueDate: followupDueDate ?? null }),
    });
  },

  async getCollaborators(passportId: string) {
    return apiRequest<PassportCollaborator[]>(`/api/v1/passports/${passportId}/timeline/collaborators`);
  },
};

// Document API
export const documentApi = {
  async list(passportId: string) {
    return apiRequest<DocumentListResponse>(`/api/v1/passports/${passportId}/documents`);
  },

  async upload(passportId: string, file: File, timelineEntryId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (timelineEntryId) {
      formData.append('timelineEntryId', timelineEntryId);
    }

    const t = getTokens();
    const response = await fetch(`${API_BASE}/api/v1/passports/${passportId}/documents`, {
      method: 'POST',
      headers: t ? { Authorization: `Bearer ${t.accessToken}` } : {},
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(response.status, 'Upload failed');
    }

    return response.json() as Promise<Document>;
  },

  async getDownloadUrl(passportId: string, documentId: string) {
    return apiRequest<{ downloadUrl: string }>(
      `/api/v1/passports/${passportId}/documents/${documentId}/download`
    );
  },

  async delete(passportId: string, documentId: string) {
    return apiRequest<void>(`/api/v1/passports/${passportId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  },
};

// Share API
export const shareApi = {
  async list(passportId: string) {
    return apiRequest<ShareLink[]>(`/api/v1/passports/${passportId}/share`);
  },

  async create(passportId: string, options: CreateShareLink) {
    return apiRequest<ShareLink>(`/api/v1/passports/${passportId}/share`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  async revoke(passportId: string, linkId: string) {
    return apiRequest<void>(`/api/v1/passports/${passportId}/share/${linkId}`, {
      method: 'DELETE',
    });
  },

  // Public endpoints
  async checkAccess(token: string) {
    const response = await fetch(`${API_BASE}/share/${token}/check`);
    if (!response.ok) throw new ApiError(response.status, 'Not found');
    return response.json() as Promise<ShareAccessResponse>;
  },

  async verifyPassword(token: string, password: string) {
    const response = await fetch(`${API_BASE}/share/${token}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return response.json() as Promise<boolean>;
  },

  async accessShared(token: string) {
    const response = await fetch(`${API_BASE}/share/${token}`);
    if (!response.ok) throw new ApiError(response.status, 'Access denied');
    return response.json() as Promise<SharedPassport>;
  },
};

// Permissions API
export const permissionsApi = {
  async list(passportId: string) {
    return apiRequest<PassportPermissionDetail[]>(`/api/v1/passports/${passportId}/permissions`);
  },

  /**
   * Adds a permission. Returns the granted permission if the user exists,
   * or undefined if an invitation was created (HTTP 202).
   */
  async add(passportId: string, request: AddPermissionRequest): Promise<PassportPermissionDetail | undefined> {
    const t = getTokens();
    const response = await fetch(`${API_BASE}/api/v1/passports/${passportId}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(t?.accessToken ? { Authorization: `Bearer ${t.accessToken}` } : {}),
      },
      body: JSON.stringify(request),
    });

    if (response.status === 202) {
      return undefined; // Invitation created
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiError(response.status, error.message || 'Request failed');
    }
    return response.json();
  },

  async update(passportId: string, permissionId: string, updates: Partial<Record<PermissionKey, boolean>>) {
    return apiRequest<PassportPermissionDetail>(`/api/v1/passports/${passportId}/permissions/${permissionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async revoke(passportId: string, permissionId: string) {
    return apiRequest<void>(`/api/v1/passports/${passportId}/permissions/${permissionId}`, {
      method: 'DELETE',
    });
  },
};

// Invitations API
export const invitationsApi = {
  async list(passportId: string) {
    return apiRequest<PendingInvitation[]>(`/api/v1/passports/${passportId}/invitations`);
  },

  async resend(passportId: string, invitationId: string) {
    return apiRequest<PendingInvitation>(`/api/v1/passports/${passportId}/invitations/${invitationId}/resend`, {
      method: 'POST',
    });
  },

  async revoke(passportId: string, invitationId: string) {
    return apiRequest<void>(`/api/v1/passports/${passportId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  },
};

// Custom Roles API
export const customRolesApi = {
  async list(passportId: string) {
    return apiRequest<CustomRole[]>(`/api/v1/passports/${passportId}/custom-roles`);
  },

  async create(passportId: string, payload: CreateCustomRolePayload) {
    return apiRequest<CustomRole>(`/api/v1/passports/${passportId}/custom-roles`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(passportId: string, customRoleId: string, payload: Partial<CreateCustomRolePayload>) {
    return apiRequest<CustomRole>(`/api/v1/passports/${passportId}/custom-roles/${customRoleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async remove(passportId: string, customRoleId: string) {
    return apiRequest<void>(`/api/v1/passports/${passportId}/custom-roles/${customRoleId}`, {
      method: 'DELETE',
    });
  },
};

// Auth invite validation (public — no token needed)
export const inviteApi = {
  async validate(token: string): Promise<{ email: string }> {
    const response = await fetch(`${API_BASE}/api/auth/invite/validate?token=${encodeURIComponent(token)}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Invalid invitation link' }));
      throw new ApiError(response.status, error.message || 'Invalid invitation link');
    }
    return response.json();
  },
};

// Export API
export const exportApi = {
  async downloadJson(passportId: string) {
    const t = getTokens();
    const response = await fetch(`${API_BASE}/api/v1/passports/${passportId}/export/json`, {
      headers: t ? { Authorization: `Bearer ${t.accessToken}` } : {},
    });
    return response.blob();
  },

  async downloadCsv(passportId: string) {
    const t = getTokens();
    const response = await fetch(`${API_BASE}/api/v1/passports/${passportId}/export/csv`, {
      headers: t ? { Authorization: `Bearer ${t.accessToken}` } : {},
    });
    return response.blob();
  },

  async downloadMarkdown(passportId: string) {
    const t = getTokens();
    const response = await fetch(`${API_BASE}/api/v1/passports/${passportId}/export/markdown`, {
      headers: t ? { Authorization: `Bearer ${t.accessToken}` } : {},
    });
    return response.blob();
  },

  async downloadHtml(passportId: string) {
    const t = getTokens();
    const response = await fetch(`${API_BASE}/api/v1/passports/${passportId}/export/html`, {
      headers: t ? { Authorization: `Bearer ${t.accessToken}` } : {},
    });
    return response.blob();
  },
};

// Types
export interface PassportListItem {
  id: string;
  childFirstName: string;
  role: string;
  createdAt: string;
}

export interface Passport {
  id: string;
  childFirstName: string;
  childDateOfBirth?: string;
  photoUrl?: string;
  childAvatar?: string;
  createdById: string;
  createdByName: string;
  wizardComplete?: boolean;
  sections: Record<string, PassportSection[]>;
  userRole?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PassportSection {
  id: string;
  type: 'LOVES' | 'HATES' | 'STRENGTHS' | 'NEEDS';
  content: string;
  remedialSuggestion?: string;
  published: boolean;
  visibilityLevel: string;
  displayOrder: number;
  createdByName: string;
  lastEditedByName: string;
  revisionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type { SectionRevision, PassportRevision } from './types';

export interface PassportPermission {
  id: string;
  userId: string;
  userName: string;
  role: string;
  notes?: string;
}

export interface TimelineEntry {
  id: string;
  passportId: string;
  author: { id: string; name: string; role: string };
  entryType: 'INCIDENT' | 'LIKE' | 'DISLIKE' | 'MILESTONE' | 'SUCCESS' | 'NOTE' | 'MEDICAL' | 'EDUCATIONAL' | 'THERAPY' | 'SCHOOL_REPORT' | 'BEHAVIOR' | 'SENSORY' | 'COMMUNICATION' | 'SOCIAL';
  title: string;
  content: string;
  entryDate: string;
  visibilityLevel: string;
  tags: string[];
  pinned: boolean;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
  flaggedForFollowup: boolean;
  followupDueDate?: string;
  mentionedUserIds: string[];
}

export interface CreateTimelineEntry {
  entryType: string;
  title: string;
  content: string;
  entryDate: string;
  visibilityLevel?: string;
  tags?: string[];
  mentionedUserIds?: string[];
}

export interface PassportCollaborator {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface TimelinePageResponse {
  entries: TimelineEntry[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface Document {
  id: string;
  passportId: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  hasOcrText: boolean;
  uploadedAt: string;
  uploadedBy: { id: string; name: string };
}

export interface DocumentListResponse {
  documents: Document[];
  totalStorageBytes: number;
  storageQuotaBytes: number;
}

export interface ShareLink {
  id: string;
  token: string;
  shareUrl: string;
  label?: string;
  visibleSections: string[];
  showTimeline: boolean;
  showDocuments: boolean;
  timelineVisibilityLevel?: string;
  expiresAt?: string;
  isPasswordProtected: boolean;
  accessCount: number;
  lastAccessedAt?: string;
  createdAt: string;
  active: boolean;
}

export interface CreateShareLink {
  label?: string;
  visibleSections?: string[];
  showTimeline?: boolean;
  showDocuments?: boolean;
  timelineVisibilityLevel?: string;
  expiresInDays?: number;
  password?: string;
}

export interface ShareAccessResponse {
  requiresPassword: boolean;
  isExpired: boolean;
  passportChildName: string;
}

export interface SharedPassport {
  passportId: string;
  childFirstName: string;
  childDateOfBirth?: string;
  sections: { type: string; content: string; remedialSuggestion?: string }[];
  timelineEntries: { title: string; content: string; entryType: string; entryDate: string }[];
  documents: { fileName: string; mimeType: string; fileSize: number }[];
}

// Permission types for API
export type Role = 'OWNER' | 'CO_PARENT' | 'PROFESSIONAL' | 'VIEWER';

// Matches backend PermissionResponse
export interface PassportPermissionDetail {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  customRoleName?: string;
  // Passport
  canViewPassport: boolean;
  canEditPassport: boolean;
  canDeletePassport: boolean;
  canManagePermissions: boolean;
  canCreateShareLinks: boolean;
  // Sections
  canViewSections: boolean;
  canEditSections: boolean;
  canDeleteSections: boolean;
  canPublishSections: boolean;
  canReorderSections: boolean;
  // Timeline
  canViewTimeline: boolean;
  canAddTimelineEntries: boolean;
  canEditTimelineEntries: boolean;
  canDeleteTimelineEntries: boolean;
  canCommentOnTimeline: boolean;
  canReactOnTimeline: boolean;
  // Documents
  canViewDocuments: boolean;
  canUploadDocuments: boolean;
  canDownloadDocuments: boolean;
  canDeleteDocuments: boolean;
  grantedAt: string;
  notes?: string;
}

export type PermissionKey =
  | 'canViewPassport' | 'canEditPassport' | 'canDeletePassport' | 'canManagePermissions' | 'canCreateShareLinks'
  | 'canViewSections' | 'canEditSections' | 'canDeleteSections' | 'canPublishSections' | 'canReorderSections'
  | 'canViewTimeline' | 'canAddTimelineEntries' | 'canEditTimelineEntries' | 'canDeleteTimelineEntries'
  | 'canCommentOnTimeline' | 'canReactOnTimeline'
  | 'canViewDocuments' | 'canUploadDocuments' | 'canDownloadDocuments' | 'canDeleteDocuments';

// Matches backend AddPermissionRequest
export interface AddPermissionRequest {
  email: string;
  role: string;
  notes?: string;
  customRoleId?: string;
}

// Matches backend InvitationResponse
export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  customRoleName?: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
  notes?: string;
  inviteLink?: string;
}

// Custom role types
export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  canViewPassport: boolean;
  canEditPassport: boolean;
  canDeletePassport: boolean;
  canManagePermissions: boolean;
  canCreateShareLinks: boolean;
  canViewSections: boolean;
  canEditSections: boolean;
  canDeleteSections: boolean;
  canPublishSections: boolean;
  canReorderSections: boolean;
  canViewTimeline: boolean;
  canAddTimelineEntries: boolean;
  canEditTimelineEntries: boolean;
  canDeleteTimelineEntries: boolean;
  canCommentOnTimeline: boolean;
  canReactOnTimeline: boolean;
  canViewDocuments: boolean;
  canUploadDocuments: boolean;
  canDownloadDocuments: boolean;
  canDeleteDocuments: boolean;
}

export type CreateCustomRolePayload = Omit<CustomRole, 'id' | 'createdByName' | 'createdAt' | 'updatedAt'>;

// Collaboration types
export type ReactionType = 'HEART' | 'CELEBRATE' | 'SUPPORT' | 'THANK' | 'INSIGHT' | 'CONCERN';

export interface Comment {
  id: string;
  entryId: string;
  author: { id: string; name: string; role: string };
  content: string;
  mentionedUserIds: string[];
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
}

export interface ReactionSummary {
  counts: Record<ReactionType, number>;
  userReactions: ReactionType[];
}

// Collaboration API
export const collaborationApi = {
  // Comments
  async getComments(entryId: string) {
    return apiRequest<Comment[]>(`/api/timeline/${entryId}/comments`);
  },

  async addComment(entryId: string, content: string, mentionedUserIds?: string[]) {
    return apiRequest<Comment>(`/api/timeline/${entryId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, mentionedUserIds }),
    });
  },

  async updateComment(entryId: string, commentId: string, content: string) {
    return apiRequest<Comment>(`/api/timeline/${entryId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  async deleteComment(entryId: string, commentId: string) {
    return apiRequest<void>(`/api/timeline/${entryId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  // Reactions
  async getReactions(entryId: string) {
    return apiRequest<ReactionSummary>(`/api/timeline/${entryId}/reactions`);
  },

  async addReaction(entryId: string, reactionType: ReactionType) {
    return apiRequest<{ id: string }>(`/api/timeline/${entryId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ reactionType }),
    });
  },

  async removeReaction(entryId: string, reactionType: ReactionType) {
    return apiRequest<void>(`/api/timeline/${entryId}/reactions/${reactionType}`, {
      method: 'DELETE',
    });
  },
};

// Notification types
export type NotificationType =
  | 'COMMENT_ON_YOUR_ENTRY'
  | 'MENTIONED_IN_COMMENT'
  | 'MENTIONED_IN_ENTRY'
  | 'REACTION_ON_YOUR_ENTRY'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'DOCUMENT_OCR_COMPLETE';

export interface Notification {
  id: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  actor?: { id: string; name: string };
  passportId?: string;
  timelineEntryId?: string;
  commentId?: string;
  documentId?: string;
  createdAt: string;
  readAt?: string;
  isRead: boolean;
}

export interface NotificationPageResponse {
  notifications: Notification[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface NotificationPreference {
  notificationType: NotificationType;
  displayName: string;
  description: string;
  enabled: boolean;
}

// Notification API
export const notificationApi = {
  async list(page = 0, size = 20) {
    return apiRequest<NotificationPageResponse>(
      `/api/notifications?page=${page}&size=${size}`
    );
  },

  async getUnreadCount() {
    return apiRequest<{ count: number }>('/api/notifications/unread/count');
  },

  async getRecentUnread(limit = 5) {
    return apiRequest<Notification[]>(`/api/notifications/unread/recent?limit=${limit}`);
  },

  async markAsRead(notificationId: string) {
    return apiRequest<void>(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  async markAsUnread(notificationId: string) {
    return apiRequest<void>(`/api/notifications/${notificationId}/unread`, {
      method: 'POST',
    });
  },

  async markAllAsRead() {
    return apiRequest<void>('/api/notifications/read-all', {
      method: 'POST',
    });
  },

  async getPreferences() {
    return apiRequest<NotificationPreference[]>('/api/notifications/preferences');
  },

  async updatePreference(notificationType: NotificationType, enabled: boolean) {
    return apiRequest<void>('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ notificationType, enabled }),
    });
  },
};
