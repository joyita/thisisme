// src/context/PassportContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useChildMode } from './ChildModeContext';
import { passportApi, Passport, PassportListItem, PassportSection } from '@/lib/api';
import { SectionRevision } from '@/lib/types';
import { cachePassport, getCachedPassport, getPendingChanges, addPendingChange, clearPendingChanges } from '@/lib/storage';

interface PassportContextType {
  passports: PassportListItem[];
  currentPassport: Passport | null;
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
  loadPassports: () => Promise<void>;
  loadPassport: (id: string) => Promise<void>;
  createPassport: (childFirstName: string, childDateOfBirth?: string) => Promise<Passport>;
  updatePassport: (id: string, updates: { childFirstName?: string; childDateOfBirth?: string; photoUrl?: string }) => Promise<void>;
  addSection: (passportId: string, type: string, content: string, remedialSuggestion?: string, visibilityLevel?: string) => Promise<PassportSection>;
  updateSection: (passportId: string, sectionId: string, updates: { content?: string; remedialSuggestion?: string; published?: boolean; displayOrder?: number }) => Promise<void>;
  deleteSection: (passportId: string, sectionId: string) => Promise<void>;
  togglePublish: (passportId: string, sectionId: string, published: boolean) => Promise<void>;
  getSectionHistory: (passportId: string, sectionId: string) => Promise<SectionRevision[]>;
  restoreRevision: (passportId: string, sectionId: string, revisionId: string) => Promise<void>;
  reorderSections: (passportId: string, items: { sectionId: string; displayOrder: number }[]) => Promise<void>;
  clearError: () => void;
  clearCurrentPassport: () => void;
}

const PassportContext = createContext<PassportContextType | null>(null);

const DEBOUNCE_MS = 500;

