// src/context/PassportContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { passportApi, Passport, PassportListItem, PassportSection } from '@/lib/api';

interface PassportContextType {
  passports: PassportListItem[];
  currentPassport: Passport | null;
  isLoading: boolean;
  error: string | null;
  loadPassports: () => Promise<void>;
  loadPassport: (id: string) => Promise<void>;
  createPassport: (childFirstName: string, childDateOfBirth?: string) => Promise<Passport>;
  updatePassport: (id: string, updates: { childFirstName?: string; childDateOfBirth?: string; photoUrl?: string }) => Promise<void>;
  addSection: (passportId: string, type: string, content: string, visibilityLevel?: string) => Promise<PassportSection>;
  updateSection: (passportId: string, sectionId: string, content: string) => Promise<void>;
  deleteSection: (passportId: string, sectionId: string) => Promise<void>;
  clearError: () => void;
  clearCurrentPassport: () => void;
}

const PassportContext = createContext<PassportContextType | null>(null);

export function PassportProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [passports, setPassports] = useState<PassportListItem[]>([]);
  const [currentPassport, setCurrentPassport] = useState<Passport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const passport = await passportApi.get(id);
      setCurrentPassport(passport);
    } catch (e: any) {
      setError(e.message || 'Failed to load passport');
      throw e;
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

  const addSection = useCallback(async (passportId: string, type: string, content: string, visibilityLevel?: string): Promise<PassportSection> => {
    setError(null);
    try {
      const section = await passportApi.addSection(passportId, type, content, visibilityLevel);
      if (currentPassport && currentPassport.id === passportId) {
        setCurrentPassport(prev => {
          if (!prev) return prev;
          const typeSections = prev.sections?.[type] || [];
          return {
            ...prev,
            sections: {
              ...prev.sections,
              [type]: [...typeSections, section],
            },
          };
        });
      }
      return section;
    } catch (e: any) {
      setError(e.message || 'Failed to add section');
      throw e;
    }
  }, [currentPassport]);

  const updateSection = useCallback(async (passportId: string, sectionId: string, content: string) => {
    setError(null);
    try {
      const updated = await passportApi.updateSection(passportId, sectionId, content);
      if (currentPassport && currentPassport.id === passportId) {
        setCurrentPassport(prev => {
          if (!prev) return prev;
          const newSections: Record<string, PassportSection[]> = {};
          for (const [type, sections] of Object.entries(prev.sections || {})) {
            newSections[type] = sections.map(s => s.id === sectionId ? updated : s);
          }
          return { ...prev, sections: newSections };
        });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to update section');
      throw e;
    }
  }, [currentPassport]);

  const deleteSection = useCallback(async (passportId: string, sectionId: string) => {
    setError(null);
    try {
      await passportApi.deleteSection(passportId, sectionId);
      if (currentPassport && currentPassport.id === passportId) {
        setCurrentPassport(prev => {
          if (!prev) return prev;
          const newSections: Record<string, PassportSection[]> = {};
          for (const [type, sections] of Object.entries(prev.sections || {})) {
            newSections[type] = sections.filter(s => s.id !== sectionId);
          }
          return { ...prev, sections: newSections };
        });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to delete section');
      throw e;
    }
  }, [currentPassport]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearCurrentPassport = useCallback(() => {
    setCurrentPassport(null);
  }, []);

  return (
    <PassportContext.Provider
      value={{
        passports,
        currentPassport,
        isLoading,
        error,
        loadPassports,
        loadPassport,
        createPassport,
        updatePassport,
        addSection,
        updateSection,
        deleteSection,
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
