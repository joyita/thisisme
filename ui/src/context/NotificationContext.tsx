'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { notificationApi, Notification, NotificationPreference, NotificationType } from '@/lib/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  preferences: NotificationPreference[];

  // Actions
  refreshNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAsUnread: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  updatePreference: (type: NotificationType, enabled: boolean) => Promise<void>;
  clearError: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const POLL_INTERVAL = 30000; // 30 seconds

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await notificationApi.getUnreadCount();
      setUnreadCount(response.count);
    } catch (e: any) {
      console.error('Failed to fetch unread count:', e);
    }
  }, [isAuthenticated]);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const response = await notificationApi.getRecentUnread(10);
      setNotifications(response);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e: any) {
      setError(e.message || 'Failed to mark as read');
      throw e;
    }
  }, []);

  const markAsUnread = useCallback(async (notificationId: string) => {
    try {
      await notificationApi.markAsUnread(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: false, readAt: undefined } : n)
      );
      setUnreadCount(prev => prev + 1);
    } catch (e: any) {
      setError(e.message || 'Failed to mark as unread');
      throw e;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (e: any) {
      setError(e.message || 'Failed to mark all as read');
      throw e;
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const prefs = await notificationApi.getPreferences();
      setPreferences(prefs);
    } catch (e: any) {
      console.error('Failed to load notification preferences:', e);
    }
  }, [isAuthenticated]);

  const updatePreference = useCallback(async (type: NotificationType, enabled: boolean) => {
    try {
      await notificationApi.updatePreference(type, enabled);
      setPreferences(prev =>
        prev.map(p => p.notificationType === type ? { ...p, enabled } : p)
      );
    } catch (e: any) {
      setError(e.message || 'Failed to update preference');
      throw e;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Start polling when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Initial fetch
      refreshUnreadCount();
      refreshNotifications();

      // Set up polling
      pollIntervalRef.current = setInterval(() => {
        refreshUnreadCount();
      }, POLL_INTERVAL);
    } else {
      // Clear state when not authenticated
      setNotifications([]);
      setUnreadCount(0);
      setPreferences([]);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, refreshUnreadCount, refreshNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        preferences,
        refreshNotifications,
        refreshUnreadCount,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        loadPreferences,
        updatePreference,
        clearError,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
