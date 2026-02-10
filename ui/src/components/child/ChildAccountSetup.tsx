// src/components/child/ChildAccountSetup.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { childAccountApi, reviewApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { MdPerson, MdDelete, MdLock, MdBlock, MdVisibility, MdVisibilityOff } from 'react-icons/md';

interface ChildAccountSetupProps {
  passportId: string;
  childViewShowHates?: boolean;
}

export function ChildAccountSetup({ passportId, childViewShowHates = false }: ChildAccountSetupProps) {
  const [childAccount, setChildAccount] = useState<{ userId: string; username: string; active: boolean; createdAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHates, setShowHates] = useState(childViewShowHates);

  // Create form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Reset password state
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const loadAccount = useCallback(async () => {
    setLoading(true);
    try {
      const account = await childAccountApi.get(passportId);
      setChildAccount(account);
    } catch {
      setChildAccount(null);
    } finally {
      setLoading(false);
    }
  }, [passportId]);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);
    try {
      const account = await childAccountApi.create(passportId, username, password);
      setChildAccount(account);
      setSuccess('Child account created! They can now log in with their username and password.');
      setUsername('');
      setPassword('');
    } catch (e: any) {
      setError(e?.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetting(true);
    try {
      await childAccountApi.resetPassword(passportId, newPassword);
      setSuccess('Password reset successfully');
      setNewPassword('');
      setShowResetForm(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('This will prevent the child from logging in. Continue?')) return;
    try {
      await childAccountApi.deactivate(passportId);
      setSuccess('Account deactivated');
      loadAccount();
    } catch (e: any) {
      setError(e?.message || 'Failed to deactivate account');
    }
  };

  const handleDelete = async () => {
    if (!confirm('This will permanently remove the child account. Continue?')) return;
    try {
      await childAccountApi.delete(passportId);
      setSuccess('Account deleted');
      setChildAccount(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete account');
    }
  };

  const handleToggleHates = async () => {
    try {
      const newValue = !showHates;
      await reviewApi.updateChildViewSettings(passportId, newValue);
      setShowHates(newValue);
    } catch (e: any) {
      setError(e?.message || 'Failed to update settings');
    }
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <MdPerson className="w-5 h-5 text-purple-600" />
        Child Account
      </h3>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}

      {!childAccount ? (
        <form onSubmit={handleCreate} className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Create a login for your child so they can view and contribute to their passport.
          </p>
          <div>
            <label htmlFor="child-username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              id="child-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              minLength={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
          <div>
            <label htmlFor="child-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="child-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password (min 6 characters)"
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
          <Button type="submit" disabled={creating || !username || !password} size="sm">
            {creating ? 'Creating...' : 'Create Child Account'}
          </Button>
        </form>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Username: <code className="bg-white px-2 py-0.5 rounded text-purple-700">{childAccount.username}</code></p>
              <p className="text-xs text-gray-500 mt-1">
                Status: {childAccount.active ? (
                  <span className="text-green-600 font-medium">Active</span>
                ) : (
                  <span className="text-red-600 font-medium">Deactivated</span>
                )}
              </p>
            </div>
          </div>

          {showResetForm ? (
            <form onSubmit={handleResetPassword} className="flex gap-2 items-end">
              <div className="flex-1">
                <label htmlFor="new-pw" className="block text-xs text-gray-600 mb-1">New Password</label>
                <input
                  id="new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <Button type="submit" size="sm" disabled={resetting}>
                {resetting ? '...' : 'Save'}
              </Button>
              <button type="button" onClick={() => setShowResetForm(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowResetForm(true)} className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium">
                <MdLock className="w-4 h-4" /> Reset Password
              </button>
              {childAccount.active && (
                <button onClick={handleDeactivate} className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-800 font-medium">
                  <MdBlock className="w-4 h-4" /> Deactivate
                </button>
              )}
              <button onClick={handleDelete} className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 font-medium">
                <MdDelete className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Child view settings */}
      <div className="bg-gray-50 rounded-xl p-4">
        <button
          onClick={handleToggleHates}
          className="flex items-center gap-3 w-full text-left"
        >
          {showHates ? (
            <MdVisibility className="w-5 h-5 text-purple-600 flex-shrink-0" />
          ) : (
            <MdVisibilityOff className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">Show &quot;What I Find Difficult&quot; in child view</p>
            <p className="text-xs text-gray-500">
              {showHates ? 'Currently visible to child' : 'Currently hidden from child'}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
