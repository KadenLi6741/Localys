'use client';

import type { CartItem } from '@/models/PreOrder';

interface CartSummaryBarProps {
  cart: CartItem[];
  onCheckout: () => void;
}

export function CartSummaryBar({ cart, onCheckout }: CartSummaryBarProps) {
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-white/10 backdrop-blur-lg px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div>
          <span className="text-white font-medium">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          <span className="text-white/40 mx-2">|</span>
          <span className="text-green-400 font-semibold">${total.toFixed(2)}</span>
        </div>
        <button onClick={onCheckout} className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors">
          Checkout
        </button>
      </div>
    </div>
  );
}
