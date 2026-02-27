'use client';

import type { TableShape } from '@/models/FloorPlan';

interface FloorPlanToolbarProps {
  onAddTable: (shape: TableShape) => void;
  onAddSection: () => void;
  onAddWall: () => void;
  onSave: () => void;
  saving?: boolean;
}

export function FloorPlanToolbar({ onAddTable, onAddSection, onAddWall, onSave, saving }: FloorPlanToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-lg mb-4 flex-wrap">
      <span className="text-white/60 text-sm mr-2">Add:</span>

      <button onClick={() => onAddTable('round')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-300 text-sm transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
        Round
      </button>

      <button onClick={() => onAddTable('square')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-300 text-sm transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
        Square
      </button>

      <button onClick={() => onAddTable('rectangular')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-300 text-sm transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="4" width="14" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
        Rectangular
      </button>

      <div className="w-px h-6 bg-white/10 mx-1" />

      <button onClick={onAddSection} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-300 text-sm transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2"/></svg>
        Section
      </button>

      <button onClick={onAddWall} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 text-sm transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16"><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
        Wall
      </button>

      <div className="flex-1" />

      <button onClick={onSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Layout'}
      </button>
    </div>
  );
}
