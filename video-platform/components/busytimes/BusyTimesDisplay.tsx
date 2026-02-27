'use client';

import { useState, useEffect } from 'react';
import { getBusyTimes, groupBusyTimesByDay } from '@/lib/supabase/busytimes';
import { BusyTimesChart } from './BusyTimesChart';
import type { DayBusyTimes } from '@/models/BusyTimes';

interface BusyTimesDisplayProps {
  businessId: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function BusyTimesDisplay({ businessId }: BusyTimesDisplayProps) {
  const [days, setDays] = useState<DayBusyTimes[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusyTimes();
  }, [businessId]);

  const loadBusyTimes = async () => {
    const { data } = await getBusyTimes(businessId);
    if (data && data.length > 0) {
      setDays(groupBusyTimesByDay(data));
    }
    setLoading(false);
  };

  if (loading) return <div className="text-white/40 text-sm">Loading busy times...</div>;
  if (days.length === 0) return null;

  const currentDay = days.find((d) => d.dayOfWeek === selectedDay);

  return (
    <div>
      <h4 className="text-white/80 text-sm font-semibold mb-3">Popular Times</h4>
      <div className="flex gap-1 mb-3">
        {DAY_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setSelectedDay(i)}
            className={`flex-1 py-1.5 text-xs rounded transition-colors ${
              selectedDay === i ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40 hover:text-white/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {currentDay && <BusyTimesChart data={currentDay.slots} />}
    </div>
  );
}
