// src/components/timeline/CorrespondenceForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { MdClose, MdMail } from 'react-icons/md';
import { Button } from '@/components/ui/Button';
import { Input, TextArea } from '@/components/ui/Input';
import { VisibilitySelector } from '@/components/ui/VisibilitySelector';
import { TagInput } from '@/components/ui/TagInput';
import { VisibilityLevel } from '@/lib/types';
import { timelineApi, CreateCorrespondence } from '@/lib/api';
import toast from 'react-hot-toast';

interface CorrespondenceFormProps {
  passportId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CorrespondenceForm({
  passportId,
  isOpen,
  onClose,
  onSuccess,
}: CorrespondenceFormProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<VisibilityLevel>('OWNERS_ONLY');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setFrom('');
      setTo('');
      setDate(new Date().toISOString().split('T')[0]);
      setSubject('');
      setBody('');
      setVisibility('OWNERS_ONLY');
      setTags([]);
      setErrors({});
    }
  }, [isOpen]);

  // Smart paste parser - extracts email metadata from pasted content
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');

    // Try to parse email headers
    const fromMatch = pastedText.match(/^From:\s*(.+?)$/im);
    const toMatch = pastedText.match(/^To:\s*(.+?)$/im);
    const subjectMatch = pastedText.match(/^Subject:\s*(.+?)$/im);
    const dateMatch = pastedText.match(/^Date:\s*(.+?)$/im);

    if (fromMatch || toMatch || subjectMatch) {
      e.preventDefault();

      if (fromMatch && !from) {
        // Extract just the email address from "Name <email@example.com>" format
        const emailMatch = fromMatch[1].match(/<(.+?)>/);
        setFrom(emailMatch ? emailMatch[1].trim() : fromMatch[1].trim());
      }
      if (toMatch && !to) {
        // Extract just the email address from "Name <email@example.com>" format
        const emailMatch = toMatch[1].match(/<(.+?)>/);
        setTo(emailMatch ? emailMatch[1].trim() : toMatch[1].trim());
      }
      if (subjectMatch && !subject) {
        setSubject(subjectMatch[1].trim());
      }
      if (dateMatch) {
        try {
          const parsedDate = new Date(dateMatch[1]);
          if (!isNaN(parsedDate.getTime())) {
            setDate(parsedDate.toISOString().split('T')[0]);
          }
        } catch {
          // Ignore date parsing errors
        }
      }

      // Extract body (everything after headers section)
      // Look for the end of headers (double newline or after all header lines)
      const lines = pastedText.split('\n');
      let bodyStartIndex = 0;
      let foundHeaders = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Check if line is a header (starts with known header names followed by colon)
        if (line.match(/^(From|To|Subject|Date|Cc|Bcc|Reply-To):/i)) {
          foundHeaders = true;
        } else if (foundHeaders && line === '') {
          // Empty line after headers marks start of body
          bodyStartIndex = i + 1;
          break;
        } else if (foundHeaders && !line.match(/^(From|To|Subject|Date|Cc|Bcc|Reply-To):/i) && line !== '') {
          // Non-header, non-empty line after headers = start of body
          bodyStartIndex = i;
          break;
        }
      }

      if (bodyStartIndex > 0 && bodyStartIndex < lines.length) {
        setBody(lines.slice(bodyStartIndex).join('\n').trim());
      } else {
        // Fallback to original double-newline method
        const bodyStart = pastedText.search(/\n\n/);
        if (bodyStart !== -1) {
          setBody(pastedText.slice(bodyStart + 2).trim());
        }
      }

      toast.success('Email headers extracted!');
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!from.trim()) {
      newErrors.from = 'From email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) {
      newErrors.from = 'Invalid email address';
    }

    if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      newErrors.to = 'Invalid email address';
    }

    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (!subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    const correspondence: CreateCorrespondence = {
      from: from.trim(),
      to: to.trim() || undefined,
      date,
      subject: subject.trim(),
      body: body.trim() || undefined,
      visibilityLevel: visibility,
      tags: tags.length > 0 ? tags : undefined,
    };

    try {
      await timelineApi.createCorrespondence(passportId, correspondence);
      toast.success('Email added');
      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add correspondence';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <MdMail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Add Email</h2>
              <p className="text-sm text-gray-500">Record email correspondence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* From Email */}
          <Input
            id="from"
            label="From Email"
            type="email"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="sender@example.com"
            error={errors.from}
            required
            autoComplete="off"
          />

          {/* To Email */}
          <Input
            id="to"
            label="To Email"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com (optional)"
            error={errors.to}
            autoComplete="off"
          />

          {/* Date */}
          <Input
            id="date"
            label="Date Received"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
            required
          />

          {/* Subject */}
          <Input
            id="subject"
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject line"
            error={errors.subject}
            required
          />

          {/* Body */}
          <TextArea
            id="body"
            label="Email Body"
            hint="Paste full email here to auto-fill From, To, Subject, and Date fields"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onPaste={handlePaste}
            placeholder="Paste complete email with headers here, or just type the body..."
            rows={8}
            autoComplete="off"
          />

          {/* Visibility */}
          <VisibilitySelector
            value={visibility}
            onChange={setVisibility}
          />

          {/* Tags */}
          <TagInput
            value={tags}
            onChange={setTags}
            suggestions={['school', 'medical', 'therapy', 'iep', 'referral']}
            placeholder="Add tags..."
          />

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Adding...' : 'Add Email'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
