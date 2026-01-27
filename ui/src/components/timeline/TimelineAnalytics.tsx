'use client';

import { useMemo } from 'react';
import { TimelineEntry } from '@/lib/api';
import { EntryType } from '@/lib/types';
import { ENTRY_TYPE_CONFIG } from '@/lib/constants';
import { MdTrendingUp, MdTrendingDown, MdShowChart } from 'react-icons/md';

interface TimelineAnalyticsProps {
  entries: TimelineEntry[];
}

export function TimelineAnalytics({ entries }: TimelineAnalyticsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentEntries = entries.filter(e => new Date(e.entryDate) >= thirtyDaysAgo);
    const previousEntries = entries.filter(e => {
      const date = new Date(e.entryDate);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });

    // Count by type
    const typeCounts: Record<string, number> = {};
    entries.forEach(e => {
      typeCounts[e.entryType] = (typeCounts[e.entryType] || 0) + 1;
    });

    // Recent counts by type
    const recentTypeCounts: Record<string, number> = {};
    recentEntries.forEach(e => {
      recentTypeCounts[e.entryType] = (recentTypeCounts[e.entryType] || 0) + 1;
    });

    // Previous period counts
    const previousTypeCounts: Record<string, number> = {};
    previousEntries.forEach(e => {
      previousTypeCounts[e.entryType] = (previousTypeCounts[e.entryType] || 0) + 1;
    });

    // Calculate trends
    const incidentTrend = (recentTypeCounts['INCIDENT'] || 0) - (previousTypeCounts['INCIDENT'] || 0);
    const successTrend = (recentTypeCounts['SUCCESS'] || 0) - (previousTypeCounts['SUCCESS'] || 0);

    // Weekly activity (last 7 weeks)
    const weeklyActivity: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const count = entries.filter(e => {
        const date = new Date(e.entryDate);
        return date >= weekStart && date < weekEnd;
      }).length;
      weeklyActivity.push(count);
    }

    return {
      total: entries.length,
      recentCount: recentEntries.length,
      typeCounts,
      incidentTrend,
      successTrend,
      weeklyActivity,
      topTypes: Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }, [entries]);

  const maxWeekly = Math.max(...stats.weeklyActivity, 1);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MdShowChart className="w-5 h-5 text-purple-600" />
        Timeline Insights
      </h3>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">Total Entries</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">
            {stats.typeCounts['SUCCESS'] || 0}
          </div>
          <div className="text-xs text-green-600 flex items-center justify-center gap-1">
            Wins
            {stats.successTrend !== 0 && (
              <span className={stats.successTrend > 0 ? 'text-green-600' : 'text-gray-400'}>
                {stats.successTrend > 0 ? <MdTrendingUp /> : <MdTrendingDown />}
              </span>
            )}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">
            {stats.typeCounts['INCIDENT'] || 0}
          </div>
          <div className="text-xs text-red-600 flex items-center justify-center gap-1">
            Incidents
            {stats.incidentTrend !== 0 && (
              <span className={stats.incidentTrend < 0 ? 'text-green-600' : 'text-red-600'}>
                {stats.incidentTrend > 0 ? <MdTrendingUp /> : <MdTrendingDown />}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Weekly activity chart */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Weekly Activity</h4>
        <div className="flex items-end gap-1 h-16">
          {stats.weeklyActivity.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-purple-200 rounded-t transition-all hover:bg-purple-300"
                style={{ height: `${(count / maxWeekly) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                title={`${count} entries`}
              />
              <span className="text-xs text-gray-400 mt-1">{i === 6 ? 'This' : `${6 - i}w`}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top entry types */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Entry Types</h4>
        <div className="space-y-2">
          {stats.topTypes.map(([type, count]) => {
            const config = ENTRY_TYPE_CONFIG[type as keyof typeof ENTRY_TYPE_CONFIG];
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={type} className="flex items-center gap-2">
                <span className={`w-20 text-xs font-medium ${config?.badgeText || 'text-gray-600'}`}>
                  {config?.label || type}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${config?.badgeBg || 'bg-gray-300'} transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
