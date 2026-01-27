// src/app/passport/[id]/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePassport } from '@/context/PassportContext';
import { timelineApi, TimelineEntry, TimelinePageResponse } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { TimelineEntryForm } from '@/components/timeline/TimelineEntryForm';
import { QuickLogButtons } from '@/components/timeline/QuickLogButtons';
import { TimelineCalendar } from '@/components/timeline/TimelineCalendar';
import { TimelineFilters } from '@/components/timeline/TimelineFilters';
import { TimelineAnalytics } from '@/components/timeline/TimelineAnalytics';
import { EntryCollaboration } from '@/components/timeline/EntryCollaboration';
import { PermissionsTab } from '@/components/permissions/PermissionsTab';
import { EntryType } from '@/lib/types';
import { ENTRY_TYPE_CONFIG } from '@/lib/constants';
import {
  MdFace, MdArrowBack, MdLogout, MdPerson, MdAdd, MdEdit, MdDelete,
  MdFavorite, MdWarning, MdStar, MdHandshake, MdTimeline, MdShare,
  MdDownload, MdDescription, MdSecurity, MdCalendarMonth, MdViewList,
  MdBarChart
} from 'react-icons/md';
import toast from 'react-hot-toast';

type SectionType = 'LOVES' | 'HATES' | 'STRENGTHS' | 'NEEDS';

const sectionConfig: Record<SectionType, { title: string; icon: React.ReactNode; bg: string; accent: string }> = {
  LOVES: { title: 'Loves', icon: <MdFavorite />, bg: 'bg-pink-50', accent: 'text-pink-700' },
  HATES: { title: 'Hates', icon: <MdWarning />, bg: 'bg-amber-50', accent: 'text-amber-700' },
  STRENGTHS: { title: 'Strengths', icon: <MdStar />, bg: 'bg-green-50', accent: 'text-green-700' },
  NEEDS: { title: 'Needs', icon: <MdHandshake />, bg: 'bg-blue-50', accent: 'text-blue-700' },
};

