'use client';

import { useState } from 'react';
import { BusyTimesDisplay } from './BusyTimesDisplay';

interface BusyTimesManagerProps {
  businessId: string;
}

export function BusyTimesManager({ businessId }: BusyTimesManagerProps) {
  const [seeding, setSeeding] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [key, setKey] = useState(0);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await fetch('/api/seed-busy-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      setKey((k) => k + 1);
    } catch (err) {
      console.error('Seed error:', err);
    }
    setSeeding(false);
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const { updateBusyTimesFromOrders } = await import('@/lib/supabase/busytimes');
      await updateBusyTimesFromOrders(businessId);
      setKey((k) => k + 1);
    } catch (err) {
      console.error('Recompute error:', err);
    }
    setRecomputing(false);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Busy Times</h3>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-300 text-xs transition-colors disabled:opacity-50"
          >
            {seeding ? 'Seeding...' : 'Seed Data'}
          </button>
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 text-xs transition-colors disabled:opacity-50"
          >
            {recomputing ? 'Computing...' : 'Recompute from Orders'}
          </button>
        </div>
      </div>

      <BusyTimesDisplay key={key} businessId={businessId} />
    </div>
  );
}
