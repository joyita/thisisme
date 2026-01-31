// src/context/PassportContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, PupilPassport, BulletPoint, SectionType, Revision } from '@/lib/types';
import { savePassport, loadPassport, saveUser, loadUser, clearPassport, clearUser } from '@/lib/storage';
import { generateId } from '@/lib/utils';

interface PassportContextType {
  user: User | null;
  login: (username: string, isOwner: boolean) => void;
  logout: () => void;
  passport: PupilPassport | null;
  isLoading: boolean;
  updateChild: (updates: Partial<PupilPassport['child']>) => void;
  addBullet: (section: SectionType, content: string, remedialSuggestion?: string) => void;
  updateBullet: (section: SectionType, bulletId: string, content: string, remedialSuggestion?: string) => void;
  deleteBullet: (section: SectionType, bulletId: string) => void;
  togglePublish: (section: SectionType, bulletId: string) => void;
  restoreRevision: (section: SectionType, bulletId: string, revisionId: string) => void;
  reorderBullet: (section: SectionType, bulletId: string, direction: 'up' | 'down') => void;
  completeWizard: () => void;
  resetPassport: () => void;
}

const PassportContext = createContext<PassportContextType | null>(null);

export function PassportProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [passport, setPassport] = useState<PupilPassport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage after mount (client-only)
  useEffect(() => {
    const savedUser = loadUser();
    const savedPassport = loadPassport();
    if (savedUser) setUser(savedUser);
    if (savedPassport) setPassport(savedPassport);
    setIsLoading(false);
    setIsHydrated(true);
  }, []);

  // Save passport changes to localStorage (only after hydration)
  useEffect(() => {
    if (isHydrated && passport) savePassport(passport);
  }, [passport, isHydrated]);

  const login = useCallback((username: string, isOwner: boolean) => {
    const newUser: User = { id: generateId(), username, isOwner };
    setUser(newUser);
    saveUser(newUser);
    
    if (isOwner && !passport) {
      const newPassport: PupilPassport = {
        id: generateId(),
        child: { firstName: '' },
        ownerId: newUser.id,
        ownerName: username,
        sections: { loves: [], hates: [], strengths: [], needs: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wizardComplete: false,
      };
      setPassport(newPassport);
    }
  }, [passport]);

  const logout = useCallback(() => {
    setUser(null);
    clearUser();
  }, []);

  const updateChild = useCallback((updates: Partial<PupilPassport['child']>) => {
    setPassport(prev => prev ? { ...prev, child: { ...prev.child, ...updates }, updatedAt: new Date().toISOString() } : prev);
  }, []);

  const addBullet = useCallback((section: SectionType, content: string, remedialSuggestion?: string) => {
    if (!user) return;
    const newBullet: BulletPoint = {
      id: generateId(),
      content,
      remedialSuggestion,
      isPublished: user.isOwner,
      revisions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.username,
      lastEditedBy: user.username,
    };
    setPassport(prev => prev ? {
      ...prev,
      sections: { ...prev.sections, [section]: [...prev.sections[section], newBullet] },
      updatedAt: new Date().toISOString(),
    } : prev);
  }, [user]);

  const updateBullet = useCallback((section: SectionType, bulletId: string, content: string, remedialSuggestion?: string) => {
    if (!user) return;
    setPassport(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [section]: prev.sections[section].map(bullet => {
            if (bullet.id !== bulletId) return bullet;
            const revision: Revision = {
              id: generateId(),
              content: bullet.content,
              remedialSuggestion: bullet.remedialSuggestion,
              authorId: user.id,
              authorName: user.username,
              timestamp: new Date().toISOString(),
              status: 'approved',
            };
            return { ...bullet, content, remedialSuggestion, revisions: [...bullet.revisions, revision], updatedAt: new Date().toISOString(), lastEditedBy: user.username };
          }),
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }, [user]);

  const deleteBullet = useCallback((section: SectionType, bulletId: string) => {
    setPassport(prev => prev ? {
      ...prev,
      sections: { ...prev.sections, [section]: prev.sections[section].filter(b => b.id !== bulletId) },
      updatedAt: new Date().toISOString(),
    } : prev);
  }, []);

  const togglePublish = useCallback((section: SectionType, bulletId: string) => {
    setPassport(prev => prev ? {
      ...prev,
      sections: {
        ...prev.sections,
        [section]: prev.sections[section].map(b => b.id === bulletId ? { ...b, isPublished: !b.isPublished } : b),
      },
      updatedAt: new Date().toISOString(),
    } : prev);
  }, []);

  const reorderBullet = useCallback((section: SectionType, bulletId: string, direction: 'up' | 'down') => {
    setPassport(prev => {
      if (!prev) return prev;
      const bullets = [...prev.sections[section]];
      const index = bullets.findIndex(b => b.id === bulletId);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === bullets.length - 1) return prev;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [bullets[index], bullets[newIndex]] = [bullets[newIndex], bullets[index]];
      return {
        ...prev,
        sections: { ...prev.sections, [section]: bullets },
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const restoreRevision = useCallback((section: SectionType, bulletId: string, revisionId: string) => {
    if (!user?.isOwner) return;
    setPassport(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [section]: prev.sections[section].map(bullet => {
            if (bullet.id !== bulletId) return bullet;
            const revisionToRestore = bullet.revisions.find(r => r.id === revisionId);
            if (!revisionToRestore) return bullet;
            const currentAsRevision: Revision = {
              id: generateId(),
              content: bullet.content,
              remedialSuggestion: bullet.remedialSuggestion,
              authorId: user.id,
              authorName: user.username,
              timestamp: new Date().toISOString(),
              status: 'approved',
            };
            return { ...bullet, content: revisionToRestore.content, remedialSuggestion: revisionToRestore.remedialSuggestion, revisions: [...bullet.revisions, currentAsRevision], updatedAt: new Date().toISOString(), lastEditedBy: user.username };
          }),
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }, [user]);

  const completeWizard = useCallback(() => {
    setPassport(prev => prev ? { ...prev, wizardComplete: true, updatedAt: new Date().toISOString() } : prev);
  }, []);

  const resetPassport = useCallback(() => {
    clearPassport();
    setPassport(null);
  }, []);

  return (
    <PassportContext.Provider value={{ user, login, logout, passport, isLoading, updateChild, addBullet, updateBullet, deleteBullet, togglePublish, restoreRevision, reorderBullet, completeWizard, resetPassport }}>
      {children}
    </PassportContext.Provider>
  );
}

export function usePassport() {
  const context = useContext(PassportContext);
  if (!context) throw new Error('usePassport must be used within a PassportProvider');
  return context;
}

