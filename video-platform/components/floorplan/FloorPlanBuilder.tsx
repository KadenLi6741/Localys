'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { FloorPlan, RestaurantTable, RestaurantTableCreateData, TableShape, FloorPlanLayoutData, SectionElement, WallElement } from '@/models/FloorPlan';
import { getFloorPlan, createFloorPlan, updateFloorPlan, createRestaurantTable, updateRestaurantTable, deleteRestaurantTable } from '@/lib/supabase/floorplans';
import { FloorPlanCanvas } from './FloorPlanCanvas';
import { FloorPlanToolbar } from './FloorPlanToolbar';
import { TablePropertiesPanel } from './TablePropertiesPanel';

interface FloorPlanBuilderProps {
  businessId: string;
}

export function FloorPlanBuilder({ businessId }: FloorPlanBuilderProps) {
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const tableCounter = useRef(1);

  useEffect(() => {
    loadFloorPlan();
  }, [businessId]);

  const loadFloorPlan = async () => {
    setLoading(true);
    const { data } = await getFloorPlan(businessId);
    if (data) {
      setFloorPlan(data);
      setTables(data.restaurant_tables || []);
      tableCounter.current = (data.restaurant_tables?.length || 0) + 1;
    }
    setLoading(false);
  };

  const ensureFloorPlan = async (): Promise<FloorPlan> => {
    if (floorPlan) return floorPlan;
    const { data } = await createFloorPlan(businessId);
    if (data) {
      setFloorPlan(data);
      return data;
    }
    throw new Error('Failed to create floor plan');
  };

  const handleAddTable = async (shape: TableShape) => {
    try {
      const fp = await ensureFloorPlan();
      const label = `T${tableCounter.current++}`;
      const newTable: RestaurantTableCreateData = {
        label,
        shape,
        capacity: shape === 'rectangular' ? 6 : 4,
        section: 'indoor',
        x: 100 + Math.random() * 300,
        y: 100 + Math.random() * 200,
        width: shape === 'rectangular' ? 120 : 80,
        height: 80,
      };
      const { data } = await createRestaurantTable(fp.id, businessId, newTable);
      if (data) {
        setTables((prev) => [...prev, data]);
        setSelectedTableId(data.id);
      }
    } catch (err) {
      console.error('Failed to add table:', err);
    }
  };

  const handleAddSection = async () => {
    const fp = await ensureFloorPlan();
    const sectionNames = ['Patio', 'Bar Area', 'VIP', 'Outdoor', 'Private'];
    const existing = fp.layout_data?.sections?.length || 0;
    const newSection: SectionElement = {
      id: crypto.randomUUID(),
      name: sectionNames[existing % sectionNames.length],
      color: ['#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ef4444'][existing % 5],
      x: 50 + existing * 30,
      y: 50 + existing * 30,
      width: 250,
      height: 200,
    };
    const updatedLayout: FloorPlanLayoutData = {
      ...fp.layout_data,
      sections: [...(fp.layout_data?.sections || []), newSection],
    };
    const { data } = await updateFloorPlan(fp.id, updatedLayout);
    if (data) setFloorPlan({ ...fp, layout_data: updatedLayout });
  };

  const handleAddWall = async () => {
    const fp = await ensureFloorPlan();
    const newWall: WallElement = {
      id: crypto.randomUUID(),
      x1: 100,
      y1: 300,
      x2: 400,
      y2: 300,
      thickness: 4,
    };
    const updatedLayout: FloorPlanLayoutData = {
      ...fp.layout_data,
      walls: [...(fp.layout_data?.walls || []), newWall],
    };
    const { data } = await updateFloorPlan(fp.id, updatedLayout);
    if (data) setFloorPlan({ ...fp, layout_data: updatedLayout });
  };

  const handleSave = async () => {
    if (!floorPlan) return;
    setSaving(true);
    await updateFloorPlan(floorPlan.id, floorPlan.layout_data);
    setSaving(false);
  };

  const handleTableUpdate = async (updates: Partial<RestaurantTable>) => {
    if (!selectedTableId) return;
    const { data } = await updateRestaurantTable(selectedTableId, updates);
    if (data) {
      setTables((prev) => prev.map((t) => (t.id === selectedTableId ? { ...t, ...data } : t)));
    }
  };

  const handleTableDelete = async () => {
    if (!selectedTableId) return;
    await deleteRestaurantTable(selectedTableId);
    setTables((prev) => prev.filter((t) => t.id !== selectedTableId));
    setSelectedTableId(null);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !svgContainerRef.current) return;
    const rect = svgContainerRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;
    setTables((prev) =>
      prev.map((t) => (t.id === dragging ? { ...t, x: Math.max(0, newX), y: Math.max(0, newY) } : t))
    );
  }, [dragging, dragOffset]);

  const handleMouseUp = useCallback(async () => {
    if (!dragging) return;
    const table = tables.find((t) => t.id === dragging);
    if (table) {
      await updateRestaurantTable(dragging, { x: table.x, y: table.y } as Partial<RestaurantTable>);
    }
    setDragging(null);
  }, [dragging, tables]);

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-white/40">Loading floor plan...</div>;
  }

  return (
    <div className="space-y-4">
      <FloorPlanToolbar onAddTable={handleAddTable} onAddSection={handleAddSection} onAddWall={handleAddWall} onSave={handleSave} saving={saving} />

      <div className="flex gap-4">
        <div ref={svgContainerRef} className="flex-1" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <FloorPlanCanvas
            floorPlan={floorPlan}
            tables={tables}
            selectedTableId={selectedTableId}
            onTableClick={(id) => setSelectedTableId(id)}
            onCanvasClick={() => setSelectedTableId(null)}
          />
          <p className="text-white/30 text-xs mt-2">Click a table to select. Use toolbar to add elements.</p>
        </div>

        {selectedTable && (
          <TablePropertiesPanel
            table={selectedTable}
            onUpdate={handleTableUpdate}
            onDelete={handleTableDelete}
            onClose={() => setSelectedTableId(null)}
          />
        )}
      </div>
    </div>
  );
}
