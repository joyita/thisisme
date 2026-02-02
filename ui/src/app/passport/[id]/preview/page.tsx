// src/app/passport/[id]/preview/page.tsx
'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePassport } from '@/context/PassportContext';
import { SECTIONS } from '@/lib/constants';
import { MdArrowBack, MdPrint, MdEdit, MdFavorite, MdWarning, MdStar, MdHandshake } from 'react-icons/md';
import toast from 'react-hot-toast';

type SectionType = 'LOVES' | 'HATES' | 'STRENGTHS' | 'NEEDS';

const SECTION_CONFIG: Record<SectionType, {
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}> = {
  LOVES: {
    title: 'What I Love',
    icon: <MdFavorite />,
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    iconColor: 'text-pink-500',
  },
  HATES: {
    title: 'What I Find Difficult',
    icon: <MdWarning />,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconColor: 'text-orange-500',
  },
  STRENGTHS: {
    title: 'What I Am Amazing At',
    icon: <MdStar />,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
  },
  NEEDS: {
    title: 'What I Need Help With',
    icon: <MdHandshake />,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
  },
};

export default function PassportPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentPassport, loadPassport, isLoading } = usePassport();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (isAuthenticated && resolvedParams.id) {
      loadPassport(resolvedParams.id).catch(() => {
        toast.error('Failed to load passport');
        router.push('/dashboard');
      });
    }
  }, [authLoading, isAuthenticated, resolvedParams.id, router, loadPassport]);

  const handlePrint = () => {
    window.print();
  };

  if (authLoading || !isAuthenticated || isLoading || !currentPassport) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading preview...</p>
      </main>
    );
  }

  const getSectionsByType = (type: SectionType) => {
    return (currentPassport.sections?.[type] || []).filter(s => s.published);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .page-break {
            page-break-before: always;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <main className="min-h-screen bg-white">
        {/* Header - hidden in print */}
        <header className="no-print bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link
              href={`/passport/${resolvedParams.id}`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <MdArrowBack className="w-5 h-5" />
              <span>Back to Passport</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href={`/passport/${resolvedParams.id}`}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg"
              >
                <MdEdit className="w-5 h-5" />
                <span>Edit</span>
              </Link>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <MdPrint className="w-5 h-5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </header>

        {/* Preview content */}
        <div className="print-container max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Title section */}
          <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
              {currentPassport.childFirstName.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentPassport.childFirstName}&apos;s Passport
            </h1>
            {currentPassport.childDateOfBirth && (
              <p className="text-gray-600">
                Date of Birth: {formatDate(currentPassport.childDateOfBirth)}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Created by:</span>{' '}
                <span className="font-medium text-gray-900">
                  {currentPassport.createdByName || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Last updated:</span>{' '}
                <span className="font-medium text-gray-900">
                  {formatDate(currentPassport.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {(['LOVES', 'STRENGTHS', 'HATES', 'NEEDS'] as SectionType[]).map(type => {
              const config = SECTION_CONFIG[type];
              const sections = getSectionsByType(type);
              const sectionConfig = SECTIONS[type.toUpperCase() as keyof typeof SECTIONS];

              if (sections.length === 0) return null;

              return (
                <section
                  key={type}
                  className={`${config.bgColor} border ${config.borderColor} rounded-xl p-6`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-2xl ${config.iconColor}`}>{config.icon}</span>
                    <h2 className="text-xl font-bold text-gray-900">{sectionConfig.title}</h2>
                  </div>

                  <ul className="space-y-3">
                    {sections.map(section => (
                      <li
                        key={section.id}
                        className="bg-white rounded-lg p-4 shadow-sm"
                      >
                        <p className="text-gray-800">{section.content}</p>
                        {type === 'HATES' && section.remedialSuggestion && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded shrink-0">
                                What helps
                              </span>
                              <p className="text-sm text-green-800">
                                {section.remedialSuggestion}
                              </p>
                            </div>
                          </div>
                        )}
                        {section.lastEditedByName && (
                          <p className="mt-2 text-xs text-gray-400">
                            Last edited by {section.lastEditedByName}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>
              This passport was last updated on {formatDate(currentPassport.updatedAt)}
            </p>
            <p className="mt-1">
              Printed from Pupil Passport - A living document for SEND pupils
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
