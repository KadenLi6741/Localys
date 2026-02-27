'use client';

import { useState, useEffect } from 'react';
import type { CartItem } from '@/models/PreOrder';
import { getUserMenus } from '@/lib/supabase/profiles';

interface PreOrderMenuBrowserProps {
  businessOwnerId: string;
  cart: CartItem[];
  onCartUpdate: (cart: CartItem[]) => void;
}

export function PreOrderMenuBrowser({ businessOwnerId, cart, onCartUpdate }: PreOrderMenuBrowserProps) {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenus();
  }, [businessOwnerId]);

  const loadMenus = async () => {
    const { data } = await getUserMenus(businessOwnerId);
    setMenus(data || []);
    setLoading(false);
  };

  const getItemQuantity = (itemId: string) => {
    return cart.find((c) => c.menuItemId === itemId)?.quantity || 0;
  };

  const updateCart = (item: any, delta: number) => {
    const existing = cart.find((c) => c.menuItemId === item.id);
    if (existing) {
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        onCartUpdate(cart.filter((c) => c.menuItemId !== item.id));
      } else {
        onCartUpdate(cart.map((c) => c.menuItemId === item.id ? { ...c, quantity: newQty } : c));
      }
    } else if (delta > 0) {
      onCartUpdate([...cart, {
        menuItemId: item.id,
        name: item.item_name,
        price: item.price,
        quantity: 1,
        image_url: item.image_url,
      }]);
    }
  };

  if (loading) return <div className="text-white/40 text-center py-12">Loading menu...</div>;
  if (menus.length === 0) return <div className="text-white/40 text-center py-12">No menu available</div>;

  return (
    <div className="space-y-6">
      {menus.map((menu) => (
        <div key={menu.id}>
          <h3 className="text-white font-semibold text-lg mb-3">{menu.menu_name}</h3>
          <div className="space-y-2">
            {(menu.menu_items || []).filter((item: any) => item.is_available).map((item: any) => {
              const qty = getItemQuantity(item.id);
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/[0.07] transition-colors">
                  {item.image_url && <img src={item.image_url} alt={item.item_name} className="w-16 h-16 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-sm">{item.item_name}</h4>
                    {item.description && <p className="text-white/40 text-xs mt-0.5 truncate">{item.description}</p>}
                    <p className="text-green-400 font-semibold text-sm mt-1">${Number(item.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {qty > 0 && (
                      <>
                        <button onClick={() => updateCart(item, -1)} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">-</button>
                        <span className="text-white font-medium w-6 text-center">{qty}</span>
                      </>
                    )}
                    <button onClick={() => updateCart(item, 1)} className="w-8 h-8 flex items-center justify-center bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-full text-green-300 transition-colors">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
