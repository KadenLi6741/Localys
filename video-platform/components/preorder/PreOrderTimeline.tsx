'use client';

import type { PreOrder, PreOrderStatus } from '@/models/PreOrder';

const STEPS: { status: PreOrderStatus; label: string }[] = [
  { status: 'confirmed', label: 'Order Confirmed' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'ready', label: 'Ready' },
  { status: 'arrived', label: 'Checked In' },
  { status: 'completed', label: 'Completed' },
];

const STATUS_ORDER: PreOrderStatus[] = ['pending_payment', 'confirmed', 'preparing', 'ready', 'arrived', 'completed'];

export function PreOrderTimeline({ preorder }: { preorder: PreOrder }) {
  if (preorder.status === 'cancelled') {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm text-center">
        Order cancelled
        {preorder.cancelled_at && <span className="text-red-300/60 text-xs block mt-1">{new Date(preorder.cancelled_at).toLocaleString()}</span>}
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(preorder.status);

  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const stepIndex = STATUS_ORDER.indexOf(step.status);
        const isComplete = currentIndex >= stepIndex;
        const isCurrent = preorder.status === step.status;

        return (
          <div key={step.status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isComplete ? 'bg-green-500 border-green-500' : 'bg-transparent border-white/20'} ${isCurrent ? 'ring-2 ring-green-500/30' : ''}`}>
                {isComplete && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
              </div>
              {i < STEPS.length - 1 && <div className={`w-0.5 h-8 ${isComplete ? 'bg-green-500' : 'bg-white/10'}`} />}
            </div>
            <div className="pb-6">
              <p className={`text-sm font-medium ${isComplete ? 'text-white' : 'text-white/30'}`}>{step.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
