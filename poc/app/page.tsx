// src/app/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { usePassport } from '@/context/PassportContext';
import { Button } from '@/components/ui/Button';
import { MdFace } from 'react-icons/md';

export default function LoginPage() {
  const router = useRouter();
  const { login, passport, isLoading } = usePassport();
  const [username, setUsername] = useState('');
  const [isOwner, setIsOwner] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('Please enter your name'); return; }
    login(username.trim(), isOwner);
    if (isOwner) {
      router.push(passport?.wizardComplete ? '/admin' : '/wizard');
    } else {
      if (passport) router.push('/admin');
      else setError('No passport exists yet. The caregiver needs to create one first.');
    }
  };

  if (isLoading) return <main className="min-h-screen flex items-center justify-center"><p>Loading...</p></main>;

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-gray-50 p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-md p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-5 sm:mb-8">
            <div className="flex justify-center mb-3">
              <MdFace className="w-12 h-12 sm:w-14 sm:h-14 text-[#581c87]" aria-hidden="true" />
            </div>
            <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Pupil Passport</h1>
            <p className="text-xs sm:text-base text-gray-700 mt-1.5 sm:mt-2">Share what matters most about your child</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
            <div className="space-y-1">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Your name<span className="text-[#be185d] ml-0.5">*</span>
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                required
                autoComplete="name"
                aria-invalid={error && !username.trim() ? 'true' : undefined}
                aria-describedby="username-hint"
                className="w-full px-3 py-2.5 rounded-md border-2 bg-white text-base text-gray-900 border-gray-300 hover:border-gray-400 focus:border-[#be185d] focus:outline-none focus:ring-4 focus:ring-pink-200/50 transition-all min-h-[48px] placeholder:text-gray-500"
              />
              <p id="username-hint" className="text-xs text-gray-600">This will be shown as the author of items you add</p>
              {error && !username.trim() && <p className="text-xs text-[#be185d]" role="alert">{error}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border-2 border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                <input type="checkbox" id="is-owner" checked={isOwner} onChange={(e) => setIsOwner(e.target.checked)} aria-describedby="admin-hint" className="w-6 h-6 sm:w-7 sm:h-7 rounded border-2 border-gray-300 text-[#a855f7] focus:ring-4 focus:ring-[#a855f7]/20 cursor-pointer flex-shrink-0" />
                <label htmlFor="is-owner" className="text-sm sm:text-base text-gray-900 font-medium cursor-pointer flex-grow">
                  Log in as admin
                </label>
              </div>
              <p id="admin-hint" className="text-xs text-gray-600 px-1">Admins can create, edit, and publish passport items</p>
            </div>

            {error && username.trim() && <p className="text-xs sm:text-sm text-red-800 bg-red-50 p-2.5 sm:p-3 rounded-lg border border-red-200" role="alert">{error}</p>}

            <Button type="submit" className="w-full font-semibold">{isOwner ? 'Get Started' : 'View Passport'}</Button>
          </form>

          <p className="text-center text-[10px] sm:text-xs text-gray-700 mt-3 sm:mt-4">Saved locally on this device</p>
        </div>
      </div>
    </main>
  );
}
