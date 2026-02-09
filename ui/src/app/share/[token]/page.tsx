// src/app/share/[token]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { shareApi, SharedPassport, ShareAccessResponse } from '@/lib/api';
import { SECTIONS } from '@/lib/constants';
import {
  MdLock, MdAccessTime, MdPerson, MdFavorite, MdWarning, MdStar, MdHandshake, MdFace,
  MdCelebration, MdFlag, MdNotes, MdThumbDown, MdMedicalServices, MdSchool,
  MdPsychology, MdAssignment, MdMood, MdSensors, MdRecordVoiceOver, MdGroups
} from 'react-icons/md';
import { ENTRY_TYPE_CONFIG } from '@/lib/constants';
import { AlertCircle } from 'lucide-react';

const timelineEntryIcons: Record<string, React.ReactNode> = {
  INCIDENT: <MdWarning className="w-4 h-4" />,
  SUCCESS: <MdCelebration className="w-4 h-4" />,
  MILESTONE: <MdFlag className="w-4 h-4" />,
  NOTE: <MdNotes className="w-4 h-4" />,
  LIKE: <MdFavorite className="w-4 h-4" />,
  DISLIKE: <MdThumbDown className="w-4 h-4" />,
  MEDICAL: <MdMedicalServices className="w-4 h-4" />,
  EDUCATIONAL: <MdSchool className="w-4 h-4" />,
  THERAPY: <MdPsychology className="w-4 h-4" />,
  SCHOOL_REPORT: <MdAssignment className="w-4 h-4" />,
  BEHAVIOR: <MdMood className="w-4 h-4" />,
  SENSORY: <MdSensors className="w-4 h-4" />,
  COMMUNICATION: <MdRecordVoiceOver className="w-4 h-4" />,
  SOCIAL: <MdGroups className="w-4 h-4" />,
};

/** Strip raw @[Name](uuid) mentions down to just the name */
function stripMentions(text: string): string {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '$1');
}

type SectionType = 'LOVES' | 'HATES' | 'STRENGTHS' | 'NEEDS';

const SECTION_ORDER: SectionType[] = ['LOVES', 'HATES', 'STRENGTHS', 'NEEDS'];

