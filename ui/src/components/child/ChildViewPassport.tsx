// src/components/child/ChildViewPassport.tsx
'use client';

import { useState, useCallback } from 'react';
import { Passport } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useChildMode } from '@/context/ChildModeContext';
import { usePassport } from '@/context/PassportContext';
import { ChildSectionCard } from './ChildSectionCard';
import { ChildTimelineFeed } from './ChildTimelineFeed';
import { ChildAddForm } from './ChildAddForm';
import { ExitChildModeModal } from './ExitChildModeModal';
import { CHILD_VISIBLE_SECTIONS } from '@/lib/constants';

interface ChildViewPassportProps {
  passport: Passport;
}

export function ChildViewPassport({ passport }: ChildViewPassportProps) {
  const { isChildAccount } = useAuth();
  const { isChildMode, setIsExitModalOpen } = useChildMode();
  const { loadPassport } = usePassport();
  const [addMode, setAddMode] = useState<'section' | 'timeline' | null>(null);

  const handleSuccess = useCallback(() => {
    setAddMode(null);
    loadPassport(passport.id);
  }, [loadPassport, passport.id]);

  const visibleTypes: string[] = [...CHILD_VISIBLE_SECTIONS];
  if (passport.childViewShowHates) {
    visibleTypes.push('HATES');
  }

  const initial = passport.childFirstName?.[0]?.toUpperCase() || '?';
  const hasImage = passport.childAvatar && passport.childAvatar.startsWith('http');

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-100 via-sky-50 to-amber-50">
      {/* Exit button for parent in child mode */}
      {isChildMode && !isChildAccount && (
        <div className="fixed top-3 right-3 z-30">
          <button
            onClick={() => setIsExitModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-gray-900/70 text-white/90 text-xs font-medium backdrop-blur-sm hover:bg-gray-900/90 transition-colors"
          >
            Exit
          </button>
        </div>
      )}

      {/* Hero header */}
      <div className="pt-10 pb-6 text-center px-4">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-400 to-pink-400 text-white text-4xl font-bold shadow-xl ring-4 ring-white mb-4">
          {hasImage ? (
            <img src={passport.childAvatar!} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          {passport.childFirstName}&apos;s Passport
        </h1>
        <p className="text-lg text-gray-500 mt-1 font-medium">This is all about me!</p>
      </div>

      {/* Section cards */}
      <div className="px-4 sm:px-6 space-y-5 max-w-xl mx-auto">
        {visibleTypes.map((type) => {
          const items = passport.sections?.[type] || [];
          return <ChildSectionCard key={type} type={type} items={items} />;
        })}
      </div>

      {/* Timeline */}
      <div className="px-4 sm:px-6 max-w-xl mx-auto mt-8 mb-6">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
          My Moments
        </h2>
        <ChildTimelineFeed passportId={passport.id} />
      </div>

      {/* Add buttons — anchored to bottom, full width on mobile */}
      <div className="fixed bottom-0 inset-x-0 z-20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white/95 to-white/0">
        <div className="max-w-xl mx-auto flex gap-3">
          <button
            onClick={() => setAddMode('section')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-violet-600 text-white text-base font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 active:scale-[0.98] transition-all"
          >
            <span className="text-xl leading-none">+</span>
            About Me
          </button>
          <button
            onClick={() => setAddMode('timeline')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-white text-base font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all"
          >
            <span className="text-xl leading-none">+</span>
            My Timeline
          </button>
        </div>
      </div>

      {/* Bottom spacer for fixed buttons */}
      <div className="h-24" />

      {addMode && (
        <ChildAddForm
          passportId={passport.id}
          mode={addMode}
          onClose={() => setAddMode(null)}
          onSuccess={handleSuccess}
        />
      )}

      <ExitChildModeModal />
    </div>
  );
}
