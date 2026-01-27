// src/components/HistoryModal.tsx
'use client';

import { Modal } from '@/components/ui/Modal';
import { Revision } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  revisions: Revision[];
  currentContent: string;
  onRestore: (revisionId: string) => void;
  isOwner: boolean;
}

const capitalizeFirstWord = (text: string) => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function HistoryModal({ isOpen, onClose, revisions, currentContent, onRestore, isOwner }: HistoryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Revision History">
      <div className="space-y-1">
        {/* Current Version - styled like other items */}
        <div className="py-3 border-t border-purple-200/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-base text-gray-900 leading-relaxed mb-2">{capitalizeFirstWord(currentContent)}</p>
              <div className="flex items-center gap-2">
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
            {[...revisions].reverse().map((rev) => (
              <div
                key={rev.id}
                className="py-3 hover:bg-purple-50/30 transition-all duration-200 border-t border-gray-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-gray-900 leading-relaxed mb-2">{capitalizeFirstWord(rev.content)}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs text-pink-600">
                        {formatDateTime(rev.timestamp)} · {rev.authorName}
                      </span>
                      {rev.status === 'rejected' && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md bg-red-100 text-red-700">
                            Rejected
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {isOwner && rev.status !== 'rejected' && (
                    <button
                      onClick={() => onRestore(rev.id)}
                      className="flex-shrink-0 px-3 py-2 min-h-[44px] text-xs text-purple-600 hover:bg-purple-100 hover:text-purple-700 rounded-md transition-all focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-purple-400 focus-visible:bg-purple-100"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

