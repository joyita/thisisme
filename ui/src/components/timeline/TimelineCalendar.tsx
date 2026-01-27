'use client';

import { useState, useMemo } from 'react';
import { TimelineEntry } from '@/lib/api';
import { ENTRY_TYPE_CONFIG } from '@/lib/constants';
import { MdChevronLeft, MdChevronRight, MdToday } from 'react-icons/md';

interface TimelineCalendarProps {
  entries: TimelineEntry[];
  onEntryClick: (entry: TimelineEntry) => void;
  onDateClick: (date: Date) => void;
}

export function TimelineCalendar({ entries, onEntryClick, onDateClick }: TimelineCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>();
    entries.forEach(entry => {
      const dateKey = new Date(entry.entryDate).toISOString().split('T')[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(entry);
    });
    return map;
  }, [entries]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const getDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const days = [];
  // Empty cells for days before the first of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50" />);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = getDateKey(day);
    const dayEntries = entriesByDate.get(dateKey) || [];
    const date = new Date(year, month, day);

    days.push(
      <div
        key={day}
        className={`h-24 border border-gray-100 p-1 cursor-pointer hover:bg-gray-50 transition-colors ${
          isToday(day) ? 'bg-purple-50 border-purple-200' : 'bg-white'
        }`}
        onClick={() => onDateClick(date)}
      >
        <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-purple-600' : 'text-gray-700'}`}>
          {day}
        </div>
        <div className="space-y-0.5 overflow-hidden">
          {dayEntries.slice(0, 3).map(entry => {
            const config = ENTRY_TYPE_CONFIG[entry.entryType];
            return (
              <div
                key={entry.id}
                className={`text-xs truncate px-1 py-0.5 rounded ${config?.badgeBg || 'bg-gray-100'} ${config?.badgeText || 'text-gray-700'} cursor-pointer hover:opacity-80`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEntryClick(entry);
                }}
                title={entry.title}
              >
                {entry.title}
              </div>
            );
          })}
          {dayEntries.length > 3 && (
            <div className="text-xs text-gray-500 px-1">
              +{dayEntries.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-1 hover:bg-gray-200 rounded-md transition-colors"
          >
            <MdChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-gray-200 rounded-md transition-colors"
          >
            <MdChevronRight className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 ml-2">{monthName}</h3>
        </div>
        <button
          onClick={goToToday}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
        >
          <MdToday className="w-4 h-4" />
          Today
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="px-2 py-2 text-xs font-medium text-gray-500 text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days}
      </div>
    </div>
  );
}
