'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, MenuItem, getUserMenus, getUserMenu, deleteMenu, updateMenuItem, deleteMenuItem } from '@/lib/supabase/profiles';
import dynamic from 'next/dynamic';
const MenuModal = dynamic(() => import('./MenuModal').then(mod => mod.MenuModal), { ssr: false });
import { MenuItemPurchaseButton } from './MenuItemPurchaseButton';

interface MenuListProps {
  userId: string;
  businessId?: string;
  isOwnProfile: boolean;
  onMenusLoaded?: (menus: Menu[]) => void;
}

export function MenuList({ userId, businessId, isOwnProfile, onMenusLoaded }: MenuListProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [primaryMenu, setPrimaryMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [fadingOutItemId, setFadingOutItemId] = useState<string | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const [priceGlowId, setPriceGlowId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'sage' | 'red' | 'amber'>('sage');
  const priceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(''), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    loadMenus();
  }, [userId]);

  const loadMenus = async () => {
    setLoading(true);
    try {
      const { data: menu, error: menuError } = await getUserMenu(userId);
      if (!menuError && menu) {
        setPrimaryMenu(menu);
        setMenus([menu]);
        setExpandedMenuId(menu.id); // Expand the menu by default
        onMenusLoaded?.([menu]);
      } else {
        // No menu exists yet
        setPrimaryMenu(null);
        setMenus([]);
      }
    } catch (error) {
      console.error('Failed to load menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (!isOwnProfile) return;

    if (!confirm('Are you sure you want to delete this menu?')) return;

    try {
      const { error } = await deleteMenu(menuId);
      if (!error) {
        setMenus(menus.filter((menu) => menu.id !== menuId));
      }
    } catch (error) {
      console.error('Failed to delete menu:', error);
    }
  };

  const handleEditMenu = (menu: Menu) => {
    setSelectedMenu(menu);
    setIsModalOpen(true);
  };

  const handleModalSave = () => {
    setIsModalOpen(false);
    setSelectedMenu(null);
    setEditingItem(null);
    loadMenus();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMenu(null);
    setEditingItem(null);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setSelectedMenu(primaryMenu);
    setIsModalOpen(true);
  };

  const handleDeleteItemConfirm = async (itemId: string) => {
    setFadingOutItemId(itemId);
    setTimeout(async () => {
      try {
        const { error } = await deleteMenuItem(itemId);
        if (!error) {
          setMenus(prev => prev.map(menu => ({
            ...menu,
            menu_items: menu.menu_items?.filter(i => i.id !== itemId),
          })));
          showToast('Item deleted', 'red');
        }
      } catch (err) {
        console.error('Failed to delete menu item:', err);
      } finally {
        setFadingOutItemId(null);
        setDeletingItemId(null);
      }
    }, 200);
  };

  const handlePriceEdit = (item: MenuItem) => {
    setEditingPriceId(item.id);
    setEditingPriceValue(item.price.toFixed(2));
    setTimeout(() => priceInputRef.current?.select(), 0);
  };

  const handlePriceSave = async (itemId: string) => {
    const newPrice = parseFloat(editingPriceValue);
    if (isNaN(newPrice) || newPrice < 0) {
      setEditingPriceId(null);
      return;
    }
    try {
      const { error } = await updateMenuItem(itemId, { price: newPrice });
      if (!error) {
        setMenus(prev => prev.map(menu => ({
          ...menu,
          menu_items: menu.menu_items?.map(i =>
            i.id === itemId ? { ...i, price: newPrice } : i
          ),
        })));
        setPriceGlowId(itemId);
        setTimeout(() => setPriceGlowId(null), 600);
      }
    } catch (err) {
      console.error('Failed to update price:', err);
    } finally {
      setEditingPriceId(null);
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePriceSave(itemId);
    } else if (e.key === 'Escape') {
      setEditingPriceId(null);
    }
  };

  const showToast = (message: string, color: 'sage' | 'red' | 'amber') => {
    setToastMessage(message);
    setToastColor(color);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-[#2E2E28] rounded-2xl overflow-hidden animate-pulse"
          >
            <div className="aspect-square bg-[#3A3A34]"></div>
            <div className="p-3 space-y-2">
              <div className="h-4 bg-[#3A3A34] rounded w-3/4"></div>
              <div className="h-4 bg-[#3A3A34] rounded w-1/2"></div>
              <div className="h-8 bg-[#3A3A34] rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Add Items or Create Menu Button */}
      {isOwnProfile && (
        <button
          onClick={() => {
            if (primaryMenu) {
              // If menu exists, open it for editing (adding items)
              setSelectedMenu(primaryMenu);
            } else {
              // If no menu exists, create a new one
              setSelectedMenu(null);
            }
            setIsModalOpen(true);
          }}
          className="w-full mb-6 bg-[#F5A623] hover:bg-[#F5A623]/90 text-black font-semibold rounded-lg py-3 transition-colors flex items-center justify-center gap-2 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A18]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {primaryMenu ? t('menu.add_items') : t('menu.create_menu')}
        </button>
      )}

      {/* Menu Items Grid */}
      {menus.length > 0 && menus[0]?.menu_items && menus[0].menu_items.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {menus[0].menu_items.map((item, index) => (
            <div
              key={item.id}
              className={`menu-item-card bg-[#242420] border border-[#3A3A34] rounded-2xl overflow-hidden hover:scale-[0.97] transition-all duration-200 group relative ${
                fadingOutItemId === item.id ? 'opacity-0 scale-95 pointer-events-none' : ''
              }`}
            >
              {/* Edit & Delete Buttons (owner only) */}
              {isOwnProfile && (
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1A1A18]/70 backdrop-blur-sm text-[#F5F0E8] hover:text-[#F5A623] transition-colors"
                    aria-label={`Edit ${item.item_name}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeletingItemId(item.id); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1A1A18]/70 backdrop-blur-sm text-[#E05C3A] hover:text-[#E05C3A]/80 transition-colors"
                    aria-label={`Delete ${item.item_name}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Inline Delete Confirmation */}
              {deletingItemId === item.id && (
                <div className="absolute inset-0 z-20 bg-[#1A1A18]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 rounded-2xl">
                  <p className="text-[#F5F0E8] text-sm font-medium text-center">Delete this item?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteItemConfirm(item.id)}
                      className="px-4 py-1.5 bg-[#E05C3A] hover:bg-[#E05C3A]/90 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeletingItemId(null)}
                      className="px-4 py-1.5 text-[#9E9A90] hover:bg-[#2E2E28] text-xs font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Item Image */}
              {item.image_url ? (
                <div className="relative aspect-square overflow-hidden bg-[#1A1A18]">
                  <img
                    src={item.image_url}
                    alt={item.item_name}
                    className="w-full h-full object-cover group-active:scale-95 transition-transform duration-150"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-[#3A3A34] flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#6BAF7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Item Details */}
              <div className="p-3 flex flex-col flex-1">
                <h4 className="text-[#F5F0E8] font-bold text-sm truncate mb-1">
                  {item.item_name}
                </h4>

                {/* Price — inline editable for owner */}
                {isOwnProfile && editingPriceId === item.id ? (
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-[#F5A623] font-bold text-sm">$</span>
                    <input
                      ref={priceInputRef}
                      type="number"
                      step="0.01"
                      value={editingPriceValue}
                      onChange={(e) => setEditingPriceValue(e.target.value)}
                      onKeyDown={(e) => handlePriceKeyDown(e, item.id)}
                      onBlur={() => handlePriceSave(item.id)}
                      className="w-16 bg-[#242420] border border-[#F5A623] rounded px-1 py-0.5 text-[#F5A623] font-bold text-sm focus:outline-none"
                      autoFocus
                    />
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handlePriceSave(item.id); }}
                      className="text-[#F5A623] hover:text-[#F5A623]/80"
                      aria-label="Save price"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <span
                    className={`text-[#F5A623] font-bold text-sm mb-2 transition-all duration-300 ${
                      priceGlowId === item.id ? 'shadow-[0_0_12px_rgba(245,166,35,0.6)] rounded' : ''
                    } ${isOwnProfile ? 'cursor-pointer hover:underline' : ''}`}
                    onClick={isOwnProfile ? () => handlePriceEdit(item) : undefined}
                    title={isOwnProfile ? 'Click to edit price' : undefined}
                  >
                    ${item.price.toFixed(2)}
                  </span>
                )}

                {/* Purchase Button */}
                {!isOwnProfile && user && item.is_available && (
                  <div className="mt-auto">
                    <MenuItemPurchaseButton
                      itemId={item.id}
                      itemName={item.item_name}
                      itemPrice={item.price}
                      itemImage={item.image_url}
                      sellerId={userId}
                      buyerId={user.id}
                      isOwnBusiness={false}
                    />
                  </div>
                )}

                {!item.is_available && (
                  <div className="text-red-400 text-xs text-center py-1">Out of Stock</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-[#6BAF7A]/40 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-[#F5F0E8]/60 mb-4">
            {isOwnProfile ? t('menu.no_menus') : 'No items available'}
          </p>
          {isOwnProfile && (
            <button
              onClick={() => {
                setSelectedMenu(null);
                setIsModalOpen(true);
              }}
              className="inline-block bg-[#F5A623] hover:bg-[#F5A623]/90 text-black font-semibold rounded-lg px-6 py-2 transition-colors"
            >
              {t('menu.create_menu')}
            </button>
          )}
        </div>
      )}

      {/* Menu Modal */}
      <MenuModal
        userId={userId}
        businessId={businessId}
        menu={selectedMenu}
        editItem={editingItem}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        onItemSaved={(msg) => showToast(msg, 'sage')}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 backdrop-blur-md px-6 py-3 rounded-full shadow-lg"
          style={{
            backgroundColor: toastColor === 'red' ? 'rgba(224,92,58,0.9)' : toastColor === 'amber' ? 'rgba(245,166,35,0.9)' : 'rgba(107,175,122,0.9)',
            color: toastColor === 'sage' || toastColor === 'red' ? '#fff' : '#000',
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            {toastColor === 'sage' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toastColor === 'red' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" />
              </svg>
            )}
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
