// src/components/sharing/ShareLinksTab.tsx
'use client';

import { useState, useEffect, useId } from 'react';
import { shareApi, ShareLink, CreateShareLink, exportApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  MdAdd, MdLink, MdContentCopy, MdDelete, MdDownload,
  MdVisibility, MdLock, MdAccessTime, MdCheck, MdClose
} from 'react-icons/md';
import { AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShareLinksTabProps {
  passportId: string;
  childName: string;
}

export function ShareLinksTab({ passportId, childName }: ShareLinksTabProps) {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadShareLinks();
  }, [passportId]);

  const loadShareLinks = async () => {
    setIsLoading(true);
    try {
      const links = await shareApi.list(passportId);
      setShareLinks(links.filter(l => l.active));
    } catch (err) {
      toast.error('Failed to load share links');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLink = async (options: CreateShareLink) => {
    try {
      const newLink = await shareApi.create(passportId, options);
      setShareLinks(prev => [...prev, newLink]);
      setShowCreateModal(false);
      toast.success('Share link created!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create share link');
      throw err;
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to revoke this share link? Anyone with this link will lose access.')) {
      return;
    }
    try {
      await shareApi.revoke(passportId, linkId);
      setShareLinks(prev => prev.filter(l => l.id !== linkId));
      toast.success('Share link revoked');
    } catch (err) {
      toast.error('Failed to revoke share link');
    }
  };

  const handleCopyLink = async (link: ShareLink) => {
    try {
      await navigator.clipboard.writeText(link.shareUrl);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'html') => {
    try {
      let blob: Blob;
      switch (format) {
        case 'json':
          blob = await exportApi.downloadJson(passportId);
          break;
        case 'csv':
          blob = await exportApi.downloadCsv(passportId);
          break;
        case 'html':
          blob = await exportApi.downloadHtml(passportId);
          break;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${childName.toLowerCase().replace(/\s+/g, '-')}-passport.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isExpired = (link: ShareLink) => {
    if (!link.expiresAt) return false;
    return new Date(link.expiresAt) < new Date();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Sharing</h2>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
          aria-label="Create new share link"
        >
          <MdAdd className="w-5 h-5" aria-hidden="true" />
          Create Link
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Share Links Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Share Links</h3>
          <p className="text-sm text-gray-600 mb-4">
            Create secure links to share this passport with teachers, therapists, and caregivers.
          </p>

          {isLoading ? (
            <p className="text-gray-500 text-sm" role="status">Loading share links...</p>
          ) : shareLinks.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No active share links</p>
          ) : (
            <ul className="space-y-3" aria-label="Active share links">
              {shareLinks.map((link) => (
                <li
                  key={link.id}
                  className={`p-3 rounded-md border ${isExpired(link) ? 'bg-gray-50 border-gray-200' : 'bg-purple-50 border-purple-200'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <MdLink className="w-4 h-4 text-purple-600 flex-shrink-0" aria-hidden="true" />
                        <span className="font-medium text-gray-900 truncate">
                          {link.label || 'Share Link'}
                        </span>
                        {isExpired(link) && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                            Expired
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                        {link.isPasswordProtected && (
                          <span className="flex items-center gap-1">
                            <MdLock className="w-3 h-3" aria-hidden="true" />
                            Password protected
                          </span>
                        )}
                        {link.expiresAt && (
                          <span className="flex items-center gap-1">
                            <MdAccessTime className="w-3 h-3" aria-hidden="true" />
                            Expires {formatDate(link.expiresAt)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MdVisibility className="w-3 h-3" aria-hidden="true" />
                          {link.accessCount} views
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(link)}
                        className="p-2 text-gray-600 hover:text-purple-700 hover:bg-purple-100 rounded-md transition-colors"
                        aria-label={copiedId === link.id ? 'Copied!' : 'Copy link to clipboard'}
                      >
                        {copiedId === link.id ? (
                          <MdCheck className="w-4 h-4 text-green-600" />
                        ) : (
                          <MdContentCopy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevokeLink(link.id)}
                        className="p-2 text-gray-600 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors"
                        aria-label="Revoke share link"
                      >
                        <MdDelete className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Export Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Export Data</h3>
          <p className="text-sm text-gray-600 mb-4">
            Download a copy of this passport for offline use or backup.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleExport('json')}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
            >
              <MdDownload className="w-4 h-4" aria-hidden="true" />
              JSON
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
            >
              <MdDownload className="w-4 h-4" aria-hidden="true" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport('html')}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
            >
              <MdDownload className="w-4 h-4" aria-hidden="true" />
              HTML
            </button>
          </div>
        </div>
      </div>

      {/* Create Share Link Modal */}
      {showCreateModal && (
        <CreateShareLinkModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateLink}
          childName={childName}
        />
      )}
    </div>
  );
}

interface CreateShareLinkModalProps {
  onClose: () => void;
  onCreate: (options: CreateShareLink) => Promise<void>;
  childName: string;
}

function CreateShareLinkModal({ onClose, onCreate, childName }: CreateShareLinkModalProps) {
  const formId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [label, setLabel] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showDocuments, setShowDocuments] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>(['LOVES', 'HATES', 'STRENGTHS', 'NEEDS']);

  const sectionOptions = [
    { value: 'LOVES', label: 'Loves' },
    { value: 'HATES', label: 'Difficulties' },
    { value: 'STRENGTHS', label: 'Strengths' },
    { value: 'NEEDS', label: 'Needs' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onCreate({
        label: label.trim() || undefined,
        visibleSections: selectedSections.length > 0 ? selectedSections : undefined,
        showTimeline,
        showDocuments,
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
        password: password.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create share link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSection = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
    >
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 id={`${formId}-title`} className="text-xl font-bold text-gray-900">
            Create Share Link
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            aria-label="Close modal"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 flex items-start gap-3" role="alert">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Label */}
          <div>
            <label htmlFor={`${formId}-label`} className="block text-sm font-medium text-gray-700 mb-1">
              Label <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              id={`${formId}-label`}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`e.g., "For ${childName}'s teacher"`}
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Help you remember who this link is for</p>
          </div>

          {/* Visible Sections */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              Visible Sections
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {sectionOptions.map((section) => (
                <label
                  key={section.value}
                  className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedSections.includes(section.value)
                      ? 'bg-purple-50 border-purple-300'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(section.value)}
                    onChange={() => toggleSection(section.value)}
                    className="sr-only"
                  />
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedSections.includes(section.value)
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-gray-300'
                    }`}
                    aria-hidden="true"
                  >
                    {selectedSections.includes(section.value) && (
                      <MdCheck className="w-3 h-3 text-white" />
                    )}
                  </span>
                  <span className="text-sm text-gray-700">{section.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Additional Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showTimeline}
                onChange={(e) => setShowTimeline(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Include timeline entries</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showDocuments}
                onChange={(e) => setShowDocuments(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Include documents</span>
            </label>
          </div>

          {/* Expiration */}
          <div>
            <label htmlFor={`${formId}-expires`} className="block text-sm font-medium text-gray-700 mb-1">
              Link Expiration <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <select
              id={`${formId}-expires`}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none"
            >
              <option value="">Never expires</option>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label htmlFor={`${formId}-password`} className="block text-sm font-medium text-gray-700 mb-1">
              Password Protection <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <input
                id={`${formId}-password`}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="new-password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <MdVisibility className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Recipients will need this password to view the passport</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-md hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
            >
              {isSubmitting ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
