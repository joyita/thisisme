// src/components/permissions/CustomRoleModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import { Button } from '@/components/ui/Button';
import { Input, TextArea } from '@/components/ui/Input';
import { CustomRole, customRolesApi } from '@/lib/api';
import { PERMISSION_CATEGORIES } from '@/lib/constants';
import toast from 'react-hot-toast';

interface CustomRoleModalProps {
  passportId: string;
  isOpen: boolean;
  editing: CustomRole | null;
  onClose: () => void;
  onSuccess: () => void;
}

// All 20 permission flag keys in the order matching PERMISSION_CATEGORIES
const ALL_PERMISSION_KEYS = [
  'canViewPassport', 'canEditPassport', 'canDeletePassport', 'canManagePermissions', 'canCreateShareLinks',
  'canViewSections', 'canEditSections', 'canDeleteSections', 'canPublishSections', 'canReorderSections',
  'canViewTimeline', 'canAddTimelineEntries', 'canEditTimelineEntries', 'canDeleteTimelineEntries',
  'canCommentOnTimeline', 'canReactOnTimeline',
  'canViewDocuments', 'canUploadDocuments', 'canDownloadDocuments', 'canDeleteDocuments',
] as const;

type PermFlags = Record<typeof ALL_PERMISSION_KEYS[number], boolean>;

function defaultFlags(): PermFlags {
  const flags = {} as PermFlags;
  ALL_PERMISSION_KEYS.forEach(k => { flags[k] = false; });
  flags.canViewPassport = true;
  flags.canViewSections = true;
  flags.canViewTimeline = true;
  return flags;
}

export function CustomRoleModal({
  passportId,
  isOpen,
  editing,
  onClose,
  onSuccess,
}: CustomRoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [flags, setFlags] = useState<PermFlags>(defaultFlags());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? '');
      const f = {} as PermFlags;
      ALL_PERMISSION_KEYS.forEach(k => { f[k] = editing[k]; });
      setFlags(f);
    } else {
      setName('');
      setDescription('');
      setFlags(defaultFlags());
    }
    setErrors({});
  }, [isOpen, editing]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload = { name: name.trim(), description: description.trim() || undefined, ...flags };
      if (editing) {
        await customRolesApi.update(passportId, editing.id, payload);
        toast.success('Custom role updated');
      } else {
        await customRolesApi.create(passportId, payload);
        toast.success('Custom role created');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already exists')) {
        toast.error('A custom role with this name already exists');
      } else {
        toast.error(editing ? 'Failed to update custom role' : 'Failed to create custom role');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {editing ? 'Edit Custom Role' : 'New Custom Role'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow space-y-5">
          <Input
            label="Role Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Speech Therapist"
            error={errors.name}
            required
          />

          <TextArea
            label="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what this role can do..."
            rows={2}
          />

          {/* Permission matrix */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
            {PERMISSION_CATEGORIES.map(category => (
              <div key={category.label} className="mb-3 last:mb-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{category.label}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {category.permissions.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flags[key]}
                        onChange={() => setFlags(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className={flags[key] ? 'text-gray-800' : 'text-gray-400'}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving...' : (editing ? 'Save Changes' : 'Create Role')}
          </Button>
        </div>
      </div>
    </div>
  );
}
