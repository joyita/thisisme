// src/app/share/[token]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { shareApi, SharedPassport, ShareAccessResponse } from '@/lib/api';
import { MdLock, MdAccessTime, MdPerson, MdFavorite, MdThumbDown, MdStar, MdHelp } from 'react-icons/md';
import { AlertCircle } from 'lucide-react';

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

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'LOVES': return <MdFavorite className="w-5 h-5 text-pink-500" />;
      case 'HATES': return <MdThumbDown className="w-5 h-5 text-orange-500" />;
      case 'STRENGTHS': return <MdStar className="w-5 h-5 text-yellow-500" />;
      case 'NEEDS': return <MdHelp className="w-5 h-5 text-blue-500" />;
      default: return null;
    }
  };

  const getSectionTitle = (type: string) => {
    switch (type) {
      case 'LOVES': return 'Loves';
      case 'HATES': return 'Finds Difficult';
      case 'STRENGTHS': return 'Strengths';
      case 'NEEDS': return 'Needs';
      default: return type;
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

  // Display shared passport
  if (sharedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {sharedData.childFirstName.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {sharedData.childFirstName}&apos;s Passport
                </h1>
                {sharedData.childDateOfBirth && (
                  <p className="text-gray-600">
                    Born {formatDate(sharedData.childDateOfBirth)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Sections */}
          {sharedData.sections.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              {sharedData.sections.map((section, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {getSectionIcon(section.type)}
                    <h2 className="font-semibold text-gray-900">
                      {getSectionTitle(section.type)}
                    </h2>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{section.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Timeline */}
          {sharedData.timelineEntries.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-4">
                {sharedData.timelineEntries.map((entry, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-gray-900">{entry.title}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MdAccessTime className="w-4 h-4" />
                          {formatDate(entry.entryDate)}
                          <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {entry.entryType}
                          </span>
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-700 mt-3 whitespace-pre-wrap">{entry.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {sharedData.documents.length > 0 && (
            <div>
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
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">No content has been shared via this link.</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white mt-8">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
            Shared via <span className="font-semibold text-purple-600">This Is Me</span> passport
          </div>
        </footer>
      </div>
    );
  }

  return null;
}
