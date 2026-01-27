// src/components/timeline/QuickLogButtons.tsx
'use client';

import { MdWarning, MdCelebration } from 'react-icons/md';

interface QuickLogButtonsProps {
  variant: 'floating' | 'inline';
  onLogIncident: () => void;
  onLogWin: () => void;
}

export function QuickLogButtons({ variant, onLogIncident, onLogWin }: QuickLogButtonsProps) {
  if (variant === 'floating') {
    return (
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        <button
          onClick={onLogWin}
          className="w-14 h-14 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 hover:shadow-xl transition-all flex items-center justify-center group"
          title="Log a Win"
        >
          <MdCelebration className="w-6 h-6" />
          <span className="absolute right-full mr-3 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Log a Win
          </span>
        </button>
        <button
          onClick={onLogIncident}
          className="w-14 h-14 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 hover:shadow-xl transition-all flex items-center justify-center group"
          title="Log Incident"
        >
          <MdWarning className="w-6 h-6" />
          <span className="absolute right-full mr-3 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Log Incident
          </span>
        </button>
      </div>
    );
  }

  // Inline variant
  return (
    <div className="flex gap-2">
      <button
        onClick={onLogIncident}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
      >
        <MdWarning className="w-4 h-4" />
        Log Incident
      </button>
      <button
        onClick={onLogWin}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
      >
        <MdCelebration className="w-4 h-4" />
        Log Win
      </button>
    </div>
  );
}
