'use client';

import type { OrderType } from '@/models/PreOrder';

interface OrderTypeSelectorProps {
  value: OrderType;
  onChange: (type: OrderType) => void;
}

export function OrderTypeSelector({ value, onChange }: OrderTypeSelectorProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={() => onChange('dine-in')}
        className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
          value === 'dine-in' ? 'border-green-500 bg-green-500/10 text-green-300' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
        }`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 22h18M6 18V2l6 4 6-4v16" /></svg>
        <div className="text-left">
          <p className="font-semibold text-sm">Dine-in</p>
          <p className="text-xs opacity-60">Eat at the restaurant</p>
        </div>
      </button>
      <button
        onClick={() => onChange('pickup')}
        className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
          value === 'pickup' ? 'border-green-500 bg-green-500/10 text-green-300' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
        }`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 00-8 0v2" /></svg>
        <div className="text-left">
          <p className="font-semibold text-sm">Pickup</p>
          <p className="text-xs opacity-60">Grab and go</p>
        </div>
      </button>
    </div>
  );
}
