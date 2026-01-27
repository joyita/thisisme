'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MdArrowBack, MdNotifications, MdCheck, MdComment, MdAlternateEmail, MdFavorite, MdShare, MdBlock, MdDescription, MdSettings } from 'react-icons/md';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { notificationApi, Notification, NotificationType, NotificationPageResponse } from '@/lib/api';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'COMMENT_ON_YOUR_ENTRY':
      return <MdComment className="w-5 h-5 text-blue-500" />;
    case 'MENTIONED_IN_COMMENT':
      return <MdAlternateEmail className="w-5 h-5 text-purple-500" />;
    case 'REACTION_ON_YOUR_ENTRY':
      return <MdFavorite className="w-5 h-5 text-pink-500" />;
    case 'PERMISSION_GRANTED':
      return <MdShare className="w-5 h-5 text-green-500" />;
    case 'PERMISSION_REVOKED':
      return <MdBlock className="w-5 h-5 text-red-500" />;
    case 'DOCUMENT_OCR_COMPLETE':
      return <MdDescription className="w-5 h-5 text-amber-500" />;
    default:
      return <MdNotifications className="w-5 h-5 text-gray-500" />;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { preferences, loadPreferences, updatePreference, markAsRead, markAsUnread, markAllAsRead, refreshUnreadCount } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'preferences'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load notifications
  useEffect(() => {
    async function loadNotifications() {
      setIsLoading(true);
      try {
        const response = await notificationApi.list(currentPage, 20);
        if (currentPage === 0) {
          setNotifications(response.notifications);
        } else {
          setNotifications(prev => [...prev, ...response.notifications]);
        }
        setHasMore(response.hasNext);
        setTotalElements(response.totalElements);
      } catch (e) {
        console.error('Failed to load notifications:', e);
      } finally {
        setIsLoading(false);
      }
    }

    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated, currentPage]);

  // Load preferences when tab changes
  useEffect(() => {
    if (activeTab === 'preferences' && preferences.length === 0) {
      loadPreferences();
    }
  }, [activeTab, preferences.length, loadPreferences]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
        );
        refreshUnreadCount();
      } catch (e) {
        // Continue with navigation
      }
    }

    // Navigate based on notification type
    if (notification.passportId) {
      if (notification.timelineEntryId) {
        router.push(`/passport/${notification.passportId}?entry=${notification.timelineEntryId}`);
      } else if (notification.documentId) {
        router.push(`/passport/${notification.passportId}?tab=documents`);
      } else {
        router.push(`/passport/${notification.passportId}`);
      }
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
      );
      refreshUnreadCount();
    } catch (e) {
      // Error handled in context
    }
  };

  const handleMarkAsUnread = async (notification: Notification) => {
    try {
      await markAsUnread(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: false, readAt: undefined } : n)
      );
      refreshUnreadCount();
    } catch (e) {
      // Error handled in context
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
    } catch (e) {
      // Error handled in context
    }
  };

  const handlePreferenceToggle = async (type: NotificationType, currentEnabled: boolean) => {
    try {
      await updatePreference(type, !currentEnabled);
    } catch (e) {
      // Error handled in context
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Back to dashboard"
            >
              <MdArrowBack className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4">
          <nav className="flex gap-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All Notifications
              {totalElements > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                  {totalElements}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`py-3 border-b-2 text-sm font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'preferences'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <MdSettings className="w-4 h-4" />
              Preferences
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === 'all' ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Actions bar */}
            {notifications.some(n => !n.isRead) && (
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-end">
                <button
                  onClick={handleMarkAllRead}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  Mark all as read
                </button>
              </div>
            )}

            {/* Notifications list */}
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <MdNotifications className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
                <p className="text-gray-500">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-purple-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.notificationType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs text-gray-400">{formatTimeAgo(notification.createdAt)}</p>
                        {notification.isRead ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsUnread(notification);
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Mark unread
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification);
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="flex-shrink-0">
                        <span className="inline-block w-2 h-2 bg-purple-600 rounded-full" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Load more */}
            {hasMore && (
              <div className="p-4 border-t border-gray-100 text-center">
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={isLoading}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Preferences tab */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-medium text-gray-900">Notification Preferences</h2>
              <p className="text-sm text-gray-500 mt-0.5">Choose which notifications you want to receive</p>
            </div>
            <div className="divide-y divide-gray-100">
              {preferences.map((pref) => (
                <div key={pref.notificationType} className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(pref.notificationType)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{pref.displayName}</p>
                      <p className="text-sm text-gray-500">{pref.description}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pref.enabled}
                      onChange={() => handlePreferenceToggle(pref.notificationType, pref.enabled)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
