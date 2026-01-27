// src/app/admin/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePassport } from '@/context/PassportContext';

// Redirect old admin page to new dashboard
export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { passports, isLoading: passportsLoading } = usePassport();

  useEffect(() => {
    if (authLoading || passportsLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // If user has passports, redirect to the first one
    // Otherwise redirect to dashboard to create one
    if (passports.length > 0) {
      router.push(`/passport/${passports[0].id}`);
    } else {
      router.push('/dashboard');
    }
  }, [authLoading, passportsLoading, isAuthenticated, passports, router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p>Redirecting...</p>
    </main>
  );
}