export default function PassportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { currentPassport, loadPassport, isLoading, error, addSection, updateSection, deleteSection } = usePassport();

  const [activeTab, setActiveTab] = useState<'about' | 'timeline' | 'documents' | 'sharing' | 'permissions'>('about');
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Timeline view state
  const [timelineView, setTimelineView] = useState<'list' | 'calendar' | 'analytics'>('list');
  const [selectedTypes, setSelectedTypes] = useState<EntryType[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  // Timeline entry form state
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryFormPreset, setEntryFormPreset] = useState<EntryType | undefined>();
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Add section modal state
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionType, setNewSectionType] = useState<SectionType>('LOVES');
  const [newSectionContent, setNewSectionContent] = useState('');
  const [addingSectionLoading, setAddingSectionLoading] = useState(false);

  // Edit section state
  const [editingSection, setEditingSection] = useState<{ id: string; content: string } | null>(null);

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

  useEffect(() => {
    if (activeTab === 'timeline' && currentPassport) {
      loadTimeline();
    }
  }, [activeTab, currentPassport]);

  const loadTimeline = async () => {
    if (!currentPassport) return;
    setTimelineLoading(true);
    try {
      const response = await timelineApi.list(currentPassport.id);
      setTimeline(response.entries);
    } catch (err) {
      toast.error('Failed to load timeline');
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleAddSection = async () => {
    if (!currentPassport || !newSectionContent.trim()) return;
    setAddingSectionLoading(true);
    try {
      await addSection(currentPassport.id, newSectionType, newSectionContent.trim());
      setShowAddSection(false);
      setNewSectionContent('');
      toast.success('Section added');
    } catch (err) {
      toast.error('Failed to add section');
    } finally {
      setAddingSectionLoading(false);
    }
  };

  const handleUpdateSection = async () => {
    if (!currentPassport || !editingSection) return;
    try {
      await updateSection(currentPassport.id, editingSection.id, editingSection.content);
      setEditingSection(null);
      toast.success('Section updated');
    } catch (err) {
      toast.error('Failed to update section');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!currentPassport) return;
    if (!confirm('Are you sure you want to delete this section?')) return;
    try {
      await deleteSection(currentPassport.id, sectionId);
      toast.success('Section deleted');
    } catch (err) {
      toast.error('Failed to delete section');
    }
  };

  // Timeline entry form handlers
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

  const handleEntrySuccess = () => {
    loadTimeline();
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!currentPassport) return;
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await timelineApi.delete(currentPassport.id, entryId);
      toast.success('Entry deleted');
      loadTimeline();
    } catch (err) {
      toast.error('Failed to delete entry');
    }
  };

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

  const getSectionsByType = (type: SectionType) => {
    return currentPassport.sections?.[type] || [];
  };

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
          <nav className="flex gap-6 -mb-px">
            {[
              { id: 'about', label: 'About', icon: <MdFace /> },
              { id: 'timeline', label: 'Timeline', icon: <MdTimeline /> },
              { id: 'documents', label: 'Documents', icon: <MdDescription /> },
              { id: 'sharing', label: 'Sharing', icon: <MdShare /> },
              { id: 'permissions', label: 'Permissions', icon: <MdSecurity /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
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

        {activeTab === 'about' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">About {currentPassport.childFirstName}</h2>
              <Button onClick={() => setShowAddSection(true)} className="flex items-center gap-2">
                <MdAdd className="w-5 h-5" />
                Add Section
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {(['LOVES', 'HATES', 'STRENGTHS', 'NEEDS'] as SectionType[]).map(type => {
                const config = sectionConfig[type];
                const sections = getSectionsByType(type);

                return (
                  <div key={type} className={`${config.bg} rounded-xl p-6`}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-2xl ${config.accent}`}>{config.icon}</span>
                      <h3 className={`text-lg font-bold ${config.accent}`}>{config.title}</h3>
                    </div>

                    {sections.length === 0 ? (
                      <p className="text-gray-500 italic text-sm">No items yet</p>
                    ) : (
                      <ul className="space-y-3">
                        {sections.map(section => (
                          <li key={section.id} className="bg-white rounded-lg p-3 shadow-sm">
                            {editingSection && editingSection.id === section.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingSection.content}
                                  onChange={(e) => setEditingSection({ ...editingSection, content: e.target.value })}
                                  className="w-full px-3 py-2 border rounded-md text-sm"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleUpdateSection}
                                    className="px-3 py-1 bg-purple-600 text-white text-xs rounded-md"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingSection(null)}
                                    className="px-3 py-1 text-gray-600 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-gray-800 text-sm">{section.content}</p>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => setEditingSection({ id: section.id, content: section.content })}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                  >
                                    <MdEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSection(section.id)}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                  >
                                    <MdDelete className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
              </div>
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

              {/* Filters */}
              <TimelineFilters
                selectedTypes={selectedTypes}
                onTypesChange={setSelectedTypes}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onClear={() => {
                  setSelectedTypes([]);
                  setDateRange(null);
                }}
              />
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
                {/* Filtered entries */}
                {(() => {
                  const filteredEntries = timeline.filter(entry => {
                    // Filter by type
                    if (selectedTypes.length > 0 && !selectedTypes.includes(entry.entryType)) {
                      return false;
                    }
                    // Filter by date range
                    if (dateRange) {
                      const entryDate = new Date(entry.entryDate);
                      const start = new Date(dateRange.start);
                      const end = new Date(dateRange.end);
                      if (entryDate < start || entryDate > end) {
                        return false;
                      }
                    }
                    return true;
                  });

                  if (timelineView === 'calendar') {
                    return (
                      <TimelineCalendar
                        entries={filteredEntries}
                        onEntryClick={openEditForm}
                        onDateClick={(date) => {
                          setSelectedDate(date);
                          openEntryForm();
                        }}
                      />
                    );
                  }

                  if (timelineView === 'analytics') {
                    return <TimelineAnalytics entries={filteredEntries} />;
                  }

                  // List view
                  return (
                    <div className="space-y-4">
                      {filteredEntries.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No entries match your filters
                        </div>
                      ) : (
                        filteredEntries.map(entry => {
                          const entryConfig = ENTRY_TYPE_CONFIG[entry.entryType];
                          return (
                            <div key={entry.id} className={`bg-white rounded-lg border-2 ${entryConfig?.borderColor || 'border-gray-200'} p-4`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded mb-2 ${entryConfig?.badgeBg || 'bg-gray-100'} ${entryConfig?.badgeText || 'text-gray-700'}`}>
                                    {entryConfig?.label || entry.entryType}
                                  </span>
                                  <h4 className="font-semibold text-gray-900">{entry.title}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{entry.content}</p>
                                </div>
                                <div className="flex items-start gap-2 ml-4">
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {new Date(entry.entryDate).toLocaleDateString()}
                                  </span>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => openEditForm(entry)}
                                      className="p-1 text-gray-400 hover:text-gray-600"
                                      title="Edit entry"
                                    >
                                      <MdEdit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      className="p-1 text-gray-400 hover:text-red-600"
                                      title="Delete entry"
                                    >
                                      <MdDelete className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              {entry.tags.length > 0 && (
                                <div className="flex gap-1 mt-3">
                                  {entry.tags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* Collaboration: Reactions & Comments */}
                              <EntryCollaboration entryId={entry.id} />
                            </div>
                          );
                        })
                      )}
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
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Documents</h2>
              <Button className="flex items-center gap-2">
                <MdAdd className="w-5 h-5" />
                Upload
              </Button>
            </div>

            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <MdDescription className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-600">Upload medical records, assessments, and reports.</p>
            </div>
          </div>
        )}

        {activeTab === 'sharing' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Sharing</h2>
              <Button className="flex items-center gap-2">
                <MdAdd className="w-5 h-5" />
                Create Link
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Share Links</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Create secure links to share this passport with teachers, therapists, and caregivers.
                </p>
                <p className="text-gray-400 text-sm italic">No active share links</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Export Data</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Download a copy of this passport for offline use or backup.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                    <MdDownload className="w-4 h-4" />
                    JSON
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                    <MdDownload className="w-4 h-4" />
                    CSV
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                    <MdDownload className="w-4 h-4" />
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <PermissionsTab passportId={currentPassport.id} />
        )}
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Section</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newSectionType}
                  onChange={(e) => setNewSectionType(e.target.value as SectionType)}
                  className="w-full px-3 py-2.5 rounded-md border-2 bg-white text-base border-gray-300 focus:border-purple-500 focus:outline-none"
                >
                  {Object.entries(sectionConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={newSectionContent}
                  onChange={(e) => setNewSectionContent(e.target.value)}
                  placeholder="Describe what they love, hate, their strengths, or needs..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-md border-2 bg-white text-base border-gray-300 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddSection(false);
                  setNewSectionContent('');
                }}
                className="flex-1 px-4 py-2.5 rounded-md border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                disabled={addingSectionLoading}
              >
                Cancel
              </button>
              <Button
                onClick={handleAddSection}
                className="flex-1"
                disabled={addingSectionLoading || !newSectionContent.trim()}
              >
                {addingSectionLoading ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Entry Form Modal */}
      <TimelineEntryForm
        passportId={currentPassport.id}
        isOpen={showEntryForm}
        onClose={closeEntryForm}
        onSuccess={handleEntrySuccess}
        presetType={entryFormPreset}
        editEntry={editingEntry}
      />
    </main>
  );
}
