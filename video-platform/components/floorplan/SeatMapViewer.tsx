'use client';

import { useState, useEffect } from 'react';
import type { FloorPlan, RestaurantTable } from '@/models/FloorPlan';
import { getFloorPlan } from '@/lib/supabase/floorplans';
import { FloorPlanCanvas } from './FloorPlanCanvas';

interface SeatMapViewerProps {
  businessId: string;
  selectedTableId?: string | null;
  onTableSelect?: (tableId: string | null) => void;
  partySize?: number;
}

export function SeatMapViewer({ businessId, selectedTableId, onTableSelect, partySize = 1 }: SeatMapViewerProps) {
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFloorPlan();
  }, [businessId]);

  const loadFloorPlan = async () => {
    const { data } = await getFloorPlan(businessId);
    if (data) {
      setFloorPlan(data);
      setTables(data.restaurant_tables || []);
    }
    setLoading(false);
  };

  const handleTableClick = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table || table.status !== 'available') return;
    if (partySize > table.capacity) return;
    onTableSelect?.(selectedTableId === tableId ? null : tableId);
  };

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-white/40 text-sm">Loading seat map...</div>;
  }

  if (!floorPlan || tables.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-white/40 text-sm border border-white/10 rounded-lg">
        No seat map available. The restaurant will assign your table.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-white/50">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500/40 border border-green-500" />
          Available
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-500/40 border border-yellow-500" />
          Reserved
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500" />
          Occupied
        </div>
      </div>

      <FloorPlanCanvas
        floorPlan={floorPlan}
        tables={tables}
        selectedTableId={selectedTableId}
        onTableClick={handleTableClick}
      />

      {selectedTableId && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 text-sm">
          Table {tables.find((t) => t.id === selectedTableId)?.label} selected
          ({tables.find((t) => t.id === selectedTableId)?.capacity} seats,{' '}
          {tables.find((t) => t.id === selectedTableId)?.section})
        </div>
      )}
    </div>
  );
}
