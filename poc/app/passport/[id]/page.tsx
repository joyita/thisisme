// src/app/passport/[id]/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { usePassport } from '@/context/PassportContext';
import { PassportView } from '@/components/PassportView';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Printer, Edit, ArrowLeft, LogIn } from 'lucide-react';

export default function PublicPassportPage() {
  const router = useRouter();
  const passportRef = useRef<HTMLDivElement>(null);
  const { passport, isLoading, user } = usePassport();
  const handlePrint = useReactToPrint({ contentRef: passportRef, documentTitle: `${passport?.child.firstName || 'Pupil'}-Passport` });

  useEffect(() => { if (!isLoading && !passport) router.push('/'); }, [passport, isLoading, router]);

  if (isLoading || !passport) return <main className="min-h-screen flex items-center justify-center"><p>Loading...</p></main>;

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Action buttons - hidden on print */}
      <div className="sticky top-0 z-40 print:hidden bg-white/80 backdrop-blur-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-end gap-1 sm:gap-1.5">
          <button 
            onClick={() => handlePrint()} 
            className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] text-xs font-medium text-orange-700 hover:bg-orange-100 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Print</span>
          </button>
          {user && (
            <button 
              onClick={() => router.push('/admin')} 
              className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] text-xs font-semibold bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600 rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white shadow-sm"
            >
              {user.isOwner ? (
                <>
                  <Edit className="w-4 h-4" aria-hidden="true" />
                  <span>Edit</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  <span>Back</span>
                </>
              )}
            </button>
          )}
          {!user && (
            <button 
              onClick={() => router.push('/')} 
              className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] text-xs font-medium text-orange-700 hover:bg-orange-100 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      <main id="main-content" className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4">
          <Breadcrumb
            items={[
              { label: `${passport.child.firstName}'s Passport`, current: true }
            ]}
            className="mb-4 print:hidden"
          />
          <div ref={passportRef}>
            <PassportView passport={passport} />
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-700 print:hidden">Pupil Passport · Empowering caregivers</footer>
    </div>
  );
}

