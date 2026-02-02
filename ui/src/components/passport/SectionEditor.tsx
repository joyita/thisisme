'use client';

import { useState, useEffect } from 'react';
import { usePassport } from '@/context/PassportContext';
import { PassportSection } from '@/lib/api';
import { SectionRevision } from '@/lib/types';
import { HistoryModal } from '@/components/HistoryModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PublishStatsBanner } from './PublishStatsBanner';
import { SECTIONS } from '@/lib/constants';
import {
  MdFavorite, MdWarning, MdStar, MdHandshake,
  MdMoreVert, MdEdit, MdHistory, MdShare, MdFilePresent,
  MdKeyboardArrowUp, MdKeyboardArrowDown, MdDelete,
  MdCheck, MdClose
} from 'react-icons/md';
import toast from 'react-hot-toast';

type SectionType = 'LOVES' | 'HATES' | 'STRENGTHS' | 'NEEDS';

const SECTION_CONFIG: Record<SectionType, {
  title: string;
  icon: React.ReactNode;
  shortTitle: string;
}> = {
  LOVES: { title: 'Loves', shortTitle: 'Loves', icon: <MdFavorite /> },
  HATES: { title: 'Difficulties', shortTitle: 'Hates', icon: <MdWarning /> },
  STRENGTHS: { title: 'Strengths', shortTitle: 'Strong', icon: <MdStar /> },
  NEEDS: { title: 'Needs', shortTitle: 'Needs', icon: <MdHandshake /> },
};

interface SectionEditorProps {
  passportId: string;
  childName: string;
}

