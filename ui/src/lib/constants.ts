// src/lib/constants.ts
import { SectionType } from './types';

export const SECTIONS: Record<SectionType, {
  title: string;
  prompt: string;
  suggestedMax: number;
  requiresRemedial: boolean;
}> = {
  LOVES: {
    title: 'What I Love',
    prompt: 'What makes your child happy? Think about favourite activities, subjects, people, places...',
    suggestedMax: 5,
    requiresRemedial: false,
  },
  HATES: {
    title: 'What I Find Difficult',
    prompt: 'What does your child struggle with? For each one, add what helps make it better.',
    suggestedMax: 4,
    requiresRemedial: true,
  },
  STRENGTHS: {
    title: 'What I Am Amazing At',
    prompt: 'Every child has unique strengths. What is your child particularly good at?',
    suggestedMax: 5,
    requiresRemedial: false,
  },
  NEEDS: {
    title: 'What I Need Help With',
    prompt: 'Where does your child benefit most from extra support?',
    suggestedMax: 4,
    requiresRemedial: false,
  },
};

export const WIZARD_STEPS = [
  { id: 'child', label: 'About' },
  { id: 'LOVES', label: 'Loves' },
  { id: 'HATES', label: 'Difficulties' },
  { id: 'STRENGTHS', label: 'Strengths' },
  { id: 'NEEDS', label: 'Needs' },
] as const;

// Timeline Entry Type Configuration
export const ENTRY_TYPE_CONFIG = {
  INCIDENT: {
    label: 'Incident',
    description: 'Record a challenging situation or behavior',
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
  },
  SUCCESS: {
    label: 'Win / Success',
    description: 'Celebrate an achievement or positive moment',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
  },
  MILESTONE: {
    label: 'Milestone',
    description: 'Mark a significant developmental achievement',
    color: 'purple',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
  },
  NOTE: {
    label: 'Note',
    description: 'Add a general observation or update',
    color: 'gray',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-700',
  },
  MEDICAL: {
    label: 'Medical',
    description: 'Record medical appointments, medications, or health info',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
  },
  EDUCATIONAL: {
    label: 'Educational',
    description: 'Document school-related events or IEP updates',
    color: 'amber',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
  },
  LIKE: {
    label: 'New Like',
    description: 'Something new they enjoy',
    color: 'pink',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-700',
  },
  DISLIKE: {
    label: 'New Dislike',
    description: 'Something new they find difficult',
    color: 'orange',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
  },
  // Professional categories
  THERAPY: {
    label: 'Therapy',
    description: 'Therapy sessions, progress, and recommendations',
    color: 'teal',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-700',
  },
  SCHOOL_REPORT: {
    label: 'School Report',
    description: 'Reports, assessments, and feedback from school',
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700',
  },
  // Behavioral tracking
  BEHAVIOR: {
    label: 'Behavior',
    description: 'Track behavioral patterns and triggers',
    color: 'rose',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
  },
  SENSORY: {
    label: 'Sensory',
    description: 'Sensory experiences and responses',
    color: 'cyan',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-700',
  },
  COMMUNICATION: {
    label: 'Communication',
    description: 'Speech, language, and communication progress',
    color: 'violet',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-700',
  },
  SOCIAL: {
    label: 'Social',
    description: 'Social interactions and relationships',
    color: 'fuchsia',
    bgColor: 'bg-fuchsia-50',
    textColor: 'text-fuchsia-700',
    borderColor: 'border-fuchsia-200',
    badgeBg: 'bg-fuchsia-100',
    badgeText: 'text-fuchsia-700',
  },
  // Progress tracking
  GOAL_SET: {
    label: 'Goal Set',
    description: 'New goal or target established',
    color: 'sky',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-700',
  },
  GOAL_PROGRESS: {
    label: 'Goal Progress',
    description: 'Update on progress towards a goal',
    color: 'lime',
    bgColor: 'bg-lime-50',
    textColor: 'text-lime-700',
    borderColor: 'border-lime-200',
    badgeBg: 'bg-lime-100',
    badgeText: 'text-lime-700',
  },
  GOAL_ACHIEVED: {
    label: 'Goal Achieved',
    description: 'Celebrate a completed goal!',
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
  },
} as const;

// Entry type categories for filtering
export const ENTRY_TYPE_CATEGORIES = {
  'Quick Log': ['INCIDENT', 'SUCCESS'],
  'Core': ['MILESTONE', 'NOTE', 'LIKE', 'DISLIKE'],
  'Professional': ['MEDICAL', 'EDUCATIONAL', 'THERAPY', 'SCHOOL_REPORT'],
  'Tracking': ['BEHAVIOR', 'SENSORY', 'COMMUNICATION', 'SOCIAL'],
  'Goals': ['GOAL_SET', 'GOAL_PROGRESS', 'GOAL_ACHIEVED'],
} as const;

// Visibility Level Configuration
export const VISIBILITY_CONFIG = {
  OWNERS_ONLY: {
    label: 'Owners Only',
    description: 'Only parents/guardians can see this',
    icon: 'lock',
  },
  PROFESSIONALS: {
    label: 'Professionals',
    description: 'Parents and approved professionals (teachers, therapists)',
    icon: 'users',
  },
  ALL: {
    label: 'Everyone',
    description: 'Anyone with access to this passport',
    icon: 'globe',
  },
  CUSTOM: {
    label: 'Custom',
    description: 'Select specific people',
    icon: 'settings',
  },
} as const;

// Role Configuration
export const ROLE_CONFIG = {
  OWNER: {
    label: 'Owner',
    description: 'Full access to all features',
    color: 'purple',
  },
  CO_PARENT: {
    label: 'Co-Parent',
    description: 'Full access, can manage permissions',
    color: 'blue',
  },
  PROFESSIONAL: {
    label: 'Professional',
    description: 'Can view and add entries based on permissions',
    color: 'green',
  },
  VIEWER: {
    label: 'Viewer',
    description: 'Read-only access to permitted content',
    color: 'gray',
  },
} as const;




