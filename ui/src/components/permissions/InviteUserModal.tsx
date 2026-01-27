// src/components/permissions/InviteUserModal.tsx
'use client';

import { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { Button } from '@/components/ui/Button';
import { Input, TextArea } from '@/components/ui/Input';
import { AddPermissionRequest, permissionsApi } from '@/lib/api';
import { ROLE_CONFIG } from '@/lib/constants';
import { Role } from '@/lib/types';
import toast from 'react-hot-toast';

interface InviteUserModalProps {
  passportId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteUserModal({
  passportId,
  isOpen,
  onClose,
  onSuccess,
}: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('PROFESSIONAL');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const request: AddPermissionRequest = {
        email: email.trim().toLowerCase(),
        role,
        notes: notes.trim() || undefined,
      };
      await permissionsApi.add(passportId, request);
      toast.success(`Invitation sent to ${email}`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      if (err.message?.includes('already has access')) {
        toast.error('This user already has access to this passport');
      } else {
        toast.error('Failed to send invitation');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('PROFESSIONAL');
    setNotes('');
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Invite User</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow space-y-5">
          {/* Email */}
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="teacher@school.edu"
            error={errors.email}
            required
          />

          {/* Role Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {(['CO_PARENT', 'PROFESSIONAL', 'VIEWER'] as Role[]).map(r => {
                const config = ROLE_CONFIG[r];
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`font-medium text-sm ${isSelected ? 'text-purple-700' : 'text-gray-900'}`}>
                      {config.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <TextArea
            label="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g., Year 3 teacher, Speech therapist..."
            rows={2}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </div>
    </div>
  );
}
