// src/app/passport/[id]/page.tsx
'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useChildMode } from '@/context/ChildModeContext';
import { usePassport } from '@/context/PassportContext';
import { timelineApi, passportApi, TimelineEntry } from '@/lib/api';
import { EntryType, SectionRevision, PassportRevision } from '@/lib/types';
import { SECTIONS, ENTRY_TYPE_CONFIG } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PassportView } from '@/components/PassportView';
import { HistoryModal } from '@/components/HistoryModal';
import { SectionEditor } from '@/components/passport/SectionEditor';
import { PassportHistoryModal } from '@/components/passport/PassportHistoryModal';
import { TimelineEntryForm } from '@/components/timeline/TimelineEntryForm';
import { CorrespondenceForm } from '@/components/timeline/CorrespondenceForm';
import { QuickLogButtons } from '@/components/timeline/QuickLogButtons';
import { TimelineCalendar } from '@/components/timeline/TimelineCalendar';
import { TimelineFilters } from '@/components/timeline/TimelineFilters';
import { TimelineAnalytics } from '@/components/timeline/TimelineAnalytics';
import { EntryCollaboration } from '@/components/timeline/EntryCollaboration';
import { PermissionsTab } from '@/components/permissions/PermissionsTab';
import { ShareLinksTab } from '@/components/sharing/ShareLinksTab';
import { DocumentsTab } from '@/components/documents/DocumentsTab';
import { ChildViewPassport } from '@/components/child/ChildViewPassport';
import { PendingReviewsPanel } from '@/components/child/PendingReviewsPanel';
import { ChildAccountSetup } from '@/components/child/ChildAccountSetup';
import {
  MdFace, MdArrowBack, MdLogout, MdPerson, MdAdd, MdEdit, MdDelete,
  MdFavorite, MdWarning, MdStar, MdHandshake, MdTimeline, MdShare,
  MdDescription, MdSecurity, MdCalendarMonth, MdViewList,
  MdBarChart, MdMoreVert, MdPublish, MdUnpublished, MdHistory,
  MdArrowUpward, MdArrowDownward, MdExpandMore, MdExpandLess, MdPrint,
  MdSearch, MdBookmark, MdBookmarkBorder,
  MdCelebration, MdFlag, MdNotes, MdMedicalServices, MdSchool,
  MdThumbDown, MdPsychology, MdAssignment, MdMood, MdSensors,
  MdRecordVoiceOver, MdGroups, MdMail, MdAttachFile
} from 'react-icons/md';
import toast from 'react-hot-toast';

type SectionType = 'LOVES' | 'HATES' | 'STRENGTHS' | 'NEEDS';

const SECTION_TYPES: SectionType[] = ['LOVES', 'HATES', 'STRENGTHS', 'NEEDS'];

const sectionConfig: Record<SectionType, { title: string; icon: React.ReactNode; bg: string; accent: string }> = {
  LOVES: { title: 'Loves', icon: <MdFavorite className="w-4 h-4" />, bg: 'bg-pink-50', accent: 'text-pink-700' },
  HATES: { title: 'Difficulties', icon: <MdWarning className="w-4 h-4" />, bg: 'bg-amber-50', accent: 'text-amber-700' },
  STRENGTHS: { title: 'Strengths', icon: <MdStar className="w-4 h-4" />, bg: 'bg-green-50', accent: 'text-green-700' },
  NEEDS: { title: 'Needs', icon: <MdHandshake className="w-4 h-4" />, bg: 'bg-blue-50', accent: 'text-blue-700' },
};

