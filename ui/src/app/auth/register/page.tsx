// src/app/auth/register/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { MdFace } from 'react-icons/md';
import { inviteApi } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isLoading, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [localError, setLocalError] = useState('');
  const [emailLocked, setEmailLocked] = useState(false);

  // Validate invite token on mount and pre-fill email if valid
  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (!inviteToken) return;

    inviteApi.validate(inviteToken)
      .then(({ email: invitedEmail }) => {
        setEmail(invitedEmail);
        setEmailLocked(true);
      })
      .catch((err) => {
        setLocalError(err instanceof Error ? err.message : 'This invitation link is invalid or has expired');
      });
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!name.trim()) {
      setLocalError('Please enter your name');
      return;
    }
    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }
    if (!password) {
      setLocalError('Please enter a password');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (!consentGiven) {
      setLocalError('You must confirm parental responsibility to create an account');
      return;
    }

    try {
      await register(name.trim(), email.trim(), password, consentGiven);
      router.push(emailLocked ? '/dashboard' : '/wizard');
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
              Create Account
            </h1>
            <p className="text-xs sm:text-base text-gray-700 mt-1.5 sm:mt-2">
              {emailLocked
                ? 'Accept your invitation and get started'
                : 'Start creating passports for your children'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Your name<span className="text-[#be185d] ml-0.5">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                autoComplete="name"
                disabled={isLoading}
                className="w-full px-3 py-2.5 rounded-md border-2 bg-white text-base text-gray-900 border-gray-300 hover:border-gray-400 focus:border-[#be185d] focus:outline-none focus:ring-4 focus:ring-pink-200/50 transition-all min-h-[48px] placeholder:text-gray-500 disabled:opacity-50"
              />
            </div>

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
                disabled={isLoading || emailLocked}
                className="w-full px-3 py-2.5 rounded-md border-2 bg-white text-base text-gray-900 border-gray-300 hover:border-gray-400 focus:border-[#be185d] focus:outline-none focus:ring-4 focus:ring-pink-200/50 transition-all min-h-[48px] placeholder:text-gray-500 disabled:opacity-50"
              />
              {emailLocked && (
                <p className="text-xs text-purple-600 mt-1">Pre-filled from your invitation link</p>
              )}
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
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
                disabled={isLoading}
                className="w-full px-3 py-2.5 rounded-md border-2 bg-white text-base text-gray-900 border-gray-300 hover:border-gray-400 focus:border-[#be185d] focus:outline-none focus:ring-4 focus:ring-pink-200/50 transition-all min-h-[48px] placeholder:text-gray-500 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm password<span className="text-[#be185d] ml-0.5">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
                disabled={isLoading}
                className="w-full px-3 py-2.5 rounded-md border-2 bg-white text-base text-gray-900 border-gray-300 hover:border-gray-400 focus:border-[#be185d] focus:outline-none focus:ring-4 focus:ring-pink-200/50 transition-all min-h-[48px] placeholder:text-gray-500 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1 pt-2">
              <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border-2 border-gray-200 hover:border-purple-300 transition-colors cursor-pointer bg-gray-50">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  disabled={isLoading}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded border-2 border-gray-300 text-[#a855f7] focus:ring-4 focus:ring-[#a855f7]/20 cursor-pointer flex-shrink-0 mt-0.5"
                />
                <label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer">
                  <span className="font-medium text-gray-900">I confirm parental responsibility</span>
                  <br />
                  <span className="text-xs">
                    I confirm that I have parental responsibility for the child(ren) whose information I will be
                    entering, and I consent to the processing of this data in accordance with UK GDPR.
                  </span>
                </label>
              </div>
            </div>

            {displayError && (
              <p className="text-xs sm:text-sm text-red-800 bg-red-50 p-2.5 sm:p-3 rounded-lg border border-red-200" role="alert">
                {displayError}
              </p>
            )}

            <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-[#be185d] hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <p className="text-center text-[10px] sm:text-xs text-gray-500 mt-4">
            By creating an account, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </main>
  );
}
