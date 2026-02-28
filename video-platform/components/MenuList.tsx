'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, getUserMenus, getUserMenu, deleteMenu } from '@/lib/supabase/profiles';
import { MenuModal } from './MenuModal';
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
    loadMenus();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMenu(null);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        <p className="text-white/60 mt-2">{t('common.loading')}</p>
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
          className="w-full mb-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg py-3 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {primaryMenu ? t('menu.add_items') : t('menu.create_menu')}
        </button>
      )}

      {/* Menus List */}
      {menus.length > 0 ? (
        <div className="space-y-4">
          {menus.map((menu) => (
            <div
              key={menu.id}
              className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
            >
              {/* Menu Header */}
              <div
                onClick={() =>
                  setExpandedMenuId(expandedMenuId === menu.id ? null : menu.id)
                }
                className="w-full p-4 flex items-start justify-between hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {menu.menu_name}
                  </h3>
                  {menu.description && (
                    <p className="text-white/60 text-sm mb-2">{menu.description}</p>
                  )}
                  <div className="flex gap-2 items-center">
                    <span className="inline-block bg-blue-500/30 text-blue-200 text-xs px-2 py-1 rounded">
                      {menu.category}
                    </span>
                    <span className="text-white/40 text-xs">
                      {menu.menu_items?.length || 0} {t('menu.items')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  {isOwnProfile && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMenu(menu);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title={t('menu.add_items')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </>
                  )}

                  <svg
                    className={`w-5 h-5 text-white/40 transition-transform duration-200 ${
                      expandedMenuId === menu.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* Menu Items - Expanded */}
              {expandedMenuId === menu.id && (
                <div className="border-t border-white/10 bg-white/2 p-4 space-y-3">
                  {menu.menu_items && menu.menu_items.length > 0 ? (
                    menu.menu_items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white/5 border border-white/10 rounded-lg p-3 flex gap-3"
                      >
                        {/* Item Image */}
                        {item.image_url && (
                          <div className="flex-shrink-0">
                            <img
                              src={item.image_url}
                              alt={item.item_name}
                              className="w-20 h-20 rounded-lg object-cover border border-white/20"
                            />
                          </div>
                        )}

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-white font-semibold">{item.item_name}</h4>
                              {item.category && (
                                <p className="text-white/40 text-xs mt-1">{t('menu.category')}: {item.category}</p>
                              )}
                            </div>
                            <span className="text-yellow-400 font-bold whitespace-nowrap ml-2">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-white/60 text-sm mb-2">{item.description}</p>
                          )}

                          {!item.is_available && (
                            <div className="text-red-400 text-xs mb-2">Out of Stock</div>
                          )}

                          {/* Purchase Button for Other Users */}
                          {!isOwnProfile && user && item.is_available && (
                            <MenuItemPurchaseButton
                              itemId={item.id}
                              itemName={item.item_name}
                              itemPrice={item.price}
                              itemImage={item.image_url}
                              sellerId={userId}
                              buyerId={user.id}
                              isOwnBusiness={false}
                            />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/40 text-center py-4">{t('menu.no_items')}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-white/20 mx-auto mb-4"
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
          <p className="text-white/60 mb-4">
            {isOwnProfile ? t('menu.no_menus') : 'No menu available'}
          </p>
          {isOwnProfile && (
            <button
              onClick={() => {
                setSelectedMenu(null);
                setIsModalOpen(true);
              }}
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg px-6 py-2 transition-colors"
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
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </div>
  );
}
