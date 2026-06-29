'use client';

/**
 * CartContext — the shopping cart state shared across the app.
 * Purpose: Holds the list of cart items and the operations on them (add, remove, update quantity/special
 *   requests, clear) plus derived helpers like the total item count. Persists to localStorage so the cart
 *   survives reloads, and exposes everything via useCart().
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface CartDeal {
  type: 'percent' | 'dollar_off' | 'bogo' | 'free_delivery' | 'bundle' | 'first_order';
  label: string;
  value?: number;
  threshold?: number;
}

export interface CartItem {
  itemId: string;
  itemName: string;
  itemPrice: number; // base unit price (deal applied at checkout)
  itemImage?: string;
  sellerId: string;
  buyerId: string;
  quantity: number;
  specialRequests?: string;
  deal?: CartDeal;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateSpecialRequests: (itemId: string, specialRequests: string) => void;
  clearCart: () => void;
  getCartCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = 'localys-cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    }
  }, [items, loaded]);

  const addToCart = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.itemId === item.itemId);
      if (existing) {
        return prev.map((i) =>
          i.itemId === item.itemId
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, quantity } : i))
    );
  }, []);

  const updateSpecialRequests = useCallback((itemId: string, specialRequests: string) => {
    setItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, specialRequests } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getCartCount = useCallback(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, updateSpecialRequests, clearCart, getCartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
