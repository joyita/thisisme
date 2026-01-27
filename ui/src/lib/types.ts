// src/lib/types.ts
export interface User {
  id: string;
  username: string;
  isOwner: boolean;
}

export interface Revision {
  id: string;
  content: string;
  remedialSuggestion?: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  status: 'current' | 'pending' | 'approved' | 'rejected';
}

export interface BulletPoint {
  id: string;
  content: string;
  remedialSuggestion?: string;
  isPublished: boolean;
  revisions: Revision[];
  pendingRevision?: Revision;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastEditedBy: string;
}

export type SectionType = 'loves' | 'hates' | 'strengths' | 'needs';

export interface ChildProfile {
  firstName: string;
  avatar?: string;
}

export interface PupilPassport {
  id: string;
  child: ChildProfile;
  ownerId: string;
  ownerName: string;
  sections: Record<SectionType, BulletPoint[]>;
  createdAt: string;
  updatedAt: string;
  wizardComplete: boolean;
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
  // Behavioral tracking
  | 'BEHAVIOR'
  | 'SENSORY'
  | 'COMMUNICATION'
  | 'SOCIAL'
  // Progress tracking
  | 'GOAL_SET'
  | 'GOAL_PROGRESS'
  | 'GOAL_ACHIEVED';

export type VisibilityLevel = 'OWNERS_ONLY' | 'PROFESSIONALS' | 'ALL' | 'CUSTOM';

// Role type - matches backend roles
export type Role = 'OWNER' | 'CO_PARENT' | 'PROFESSIONAL' | 'VIEWER';

// Notification types
export type NotificationType =
  | 'COMMENT_ON_YOUR_ENTRY'
  | 'MENTIONED_IN_COMMENT'
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




