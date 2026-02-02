// src/components/HistoryModal.tsx
'use client';

import { Modal } from '@/components/ui/Modal';
import { SectionRevision } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  revisions: SectionRevision[];
  currentContent: string;
  currentRemedialSuggestion?: string;
  onRestore: (revisionId: string) => void;
  isOwner: boolean;
}

const capitalizeFirstWord = (text: string) => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function HistoryModal({ isOpen, onClose, revisions, currentContent, currentRemedialSuggestion, onRestore, isOwner }: HistoryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Revision History">
      <div className="space-y-1">
        {/* Current Version */}
        <div className="py-3 border-t border-purple-200/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-base text-gray-900 leading-relaxed mb-1">{capitalizeFirstWord(currentContent)}</p>
              {currentRemedialSuggestion && (
                <p className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded mt-1">✓ {currentRemedialSuggestion}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] sm:text-xs text-pink-600">
                  {formatDateTime(new Date().toISOString())}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                  Current Version
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Previous Versions */}
        {revisions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No previous versions</p>
          </div>
        ) : (
          <div className="space-y-1">
            {revisions.map((rev) => {
              const isEdit = rev.changeType === 'EDIT';
              return (
                <div
                  key={rev.id}
                  className="py-3 hover:bg-purple-50/30 transition-all duration-200 border-t border-gray-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-gray-900 leading-relaxed mb-1">{capitalizeFirstWord(rev.content)}</p>
                      {rev.remedialSuggestion && (
                        <p className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded mt-1">✓ {rev.remedialSuggestion}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] sm:text-xs text-pink-600">
                          {formatDateTime(rev.timestamp)} · {rev.authorName}
                        </span>
                        {!isEdit && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md ${
                              rev.changeType === 'PUBLISH' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {rev.changeType === 'PUBLISH' ? 'Published' : 'Unpublished'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {isOwner && isEdit && (
                      <button
                        onClick={() => onRestore(rev.id)}
                        className="flex-shrink-0 px-3 py-2 min-h-[44px] text-xs text-purple-600 hover:bg-purple-100 hover:text-purple-700 rounded-md transition-all focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-purple-400 focus-visible:bg-purple-100"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
