// src/components/child/ChildTimelineFeed.tsx
'use client';

import { useState, useEffect } from 'react';
import { timelineApi, TimelineEntry } from '@/lib/api';
import { MdHourglassTop } from 'react-icons/md';

const ENTRY_STYLES: Record<string, { emoji: string; label: string; bg: string; border: string; accent: string }> = {
  SUCCESS: { emoji: '\ud83c\udf89', label: 'Win!', bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'text-emerald-700' },
  MILESTONE: { emoji: '\ud83c\udfc6', label: 'Milestone', bg: 'bg-violet-50', border: 'border-violet-200', accent: 'text-violet-700' },
  LIKE: { emoji: '\ud83d\udc96', label: 'New Like', bg: 'bg-pink-50', border: 'border-pink-200', accent: 'text-pink-700' },
};

interface ChildTimelineFeedProps {
  passportId: string;
}

export function ChildTimelineFeed({ passportId }: ChildTimelineFeedProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const resp = await timelineApi.list(passportId, { childView: true, size: 20 });
        if (!cancelled) setEntries(resp.entries);
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [passportId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p className="text-5xl mb-2">{'\ud83c\udf1f'}</p>
        <p className="text-lg font-medium">No moments yet!</p>
        <p className="text-sm mt-1">Add your first one below</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const style = ENTRY_STYLES[entry.entryType] || ENTRY_STYLES.SUCCESS;
        return (
          <div
            key={entry.id}
            className={`relative rounded-2xl border-2 ${style.border} ${style.bg} p-4 shadow-sm`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0 mt-0.5">{style.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-bold uppercase tracking-wide ${style.accent}`}>
                    {style.label}
                  </span>
                  {entry.status === 'PENDING_REVIEW' && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-white text-[0.6rem] font-bold">
                      <MdHourglassTop className="w-2.5 h-2.5" />
                      Waiting
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-bold text-gray-900 leading-snug">{entry.title}</h4>
                {entry.content && (
                  <p className="text-base text-gray-600 mt-1 leading-relaxed">{entry.content}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
