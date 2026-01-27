'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MdNotifications, MdCheck, MdComment, MdAlternateEmail, MdFavorite, MdShare, MdBlock, MdDescription } from 'react-icons/md';
import { useNotifications } from '@/context/NotificationContext';
import { Notification, NotificationType } from '@/lib/api';

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

function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: {
  notification: Notification;
  onMarkAsRead: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.isRead ? 'bg-purple-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getNotificationIcon(notification.notificationType)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${!notification.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(notification.createdAt)}</p>
      </div>
      {!notification.isRead && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead();
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors"
          title="Mark as read"
        >
          <MdCheck className="w-4 h-4 text-gray-500" />
        </button>
      )}
    </div>
  );
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refreshNotifications();
    }
  }, [isOpen, refreshNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
      } catch (e) {
        // Continue with navigation even if marking fails
      }
    }

    setIsOpen(false);

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

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (e) {
      // Error is handled in context
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <MdNotifications className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-purple-600 hover:text-purple-800 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <MdNotifications className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={() => markAsRead(notification.id)}
                    onClick={() => handleNotificationClick(notification)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2">
            <Link
              href="/dashboard/notifications"
              className="block text-center text-sm text-purple-600 hover:text-purple-800 font-medium py-1"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
