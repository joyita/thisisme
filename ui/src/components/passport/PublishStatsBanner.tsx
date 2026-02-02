'use client';

import { PassportSection } from '@/lib/api';
import { SECTIONS } from '@/lib/constants';
import { MdWarning, MdCheckCircle, MdInfo } from 'react-icons/md';

type SectionType = 'LOVES' | 'HATES' | 'STRENGTHS' | 'NEEDS';

interface PublishStatsBannerProps {
  sections: PassportSection[];
  sectionType: SectionType;
}

export function PublishStatsBanner({ sections, sectionType }: PublishStatsBannerProps) {
  const config = SECTIONS[sectionType.toUpperCase() as keyof typeof SECTIONS];
  const published = sections.filter(s => s.published).length;
  const suggestedMax = config.suggestedMax;

  const isOverLimit = published > suggestedMax;
  const isAtLimit = published === suggestedMax;

  let bgColor = 'bg-gray-50 border-gray-200';
  let textColor = 'text-gray-900';
  let subTextColor = 'text-gray-600';
  let Icon = MdInfo;
  let iconColor = 'text-gray-500';

  if (isOverLimit) {
    bgColor = 'bg-orange-50 border-orange-200';
    textColor = 'text-orange-800';
    subTextColor = 'text-orange-700';
    Icon = MdWarning;
    iconColor = 'text-orange-600';
  } else if (isAtLimit) {
    bgColor = 'bg-amber-50 border-amber-200';
    textColor = 'text-amber-800';
    subTextColor = 'text-amber-700';
    Icon = MdCheckCircle;
    iconColor = 'text-amber-600';
  }

  const getMessage = () => {
    if (isOverLimit) {
      return 'Too many items may overwhelm readers. Consider unpublishing some.';
    }
    if (isAtLimit) {
      return "You've reached the suggested limit for this section.";
    }
    return `Suggested limit: ${suggestedMax} items for easy reading`;
  };

  return (
    <div className="px-4 py-2 sm:py-3">
      <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border ${bgColor}`}>
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm sm:text-base font-semibold ${textColor}`}>
            {published} of {suggestedMax} published
            {isOverLimit && (
              <span className="ml-2">({published - suggestedMax} over limit)</span>
            )}
          </p>
          <p className={`text-xs sm:text-sm ${subTextColor}`}>
            {getMessage()}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`text-lg sm:text-xl font-bold ${textColor}`}>
            {published}/{suggestedMax}
          </span>
        </div>
      </div>
    </div>
  );
}
