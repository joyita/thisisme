// src/components/PassportView.tsx
'use client';

import { forwardRef } from 'react';
import Image from 'next/image';
import { Passport } from '@/lib/api';
import { SECTIONS } from '@/lib/constants';
import { MdFavorite, MdWarning, MdStar, MdHandshake, MdFace } from 'react-icons/md';

type SectionType = 'LOVES' | 'HATES' | 'STRENGTHS' | 'NEEDS';

interface PassportViewProps {
  passport: Passport;
}

export const PassportView = forwardRef<HTMLDivElement, PassportViewProps>(
  function PassportView({ passport }, ref) {
    const childName = passport.childFirstName;
    const getPublishedItems = (type: SectionType) =>
      (passport.sections[type] || []).filter(s => s.published);

    const getSectionIcon = (type: SectionType) => {
      const iconClass = "text-2xl";
      switch (type) {
        case 'LOVES': return <MdFavorite className={iconClass} />;
        case 'HATES': return <MdWarning className={iconClass} />;
        case 'STRENGTHS': return <MdStar className={iconClass} />;
        case 'NEEDS': return <MdHandshake className={iconClass} />;
      }
    };

    const colors: Record<SectionType, { bg: string; accent: string; icon: string; bullet: string }> = {
      LOVES: { bg: 'bg-orange-50', accent: 'text-orange-700', icon: 'text-orange-600', bullet: 'text-orange-400' },
      HATES: { bg: 'bg-amber-50', accent: 'text-amber-800', icon: 'text-amber-600', bullet: 'text-amber-400' },
      STRENGTHS: { bg: 'bg-orange-50', accent: 'text-orange-700', icon: 'text-orange-600', bullet: 'text-orange-400' },
      NEEDS: { bg: 'bg-amber-50', accent: 'text-amber-800', icon: 'text-amber-600', bullet: 'text-amber-400' },
    };

    const renderCard = (sectionType: SectionType) => {
      const items = getPublishedItems(sectionType);
      const c = colors[sectionType];

      return (
        <div className={`${c.bg} rounded-2xl p-[30px] h-full min-h-[200px] md:min-h-[240px]`}>
          <div className="flex items-center gap-2 mb-4 ml-[10px]">
            <div className={c.icon}>{getSectionIcon(sectionType)}</div>
            <h2 className={`text-lg md:text-xl font-black ${c.accent}`}>{SECTIONS[sectionType].title}</h2>
          </div>
          {items.length === 0 ? (
            <p className="text-base text-gray-500 italic">No items published</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="text-base md:text-lg text-gray-900 leading-relaxed flex gap-2">
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

    const renderMobileCard = (sectionType: SectionType) => {
      const items = getPublishedItems(sectionType);
      const c = colors[sectionType];
      return (
        <div className={`${c.bg} rounded-2xl p-[30px] h-full`}>
          <div className="flex items-center gap-2 mb-4 ml-[10px]">
            <div className={c.icon}>{getSectionIcon(sectionType)}</div>
            <h2 className={`text-lg font-black ${c.accent}`}>{SECTIONS[sectionType].title}</h2>
          </div>
          {items.length === 0 ? (
            <p className="text-base text-gray-500 italic">No items published</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="text-base text-gray-900 leading-relaxed flex gap-2">
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
      <div ref={ref} className="bg-white" data-print-container>
        {/* Header with name and subtitle */}
        <div className="text-center py-4 border-b border-orange-100">
          <div className="flex items-center justify-center gap-2">
            <MdFace className="w-7 h-7 text-[#fca103]" aria-hidden="true" />
            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-orange-700 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              <span className="capitalize">{childName}</span>&apos;s Passport
            </h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">A living document to help caregivers understand and support {childName}</p>
        </div>

        {/* Mobile Layout - Avatar above, single column stacked cards */}
        <div className="md:hidden print:hidden">
          <div className="flex flex-col items-center pt-6 pb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#fca103] to-[#fce703] flex items-center justify-center border-4 border-white">
              {passport.childAvatar ? (
                <Image src={passport.childAvatar} alt={childName} width={80} height={80} className="w-full h-full rounded-full object-cover" unoptimized />
              ) : (
                <MdFace className="text-3xl text-white" />
              )}
            </div>
          </div>
          <div className="px-4 pb-6 space-y-4">
            {renderMobileCard('LOVES')}
            {renderMobileCard('HATES')}
            {renderMobileCard('STRENGTHS')}
            {renderMobileCard('NEEDS')}
          </div>
        </div>

        {/* Desktop/Tablet/Print Layout - 2x2 grid with avatar center */}
        <div className="hidden md:block print:block px-6 py-8">
          <div className="max-w-4xl mx-auto relative">
            <div className="grid grid-cols-2 gap-3">
              {renderCard('LOVES')}
              {renderCard('HATES')}
              {renderCard('STRENGTHS')}
              {renderCard('NEEDS')}
            </div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#fca103] to-[#fce703] flex items-center justify-center border-[6px] border-white">
                {passport.childAvatar ? (
                  <Image src={passport.childAvatar} alt={childName} width={96} height={96} className="w-full h-full rounded-full object-cover" unoptimized />
                ) : (
                  <MdFace className="text-4xl text-white" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with document info */}
        <footer className="py-3 px-4 border-t border-orange-100 bg-orange-50/50">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <span>
                <span className="font-medium text-gray-700">Owner:</span> {passport.createdByName}
              </span>
              <span>
                <span className="font-medium text-gray-700">Last updated:</span> {new Date(passport.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <span className="text-gray-500">Pupil Passport</span>
          </div>
        </footer>

        {/* Print styles */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4 landscape;
              margin: 6mm;
            }
            html, body {
              height: 100%;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            [data-print-container] {
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            [data-print-container] > div:first-child {
              padding: 8px 0 !important;
            }
            [data-print-container] .print\\:block {
              flex: 1;
              padding: 8px 16px !important;
              display: flex !important;
              align-items: center;
              justify-content: center;
            }
            [data-print-container] .print\\:block > div {
              max-width: 100% !important;
              width: 100%;
              height: 100%;
            }
            [data-print-container] .print\\:block .grid {
              height: 100%;
              gap: 10px !important;
            }
            [data-print-container] .print\\:block .grid > div {
              padding: 16px 20px !important;
              min-height: 0 !important;
            }
          }
        `}</style>
      </div>
    );
  }
);
