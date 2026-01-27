// src/app/auth/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { MdFace } from 'react-icons/md';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (err: any) {
      // Error is handled by AuthContext
    }
  };

  const displayError = localError || error;

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-gray-50 p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-md p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-5 sm:mb-8">
            <div className="flex justify-center mb-3">
              <MdFace className="w-12 h-12 sm:w-14 sm:h-14 text-[#581c87]" aria-hidden="true" />
            </div>
            <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-base text-gray-700 mt-1.5 sm:mt-2">
              Sign in to access your passports
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address<span className="text-[#be185d] ml-0.5">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                disabled={isLoading}
                className="w-full px-3 py-2.5 rounded-md border-2 bg-white text-base text-gray-900 border-gray-300 hover:border-gray-400 focus:border-[#be185d] focus:outline-none focus:ring-4 focus:ring-pink-200/50 transition-all min-h-[48px] placeholder:text-gray-500 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password<span className="text-[#be185d] ml-0.5">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full px-3 py-2.5 rounded-md border-2 bg-white text-base text-gray-900 border-gray-300 hover:border-gray-400 focus:border-[#be185d] focus:outline-none focus:ring-4 focus:ring-pink-200/50 transition-all min-h-[48px] placeholder:text-gray-500 disabled:opacity-50"
              />
            </div>

            {displayError && (
              <p className="text-xs sm:text-sm text-red-800 bg-red-50 p-2.5 sm:p-3 rounded-lg border border-red-200" role="alert">
                {displayError}
              </p>
            )}

            <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-[#be185d] hover:underline font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
