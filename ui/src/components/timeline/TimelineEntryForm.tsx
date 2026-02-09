// src/components/timeline/TimelineEntryForm.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MdClose, MdWarning, MdCelebration, MdFlag, MdNotes, MdMedicalServices, MdSchool,
  MdFavorite, MdThumbDown, MdPsychology, MdAssignment, MdMood, MdSensors,
  MdRecordVoiceOver, MdGroups
} from 'react-icons/md';
import { Button } from '@/components/ui/Button';
import { Input, TextArea } from '@/components/ui/Input';
import { VisibilitySelector } from '@/components/ui/VisibilitySelector';
import { TagInput } from '@/components/ui/TagInput';
import { EntryType, VisibilityLevel } from '@/lib/types';
import { ENTRY_TYPE_CONFIG } from '@/lib/constants';
import { timelineApi, CreateTimelineEntry, TimelineEntry, PassportCollaborator } from '@/lib/api';
import toast from 'react-hot-toast';

interface TimelineEntryFormProps {
  passportId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  presetType?: EntryType;
  editEntry?: TimelineEntry;
  suggestedTags?: string[];
}

const entryTypeIcons: Record<EntryType, React.ReactNode> = {
  // Core types
  INCIDENT: <MdWarning className="w-5 h-5" />,
  SUCCESS: <MdCelebration className="w-5 h-5" />,
  MILESTONE: <MdFlag className="w-5 h-5" />,
  NOTE: <MdNotes className="w-5 h-5" />,
  // Preference tracking
  LIKE: <MdFavorite className="w-5 h-5" />,
  DISLIKE: <MdThumbDown className="w-5 h-5" />,
  // Professional categories
  MEDICAL: <MdMedicalServices className="w-5 h-5" />,
  EDUCATIONAL: <MdSchool className="w-5 h-5" />,
  THERAPY: <MdPsychology className="w-5 h-5" />,
  SCHOOL_REPORT: <MdAssignment className="w-5 h-5" />,
  // Behavioral tracking
  BEHAVIOR: <MdMood className="w-5 h-5" />,
  SENSORY: <MdSensors className="w-5 h-5" />,
  COMMUNICATION: <MdRecordVoiceOver className="w-5 h-5" />,
  SOCIAL: <MdGroups className="w-5 h-5" />,
};

export function TimelineEntryForm({
  passportId,
  isOpen,
  onClose,
  onSuccess,
  presetType,
  editEntry,
  suggestedTags = [],
}: TimelineEntryFormProps) {
  const [entryType, setEntryType] = useState<EntryType>(presetType || 'NOTE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [visibility, setVisibility] = useState<VisibilityLevel>('PROFESSIONALS');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<PassportCollaborator[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const isEditing = !!editEntry;

  useEffect(() => {
    if (isOpen) {
      if (editEntry) {
        setEntryType(editEntry.entryType);
        setTitle(editEntry.title);
        setContent(editEntry.content);
        setEntryDate(editEntry.entryDate.split('T')[0]);
        setVisibility(editEntry.visibilityLevel as VisibilityLevel);
        setTags(editEntry.tags);
        setMentionedUserIds(editEntry.mentionedUserIds || []);
      } else {
        setEntryType(presetType || 'NOTE');
        setTitle('');
        setContent('');
        setEntryDate(new Date().toISOString().split('T')[0]);
        setVisibility('PROFESSIONALS');
        setTags([]);
        setMentionedUserIds([]);
      }
      setErrors({});
      timelineApi.getCollaborators(passportId).then(setCollaborators).catch(() => {});
    }
  }, [isOpen, presetType, editEntry]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!entryDate) newErrors.entryDate = 'Date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const entryData: CreateTimelineEntry = {
        entryType,
        title: title.trim(),
        content: content.trim(),
        entryDate,
        visibilityLevel: visibility,
        tags,
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      };

      if (isEditing && editEntry) {
        await timelineApi.update(passportId, editEntry.id, entryData);
        toast.success('Entry updated');
      } else {
        await timelineApi.create(passportId, entryData);
        toast.success('Entry created');
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(isEditing ? 'Failed to update entry' : 'Failed to create entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentConfig = ENTRY_TYPE_CONFIG[entryType];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${currentConfig.bgColor}`}>
          <h2 className={`text-xl font-bold ${currentConfig.textColor}`}>
            {isEditing ? 'Edit Entry' : 'Add Timeline Entry'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-md"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow space-y-4">
          {/* Entry Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entry Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(ENTRY_TYPE_CONFIG) as EntryType[]).map(type => {
                const config = ENTRY_TYPE_CONFIG[type];
                const isSelected = entryType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEntryType(type)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${config.bgColor} ${config.borderColor} ${config.textColor}`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                    title={config.label}
                  >
                    {entryTypeIcons[type]}
                    <span className="text-[10px] font-medium text-center leading-tight truncate w-full">
                      {config.label.split(' / ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <Input
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={`What happened?`}
            error={errors.title}
            required
          />

          {/* Date */}
          <Input
            label="Date"
            type="date"
            value={entryDate}
            onChange={e => setEntryDate(e.target.value)}
            error={errors.entryDate}
            required
          />

          {/* Content with @mention autocomplete */}
          <div className="relative">
            <TextArea
              ref={contentRef}
              label="Details (optional)"
              value={content}
              onChange={e => {
                const val = e.target.value;
                setContent(val);
                const cursor = e.target.selectionStart ?? val.length;
                const match = val.slice(0, cursor).match(/@(\w*)$/);
                if (match) {
                  setMentionQuery(match[1]);
                  setShowMentionDropdown(true);
                } else {
                  setShowMentionDropdown(false);
                  setMentionQuery('');
                }
              }}
              onBlur={() => setTimeout(() => setShowMentionDropdown(false), 150)}
              placeholder="Describe what happened… use @name to mention collaborators"
              rows={4}
              error={errors.content}
            />
            {showMentionDropdown && (() => {
              const filtered = collaborators.filter(
                c => mentionQuery === '' || c.name.toLowerCase().includes(mentionQuery.toLowerCase())
              );
              return (
                <ul
                  role="listbox"
                  aria-label="Mention suggestions"
                  className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto"
                >
                  {filtered.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-400">No matching collaborators</li>
                  ) : filtered.map(c => (
                    <li key={c.id} role="option">
                      <button
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault();
                          const cursor = contentRef.current?.selectionStart ?? content.length;
                          const before = content.slice(0, cursor).replace(/@(\w*)$/, `@${c.name} `);
                          setContent(before + content.slice(cursor));
                          setMentionedUserIds(prev => prev.includes(c.id) ? prev : [...prev, c.id]);
                          setShowMentionDropdown(false);
                          setMentionQuery('');
                          contentRef.current?.focus();
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-500 ml-2 text-xs">{c.role}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>

          {/* Visibility */}
          <VisibilitySelector
            value={visibility}
            onChange={setVisibility}
            hideCustom
          />

          {/* Tags */}
          <TagInput
            value={tags}
            onChange={setTags}
            suggestions={suggestedTags}
            placeholder="Add tags (e.g., school, sensory, social)..."
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Entry' : 'Add Entry'}
          </Button>
        </div>
      </div>
    </div>
  );
}
