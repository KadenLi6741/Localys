'use client';

interface PaymentSummaryCardProps {
  subtotal: number;
  upfrontPct: number;
}

export function PaymentSummaryCard({ subtotal, upfrontPct }: PaymentSummaryCardProps) {
  const amountDueNow = Math.round(subtotal * (upfrontPct / 100) * 100) / 100;
  const amountDueLater = Math.round((subtotal - amountDueNow) * 100) / 100;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
      <h4 className="text-white font-semibold text-sm">Payment Summary</h4>
      <div className="flex justify-between text-sm">
        <span className="text-white/60">Subtotal</span>
        <span className="text-white">${subtotal.toFixed(2)}</span>
      </div>
      <div className="border-t border-white/10 pt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Due now ({upfrontPct}%)</span>
          <span className="text-green-400 font-semibold">${amountDueNow.toFixed(2)}</span>
        </div>
        {amountDueLater > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Due at restaurant</span>
            <span className="text-yellow-400">${amountDueLater.toFixed(2)}</span>
          </div>
        )}
      </div>
      {upfrontPct < 100 && (
        <p className="text-white/30 text-xs">
          This restaurant requires {upfrontPct}% upfront payment. The remaining balance will be collected at the restaurant.
        </p>
      )}
    </div>
  );
}
