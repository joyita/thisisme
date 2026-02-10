// src/lib/types.ts
export type SectionType = 'LOVES' | 'HATES' | 'STRENGTHS' | 'NEEDS';

export interface SectionRevision {
  id: string;
  content: string;
  remedialSuggestion?: string;
  changeType: 'EDIT' | 'PUBLISH' | 'UNPUBLISH';
  authorId?: string;
  authorName: string;
  timestamp: string;
}

export interface PassportRevisionSection {
  type: string;
  content: string;
  remedialSuggestion: string;
  published: boolean;
  visibilityLevel: string;
}

export interface PassportRevision {
  id: string;
  revisionNumber: number;
  description: string;
  createdByName: string;
  createdAt: string;
  sectionsSnapshot: PassportRevisionSection[];
}

// Timeline Entry Types
export type EntryType =
  // Core types
  | 'INCIDENT'
  | 'SUCCESS'
  | 'MILESTONE'
  | 'NOTE'
  // Preference tracking
  | 'LIKE'
  | 'DISLIKE'
  // Professional categories
  | 'MEDICAL'
  | 'EDUCATIONAL'
  | 'THERAPY'
  | 'SCHOOL_REPORT'
  | 'CORRESPONDENCE'
  // Behavioral tracking
  | 'BEHAVIOR'
  | 'SENSORY'
  | 'COMMUNICATION'
  | 'SOCIAL';

export type VisibilityLevel = 'OWNERS_ONLY' | 'PROFESSIONALS' | 'ALL' | 'CUSTOM';

// Role type - matches backend roles
export type Role = 'OWNER' | 'CO_PARENT' | 'PROFESSIONAL' | 'VIEWER' | 'CHILD';

export type AccountType = 'STANDARD' | 'CHILD';

export type ContentStatus = 'PUBLISHED' | 'PENDING_REVIEW';

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
  actor?: {
    id: string;
    name: string;
  };
  passportId?: string;
  timelineEntryId?: string;
  commentId?: string;
  documentId?: string;
  createdAt: string;
  readAt?: string;
  isRead: boolean;
}

export interface NotificationPreference {
  notificationType: NotificationType;
  displayName: string;
  description: string;
  enabled: boolean;
}




