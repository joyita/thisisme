// src/components/child/ExitChildModeModal.tsx
'use client';

import { useState } from 'react';
import { useChildMode } from '@/context/ChildModeContext';

export function ExitChildModeModal() {
  const { isExitModalOpen, setIsExitModalOpen, exitChildMode } = useChildMode();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isExitModalOpen) return null;

  const handleClose = () => {
    setIsExitModalOpen(false);
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const success = await exitChildMode(password);
      if (!success) {
        setError('Incorrect password');
      }
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
        <h3 className="text-xl font-extrabold text-gray-900 mb-1">Exit Child View</h3>
        <p className="text-sm text-gray-500 mb-5">Enter your password to return to the full view.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            autoFocus
            disabled={loading}
            className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-base font-medium placeholder:text-gray-300 focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100 transition-all"
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl font-medium">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 active:scale-[0.98] transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-40"
              disabled={loading || !password}
            >
              {loading ? 'Checking...' : 'Exit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
