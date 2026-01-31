// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { usePassport } from '@/context/PassportContext';
import { HistoryModal } from '@/components/HistoryModal';
import { PassportView } from '@/components/PassportView';
import { SECTIONS } from '@/lib/constants';
import { SectionType, BulletPoint } from '@/lib/types';
import { Eye, Printer, LogOut, Plus, History, Trash2, ChevronUp, ChevronDown, Edit2, Check, X, MoreVertical, Share2, FileText, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { MdFavorite, MdWarning, MdStar, MdHandshake, MdFace } from 'react-icons/md';
import toast from 'react-hot-toast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function AdminPage() {
  const router = useRouter();
  const passportRef = useRef<HTMLDivElement>(null);
  const { user, passport, isLoading, addBullet, updateBullet, deleteBullet, togglePublish, restoreRevision, reorderBullet, logout } = usePassport();
  const [activeSection, setActiveSection] = useState<SectionType>('loves');
  const [historyModal, setHistoryModal] = useState<{ section: SectionType; bullet: BulletPoint } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<{ content: string; remedial: string }>({ content: '', remedial: '' });
  const [drawerOpen, setDrawerOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ section: SectionType; bulletId: string } | null>(null);
  const [newItems, setNewItems] = useState<Record<SectionType, { content: string; remedial: string }>>({
    loves: { content: '', remedial: '' }, hates: { content: '', remedial: '' }, strengths: { content: '', remedial: '' }, needs: { content: '', remedial: '' }
  });

  // Helper function to capitalize only the first word
  const capitalizeFirstWord = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const handlePrint = useReactToPrint({ contentRef: passportRef, documentTitle: `${passport?.child.firstName || 'Pupil'}-Passport` });

  useEffect(() => { if (!isLoading && !user) router.push('/'); }, [user, isLoading, router]);
  useEffect(() => { if (!isLoading && passport && !passport.wizardComplete && user?.isOwner) router.push('/wizard'); }, [passport, isLoading, router, user]);

  if (isLoading || !user || !passport) return <main className="min-h-screen flex items-center justify-center"><p>Loading...</p></main>;

  const handleAddItem = (section: SectionType) => {
    const item = newItems[section];
    if (!item.content.trim()) return;
    if (SECTIONS[section].requiresRemedial && !item.remedial.trim()) return;
    addBullet(section, item.content.trim(), SECTIONS[section].requiresRemedial ? item.remedial.trim() : undefined);
    setNewItems(prev => ({ ...prev, [section]: { content: '', remedial: '' } }));
    toast.success('Item added successfully');
  };

  const startEditing = (bullet: BulletPoint) => {
    setEditingId(bullet.id);
    setEditContent({ content: bullet.content, remedial: bullet.remedialSuggestion || '' });
  };

  const saveEdit = (section: SectionType, bulletId: string) => {
    if (!editContent.content.trim()) return;
    updateBullet(section, bulletId, editContent.content.trim(), editContent.remedial.trim() || undefined);
    setEditingId(null);
    setEditContent({ content: '', remedial: '' });
    toast.success('Item updated successfully');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent({ content: '', remedial: '' });
  };

  const handleDelete = (section: SectionType, bulletId: string) => {
    setDeleteConfirm({ section, bulletId });
    setDrawerOpen(null);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteBullet(deleteConfirm.section, deleteConfirm.bulletId);
      toast.success('Item deleted');
      setDeleteConfirm(null);
    }
  };

  const handleTogglePublish = (section: SectionType, bulletId: string, currentStatus: boolean) => {
    togglePublish(section, bulletId);
    toast.success(currentStatus ? 'Item unpublished' : 'Item published');
  };

  const handleReorder = (section: SectionType, bulletId: string, direction: 'up' | 'down') => {
    reorderBullet(section, bulletId, direction);
    toast.success(`Item moved ${direction}`);
  };

  const getSectionIcon = (section: SectionType, large = false) => {
    const iconClass = large ? "text-2xl" : "text-lg sm:text-2xl";
    switch (section) {
      case 'loves': return <MdFavorite className={iconClass} />;
      case 'hates': return <MdWarning className={iconClass} />;
      case 'strengths': return <MdStar className={iconClass} />;
      case 'needs': return <MdHandshake className={iconClass} />;
    }
  };

  const getSectionLabel = (section: SectionType, short = false) => {
    if (short) {
      switch (section) {
        case 'loves': return 'Loves';
        case 'hates': return 'Hates';
        case 'strengths': return 'Strong';
        case 'needs': return 'Needs';
      }
    }
    switch (section) {
      case 'loves': return 'Loves';
      case 'hates': return 'Difficulties';
      case 'strengths': return 'Strengths';
      case 'needs': return 'Needs';
    }
  };

  const getPlaceholderText = (section: SectionType) => {
    switch (section) {
      case 'loves': return 'Add a love...';
      case 'hates': return 'Add a difficulty...';
      case 'strengths': return 'Add a strength...';
      case 'needs': return 'Add a need...';
    }
  };

  const config = SECTIONS[activeSection];
  const bullets = passport.sections[activeSection];
  const published = bullets.filter(b => b.isPublished).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Header - Mobile/Tablet Only */}
      <header className="bg-white sticky top-0 z-40 no-print lg:hidden h-[68px] sm:h-[76px]">
        <div className="px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MdFace className="w-7 h-7 sm:w-8 sm:h-8 text-[#581c87] flex-shrink-0" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-black truncate">
              <span className="bg-gradient-to-r from-[#581c87] to-[#7c3aed] bg-clip-text text-transparent capitalize">{passport.child.firstName}&apos;s</span>
              {' '}
              <span className="text-[#be185d]">{getSectionLabel(activeSection)}</span>
            </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button onClick={() => router.push(`/passport/${passport.id}`)} className="flex items-center gap-1 px-2 py-1.5 min-h-[44px] text-xs font-medium text-[#581c87] hover:bg-purple-50 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">
              <Eye className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">View</span>
              <span className="sm:hidden sr-only">View passport</span>
            </button>
            <button onClick={() => handlePrint()} className="flex items-center gap-1 px-2 py-1.5 min-h-[44px] text-xs font-medium text-[#581c87] hover:bg-purple-50 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Print</span>
              <span className="sm:hidden sr-only">Print</span>
            </button>
            <button onClick={logout} className="p-2 min-h-[44px] min-w-[44px] text-[#581c87] hover:bg-purple-50 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600" aria-label="Log out">
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:left-0 lg:top-0 lg:bottom-0 bg-white no-print z-40">
        {/* Sidebar Header */}
        <div className="px-6 py-6">
          <div className="flex items-center gap-2 mb-1">
            <MdFace className="w-7 h-7 text-[#581c87]" aria-hidden="true" />
            <h1 className="text-2xl font-black truncate">
              <span className="bg-gradient-to-r from-[#581c87] to-[#7c3aed] bg-clip-text text-transparent capitalize">{passport.child.firstName}&apos;s</span>
            </h1>
          </div>
          <h2 className="text-2xl font-black text-[#be185d] pl-9">{getSectionLabel(activeSection)}</h2>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {(['loves', 'hates', 'strengths', 'needs'] as SectionType[]).map((section) => {
              const isActive = section === activeSection;
              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-md transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#581c87] to-[#7c3aed] text-white scale-105 focus-visible:outline-white' 
                      : 'text-[#581c87] hover:bg-purple-50 hover:scale-105 focus-visible:outline-purple-600'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span aria-hidden="true">{getSectionIcon(section, true)}</span>
                  <span className="text-base font-semibold">{getSectionLabel(section)}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="px-4 py-4 space-y-2">
          <button onClick={() => router.push(`/passport/${passport.id}`)} className="w-full flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm font-medium text-[#581c87] hover:bg-purple-50 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">
            <Eye className="w-4 h-4" aria-hidden="true" />
            <span>View Passport</span>
          </button>
          <button onClick={() => handlePrint()} className="w-full flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm font-medium text-[#581c87] hover:bg-purple-50 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Print</span>
          </button>
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm font-medium text-[#581c87] hover:bg-purple-50 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Section Navigation - Mobile/Tablet Only */}
      <nav className="bg-white sticky top-[68px] sm:top-[76px] z-30 no-print lg:hidden shadow-sm">
        <div className="px-3 sm:px-6 py-1.5 sm:py-2">
          <div className="flex gap-1 sm:gap-2">
            {(['loves', 'hates', 'strengths', 'needs'] as SectionType[]).map((section) => {
              const isActive = section === activeSection;
              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 px-1 sm:px-3 min-h-[44px] rounded-md transition-all duration-300 ease-out min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#581c87] to-[#7c3aed] text-white scale-105 focus-visible:outline-white' 
                      : 'bg-gray-50 text-gray-900 hover:bg-purple-50 hover:text-[#581c87] hover:scale-105 focus-visible:outline-purple-600'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span aria-hidden="true">{getSectionIcon(section)}</span>
                  <span className="text-[11px] sm:text-sm font-semibold truncate">
                    <span className="sm:hidden">{getSectionLabel(section, true)}</span>
                    <span className="hidden sm:inline">{getSectionLabel(section)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" className="flex-1 w-full px-4 sm:px-6 pt-3 sm:pt-6 pb-40 lg:ml-64 lg:px-12 lg:max-w-6xl">
        {/* Breadcrumb - Desktop Only */}
        <Breadcrumb
          items={[
            { label: 'Admin', href: '/admin' },
            { label: getSectionLabel(activeSection), current: true }
          ]}
          className="hidden lg:block mb-4"
        />

        {/* Publishing Status Banner */}
        <div className="mb-4 sm:mb-6">
          <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg ${
            published > config.suggestedMax 
              ? 'bg-orange-50 border border-orange-200' 
              : published === config.suggestedMax 
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-gray-50 border border-gray-200'
          }`}>
            {published > config.suggestedMax ? (
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" aria-hidden="true" />
            ) : published === config.suggestedMax ? (
              <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0" aria-hidden="true" />
            ) : (
              <Info className="w-5 h-5 text-gray-500 flex-shrink-0" aria-hidden="true" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm sm:text-base font-semibold ${
                published > config.suggestedMax 
                  ? 'text-orange-800' 
                  : published === config.suggestedMax 
                    ? 'text-amber-800'
                    : 'text-gray-900'
              }`} style={{ fontFamily: 'var(--font-besley), Georgia, serif' }}>
                {published} of {config.suggestedMax} published
                {published > config.suggestedMax && (
                  <span className="ml-2 text-orange-800">({published - config.suggestedMax} over limit)</span>
                )}
              </p>
              <p className={`text-xs sm:text-sm ${
                published > config.suggestedMax
                  ? 'text-orange-800'
                  : published === config.suggestedMax
                    ? 'text-amber-800'
                    : 'text-gray-600'
              }`}>
                {published > config.suggestedMax
                  ? 'Too many items may overwhelm readers. Consider unpublishing some.'
                  : published === config.suggestedMax
                    ? 'You\'ve reached the suggested limit for this section.'
                    : `Suggested limit: ${config.suggestedMax} items for easy reading`
                }
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className={`text-lg sm:text-xl font-bold ${
                published > config.suggestedMax
                  ? 'text-orange-800'
                  : published === config.suggestedMax
                    ? 'text-amber-800'
                    : 'text-gray-500'
              }`} style={{ fontFamily: 'var(--font-besley), Georgia, serif' }}>
                {published}/{config.suggestedMax}
              </span>
            </div>
          </div>
        </div>

        {/* Bullets */}
        <h2 className="sr-only">Items list</h2>
        <div className="space-y-1">
          {bullets.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <p className="text-gray-500 mb-2">No items yet</p>
              <p className="text-sm text-gray-400">Add your first item below</p>
            </div>
          )}

          {bullets.map((bullet, i) => {
            const isEditing = editingId === bullet.id;
            const isExpanded = drawerOpen === bullet.id;
            return (
              <div key={bullet.id} className={`${i > 0 ? 'border-t border-gray-200' : ''}`}>
                <div className={`py-3 sm:py-4 transition-all duration-200 ease-out ${isExpanded ? 'bg-purple-50/50' : 'hover:bg-purple-50/30'}`}>
                  <div className="flex flex-col">
                    {isEditing ? (
                      <>
                        <textarea
                          value={editContent.content}
                          onChange={(e) => setEditContent(prev => ({ ...prev, content: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (editContent.content.trim() && (!config.requiresRemedial || editContent.remedial.trim())) {
                                saveEdit(activeSection, bullet.id);
                              }
                            }
                          }}
                          className="w-full text-base text-gray-900 bg-gray-50 border-2 border-[#be185d] focus:bg-white px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-md resize-none focus:outline-none placeholder:text-gray-500 transition-colors min-h-[48px]"
                          rows={2}
                          autoFocus
                        />
                        {config.requiresRemedial && (
                          <div className="mt-2">
                            <textarea
                              value={editContent.remedial}
                              onChange={(e) => setEditContent(prev => ({ ...prev, remedial: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (editContent.content.trim() && editContent.remedial.trim()) {
                                    saveEdit(activeSection, bullet.id);
                                  }
                                }
                              }}
                              placeholder="What helps?"
                              className="w-full text-base text-[#166534] bg-green-50 border-2 border-green-200 focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-200/50 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-md resize-none focus:outline-none placeholder:text-green-700 transition-all min-h-[48px]"
                              rows={1}
                            />
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => saveEdit(activeSection, bullet.id)} className="flex items-center gap-1 px-3 py-2 min-h-[44px] text-xs font-semibold bg-[#be185d] text-white hover:bg-[#9f1239] rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600">
                            <Check className="w-3 h-3" aria-hidden="true" />
                            Save
                          </button>
                          <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-2 min-h-[44px] text-xs font-semibold bg-gray-200 text-gray-900 hover:bg-gray-300 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600">
                            <X className="w-3 h-3" aria-hidden="true" />
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-base sm:text-lg leading-relaxed text-gray-900 transition-colors">{capitalizeFirstWord(bullet.content)}</p>
                            {config.requiresRemedial && bullet.remedialSuggestion && (
                              <p className="text-sm sm:text-base leading-relaxed text-[#166534] bg-green-50 border border-green-200 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md mt-2">{capitalizeFirstWord(bullet.remedialSuggestion)}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] sm:text-xs text-pink-800">
                                {bullet.lastEditedBy !== bullet.createdBy
                                  ? `${bullet.createdBy} · edited by ${bullet.lastEditedBy}`
                                  : bullet.createdBy
                                }
                              </span>
                              <span className="text-gray-300">·</span>
                              <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md ${
                                bullet.isPublished 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-gray-100 text-gray-900'
                              }`}>
                                {bullet.isPublished ? 'Published' : 'Draft'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setDrawerOpen(drawerOpen === bullet.id ? null : bullet.id)}
                            className={`p-2 rounded-md transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 ${
                              isExpanded 
                                ? 'text-purple-700 bg-purple-100' 
                                : 'text-gray-900 hover:bg-gray-100'
                            }`}
                            aria-label={isExpanded ? "Close menu" : "Open menu"}
                            aria-expanded={isExpanded}
                            aria-controls={`drawer-${bullet.id}`}
                          >
                            <MoreVertical className="w-5 h-5" aria-hidden="true" />
                          </button>
                        </div>
                        {/* Drawer */}
                        <div
                          id={`drawer-${bullet.id}`}
                          className={`overflow-hidden transition-all duration-300 ease-out ${
                            drawerOpen === bullet.id ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0 pointer-events-none'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap px-1 py-2 border-t border-purple-200/50">
                            {user.isOwner && (
                              <button
                                onClick={() => { handleTogglePublish(activeSection, bullet.id, bullet.isPublished); setDrawerOpen(null); }}
                                className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-medium text-purple-700 hover:bg-purple-100 hover:text-purple-800 rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 focus-visible:bg-purple-100"
                                tabIndex={drawerOpen === bullet.id ? 0 : -1}
                              >
                                {bullet.isPublished ? (
                                  <>
                                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Unpublish</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Publish</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => { startEditing(bullet); setDrawerOpen(null); }}
                              className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-medium bg-gradient-to-r from-[#a855f7] to-[#be185d] text-white hover:from-[#9333ea] hover:to-[#9f1239] rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white shadow-sm"
                              tabIndex={drawerOpen === bullet.id ? 0 : -1}
                            >
                              <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Edit</span>
                            </button>
                            {bullet.revisions.length > 0 && (
                              <button
                                onClick={() => { setHistoryModal({ section: activeSection, bullet }); setDrawerOpen(null); }}
                                className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-medium text-purple-700 hover:bg-purple-100 hover:text-purple-800 rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 focus-visible:bg-purple-100"
                                tabIndex={drawerOpen === bullet.id ? 0 : -1}
                              >
                                <History className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>History</span>
                              </button>
                            )}
                            {/* Force line break on mobile */}
                            <div className="sm:hidden w-full h-0" aria-hidden="true"></div>
                            {user.isOwner && (
                              <>
                                <button
                                  onClick={() => { handleReorder(activeSection, bullet.id, 'up'); setDrawerOpen(null); }}
                                  disabled={i === 0}
                                  className="flex items-center gap-1 px-3 py-2.5 min-h-[44px] text-xs font-medium text-purple-700 hover:bg-purple-100 hover:text-purple-800 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 focus-visible:bg-purple-100"
                                  tabIndex={drawerOpen === bullet.id ? 0 : -1}
                                  aria-label="Move item up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Up</span>
                                </button>
                                <button
                                  onClick={() => { handleReorder(activeSection, bullet.id, 'down'); setDrawerOpen(null); }}
                                  disabled={i === bullets.length - 1}
                                  className="flex items-center gap-1 px-3 py-2.5 min-h-[44px] text-xs font-medium text-purple-700 hover:bg-purple-100 hover:text-purple-800 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 focus-visible:bg-purple-100"
                                  tabIndex={drawerOpen === bullet.id ? 0 : -1}
                                  aria-label="Move item down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Down</span>
                                </button>
                                {/* Divider before delete */}
                                <div className="w-px h-6 bg-gray-300 mx-1" aria-hidden="true"></div>
                                <button
                                  onClick={() => handleDelete(activeSection, bullet.id)}
                                  className="flex items-center gap-1 px-3 py-2.5 min-h-[44px] text-xs font-medium text-red-700 hover:bg-red-50 hover:text-red-800 rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 focus-visible:bg-red-50"
                                  tabIndex={drawerOpen === bullet.id ? 0 : -1}
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </main>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t-2 border-purple-200 shadow-[0_-4px_20px_-4px_rgba(88,28,135,0.15)] z-50 no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex gap-2 sm:gap-3 items-center">
              <label htmlFor="add-item-input" className="sr-only">Add new item</label>
              <textarea
                id="add-item-input"
                value={newItems[activeSection].content}
                onChange={(e) => setNewItems(prev => ({ ...prev, [activeSection]: { ...prev[activeSection], content: e.target.value } }))}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (newItems[activeSection].content.trim()) handleAddItem(activeSection); } }}
                placeholder={getPlaceholderText(activeSection)}
                className="flex-grow text-base text-gray-900 placeholder:text-purple-700 bg-purple-50 border-2 border-purple-200 focus:bg-white focus:border-[#a855f7] focus:ring-4 focus:ring-purple-200/50 px-4 sm:px-5 py-3 sm:py-3.5 rounded-lg resize-none focus:outline-none transition-all min-h-[48px]"
                rows={1}
              />
              <button
                onClick={() => handleAddItem(activeSection)}
                disabled={!newItems[activeSection].content.trim() || (config.requiresRemedial && !newItems[activeSection].remedial.trim())}
                aria-label="Add item"
                className="group flex-shrink-0 flex items-center gap-2 px-4 sm:px-5 h-[48px] sm:h-[56px] bg-gradient-to-r from-[#a855f7] to-[#be185d] hover:from-[#9333ea] hover:to-[#9f1239] hover:shadow-lg active:scale-95 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
              >
                <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5] text-white" aria-hidden="true" />
                <span className="text-sm sm:text-base font-semibold text-white">Add</span>
              </button>
            </div>
            {config.requiresRemedial && newItems[activeSection].content.trim() && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label htmlFor="add-item-remedial" className="sr-only">What helps with this?</label>
                <textarea
                  id="add-item-remedial"
                  value={newItems[activeSection].remedial}
                  onChange={(e) => setNewItems(prev => ({ ...prev, [activeSection]: { ...prev[activeSection], remedial: e.target.value } }))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (newItems[activeSection].content.trim() && newItems[activeSection].remedial.trim()) handleAddItem(activeSection); } }}
                  placeholder="What helps with this?"
                  className="w-full text-base text-[#166534] placeholder:text-green-700 bg-green-50 border-2 border-green-200 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-200/50 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg resize-none focus:outline-none transition-all min-h-[48px]"
                  rows={1}
                />
              </div>
            )}
            {!user.isOwner && newItems[activeSection].content.trim() && (
              <p className="text-xs text-purple-600">Note: Requires owner approval to publish</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {historyModal && (
        <HistoryModal
          isOpen
          onClose={() => setHistoryModal(null)}
          revisions={historyModal.bullet.revisions}
          currentContent={historyModal.bullet.content}
          onRestore={(id) => { restoreRevision(historyModal.section, historyModal.bullet.id, id); setHistoryModal(null); }}
          isOwner={user.isOwner}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete item?"
        message="This action cannot be undone. The item will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        variant="danger"
      />

      <div className="hidden"><div ref={passportRef}><PassportView passport={passport} /></div></div>
    </div>
  );
}
