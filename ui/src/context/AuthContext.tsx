// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, getTokens, clearTokens } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, consentGiven: boolean) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const tokens = getTokens();
    if (tokens) {
      // Try to get user info from stored data
      const storedUser = typeof window !== 'undefined'
        ? localStorage.getItem('user_info')
        : null;
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authApi.login(email, password);
      const newUser = { id: response.userId, name: response.name, email: response.email };
      setUser(newUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_info', JSON.stringify(newUser));
      }
    } catch (e: any) {
      setError(e.message || 'Login failed');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, consentGiven: boolean) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authApi.register(name, email, password, consentGiven);
      const newUser = { id: response.userId, name: response.name, email: response.email };
      setUser(newUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_info', JSON.stringify(newUser));
      }
    } catch (e: any) {
      setError(e.message || 'Registration failed');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore logout errors
    } finally {
      setUser(null);
      clearTokens();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_info');
      }
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
