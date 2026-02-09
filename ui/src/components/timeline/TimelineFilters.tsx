'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { EntryType } from '@/lib/types';
import { ENTRY_TYPE_CONFIG, ENTRY_TYPE_CATEGORIES } from '@/lib/constants';
import { MdFilterList, MdClose, MdCalendarToday } from 'react-icons/md';

interface TimelineFiltersProps {
  selectedTypes: EntryType[];
  onTypesChange: (types: EntryType[]) => void;
  dateRange: { start: string; end: string } | null;
  onDateRangeChange: (range: { start: string; end: string } | null) => void;
  onClear: () => void;
}

export function TimelineFilters({
  selectedTypes,
  onTypesChange,
  dateRange,
  onDateRangeChange,
  onClear,
}: TimelineFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  const hasActiveFilters = selectedTypes.length > 0 || dateRange !== null;
  const activeCount = selectedTypes.length + (dateRange ? 1 : 0);

  const announce = (msg: string) => {
    setAnnouncement(msg);
    setTimeout(() => setAnnouncement(''), 1500);
  };

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowFilters(false);
      toggleBtnRef.current?.focus();
    }
  };

  const toggleType = (type: EntryType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
      announce(`Removed ${ENTRY_TYPE_CONFIG[type].label} filter`);
    } else {
      onTypesChange([...selectedTypes, type]);
      announce(`Added ${ENTRY_TYPE_CONFIG[type].label} filter`);
    }
  };

  const removeType = (type: EntryType) => {
    onTypesChange(selectedTypes.filter(t => t !== type));
    announce(`Removed ${ENTRY_TYPE_CONFIG[type].label} filter`);
  };

  const selectCategory = (types: readonly string[]) => {
    const newTypes = types.filter(t => !selectedTypes.includes(t as EntryType)) as EntryType[];
    if (newTypes.length > 0) {
      onTypesChange([...selectedTypes, ...newTypes]);
      announce(`Added ${types[0]} category filters`);
    } else {
      onTypesChange(selectedTypes.filter(t => !types.includes(t)));
      announce(`Removed ${types[0]} category filters`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Filter toggle button — min 44×44px touch target */}
      <button
        ref={toggleBtnRef}
        onClick={() => setShowFilters(!showFilters)}
        aria-expanded={showFilters}
        aria-haspopup="true"
        aria-controls="timeline-filter-panel"
        className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg border-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 ${
          hasActiveFilters
            ? 'border-purple-600 bg-purple-50 text-purple-800'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
        }`}
      >
        <MdFilterList className="w-5 h-5" aria-hidden="true" />
        <span className="text-sm">Filters</span>
        {hasActiveFilters && (
          <span
            className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-purple-700 text-white rounded-full"
            aria-label={`${activeCount} active filters`}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Filter panel */}
      {showFilters && (
        <div
          id="timeline-filter-panel"
          role="dialog"
          aria-labelledby={headingId}
          onKeyDown={handleKeyDown}
          className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-20"
        >
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 id={headingId} className="font-semibold text-gray-900">Filter Timeline</h4>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    onClear();
                    setShowFilters(false);
                    announce('All filters cleared');
                  }}
                  className="text-sm text-purple-700 hover:text-purple-900 underline focus:outline-none focus:ring-2 focus:ring-purple-600 rounded px-1"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Date range */}
            <fieldset className="space-y-2 mb-4">
              <legend className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <MdCalendarToday className="w-4 h-4" aria-hidden="true" />
                Date Range
              </legend>
              <div className="flex gap-2">
                <label className="flex-1">
                  <span className="sr-only">Start date</span>
                  <input
                    type="date"
                    value={dateRange?.start || ''}
                    onChange={(e) => onDateRangeChange({
                      start: e.target.value,
                      end: dateRange?.end || e.target.value,
                    })}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[44px]"
                  />
                </label>
                <span className="text-gray-400 self-center text-sm" aria-hidden="true">to</span>
                <label className="flex-1">
                  <span className="sr-only">End date</span>
                  <input
                    type="date"
                    value={dateRange?.end || ''}
                    onChange={(e) => onDateRangeChange({
                      start: dateRange?.start || e.target.value,
                      end: e.target.value,
                    })}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[44px]"
                  />
                </label>
              </div>
              {dateRange && (
                <button
                  onClick={() => { onDateRangeChange(null); announce('Date filter cleared'); }}
                  className="text-xs text-gray-600 hover:text-gray-900 underline focus:outline-none focus:ring-2 focus:ring-purple-600 rounded px-1"
                >
                  Clear dates
                </button>
              )}
            </fieldset>
          </div>

          {/* Entry types by category */}
          <div className="p-4 max-h-64 overflow-y-auto" role="group" aria-label="Entry type filters">
            <p className="text-sm font-medium text-gray-700 mb-2">Entry Types</p>
            {Object.entries(ENTRY_TYPE_CATEGORIES).map(([category, types]) => (
              <div key={category} className="mb-3">
                <button
                  onClick={() => selectCategory(types)}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900 mb-1 underline focus:outline-none focus:ring-2 focus:ring-purple-600 rounded px-1 min-h-[44px] flex items-center"
                >
                  {category}
                </button>
                <div className="flex flex-wrap gap-1" role="group" aria-label={`${category} filters`}>
                  {types.map(type => {
                    const config = ENTRY_TYPE_CONFIG[type as keyof typeof ENTRY_TYPE_CONFIG];
                    const isSelected = selectedTypes.includes(type as EntryType);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleType(type as EntryType)}
                        aria-pressed={isSelected}
                        className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-600 ${
                          isSelected
                            ? `${config.badgeBg} ${config.badgeText} ring-2 ring-offset-1 ring-current`
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Apply / close button */}
          <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <button
              onClick={() => setShowFilters(false)}
              className="w-full min-h-[44px] px-4 py-2 bg-purple-700 text-white text-sm font-semibold rounded-lg hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 mt-2" role="list" aria-label="Active filters">
          {dateRange && (
            <span role="listitem" className="inline-flex items-center gap-1 pl-3 pr-1 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
              {dateRange.start} – {dateRange.end}
              <button
                onClick={() => { onDateRangeChange(null); announce('Date filter removed'); }}
                aria-label="Remove date range filter"
                className="flex items-center justify-center w-5 h-5 ml-0.5 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <MdClose className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          )}
          {selectedTypes.map(type => {
            const config = ENTRY_TYPE_CONFIG[type];
            return (
              <span
                key={type}
                role="listitem"
                className={`inline-flex items-center gap-1 pl-3 pr-1 py-1 text-xs font-medium rounded-full ${config.badgeBg} ${config.badgeText}`}
              >
                {config.label}
                <button
                  onClick={() => removeType(type)}
                  aria-label={`Remove ${config.label} filter`}
                  className="flex items-center justify-center w-5 h-5 ml-0.5 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-current"
                >
                  <MdClose className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