export function PassportProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, isChildAccount } = useAuth();
  const { isChildMode } = useChildMode();
  const [passports, setPassports] = useState<PassportListItem[]>([]);
  const [currentPassport, setCurrentPassport] = useState<Passport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !window.navigator.onLine : false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Refs to avoid stale closures in callbacks
  const isChildModeRef = useRef(isChildMode);
  isChildModeRef.current = isChildMode;
  const isChildAccountRef = useRef(isChildAccount);
  isChildAccountRef.current = isChildAccount;

  // Online/offline event handling with pending-change flush
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      const pending = getPendingChanges();
      if (pending.length === 0) return;

      for (const change of pending) {
        try {
          switch (change.action) {
            case 'add':
              await passportApi.addSection(
                change.passportId,
                change.payload.type as string,
                change.payload.content as string,
                change.payload.remedialSuggestion as string | undefined,
                change.payload.visibilityLevel as string | undefined
              );
              break;
            case 'update':
              await passportApi.updateSection(change.passportId, change.sectionId!, {
                content: change.payload.content as string | undefined,
                remedialSuggestion: change.payload.remedialSuggestion as string | undefined,
                published: change.payload.published as boolean | undefined,
                displayOrder: change.payload.displayOrder as number | undefined,
              });
              break;
            case 'delete':
              await passportApi.deleteSection(change.passportId, change.sectionId!);
              break;
            case 'reorder':
              await passportApi.reorderSections(change.passportId, change.payload.items as { sectionId: string; displayOrder: number }[]);
              break;
          }
        } catch {
          return; // stop on first error; changes remain queued
        }
      }
      clearPendingChanges();

      // Reload passports that were modified
      const ids = [...new Set(pending.map(c => c.passportId))];
      for (const id of ids) {
        try {
          const updated = await passportApi.get(id);
          setCurrentPassport(updated);
          cachePassport(updated);
        } catch { /* ignore */ }
      }
    };

    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load passports when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadPassports();
    } else if (!isAuthenticated && !authLoading) {
      setPassports([]);
      setCurrentPassport(null);
    }
  }, [isAuthenticated, authLoading]);

  const loadPassports = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await passportApi.list();
      setPassports(list);
    } catch (e: any) {
      setError(e.message || 'Failed to load passports');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadPassport = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    const useChildView = isChildModeRef.current || isChildAccountRef.current;
    try {
      const passport = await passportApi.get(id, useChildView);
      setCurrentPassport(passport);
      cachePassport(passport);
    } catch (e: any) {
      const cached = getCachedPassport<Passport>(id);
      if (cached) {
        setCurrentPassport(cached);
      } else {
        setError(e.message || 'Failed to load passport');
        throw e;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPassport = useCallback(async (childFirstName: string, childDateOfBirth?: string): Promise<Passport> => {
    setIsLoading(true);
    setError(null);
    try {
      const passport = await passportApi.create(childFirstName, childDateOfBirth, true);
      setPassports(prev => [...prev, {
        id: passport.id,
        childFirstName: passport.childFirstName,
        role: 'OWNER',
        createdAt: passport.createdAt,
      }]);
      setCurrentPassport(passport);
      return passport;
    } catch (e: any) {
      setError(e.message || 'Failed to create passport');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePassport = useCallback(async (id: string, updates: { childFirstName?: string; childDateOfBirth?: string; photoUrl?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await passportApi.update(id, updates);
      setCurrentPassport(updated);
      setPassports(prev => prev.map(p =>
        p.id === id ? { ...p, childFirstName: updated.childFirstName } : p
      ));
    } catch (e: any) {
      setError(e.message || 'Failed to update passport');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addSection = useCallback(async (passportId: string, type: string, content: string, remedialSuggestion?: string, visibilityLevel?: string): Promise<PassportSection> => {
    setError(null);
    if (isOffline) {
      addPendingChange({ passportId, action: 'add', payload: { type, content, remedialSuggestion, visibilityLevel } });
      const optimistic: PassportSection = {
        id: `pending_${Date.now()}`,
        type: type as PassportSection['type'],
        content,
        remedialSuggestion,
        published: false,
        visibilityLevel: visibilityLevel || 'OWNERS_ONLY',
        displayOrder: 0,
        createdByName: '',
        lastEditedByName: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentPassport(prev => {
        if (!prev || prev.id !== passportId) return prev;
        const typeSections = prev.sections?.[type] || [];
        return { ...prev, sections: { ...prev.sections, [type]: [...typeSections, optimistic] } };
      });
      return optimistic;
    }
    try {
      await passportApi.addSection(passportId, type, content, remedialSuggestion, visibilityLevel);
      const updated = await passportApi.get(passportId);
      setCurrentPassport(updated);
      cachePassport(updated);
      const newSection = (updated.sections?.[type] || []).slice(-1)[0];
      return newSection;
    } catch (e: any) {
      setError(e.message || 'Failed to add section');
      throw e;
    }
  }, [isOffline]);

  const updateSection = useCallback(async (
    passportId: string,
    sectionId: string,
    updates: { content?: string; remedialSuggestion?: string; published?: boolean; displayOrder?: number },
    immediate = false
  ) => {
    setError(null);

    const performUpdate = async () => {
      try {
        const finalUpdates = (isChildModeRef.current || isChildAccountRef.current)
          ? { ...updates, childModeContribution: true }
          : updates;
        const updated = await passportApi.updateSection(passportId, sectionId, finalUpdates);
        setCurrentPassport(prev => {
          if (!prev || prev.id !== passportId) return prev;
          const newSections: Record<string, PassportSection[]> = {};
          for (const [type, sections] of Object.entries(prev.sections || {})) {
            newSections[type] = sections.map(s => s.id === sectionId ? updated : s);
          }
          return { ...prev, sections: newSections };
        });
      } catch (e: any) {
        setError(e.message || 'Failed to update section');
        throw e;
      }
    };

    // If immediate, execute right away
    if (immediate) {
      await performUpdate();
      return;
    }

    // Otherwise, debounce the update
    const key = `${passportId}-${sectionId}`;
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    debounceTimers.current[key] = setTimeout(async () => {
      await performUpdate();
      delete debounceTimers.current[key];
    }, DEBOUNCE_MS);
  }, []);

  const deleteSection = useCallback(async (passportId: string, sectionId: string) => {
    setError(null);
    try {
      await passportApi.deleteSection(passportId, sectionId);
      setCurrentPassport(prev => {
        if (!prev || prev.id !== passportId) return prev;
        const newSections: Record<string, PassportSection[]> = {};
        for (const [type, sections] of Object.entries(prev.sections || {})) {
          newSections[type] = sections.filter(s => s.id !== sectionId);
        }
        return { ...prev, sections: newSections };
      });
    } catch (e: any) {
      setError(e.message || 'Failed to delete section');
      throw e;
    }
  }, []);

  const togglePublish = useCallback(async (passportId: string, sectionId: string, published: boolean) => {
    await updateSection(passportId, sectionId, { published });
  }, [updateSection]);

  const getSectionHistory = useCallback(async (passportId: string, sectionId: string): Promise<SectionRevision[]> => {
    return passportApi.getSectionHistory(passportId, sectionId);
  }, []);

  const restoreRevision = useCallback(async (passportId: string, sectionId: string, revisionId: string) => {
    setError(null);
    try {
      const updated = await passportApi.restoreSection(passportId, sectionId, revisionId);
      setCurrentPassport(prev => {
        if (!prev || prev.id !== passportId) return prev;
        const newSections: Record<string, PassportSection[]> = {};
        for (const [type, sections] of Object.entries(prev.sections || {})) {
          newSections[type] = sections.map(s => s.id === sectionId ? updated : s);
        }
        return { ...prev, sections: newSections };
      });
    } catch (e: any) {
      setError(e.message || 'Failed to restore revision');
      throw e;
    }
  }, []);

  const reorderSections = useCallback(async (passportId: string, items: { sectionId: string; displayOrder: number }[]) => {
    setError(null);
    try {
      await passportApi.reorderSections(passportId, items);
      setCurrentPassport(prev => {
        if (!prev || prev.id !== passportId) return prev;
        const orderMap = new Map(items.map(i => [i.sectionId, i.displayOrder]));
        const newSections: Record<string, PassportSection[]> = {};
        for (const [type, sections] of Object.entries(prev.sections || {})) {
          newSections[type] = sections.map(s => {
            const newOrder = orderMap.get(s.id);
            return newOrder !== undefined ? { ...s, displayOrder: newOrder } : s;
          }).sort((a, b) => a.displayOrder - b.displayOrder);
        }
        return { ...prev, sections: newSections };
      });
    } catch (e: any) {
      setError(e.message || 'Failed to reorder sections');
      throw e;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearCurrentPassport = useCallback(() => setCurrentPassport(null), []);

  return (
    <PassportContext.Provider
      value={{
        passports,
        currentPassport,
        isLoading,
        isOffline,
        error,
        loadPassports,
        loadPassport,
        createPassport,
        updatePassport,
        addSection,
        updateSection,
        deleteSection,
        togglePublish,
        getSectionHistory,
        restoreRevision,
        reorderSections,
        clearError,
        clearCurrentPassport,
      }}
    >
      {children}
    </PassportContext.Provider>
  );
}

export function usePassport() {
  const context = useContext(PassportContext);
  if (!context) {
    throw new Error('usePassport must be used within a PassportProvider');
  }
  return context;
}
