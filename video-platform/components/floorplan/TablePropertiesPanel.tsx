'use client';

import { useState, useEffect } from 'react';
import type { RestaurantTable, TableShape } from '@/models/FloorPlan';

interface TablePropertiesPanelProps {
  table: RestaurantTable;
  onUpdate: (updates: Partial<RestaurantTable>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const SECTIONS = ['indoor', 'outdoor', 'bar', 'vip', 'patio'];
const SHAPES: TableShape[] = ['round', 'square', 'rectangular'];

export function TablePropertiesPanel({ table, onUpdate, onDelete, onClose }: TablePropertiesPanelProps) {
  const [label, setLabel] = useState(table.label);
  const [capacity, setCapacity] = useState(table.capacity);
  const [section, setSection] = useState(table.section);
  const [shape, setShape] = useState(table.shape);

  useEffect(() => {
    setLabel(table.label);
    setCapacity(table.capacity);
    setSection(table.section);
    setShape(table.shape);
  }, [table]);

  const handleSave = () => {
    onUpdate({ label, capacity, section, shape });
  };

  return (
    <div className="w-72 bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Table Properties</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div>
        <label className="block text-white/60 text-xs mb-1">Label</label>
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-white/30" />
      </div>

      <div>
        <label className="block text-white/60 text-xs mb-1">Capacity</label>
        <input type="number" value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value) || 1)} min={1} max={20} className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-white/30" />
      </div>

      <div>
        <label className="block text-white/60 text-xs mb-1">Shape</label>
        <div className="flex gap-2">
          {SHAPES.map((s) => (
            <button key={s} onClick={() => setShape(s)} className={`flex-1 py-1.5 text-xs rounded border transition-colors ${shape === s ? 'bg-white/20 border-white/40 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:text-white/80'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-white/60 text-xs mb-1">Section</label>
        <select value={section} onChange={(e) => setSection(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-white/30">
          {SECTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} className="flex-1 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded text-green-300 text-sm transition-colors">Apply</button>
        <button onClick={onDelete} className="py-1.5 px-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded text-red-300 text-sm transition-colors">Delete</button>
      </div>
    </div>
  );
}
