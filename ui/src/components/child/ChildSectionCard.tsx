// src/components/child/ChildSectionCard.tsx
'use client';

import { PassportSection } from '@/lib/api';
import { MdHourglassTop } from 'react-icons/md';

const sectionStyles: Record<string, {
  bg: string;
  border: string;
  headerBg: string;
  headerText: string;
  itemBg: string;
  itemBorder: string;
  emoji: string;
  title: string;
}> = {
  LOVES: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    headerBg: 'bg-pink-500',
    headerText: 'text-white',
    itemBg: 'bg-white',
    itemBorder: 'border-pink-100',
    emoji: '\u2764\ufe0f',
    title: 'Things I Love',
  },
  STRENGTHS: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    headerBg: 'bg-emerald-500',
    headerText: 'text-white',
    itemBg: 'bg-white',
    itemBorder: 'border-emerald-100',
    emoji: '\u2b50',
    title: 'What I Am Amazing At',
  },
  HATES: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
    itemBg: 'bg-white',
    itemBorder: 'border-amber-100',
    emoji: '\u26a1',
    title: 'What I Find Tricky',
  },
};

interface ChildSectionCardProps {
  type: string;
  items: PassportSection[];
}

export function ChildSectionCard({ type, items }: ChildSectionCardProps) {
  const style = sectionStyles[type] || sectionStyles.LOVES;

  return (
    <div className={`rounded-3xl border-2 ${style.border} ${style.bg} overflow-hidden shadow-sm`}>
      {/* Section header */}
      <div className={`${style.headerBg} ${style.headerText} px-5 py-3 flex items-center gap-2.5`}>
        <span className="text-2xl" role="img">{style.emoji}</span>
        <h3 className="text-xl font-extrabold tracking-tight">{style.title}</h3>
      </div>

      {/* Items */}
      <div className="p-4">
        {items.length === 0 ? (
          <p className="text-center text-gray-400 py-4 text-base font-medium">Nothing here yet</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {items.map((item) => (
              <div key={item.id} className="relative">
                <span className={`inline-block px-4 py-2 rounded-2xl ${style.itemBg} border ${style.itemBorder} text-[1.05rem] leading-snug font-medium text-gray-800 shadow-sm`}>
                  {item.content}
                </span>
                {item.status === 'PENDING_REVIEW' && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-white text-[0.65rem] font-bold shadow">
                    <MdHourglassTop className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
