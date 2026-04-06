'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart, CartItem } from '@/contexts/CartContext';
import { useRouter } from 'next/navigation';

export function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeFromCart, updateQuantity, getCartCount } = useCart();
  const router = useRouter();
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 280);
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const cartItems = items || [];
  const total = cartItems.reduce((sum, item) => sum + (item.itemPrice || 0) * (item.quantity || 1), 0);
  const count = getCartCount();

  return (
    <>
      {/* Backdrop */}
      <div className="cart-drawer-backdrop" onClick={handleClose} />

      {/* Drawer */}
      <div className={`cart-drawer ${closing ? 'closing' : ''}`}>
        {/* Header */}
        <div className="cart-drawer-header">
          <h2>Your Cart ({count})</h2>
          <button
            onClick={handleClose}
            className="nav-icon-button"
            aria-label="Close cart"
            style={{ width: 32, height: 32 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="cart-drawer-body">
          {cartItems.length === 0 ? (
            <div className="empty-state" style={{ paddingTop: '64px' }}>
              <svg className="w-12 h-12" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="empty-state-headline">Your cart is empty</p>
              <button
                onClick={handleClose}
                className="btn-secondary"
                style={{ marginTop: '8px' }}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cartItems.map((item, index) => (
              <div key={`${item.itemId}-${index}`} className="cart-drawer-item">
              <div className="cart-drawer-item-image" style={{ width: 72, height: 72, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  {item.itemImage ? (
                    <Image
                      src={item.itemImage}
                      alt={item.itemName || 'Product'}
                      width={72}
                      height={72}
                      className="cart-drawer-item-image"
                      unoptimized
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const fallback = target.parentElement?.querySelector('.cart-img-fallback') as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="cart-img-fallback"
                    style={{
                      display: item.itemImage ? 'none' : 'flex',
                      width: 72,
                      height: 72,
                      background: '#F8F8F6',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9E9A90',
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    {(item.itemName || 'P').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="cart-drawer-item-details">
                  <p className="cart-drawer-item-name">{item.itemName}</p>
                  <p className="cart-drawer-item-price">${(item.itemPrice || 0).toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="quantity-selector" style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>
                      <button onClick={() => updateQuantity(item.itemId, Math.max(1, (item.quantity || 1) - 1))}>−</button>
                      <span>{item.quantity || 1}</span>
                      <button onClick={() => updateQuantity(item.itemId, (item.quantity || 1) + 1)}>+</button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.itemId)}
                      className="text-xs underline"
                      style={{ color: 'var(--color-text-muted)', padding: '4px', border: 'none', background: 'none' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="flex items-center justify-between mb-4">
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--color-text-secondary)' }}>Subtotal</span>
              <span style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)' }}>
                ${total.toFixed(2)}
              </span>
            </div>
            <button
              className="btn-primary w-full text-center"
              onClick={() => { handleClose(); router.push('/checkout?source=cart'); }}
              style={{ display: 'block', width: '100%' }}
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
