'use client';

import type { CartItem } from '@/models/PreOrder';

interface CartDrawerProps {
  cart: CartItem[];
  onCartUpdate: (cart: CartItem[]) => void;
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ cart, onCartUpdate, open, onClose }: CartDrawerProps) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-[#111] border-t border-white/10 rounded-t-2xl max-h-[70vh] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg">Your Order</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white/80">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {cart.length === 0 ? (
            <p className="text-white/40 text-center py-8">Your cart is empty</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-white text-sm font-medium">{item.name}</h4>
                    <p className="text-green-400 text-sm">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      if (item.quantity <= 1) onCartUpdate(cart.filter((c) => c.menuItemId !== item.menuItemId));
                      else onCartUpdate(cart.map((c) => c.menuItemId === item.menuItemId ? { ...c, quantity: c.quantity - 1 } : c));
                    }} className="w-7 h-7 flex items-center justify-center bg-white/10 rounded-full text-white text-sm">-</button>
                    <span className="text-white w-6 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => {
                      onCartUpdate(cart.map((c) => c.menuItemId === item.menuItemId ? { ...c, quantity: c.quantity + 1 } : c));
                    }} className="w-7 h-7 flex items-center justify-center bg-green-500/20 border border-green-500/40 rounded-full text-green-300 text-sm">+</button>
                  </div>
                  <p className="text-white font-medium text-sm w-16 text-right">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <span className="text-white font-semibold">Total</span>
                <span className="text-green-400 font-bold text-lg">${total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
