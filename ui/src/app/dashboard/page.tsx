// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePassport } from '@/context/PassportContext';
import { Button } from '@/components/ui/Button';
import { MdFace, MdAdd, MdLogout, MdCalendarToday } from 'react-icons/md';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout, isChildAccount } = useAuth();
  const { passports, isLoading: passportsLoading, createPassport, error } = usePassport();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [childName, setChildName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    // Child accounts should not access dashboard
    if (!authLoading && isChildAccount && user?.passportId) {
      router.push(`/passport/${user.passportId}`);
    }
  }, [authLoading, isAuthenticated, isChildAccount, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleCreatePassport = async () => {
    if (!childName.trim()) return;
    setCreating(true);
    try {
      const passport = await createPassport(childName.trim(), childDob || undefined);
      setShowCreateModal(false);
      setChildName('');
      setChildDob('');
      router.push(`/passport/${passport.id}`);
    } catch (err) {
      // Error handled by context
    } finally {
      setCreating(false);
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MdFace className="w-8 h-8 text-[#581c87]" aria-hidden="true" />
            <h1 className="text-xl font-bold text-gray-900">ThisIsMe</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline text-sm text-gray-600">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Sign out"
            >
              <MdLogout className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Passports</h2>
            <p className="text-gray-600 mt-1">Manage passports for your children</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 self-start sm:self-auto">
            <MdAdd className="w-5 h-5" />
            New Passport
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {passportsLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading passports...</p>
          </div>
        ) : passports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
              <MdFace className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No passports yet</h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Create your first passport to start documenting what makes your child unique.
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2">
              <MdAdd className="w-5 h-5" />
              Create Passport
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {passports.map((passport) => (
              <Link
                key={passport.id}
                href={`/passport/${passport.id}`}
                className="group block bg-white rounded-xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform">
                    {passport.childFirstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{passport.childFirstName}</h3>
                    <p className="text-sm text-purple-600 capitalize">{passport.role?.toLowerCase() || 'owner'}</p>
                  </div>
                </div>
                {(passport.createdAt || passport.updatedAt) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                    <MdCalendarToday className="w-4 h-4" />
                    <span>Created {new Date(passport.createdAt || passport.updatedAt!).toLocaleDateString()}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-md w-full max-w-md p-6 sm:p-8 shadow-sm">
            <div className="mb-5 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Create New Passport</h3>
              <p className="text-sm text-gray-600 mt-1">Start documenting what makes your child unique.</p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1">
                <label htmlFor="childName" className="block text-sm font-medium text-gray-700">
                  Child&apos;s first name<span className="text-[#be185d] ml-0.5">*</span>
                </label>
                <input
                  id="childName"
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Enter child's first name"
                  autoFocus
                  disabled={creating}
                  className="w-full px-3 py-2.5 rounded-md border-2 bg-white text-base text-gray-900 border-gray-300 hover:border-gray-400 focus:border-[#be185d] focus:outline-none focus:ring-4 focus:ring-pink-200/50 transition-all min-h-[48px] placeholder:text-gray-500 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="childDob" className="block text-sm font-medium text-gray-700">
                  Date of birth <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="childDob"
                  type="date"
                  value={childDob}
                  onChange={(e) => setChildDob(e.target.value)}
                  disabled={creating}
                  className="w-full px-3 py-2.5 rounded-md border-2 bg-white text-base text-gray-900 border-gray-300 hover:border-gray-400 focus:border-[#be185d] focus:outline-none focus:ring-4 focus:ring-pink-200/50 transition-all min-h-[48px] placeholder:text-gray-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setChildName('');
                  setChildDob('');
                }}
                className="flex-1"
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePassport}
                className="flex-1"
                disabled={creating || !childName.trim()}
              >
                {creating ? 'Creating...' : 'Create Passport'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
