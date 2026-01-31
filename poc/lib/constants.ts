// src/lib/constants.ts
import { SectionType } from './types';

export const SECTIONS: Record<SectionType, {
  title: string;
  prompt: string;
  suggestedMax: number;
  requiresRemedial: boolean;
}> = {
  loves: {
    title: 'What I Love',
    prompt: 'What makes your child happy? Think about favourite activities, subjects, people, places...',
    suggestedMax: 5,
    requiresRemedial: false,
  },
  hates: {
    title: 'What I Find Difficult',
    prompt: 'What does your child struggle with? For each one, add what helps make it better.',
    suggestedMax: 4,
    requiresRemedial: true,
  },
  strengths: {
    title: 'What I Am Amazing At',
    prompt: 'Every child has unique strengths. What is your child particularly good at?',
    suggestedMax: 5,
    requiresRemedial: false,
  },
  needs: {
    title: 'What I Need Help With',
    prompt: 'Where does your child benefit most from extra support?',
    suggestedMax: 4,
    requiresRemedial: false,
  },
};

export const WIZARD_STEPS = [
  { id: 'child', label: 'About' },
  { id: 'loves', label: 'Loves' },
  { id: 'hates', label: 'Difficulties' },
  { id: 'strengths', label: 'Strengths' },
  { id: 'needs', label: 'Needs' },
] as const;