const sectionColors: Record<SectionType, { bg: string; accent: string; icon: string; bullet: string }> = {
  LOVES: { bg: 'bg-orange-50', accent: 'text-orange-700', icon: 'text-orange-600', bullet: 'text-orange-400' },
  HATES: { bg: 'bg-amber-50', accent: 'text-amber-800', icon: 'text-amber-600', bullet: 'text-amber-400' },
  STRENGTHS: { bg: 'bg-orange-50', accent: 'text-orange-700', icon: 'text-orange-600', bullet: 'text-orange-400' },
  NEEDS: { bg: 'bg-amber-50', accent: 'text-amber-800', icon: 'text-amber-600', bullet: 'text-amber-400' },
};

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default function SharePage({ params }: SharePageProps) {
  const { token } = use(params);
  const [accessInfo, setAccessInfo] = useState<ShareAccessResponse | null>(null);
  const [sharedData, setSharedData] = useState<SharedPassport | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, [token]);

  const checkAccess = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const info = await shareApi.checkAccess(token);
      setAccessInfo(info);

      if (info.isExpired) {
        setError('This share link has expired.');
      } else if (!info.requiresPassword) {
        // No password needed, load directly
        await loadSharedData();
      }
    } catch (err: any) {
      setError('This share link is invalid or has been revoked.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSharedData = async () => {
    try {
      const data = await shareApi.accessShared(token);
      setSharedData(data);
    } catch (err: any) {
      setError('Failed to load shared passport.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setPasswordError(null);

    try {
      const isValid = await shareApi.verifyPassword(token, password);
      if (isValid) {
        await loadSharedData();
      } else {
        setPasswordError('Incorrect password. Please try again.');
      }
    } catch (err) {
      setPasswordError('Failed to verify password.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getSectionIcon = (type: SectionType) => {
    const iconClass = 'text-2xl';
    switch (type) {
      case 'LOVES': return <MdFavorite className={iconClass} />;
      case 'HATES': return <MdWarning className={iconClass} />;
      case 'STRENGTHS': return <MdStar className={iconClass} />;
      case 'NEEDS': return <MdHandshake className={iconClass} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading shared passport...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Access</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-2.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // Password required
  if (accessInfo?.requiresPassword && !sharedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MdLock className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Password Protected</h1>
            <p className="text-gray-600">
              This passport for <strong>{accessInfo.passportChildName}</strong> is password protected.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 flex items-start gap-3" role="alert">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{passwordError}</p>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Enter Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoFocus
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying || !password}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-md hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? 'Verifying...' : 'View Passport'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Display shared passport — matches PassportView layout
  if (sharedData) {
    const childName = sharedData.childFirstName;

    // Group sections by type
    const sectionsByType: Record<string, typeof sharedData.sections> = {};
    sharedData.sections.forEach(s => {
      if (!sectionsByType[s.type]) sectionsByType[s.type] = [];
      sectionsByType[s.type].push(s);
    });

    const renderCard = (type: SectionType) => {
      const items = sectionsByType[type] || [];
      const c = sectionColors[type];
      const title = SECTIONS[type]?.title || type;
      return (
        <div key={type} className={`${c.bg} rounded-2xl p-[30px] h-full min-h-[200px] md:min-h-[240px]`}>
          <div className="flex items-center gap-2 mb-4 ml-[10px]">
            <div className={c.icon}>{getSectionIcon(type)}</div>
            <h2 className={`text-lg md:text-xl font-black ${c.accent}`}>{title}</h2>
          </div>
          {items.length === 0 ? (
            <p className="text-base text-gray-500 italic">No items shared</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={i} className="text-base md:text-lg text-gray-900 leading-relaxed flex gap-2">
                  <span className={`${c.bullet} flex-shrink-0`}>•</span>
                  <span>
                    {item.content}
                    {item.remedialSuggestion && (
                      <span className="block text-[#166534] bg-green-50 px-2 py-1 rounded text-sm mt-1">✓ {item.remedialSuggestion}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    };

    return (
      <div className="min-h-screen bg-white">
        {/* Header — matches PassportView */}
        <div className="text-center py-4 border-b border-orange-100">
          <div className="flex items-center justify-center gap-2">
            <MdFace className="w-7 h-7 text-[#fca103]" aria-hidden="true" />
            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-orange-700 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              <span className="capitalize">{childName}</span>&apos;s Passport
            </h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">A living document to help caregivers understand and support {childName}</p>
        </div>

        {/* Mobile Layout — single column */}
        <div className="md:hidden">
          <div className="flex flex-col items-center pt-6 pb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#fca103] to-[#fce703] flex items-center justify-center border-4 border-white">
              <MdFace className="text-3xl text-white" />
            </div>
          </div>
          <div className="px-4 pb-6 space-y-4">
            {SECTION_ORDER.map(type => renderCard(type))}
          </div>
        </div>

        {/* Desktop Layout — 2x2 grid with centered avatar */}
        <div className="hidden md:block px-6 py-8">
          <div className="max-w-4xl mx-auto relative">
            <div className="grid grid-cols-2 gap-3">
              {SECTION_ORDER.map(type => renderCard(type))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#fca103] to-[#fce703] flex items-center justify-center border-[6px] border-white">
                <MdFace className="text-4xl text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {sharedData.timelineEntries.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Timeline</h2>
            <div className="bg-white rounded-xl px-4 sm:px-6 py-4">
              <div className="relative">
                {/* Continuous vertical line */}
                {sharedData.timelineEntries.length > 1 && (
                  <span
                    className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <ul className="space-y-6">
                  {sharedData.timelineEntries.map((entry, idx) => {
                    const entryConfig = ENTRY_TYPE_CONFIG[entry.entryType as keyof typeof ENTRY_TYPE_CONFIG];
                    return (
                      <li key={idx} className="flex gap-4 relative">
                        {/* Icon */}
                        <div className="flex-shrink-0 relative z-10">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${entryConfig?.bgColor || 'bg-gray-100'} ${entryConfig?.textColor || 'text-gray-700'} shadow-sm`}>
                            {timelineEntryIcons[entry.entryType] || <MdNotes className="w-4 h-4" />}
                          </span>
                        </div>
                        {/* Title + date */}
                        <div className="flex-1 min-w-0 pt-1.5">
                          <h4 className="font-semibold text-gray-900">{stripMentions(entry.title)}</h4>
                          <time className="text-xs text-gray-400" dateTime={entry.entryDate}>
                            {new Date(entry.entryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </time>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Documents */}
        {sharedData.documents.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 pb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Documents</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {sharedData.documents.map((doc, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                    <MdPerson className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.fileName}</p>
                    <p className="text-sm text-gray-500">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sharedData.sections.length === 0 &&
         sharedData.timelineEntries.length === 0 &&
         sharedData.documents.length === 0 && (
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">No content has been shared via this link.</p>
            </div>
          </div>
        )}

        {/* Footer — matches PassportView */}
        <footer className="py-3 px-4 border-t border-orange-100 bg-orange-50/50">
          <div className="max-w-4xl mx-auto text-center text-xs text-gray-600">
            <span className="text-gray-500">Pupil Passport</span>
          </div>
        </footer>
      </div>
    );
  }

  return null;
}
