// src/components/passport/PassportHistoryModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { passportApi } from '@/lib/api';
import { PassportRevision } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { MdHistory } from 'react-icons/md';
import toast from 'react-hot-toast';

interface PassportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  passportId: string;
  childName: string;
}

export function PassportHistoryModal({ isOpen, onClose, passportId, childName }: PassportHistoryModalProps) {
  const [revisions, setRevisions] = useState<PassportRevision[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && passportId) {
      loadHistory();
    }
  }, [isOpen, passportId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await passportApi.getPassportHistory(passportId);
      setRevisions(data);
    } catch (err) {
      toast.error('Failed to load passport history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${childName}'s Passport History`}>
      <div className="space-y-1">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">Loading history...</p>
          </div>
        ) : revisions.length === 0 ? (
          <div className="text-center py-8">
            <MdHistory className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No history yet</p>
            <p className="text-xs text-gray-400 mt-1">Changes to the passport will appear here</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {revisions.map((rev) => (
              <div
                key={rev.id}
                className="py-3 hover:bg-purple-50/30 transition-all duration-200 border-t border-gray-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-medium">
                    {rev.revisionNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-gray-900 leading-relaxed mb-1">
                      {rev.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] sm:text-xs text-pink-600">
                        {formatDateTime(rev.createdAt)}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        {rev.createdByName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
