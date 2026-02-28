'use client';

import { useState, useMemo } from 'react';

interface TimeSlotPickerProps {
  value: string;
  onChange: (isoTime: string) => void;
  businessHours?: any;
}

export function TimeSlotPicker({ value, onChange }: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const dates = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      result.push({
        value: d.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      });
    }
    return result;
  }, []);

  const timeSlots = useMemo(() => {
    const slots = [];
    const now = new Date();
    const isToday = selectedDate === now.toISOString().split('T')[0];
    const minHour = isToday ? now.getHours() + 1 : 7;

    for (let h = Math.max(7, minHour); h <= 22; h++) {
      for (const m of [0, 30]) {
        if (isToday && h === minHour && m < now.getMinutes()) continue;
        const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const label = `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
        const isoTime = `${selectedDate}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
        slots.push({ label, value: isoTime });
      }
    }
    return slots;
  }, [selectedDate]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-white/60 text-xs mb-2">Select Date</label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dates.map((d) => (
            <button key={d.value} onClick={() => setSelectedDate(d.value)} className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedDate === d.value ? 'bg-green-500/20 border border-green-500/50 text-green-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-white/60 text-xs mb-2">Select Time</label>
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
          {timeSlots.map((slot) => (
            <button key={slot.value} onClick={() => onChange(slot.value)} className={`px-2 py-2 rounded text-sm transition-colors ${value === slot.value ? 'bg-green-500/20 border border-green-500/50 text-green-300 font-medium' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'}`}>
              {slot.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