const timelineEntryIcons: Record<string, React.ReactNode> = {
  INCIDENT: <MdWarning className="w-4 h-4" />,
  SUCCESS: <MdCelebration className="w-4 h-4" />,
  MILESTONE: <MdFlag className="w-4 h-4" />,
  NOTE: <MdNotes className="w-4 h-4" />,
  LIKE: <MdFavorite className="w-4 h-4" />,
  DISLIKE: <MdThumbDown className="w-4 h-4" />,
  MEDICAL: <MdMedicalServices className="w-4 h-4" />,
  EDUCATIONAL: <MdSchool className="w-4 h-4" />,
  THERAPY: <MdPsychology className="w-4 h-4" />,
  SCHOOL_REPORT: <MdAssignment className="w-4 h-4" />,
  CORRESPONDENCE: <MdMail className="w-4 h-4" />,
  BEHAVIOR: <MdMood className="w-4 h-4" />,
  SENSORY: <MdSensors className="w-4 h-4" />,
  COMMUNICATION: <MdRecordVoiceOver className="w-4 h-4" />,
  SOCIAL: <MdGroups className="w-4 h-4" />,
};

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
    ) : part
  );
}

export default function PassportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout, isChildAccount } = useAuth();
  const { isChildMode, enterChildMode } = useChildMode();
  const {
    currentPassport, loadPassport, isLoading, error,
    addSection, updateSection, deleteSection,
    togglePublish, getSectionHistory, restoreRevision, reorderSections
  } = usePassport();

  const [activeTab, setActiveTab] = useState<'passport' | 'timeline' | 'documents' | 'sharing'>('passport');
  const [passportSubView, setPassportSubView] = useState<'edit' | 'preview' | 'history'>('edit');
  const [activeSectionType, setActiveSectionType] = useState<SectionType>('LOVES');

  // Timeline state
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineView, setTimelineView] = useState<'list' | 'calendar' | 'analytics'>('list');
  const [selectedTypes, setSelectedTypes] = useState<EntryType[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showCorrespondenceForm, setShowCorrespondenceForm] = useState(false);
  const [entryFormPreset, setEntryFormPreset] = useState<EntryType | undefined>();
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [expandedAttachments, setExpandedAttachments] = useState<Set<string>>(new Set());
  const [entryAttachments, setEntryAttachments] = useState<Record<string, any[]>>({});
  const [flagPopoverEntryId, setFlagPopoverEntryId] = useState<string | null>(null);
  const [flagDueDate, setFlagDueDate] = useState('');

  // About tab state
  const [editingSection, setEditingSection] = useState<{ id: string; content: string; remedialSuggestion: string } | null>(null);
  const [openDrawer, setOpenDrawer] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<{ sectionId: string; content: string; remedialSuggestion: string } | null>(null);
  const [historyRevisions, setHistoryRevisions] = useState<SectionRevision[]>([]);
  const [newItemContent, setNewItemContent] = useState('');
  const [newItemRemedial, setNewItemRemedial] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ type: 'section' | 'entry'; id: string } | null>(null);

  // History tab state
  const [passportHistory, setPassportHistory] = useState<PassportRevision[]>([]);
  const [passportHistoryLoading, setPassportHistoryLoading] = useState(false);
  const [expandedRevision, setExpandedRevision] = useState<string | null>(null);

  const isOwner = currentPassport?.createdById === user?.id;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (isAuthenticated && resolvedParams.id) {
      loadPassport(resolvedParams.id).catch(() => {
        toast.error('Failed to load passport');
        router.push('/dashboard');
      });
    }
  }, [authLoading, isAuthenticated, resolvedParams.id, router]);

  // Debounce search input → searchQuery (300 ms)
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadTimeline = useCallback(async () => {
    if (!currentPassport) return;
    setTimelineLoading(true);
    try {
      const response = await timelineApi.list(currentPassport.id, {
        search: searchQuery || undefined,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        startDate: dateRange?.start,
        endDate: dateRange?.end,
        flaggedOnly: flaggedOnly || undefined,
      });
      setTimeline(response.entries);
    } catch {
      toast.error('Failed to load timeline');
    } finally {
      setTimelineLoading(false);
    }
  }, [currentPassport, searchQuery, selectedTypes, dateRange, flaggedOnly]);

  useEffect(() => {
    if (activeTab === 'timeline') {
      loadTimeline();
    }
  }, [activeTab, loadTimeline]);

  useEffect(() => {
    if (activeTab === 'passport' && passportSubView === 'history' && currentPassport) {
      loadPassportHistory();
    }
  }, [activeTab, passportSubView, currentPassport]);

  const loadPassportHistory = async () => {
    if (!currentPassport) return;
    setPassportHistoryLoading(true);
    try {
      const history = await passportApi.getPassportHistory(currentPassport.id);
      setPassportHistory(history);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setPassportHistoryLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // --- About tab handlers ---
  const getSectionsByType = (type: SectionType) => currentPassport?.sections?.[type] || [];

  const handleAddItem = async () => {
    if (!currentPassport || !newItemContent.trim()) return;
    try {
      const requiresRemedial = SECTIONS[activeSectionType].requiresRemedial;
      await addSection(
        currentPassport.id,
        activeSectionType,
        newItemContent.trim(),
        requiresRemedial && newItemRemedial.trim() ? newItemRemedial.trim() : undefined
      );
      setNewItemContent('');
      setNewItemRemedial('');
      toast.success('Item added');
    } catch (err) {
      toast.error('Failed to add item');
    }
  };

  const handleUpdateSection = async () => {
    if (!currentPassport || !editingSection) return;
    try {
      const section = getSectionsByType(activeSectionType).find(s => s.id === editingSection.id);
      const updates: { content?: string; remedialSuggestion?: string } = {};
      if (editingSection.content !== section?.content) updates.content = editingSection.content;
      if (editingSection.remedialSuggestion !== (section?.remedialSuggestion || '')) updates.remedialSuggestion = editingSection.remedialSuggestion;
      if (Object.keys(updates).length > 0) {
        await updateSection(currentPassport.id, editingSection.id, updates);
      }
      setEditingSection(null);
      toast.success('Item updated');
    } catch (err) {
      toast.error('Failed to update item');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!currentPassport) return;
    setPendingDelete({ type: 'section', id: sectionId });
  };

  const confirmDeleteSection = async () => {
    if (!currentPassport || !pendingDelete) return;
    try {
      await deleteSection(currentPassport.id, pendingDelete.id);
      setOpenDrawer(null);
      toast.success('Item deleted');
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const handleTogglePublish = async (sectionId: string, currentlyPublished: boolean) => {
    if (!currentPassport) return;
    try {
      await togglePublish(currentPassport.id, sectionId, !currentlyPublished);
      setOpenDrawer(null);
      toast.success(currentlyPublished ? 'Item unpublished' : 'Item published');
    } catch (err) {
      toast.error('Failed to toggle publish');
    }
  };

  const handleOpenHistory = async (sectionId: string, content: string, remedialSuggestion: string) => {
    if (!currentPassport) return;
    try {
      const revisions = await getSectionHistory(currentPassport.id, sectionId);
      setHistoryRevisions(revisions);
      setHistoryModal({ sectionId, content, remedialSuggestion });
      setOpenDrawer(null);
    } catch (err) {
      toast.error('Failed to load history');
    }
  };

  const handleRestoreRevision = async (revisionId: string) => {
    if (!currentPassport || !historyModal) return;
    try {
      await restoreRevision(currentPassport.id, historyModal.sectionId, revisionId);
      const revisions = await getSectionHistory(currentPassport.id, historyModal.sectionId);
      setHistoryRevisions(revisions);
      toast.success('Revision restored');
    } catch (err) {
      toast.error('Failed to restore revision');
    }
  };

  const handleReorder = async (sectionId: string, direction: 'up' | 'down') => {
    if (!currentPassport) return;
    const sections = getSectionsByType(activeSectionType);
    const index = sections.findIndex(s => s.id === sectionId);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sections.length) return;
    const items = sections.map((s, i) => {
      if (i === index) return { sectionId: s.id, displayOrder: sections[swapIndex].displayOrder };
      if (i === swapIndex) return { sectionId: s.id, displayOrder: sections[index].displayOrder };
      return { sectionId: s.id, displayOrder: s.displayOrder };
    });
    try {
      await reorderSections(currentPassport.id, items);
      setOpenDrawer(null);
    } catch (err) {
      toast.error('Failed to reorder');
    }
  };

  // --- Timeline handlers ---
  const openEntryForm = (preset?: EntryType) => {
    setEntryFormPreset(preset);
    setEditingEntry(undefined);
    setShowEntryForm(true);
  };

  const openEditForm = (entry: TimelineEntry) => {
    setEditingEntry(entry);
    setEntryFormPreset(undefined);
    setShowEntryForm(true);
  };

  const closeEntryForm = () => {
    setShowEntryForm(false);
    setEntryFormPreset(undefined);
    setEditingEntry(undefined);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!currentPassport) return;
    setPendingDelete({ type: 'entry', id: entryId });
  };

  const confirmDeleteEntry = async () => {
    if (!currentPassport || !pendingDelete) return;
    try {
      await timelineApi.delete(currentPassport.id, pendingDelete.id);
      toast.success('Entry deleted');
      loadTimeline();
    } catch (err) {
      toast.error('Failed to delete entry');
    }
  };

  const handleToggleAttachments = async (entryId: string) => {
    if (!currentPassport) return;
    const isExpanded = expandedAttachments.has(entryId);

    if (isExpanded) {
      // Collapse
      setExpandedAttachments(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    } else {
      // Expand and load attachments if not already loaded
      setExpandedAttachments(prev => new Set(prev).add(entryId));

      if (!entryAttachments[entryId]) {
        try {
          const docs = await import('@/lib/api').then(m => m.documentApi.getForTimelineEntry(currentPassport.id, entryId));
          setEntryAttachments(prev => ({ ...prev, [entryId]: docs }));
        } catch {
          toast.error('Failed to load attachments');
        }
      }
    }
  };

  const handleDownloadAttachment = async (doc: any) => {
    if (!currentPassport) return;
    try {
      const { downloadUrl } = await import('@/lib/api').then(m => m.documentApi.getDownloadUrl(currentPassport.id, doc.id));

      // If it's a relative API URL (local storage), download via authenticated fetch
      if (downloadUrl.startsWith('/api/')) {
        const blob = await import('@/lib/api').then(m => m.documentApi.downloadFile(currentPassport.id, doc.id));
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.originalFileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // S3 pre-signed URL, open directly
        window.open(downloadUrl, '_blank');
      }
    } catch {
      toast.error('Failed to download attachment');
    }
  };

  const handleToggleFlag = async (entry: TimelineEntry) => {
    if (!currentPassport) return;
    if (entry.flaggedForFollowup) {
      // Unflag directly
      try {
        await timelineApi.flag(currentPassport.id, entry.id, false);
        loadTimeline();
      } catch {
        toast.error('Failed to remove flag');
      }
    } else {
      // Open popover to optionally set due date
      setFlagPopoverEntryId(entry.id);
      setFlagDueDate('');
    }
  };

  const handleConfirmFlag = async (entryId: string) => {
    if (!currentPassport) return;
    try {
      await timelineApi.flag(currentPassport.id, entryId, true, flagDueDate || undefined);
      setFlagPopoverEntryId(null);
      setFlagDueDate('');
      loadTimeline();
    } catch {
      toast.error('Failed to flag entry');
    }
  };

  // --- Render guards ---
  if (authLoading || !isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (isLoading || !currentPassport) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading passport...</p>
      </main>
    );
  }

  const publishStatsColor = (published: number, max: number) => {
    if (published >= max) return 'bg-green-100 text-green-800 border-green-200';
    if (published >= max * 0.5) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  // If child mode or child account, render child view
  if ((isChildMode || isChildAccount) && currentPassport) {
    return <ChildViewPassport passport={currentPassport} />;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              <MdArrowBack className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {currentPassport.childFirstName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="font-bold text-gray-900">{currentPassport.childFirstName}&apos;s Passport</h1>
                {currentPassport.childDateOfBirth && (
                  <p className="text-sm text-gray-500">
                    Born {new Date(currentPassport.childDateOfBirth).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isOwner && (
              <button
                onClick={enterChildMode}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors border border-purple-200"
              >
                <MdFace className="w-4 h-4" />
                Child View
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <MdPerson className="w-5 h-5" />
              <span>{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <MdLogout className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 sm:gap-6 -mb-px overflow-x-auto">
            {[
              { id: 'passport', label: 'Passport', icon: <MdFace /> },
              { id: 'timeline', label: 'Timeline', icon: <MdTimeline /> },
              { id: 'documents', label: 'Documents', icon: <MdDescription /> },
              { id: 'sharing', label: 'Sharing', icon: <MdShare /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-shrink-0 flex items-center gap-1 sm:gap-2 px-2 sm:px-1 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Pending Reviews Banner */}
        {isOwner && <PendingReviewsPanel passportId={currentPassport.id} />}

        {/* --- Passport Tab --- */}
        {activeTab === 'passport' && (
          <div>
            {/* Sub-navigation */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setPassportSubView('edit')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    passportSubView === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MdEdit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setPassportSubView('preview')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    passportSubView === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MdPrint className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => setPassportSubView('history')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    passportSubView === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MdHistory className="w-4 h-4" />
                  History
                </button>
              </div>
            </div>

            {/* Edit sub-view */}
            {passportSubView === 'edit' && (
              <SectionEditor
                passportId={resolvedParams.id}
                childName={currentPassport.childFirstName}
              />
            )}

            {/* Preview sub-view */}
            {passportSubView === 'preview' && (
              <div className="text-center py-12">
                <MdPrint className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Print-Ready Preview</h2>
                <p className="text-gray-600 mb-6">View and print a clean, professional version of this passport</p>
                <Link
                  href={`/passport/${resolvedParams.id}/preview`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <MdPrint className="w-5 h-5" />
                  Open Preview Page
                </Link>
              </div>
            )}

            {/* History sub-view */}
            {passportSubView === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Passport History</h2>
              <span className="text-sm text-gray-500">{passportHistory.length} revision{passportHistory.length !== 1 ? 's' : ''}</span>
            </div>

            {passportHistoryLoading ? (
              <p className="text-gray-500">Loading history...</p>
            ) : passportHistory.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <MdHistory className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No history yet</h3>
                <p className="text-gray-600">Revisions will appear here as changes are made to the passport.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {passportHistory
                  .slice()
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((revision) => {
                    const grouped: Record<string, typeof revision.sectionsSnapshot> = {};
                    SECTION_TYPES.forEach(t => { grouped[t] = []; });
                    revision.sectionsSnapshot.forEach(item => {
                      const key = item.type.toUpperCase();
                      if (grouped[key]) grouped[key].push(item);
                    });
                    const isExpanded = expandedRevision === revision.id;

                    return (
                      <div key={revision.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                          onClick={() => setExpandedRevision(isExpanded ? null : revision.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full flex-shrink-0">
                              #{revision.revisionNumber}
                            </span>
                            <span className="text-sm font-medium text-gray-800 truncate">
                              {revision.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                            <span className="text-xs text-gray-500 hidden sm:inline">{revision.createdByName}</span>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {new Date(revision.createdAt).toLocaleDateString()}
                            </span>
                            {isExpanded ? <MdExpandLess className="w-4 h-4 text-gray-400" /> : <MdExpandMore className="w-4 h-4 text-gray-400" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                            {SECTION_TYPES.map(type => {
                              const items = grouped[type];
                              const config = sectionConfig[type];
                              return (
                                <div key={type} className={items.length === 0 ? 'opacity-40' : ''}>
                                  <p className={`text-xs font-semibold mb-1 ${config.accent}`}>
                                    {config.title} ({items.length})
                                  </p>
                                  {items.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No items</p>
                                  ) : (
                                    items.map((item, i) => (
                                      <div key={i} className="flex items-start gap-2 py-0.5">
                                        <span className="text-gray-300 text-xs mt-0.5">•</span>
                                        <div className="flex-1">
                                          <span className="text-sm text-gray-700">{item.content}</span>
                                          {item.published && <span className="ml-2 text-xs text-green-600 font-medium">Published</span>}
                                          {item.remedialSuggestion && (
                                            <p className="text-xs text-green-600 mt-0.5">✓ {item.remedialSuggestion}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
            )}
          </div>
        )}

        {/* --- Timeline Tab --- */}
        {activeTab === 'timeline' && (
          <div>
            {/* Header with actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900">Timeline</h2>
              <div className="flex items-center gap-3">
                <QuickLogButtons
                  variant="inline"
                  onLogIncident={() => openEntryForm('INCIDENT')}
                  onLogWin={() => openEntryForm('SUCCESS')}
                />
                <Button onClick={() => openEntryForm()} className="flex items-center gap-2">
                  <MdAdd className="w-5 h-5" />
                  Add Entry
                </Button>
                <Button onClick={() => setShowCorrespondenceForm(true)} variant="outline" className="flex items-center gap-2">
                  <MdMail className="w-5 h-5" />
                  Add Email
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search entries…"
                className="w-full sm:w-80 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                aria-label="Search timeline entries"
              />
            </div>

            {/* View toggle and filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              {/* View toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setTimelineView('list')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timelineView === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MdViewList className="w-4 h-4" />
                  List
                </button>
                <button
                  onClick={() => setTimelineView('calendar')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timelineView === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MdCalendarMonth className="w-4 h-4" />
                  Calendar
                </button>
                <button
                  onClick={() => setTimelineView('analytics')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timelineView === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MdBarChart className="w-4 h-4" />
                  Insights
                </button>
              </div>

              {/* Filters + flagged toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setFlaggedOnly(!flaggedOnly)}
                  aria-pressed={flaggedOnly}
                  className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg border-2 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 ${
                    flaggedOnly
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <MdBookmark className="w-5 h-5" aria-hidden="true" />
                  Flagged
                </button>
                <TimelineFilters
                  selectedTypes={selectedTypes}
                  onTypesChange={setSelectedTypes}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  onClear={() => {
                    setSelectedTypes([]);
                    setDateRange(null);
                    setSearchInput('');
                    setSearchQuery('');
                    setFlaggedOnly(false);
                  }}
                />
              </div>
            </div>

            {timelineLoading ? (
              <p className="text-gray-500">Loading timeline...</p>
            ) : timeline.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <MdTimeline className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No timeline entries yet</h3>
                <p className="text-gray-600 mb-4">Start recording milestones, incidents, and observations.</p>
                <div className="flex justify-center gap-3">
                  <QuickLogButtons
                    variant="inline"
                    onLogIncident={() => openEntryForm('INCIDENT')}
                    onLogWin={() => openEntryForm('SUCCESS')}
                  />
                </div>
              </div>
            ) : (
              <>
                {(() => {
                  if (timelineView === 'calendar') {
                    return (
                      <TimelineCalendar
                        entries={timeline}
                        onEntryClick={openEditForm}
                        onDateClick={() => openEntryForm()}
                      />
                    );
                  }

                  if (timelineView === 'analytics') {
                    return <TimelineAnalytics entries={timeline} />;
                  }

                  // Vertical list view
                  const CONTENT_LIMIT = 200;
                  return (
                    <div className="bg-white rounded-xl px-4 py-2 sm:px-6">
                    <ul className="space-y-0" aria-label="Timeline entries">
                      {timeline.length === 0 ? (
                        <li className="text-center py-8 text-gray-500">
                          No entries match your filters
                        </li>
                      ) : (
                        timeline.map((entry, idx) => {
                          const entryConfig = ENTRY_TYPE_CONFIG[entry.entryType];
                          const isExpanded = expandedEntries.has(entry.id);
                          const isLong = entry.content.length > CONTENT_LIMIT;
                          const displayContent = isLong && !isExpanded
                            ? entry.content.slice(0, CONTENT_LIMIT) + '…'
                            : entry.content;
                          return (
                            <li key={entry.id} className="flex gap-3 group -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors">
                              {/* Icon + connecting line */}
                              <div className="flex flex-col items-center flex-shrink-0">
                                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${entryConfig?.bgColor || 'bg-gray-100'} ${entryConfig?.textColor || 'text-gray-700'} ring-4 ring-white shadow-sm`}>
                                  {timelineEntryIcons[entry.entryType]}
                                </span>
                                {idx < timeline.length - 1 && (
                                  <span className="w-0.5 flex-1 bg-gray-200 my-1" aria-hidden="true" />
                                )}
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0 pt-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                      <h4 className="font-semibold text-gray-900">
                                        {entry.entryType === 'CORRESPONDENCE' && entry.metadata ? (
                                          <>
                                            {String(entry.metadata.from || 'Unknown')} mails {String(entry.metadata.to || currentPassport?.childFirstName || 'recipient')}: {String(entry.metadata.subject)}
                                          </>
                                        ) : (
                                          highlightText(entry.title, searchQuery)
                                        )}
                                      </h4>
                                      <time className="text-xs text-gray-400 whitespace-nowrap" dateTime={entry.entryDate}>
                                        {new Date(entry.entryDate).toLocaleDateString()}
                                      </time>
                                      {entry.flaggedForFollowup && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                                          <MdBookmark className="w-3 h-3" aria-hidden="true" />
                                          {entry.followupDueDate
                                            ? `Follow up ${new Date(entry.followupDueDate).toLocaleDateString()}`
                                            : 'Follow up'}
                                        </span>
                                      )}
                                    </div>
                                    {entry.entryType === 'CORRESPONDENCE' && entry.metadata && (
                                      <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                                        <div><strong>From:</strong> {String(entry.metadata.from)}</div>
                                        {entry.metadata.to ? <div><strong>To:</strong> {String(entry.metadata.to)}</div> : null}
                                        <div><strong>Source:</strong> {entry.metadata.source === 'WEBHOOK' ? 'Email' : 'Manual Entry'}</div>
                                      </div>
                                    )}
                                    {entry.content && (
                                      <p className="mt-1 text-sm text-gray-500 font-normal leading-relaxed">
                                        {highlightText(displayContent, searchQuery)}
                                      </p>
                                    )}
                                    {isLong && (
                                      <button
                                        onClick={() => setExpandedEntries(prev => {
                                          const next = new Set(prev);
                                          isExpanded ? next.delete(entry.id) : next.add(entry.id);
                                          return next;
                                        })}
                                        className="mt-1 text-xs text-purple-700 hover:text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-600 rounded"
                                      >
                                        {isExpanded ? 'Show less' : 'Show more'}
                                      </button>
                                    )}
                                    {entry.attachmentCount > 0 && (
                                      <div className="mt-2">
                                        <button
                                          onClick={() => handleToggleAttachments(entry.id)}
                                          className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-600 rounded"
                                        >
                                          <MdAttachFile className="w-4 h-4" />
                                          <span>{entry.attachmentCount} attachment{entry.attachmentCount !== 1 ? 's' : ''}</span>
                                          {expandedAttachments.has(entry.id) ? <MdExpandLess className="w-4 h-4" /> : <MdExpandMore className="w-4 h-4" />}
                                        </button>
                                        {expandedAttachments.has(entry.id) && (
                                          <div className="mt-2 space-y-1 pl-5">
                                            {entryAttachments[entry.id] ? (
                                              entryAttachments[entry.id].map((doc: any) => (
                                                <button
                                                  key={doc.id}
                                                  onClick={() => handleDownloadAttachment(doc)}
                                                  className="flex items-center gap-2 text-xs text-gray-700 hover:text-purple-700 hover:bg-purple-50 px-2 py-1 rounded transition-colors w-full text-left"
                                                >
                                                  <MdDescription className="w-4 h-4 flex-shrink-0" />
                                                  <span className="truncate">{doc.originalFileName}</span>
                                                  <span className="text-gray-400 ml-auto flex-shrink-0">
                                                    {(doc.fileSize / 1024).toFixed(1)} KB
                                                  </span>
                                                </button>
                                              ))
                                            ) : (
                                              <div className="text-xs text-gray-500 px-2 py-1">Loading...</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end flex-shrink-0">
                                  <div className={`flex gap-0.5 transition-opacity ${flagPopoverEntryId === entry.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <button
                                      onClick={() => handleToggleFlag(entry)}
                                      title={entry.flaggedForFollowup ? 'Remove follow-up flag' : 'Flag for follow-up'}
                                      aria-pressed={entry.flaggedForFollowup}
                                      className={`p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                                        entry.flaggedForFollowup
                                          ? 'text-amber-600 hover:text-amber-800'
                                          : 'text-gray-400 hover:text-amber-600'
                                      }`}
                                    >
                                      {entry.flaggedForFollowup
                                        ? <MdBookmark className="w-4 h-4" />
                                        : <MdBookmarkBorder className="w-4 h-4" />}
                                    </button>
                                    <button
                                      onClick={() => openEditForm(entry)}
                                      className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-600 rounded"
                                      title="Edit entry"
                                    >
                                      <MdEdit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      className="p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                                      title="Delete entry"
                                    >
                                      <MdDelete className="w-4 h-4" />
                                    </button>
                                  </div>
                                  {flagPopoverEntryId === entry.id && (
                                    <div className="mt-2 flex items-center gap-2 flex-wrap justify-end">
                                      <input
                                        type="date"
                                        value={flagDueDate}
                                        onChange={e => setFlagDueDate(e.target.value)}
                                        aria-label="Follow-up due date"
                                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                      />
                                      <button
                                        onClick={() => handleConfirmFlag(entry.id)}
                                        className="px-3 py-1 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                                      >
                                        Flag
                                      </button>
                                      <button
                                        onClick={() => setFlagPopoverEntryId(null)}
                                        className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                  </div>
                                </div>
                                {entry.tags.length > 0 && (
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {entry.tags.map(tag => (
                                      <span key={tag} className="px-2 py-0.5 text-xs text-gray-400">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <EntryCollaboration entryId={entry.id} />
                              </div>
                            </li>
                          );
                        })
                      )}
                    </ul>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Floating Quick Log Buttons */}
            <QuickLogButtons
              variant="floating"
              onLogIncident={() => openEntryForm('INCIDENT')}
              onLogWin={() => openEntryForm('SUCCESS')}
            />
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentsTab
            passportId={currentPassport.id}
            onAddEmail={() => setShowCorrespondenceForm(true)}
          />
        )}

        {activeTab === 'sharing' && (
          <div className="space-y-8">
            <PermissionsTab passportId={currentPassport.id} />
            <div className="border-t border-gray-200 pt-8">
              <ShareLinksTab passportId={currentPassport.id} childName={currentPassport.childFirstName} />
            </div>
            {isOwner && (
              <div className="border-t border-gray-200 pt-8">
                <ChildAccountSetup
                  passportId={currentPassport.id}
                  childViewShowHates={currentPassport.childViewShowHates}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click-away backdrop for drawer */}
      {openDrawer && (
        <div className="fixed inset-0 z-[5]" onClick={() => setOpenDrawer(null)} />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={pendingDelete?.type === 'section' ? confirmDeleteSection : confirmDeleteEntry}
        title={pendingDelete?.type === 'section' ? 'Delete item' : 'Delete entry'}
        message={pendingDelete?.type === 'section'
          ? 'This item will be permanently removed from the passport. This cannot be undone.'
          : 'This timeline entry will be permanently deleted. This cannot be undone.'}
        confirmLabel="Delete"
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={historyModal !== null}
        onClose={() => setHistoryModal(null)}
        revisions={historyRevisions}
        currentContent={historyModal?.content || ''}
        currentRemedialSuggestion={historyModal?.remedialSuggestion}
        onRestore={handleRestoreRevision}
        isOwner={isOwner}
      />

      {/* Timeline Entry Form Modal */}
      <TimelineEntryForm
        passportId={currentPassport.id}
        isOpen={showEntryForm}
        onClose={closeEntryForm}
        onSuccess={loadTimeline}
        presetType={entryFormPreset}
        editEntry={editingEntry}
      />

      {/* Correspondence Form Modal */}
      <CorrespondenceForm
        passportId={currentPassport.id}
        isOpen={showCorrespondenceForm}
        onClose={() => setShowCorrespondenceForm(false)}
        onSuccess={loadTimeline}
      />
    </main>
  );
}
