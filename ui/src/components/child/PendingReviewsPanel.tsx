// src/components/child/PendingReviewsPanel.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { reviewApi } from '@/lib/api';
import { MdCheckCircle, MdCancel, MdPending, MdRefresh } from 'react-icons/md';
import { ENTRY_TYPE_CONFIG, SECTIONS } from '@/lib/constants';

interface PendingItem {
  id: string;
  type: 'section' | 'timeline';
  sectionType?: string;
  entryType?: string;
  title?: string;
  content: string;
  createdByName: string;
  createdAt: string;
}

interface PendingReviewsPanelProps {
  passportId: string;
}

export function PendingReviewsPanel({ passportId }: PendingReviewsPanelProps) {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reviewApi.getPending(passportId);
      const merged: PendingItem[] = [
        ...data.sections.map((s) => ({
          id: s.id,
          type: 'section' as const,
          sectionType: s.sectionType,
          content: s.content,
          createdByName: s.createdByName,
          createdAt: s.createdAt,
        })),
        ...data.timelineEntries.map((e) => ({
          id: e.id,
          type: 'timeline' as const,
          entryType: e.entryType,
          title: e.title,
          content: e.content,
          createdByName: e.createdByName,
          createdAt: e.createdAt,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(merged);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [passportId]);

  useEffect(() => { load(); }, [load]);

  const reviewedRef = useRef(new Set<string>());

  const handleReview = async (item: PendingItem, approve: boolean) => {
    // Prevent duplicate requests for the same item
    if (reviewedRef.current.has(item.id)) return;
    reviewedRef.current.add(item.id);
    setActionLoading(item.id);
    try {
      if (item.type === 'section') {
        await reviewApi.reviewSection(passportId, item.id, approve);
      } else {
        await reviewApi.reviewTimelineEntry(passportId, item.id, approve);
      }
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {
      // "Not pending review" means it was already approved — remove it
      setItems(prev => prev.filter(i => i.id !== item.id));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-16 bg-gray-100 rounded-xl" />;
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
          <MdPending className="w-5 h-5" />
          Pending Reviews ({items.length})
        </h3>
        <button onClick={load} className="text-amber-600 hover:text-amber-800">
          <MdRefresh className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isActioning = actionLoading === item.id;
          const label = item.type === 'section'
            ? SECTIONS[item.sectionType as keyof typeof SECTIONS]?.title || item.sectionType
            : ENTRY_TYPE_CONFIG[item.entryType as keyof typeof ENTRY_TYPE_CONFIG]?.label || item.entryType;

          return (
            <div key={item.id} className="bg-white rounded-lg p-3 flex items-start gap-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {item.type === 'section' ? 'Section' : 'Timeline'}
                  </span>
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
                {item.title && <p className="text-sm font-medium text-gray-900">{item.title}</p>}
                <p className="text-sm text-gray-700 truncate">{item.content}</p>
                <p className="text-xs text-gray-400 mt-1">by {item.createdByName}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleReview(item, true)}
                  disabled={isActioning}
                  className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                  title="Approve"
                >
                  <MdCheckCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleReview(item, false)}
                  disabled={isActioning}
                  className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                  title="Reject"
                >
                  <MdCancel className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
