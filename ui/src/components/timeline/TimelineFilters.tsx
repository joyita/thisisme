'use client';

import { useState } from 'react';
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

  const hasActiveFilters = selectedTypes.length > 0 || dateRange !== null;

  const toggleType = (type: EntryType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const selectCategory = (types: readonly string[]) => {
    const newTypes = types.filter(t => !selectedTypes.includes(t as EntryType)) as EntryType[];
    if (newTypes.length > 0) {
      onTypesChange([...selectedTypes, ...newTypes]);
    } else {
      // All types in category are selected, so remove them
      onTypesChange(selectedTypes.filter(t => !types.includes(t)));
    }
  };

  return (
    <div className="relative">
      {/* Filter toggle button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
          hasActiveFilters
            ? 'border-purple-300 bg-purple-50 text-purple-700'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <MdFilterList className="w-5 h-5" />
        <span className="text-sm font-medium">Filters</span>
        {hasActiveFilters && (
          <span className="px-1.5 py-0.5 text-xs bg-purple-600 text-white rounded-full">
            {selectedTypes.length + (dateRange ? 1 : 0)}
          </span>
        )}
      </button>

      {/* Filter panel */}
      {showFilters && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-20">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Filter Timeline</h4>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    onClear();
                    setShowFilters(false);
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Date range */}
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <MdCalendarToday className="w-4 h-4" />
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange?.start || ''}
                  onChange={(e) => onDateRangeChange({
                    start: e.target.value,
                    end: dateRange?.end || e.target.value,
                  })}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                />
                <span className="text-gray-400 self-center">to</span>
                <input
                  type="date"
                  value={dateRange?.end || ''}
                  onChange={(e) => onDateRangeChange({
                    start: dateRange?.start || e.target.value,
                    end: e.target.value,
                  })}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                />
              </div>
              {dateRange && (
                <button
                  onClick={() => onDateRangeChange(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear dates
                </button>
              )}
            </div>
          </div>

          {/* Entry types by category */}
          <div className="p-4 max-h-64 overflow-y-auto">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Entry Types</label>
            {Object.entries(ENTRY_TYPE_CATEGORIES).map(([category, types]) => (
              <div key={category} className="mb-3">
                <button
                  onClick={() => selectCategory(types)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 mb-1"
                >
                  {category}
                </button>
                <div className="flex flex-wrap gap-1">
                  {types.map(type => {
                    const config = ENTRY_TYPE_CONFIG[type as keyof typeof ENTRY_TYPE_CONFIG];
                    const isSelected = selectedTypes.includes(type as EntryType);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleType(type as EntryType)}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          isSelected
                            ? `${config.badgeBg} ${config.badgeText} ring-2 ring-offset-1 ring-${config.color}-400`
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

          {/* Apply button */}
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setShowFilters(false)}
              className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1 mt-2">
          {dateRange && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
              {dateRange.start} - {dateRange.end}
              <button onClick={() => onDateRangeChange(null)} className="hover:text-gray-900">
                <MdClose className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedTypes.map(type => {
            const config = ENTRY_TYPE_CONFIG[type];
            return (
              <span
                key={type}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${config.badgeBg} ${config.badgeText}`}
              >
                {config.label}
                <button onClick={() => toggleType(type)} className="hover:opacity-70">
                  <MdClose className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
