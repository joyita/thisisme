// src/context/ChildModeContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { authApi } from '@/lib/api';

const STORAGE_KEY = 'thisisme_child_mode';

interface ChildModeContextType {
  isChildMode: boolean;
  enterChildMode: () => void;
  exitChildMode: (password: string) => Promise<boolean>;
  isExitModalOpen: boolean;
  setIsExitModalOpen: (open: boolean) => void;
}

const ChildModeContext = createContext<ChildModeContextType | null>(null);

function getInitialChildMode(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(STORAGE_KEY) === 'true';
}

export function ChildModeProvider({ children }: { children: ReactNode }) {
  const [isChildMode, setIsChildMode] = useState(getInitialChildMode);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const enterChildMode = useCallback(() => {
    setIsChildMode(true);
    sessionStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const exitChildMode = useCallback(async (password: string): Promise<boolean> => {
    try {
      const result = await authApi.verifyPassword(password);
      if (result.valid) {
        setIsChildMode(false);
        sessionStorage.removeItem(STORAGE_KEY);
        setIsExitModalOpen(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return (
    <ChildModeContext.Provider
      value={{
        isChildMode,
        enterChildMode,
        exitChildMode,
        isExitModalOpen,
        setIsExitModalOpen,
      }}
    >
      {children}
    </ChildModeContext.Provider>
  );
}

export function useChildMode() {
  const context = useContext(ChildModeContext);
  if (!context) {
    throw new Error('useChildMode must be used within a ChildModeProvider');
  }
  return context;
}