export function SectionEditor({ passportId, childName }: SectionEditorProps) {
  const {
    currentPassport,
    addSection,
    updateSection,
    deleteSection,
    togglePublish,
    restoreRevision,
    reorderSections,
    getSectionHistory,
  } = usePassport();

  const [activeSection, setActiveSection] = useState<SectionType>('LOVES');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState({ content: '', remedial: '' });
  const [drawerOpen, setDrawerOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ sectionId: string } | null>(null);
  const [historyModal, setHistoryModal] = useState<{ section: PassportSection; revisions: SectionRevision[] } | null>(null);
  const [newItem, setNewItem] = useState({ content: '', remedial: '' });
  const [isAddingSection, setIsAddingSection] = useState(false);

  // Compute isOwner from currentPassport
  const isOwner = currentPassport?.userRole === 'OWNER' ||
                  currentPassport?.userRole === 'CO_OWNER' ||
                  currentPassport?.userRole === 'CO_PARENT';

  const sections = currentPassport?.sections?.[activeSection] || [];
  const sortedSections = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);
  const config = SECTIONS[activeSection.toUpperCase() as keyof typeof SECTIONS];

  const capitalizeFirstWord = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const handleAddItem = async () => {
    if (!newItem.content.trim()) return;
    if (config.requiresRemedial && !newItem.remedial.trim()) return;

    setIsAddingSection(true);
    try {
      await addSection(
        passportId,
        activeSection,
        newItem.content.trim(),
        config.requiresRemedial ? newItem.remedial.trim() : undefined
      );
      setNewItem({ content: '', remedial: '' });
      toast.success('Item added');
    } catch {
      toast.error('Failed to add item');
    } finally {
      setIsAddingSection(false);
    }
  };

  const startEditing = (section: PassportSection) => {
    setEditingId(section.id);
    setEditContent({
      content: section.content,
      remedial: section.remedialSuggestion || '',
    });
  };

  const saveEdit = async (sectionId: string) => {
    if (!editContent.content.trim()) return;

    try {
      // Use immediate=true to skip debouncing - user explicitly clicked Save
      await updateSection(passportId, sectionId, {
        content: editContent.content.trim(),
        remedialSuggestion: editContent.remedial.trim() || undefined,
      });
      setEditingId(null);
      setEditContent({ content: '', remedial: '' });
      toast.success('Item updated');
    } catch {
      toast.error('Failed to update item');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent({ content: '', remedial: '' });
  };

  const handleDelete = (sectionId: string) => {
    setDeleteConfirm({ sectionId });
    setDrawerOpen(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteSection(passportId, deleteConfirm.sectionId);
      toast.success('Item deleted');
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleTogglePublish = async (sectionId: string, currentStatus: boolean) => {
    try {
      await togglePublish(passportId, sectionId, !currentStatus);
      toast.success(currentStatus ? 'Item unpublished' : 'Item published');
    } catch {
      toast.error('Failed to toggle publish');
    }
    setDrawerOpen(null);
  };

  const handleReorder = async (sectionId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = sortedSections.findIndex(s => s.id === sectionId);
      if (currentIndex === -1) return;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= sortedSections.length) return;

      // Create new order with swapped items
      const newOrder = [...sortedSections];
      [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];

      // Convert to API format
      const items = newOrder.map((section, index) => ({
        sectionId: section.id,
        displayOrder: index
      }));

      await reorderSections(passportId, items);
      toast.success(`Item moved ${direction}`);
    } catch {
      toast.error('Failed to move item');
    }
    setDrawerOpen(null);
  };

  const openHistory = async (section: PassportSection) => {
    try {
      const revisions = await getSectionHistory(passportId, section.id);
      setHistoryModal({ section, revisions });
    } catch {
      toast.error('Failed to load history');
    }
    setDrawerOpen(null);
  };

  const handleRestore = async (revisionId: string) => {
    if (!historyModal) return;
    try {
      await restoreRevision(passportId, historyModal.section.id, revisionId);
      toast.success('Revision restored');
      setHistoryModal(null);
    } catch {
      toast.error('Failed to restore revision');
    }
  };

  const getPlaceholderText = () => {
    switch (activeSection) {
      case 'LOVES': return 'Add a love...';
      case 'HATES': return 'Add a difficulty...';
      case 'STRENGTHS': return 'Add a strength...';
      case 'NEEDS': return 'Add a need...';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Section Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex gap-1 p-2">
          {(['LOVES', 'HATES', 'STRENGTHS', 'NEEDS'] as SectionType[]).map((type) => {
            const sectionConfig = SECTION_CONFIG[type];
            const isActive = type === activeSection;
            return (
              <button
                key={type}
                onClick={() => setActiveSection(type)}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 px-2 sm:px-3 rounded-lg transition-all duration-200 min-w-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                <span className="text-lg sm:text-xl">{sectionConfig.icon}</span>
                <span className="text-xs sm:text-sm font-semibold truncate">
                  <span className="sm:hidden">{sectionConfig.shortTitle}</span>
                  <span className="hidden sm:inline">{sectionConfig.title}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Publish Stats Banner */}
      <PublishStatsBanner
        sections={sortedSections}
        sectionType={activeSection}
      />

      {/* Section Items */}
      <div className="flex-1 overflow-auto pb-40">
        <div className="p-4 space-y-1">
          {sortedSections.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-2">No items yet</p>
              <p className="text-sm text-gray-400">Add your first item below</p>
            </div>
          ) : (
            sortedSections.map((section, index) => {
              const isEditing = editingId === section.id;
              const isExpanded = drawerOpen === section.id;
              const hasRevisions = section.revisionCount && section.revisionCount > 0;

              return (
                <div
                  key={section.id}
                  className={`${index > 0 ? 'border-t border-gray-200' : ''}`}
                >
                  <div className={`py-3 sm:py-4 transition-all duration-200 ${isExpanded ? 'bg-purple-50/50' : 'hover:bg-purple-50/30'}`}>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent.content}
                          onChange={(e) => setEditContent(prev => ({ ...prev, content: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (editContent.content.trim()) saveEdit(section.id);
                            }
                          }}
                          className="w-full text-base text-gray-900 bg-gray-50 border-2 border-pink-500 focus:bg-white px-3 py-2 rounded-lg resize-none focus:outline-none min-h-[48px]"
                          rows={2}
                          autoFocus
                        />
                        {config.requiresRemedial && (
                          <textarea
                            value={editContent.remedial}
                            onChange={(e) => setEditContent(prev => ({ ...prev, remedial: e.target.value }))}
                            placeholder="What helps?"
                            className="w-full text-base text-green-800 bg-green-50 border-2 border-green-200 focus:border-green-400 px-3 py-2 rounded-lg resize-none focus:outline-none min-h-[48px]"
                            rows={1}
                          />
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(section.id)}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-pink-600 text-white hover:bg-pink-700 rounded-lg transition-colors"
                          >
                            <MdCheck className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors"
                          >
                            <MdClose className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-base sm:text-lg leading-relaxed text-gray-900">
                              {capitalizeFirstWord(section.content)}
                            </p>
                            {config.requiresRemedial && section.remedialSuggestion && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded shrink-0">
                                    What helps
                                  </span>
                                  <p className="text-sm sm:text-base text-green-800">
                                    {capitalizeFirstWord(section.remedialSuggestion)}
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs text-pink-700">
                                {section.lastEditedByName !== section.createdByName
                                  ? `${section.createdByName} · edited by ${section.lastEditedByName}`
                                  : section.createdByName || 'Unknown'
                                }
                              </span>
                              <span className="text-gray-300">·</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                section.published
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {section.published ? 'Published' : 'Draft'}
                              </span>
                              {hasRevisions && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span className="text-xs text-gray-500">
                                    {section.revisionCount} revision{section.revisionCount! > 1 ? 's' : ''}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => setDrawerOpen(drawerOpen === section.id ? null : section.id)}
                            className={`p-2 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                              isExpanded
                                ? 'text-purple-700 bg-purple-100'
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            <MdMoreVert className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Action Drawer */}
                        <div
                          className={`overflow-hidden transition-all duration-300 ${
                            isExpanded ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0 pointer-events-none'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap px-1 py-2 border-t border-purple-200/50">
                            {isOwner && (
                              <button
                                onClick={() => handleTogglePublish(section.id, section.published)}
                                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-purple-700 hover:bg-purple-100 rounded-lg transition-all"
                              >
                                {section.published ? (
                                  <>
                                    <MdFilePresent className="w-4 h-4" />
                                    <span>Unpublish</span>
                                  </>
                                ) : (
                                  <>
                                    <MdShare className="w-4 h-4" />
                                    <span>Publish</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => { startEditing(section); setDrawerOpen(null); }}
                              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-sm"
                            >
                              <MdEdit className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            {hasRevisions && (
                              <button
                                onClick={() => openHistory(section)}
                                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-purple-700 hover:bg-purple-100 rounded-lg transition-all"
                              >
                                <MdHistory className="w-4 h-4" />
                                <span>History</span>
                              </button>
                            )}
                            <div className="sm:hidden w-full h-0" />
                            {isOwner && (
                              <>
                                <button
                                  onClick={() => handleReorder(section.id, 'up')}
                                  disabled={index === 0}
                                  className="flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-purple-700 hover:bg-purple-100 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <MdKeyboardArrowUp className="w-4 h-4" />
                                  <span>Up</span>
                                </button>
                                <button
                                  onClick={() => handleReorder(section.id, 'down')}
                                  disabled={index === sortedSections.length - 1}
                                  className="flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-purple-700 hover:bg-purple-100 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <MdKeyboardArrowDown className="w-4 h-4" />
                                  <span>Down</span>
                                </button>
                                <div className="w-px h-6 bg-gray-300 mx-1" />
                                <button
                                  onClick={() => handleDelete(section.id)}
                                  className="flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <MdDelete className="w-4 h-4" />
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
              );
            })
          )}
        </div>
      </div>

      {/* Add Item Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-purple-200 shadow-lg z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex gap-2 sm:gap-3 items-center">
              <textarea
                value={newItem.content}
                onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newItem.content.trim()) handleAddItem();
                  }
                }}
                placeholder={getPlaceholderText()}
                className="flex-grow text-base text-gray-900 placeholder:text-purple-600 bg-purple-50 border-2 border-purple-200 focus:bg-white focus:border-purple-500 px-4 py-3 rounded-lg resize-none focus:outline-none min-h-[48px]"
                rows={1}
              />
              <button
                onClick={handleAddItem}
                disabled={!newItem.content.trim() || (config.requiresRemedial && !newItem.remedial.trim()) || isAddingSection}
                className="flex-shrink-0 flex items-center gap-2 px-4 sm:px-5 h-[48px] sm:h-[56px] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all"
              >
                Add
              </button>
            </div>
            {config.requiresRemedial && newItem.content.trim() && (
              <textarea
                value={newItem.remedial}
                onChange={(e) => setNewItem(prev => ({ ...prev, remedial: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newItem.content.trim() && newItem.remedial.trim()) handleAddItem();
                  }
                }}
                placeholder="What helps with this?"
                className="w-full text-base text-green-800 placeholder:text-green-600 bg-green-50 border-2 border-green-200 focus:bg-white focus:border-green-500 px-4 py-2.5 rounded-lg resize-none focus:outline-none min-h-[48px]"
                rows={1}
              />
            )}
            {!isOwner && newItem.content.trim() && (
              <p className="text-xs text-purple-600">Note: Requires owner approval to publish</p>
            )}
          </div>
        </div>
      </div>

      {/* History Modal */}
      {historyModal && (
        <HistoryModal
          isOpen
          onClose={() => setHistoryModal(null)}
          revisions={historyModal.revisions}
          currentContent={historyModal.section.content}
          currentRemedialSuggestion={historyModal.section.remedialSuggestion}
          onRestore={handleRestore}
          isOwner={isOwner}
        />
      )}

      {/* Delete Confirmation Modal */}
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
    </div>
  );
}
