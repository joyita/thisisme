// src/components/child/ChildAddForm.tsx
'use client';

import { useState } from 'react';
import { passportApi, timelineApi } from '@/lib/api';
import { CHILD_VISIBLE_SECTIONS, CHILD_ALLOWED_TIMELINE_TYPES, SECTIONS } from '@/lib/constants';

interface ChildAddFormProps {
  passportId: string;
  mode: 'section' | 'timeline';
  onClose: () => void;
  onSuccess: () => void;
}

const TIMELINE_OPTIONS: Record<string, { emoji: string; label: string }> = {
  SUCCESS: { emoji: '\ud83c\udf89', label: 'A Win' },
  MILESTONE: { emoji: '\ud83c\udfc6', label: 'Milestone' },
  LIKE: { emoji: '\ud83d\udc96', label: 'New Like' },
};

const SECTION_OPTIONS: Record<string, { emoji: string; label: string }> = {
  LOVES: { emoji: '\u2764\ufe0f', label: 'Something I Love' },
  STRENGTHS: { emoji: '\u2b50', label: 'Something I\'m Great At' },
};

export function ChildAddForm({ passportId, mode, onClose, onSuccess }: ChildAddFormProps) {
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState(mode === 'section' ? 'LOVES' : 'SUCCESS');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'section') {
        await passportApi.addSection(passportId, selectedType, content, undefined, 'ALL', true);
      } else {
        await timelineApi.create(passportId, {
          entryType: selectedType as any,
          title,
          content,
          entryDate: new Date().toISOString().slice(0, 10),
          childModeContribution: true,
        });
      }
      onSuccess();
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = mode === 'section'
    ? CHILD_VISIBLE_SECTIONS.map((t) => ({ key: t, ...SECTION_OPTIONS[t] }))
    : CHILD_ALLOWED_TIMELINE_TYPES.map((t) => ({ key: t, ...TIMELINE_OPTIONS[t] }));

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-40">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom sm:m-4">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
          <h3 className="text-2xl font-extrabold text-gray-900">
            {mode === 'section' ? 'Add Something About Me' : 'Add to My Timeline'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Type picker */}
          <div className="flex flex-wrap gap-2">
            {typeOptions.map(({ key, emoji, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedType(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-base font-semibold transition-all ${
                  selectedType === key
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-200 scale-[1.02]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-lg">{emoji}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Title for timeline entries */}
          {mode === 'timeline' && (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give it a title..."
              required
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-lg font-medium placeholder:text-gray-300 focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100 transition-all"
            />
          )}

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={mode === 'section' ? 'Type something...' : 'Tell us more (optional)'}
            required={mode === 'section'}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-lg font-medium placeholder:text-gray-300 resize-none focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100 transition-all"
          />

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 px-4 py-3 rounded-2xl font-medium">
            {'\u23f3'} This will be sent to your parent for review.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 text-base font-bold hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!content && mode === 'section') || (!title && mode === 'timeline')}
              className="flex-1 py-3 rounded-2xl bg-violet-600 text-white text-base font-bold shadow-md shadow-violet-200 hover:bg-violet-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none"
            >
              {loading ? 'Sending...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
