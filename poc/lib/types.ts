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



