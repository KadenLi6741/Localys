'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Menu, MenuItem, createMenu, updateMenu, addMenuItemToMenu, updateMenuItem } from '@/lib/supabase/profiles';
import { supabase } from '@/lib/supabase/client';

interface MenuModalProps {
  userId: string;
  businessId?: string;
  menu: Menu | null;
  editItem?: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onItemSaved?: (message: string) => void;
}

export function MenuModal({ userId, businessId, menu, editItem, isOpen, onClose, onSave, onItemSaved }: MenuModalProps) {
  const { t } = useTranslation();
  const [menuName, setMenuName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Item form state
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemKeyInfo, setItemKeyInfo] = useState('');
  const [itemAvailable, setItemAvailable] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  
  // Item image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens or menu changes
  useEffect(() => {
    if (isOpen) {
      if (menu) {
        setMenuName(menu.menu_name);
        setDescription(menu.description || '');
        setCategory(menu.category || 'General');
      } else {
        setMenuName('');
        setDescription('');
        setCategory('General');
      }
      setError(null);

      // Pre-fill item form if editing an existing item
      if (editItem) {
        setItemName(editItem.item_name);
        setItemPrice(editItem.price.toString());
        setItemDescription(editItem.description || '');
        setItemCategory(editItem.category || '');
        setItemKeyInfo(editItem.key_info || '');
        setItemAvailable(editItem.is_available !== false);
        setImagePreview(editItem.image_url || null);
        setSelectedImage(null);
      } else {
        resetItemForm();
      }
    }
  }, [isOpen, menu, editItem]);

  const resetItemForm = () => {
    setItemName('');
    setItemPrice('');
    setItemDescription('');
    setItemCategory('');
    setItemKeyInfo('');
    setItemAvailable(true);
    setSelectedImage(null);
    setImagePreview(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!menuName.trim()) {
        setError(t('menu.menu_name_required') || 'Menu name is required');
        setLoading(false);
        return;
      }

      if (menu) {
        // Update existing menu
        const { error: updateError } = await updateMenu(menu.id, {
          menu_name: menuName,
          description,
          category,
        });

        if (updateError) {
          setError(updateError.message || 'Failed to update menu');
        } else {
          onSave();
        }
      } else {
        // Create new menu
        const { error: createError } = await createMenu(userId, {
          menu_name: menuName,
          description,
          category,
          business_id: businessId,
        });

        if (createError) {
          setError(createError.message || 'Failed to create menu');
        } else {
          onSave();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    setSelectedImage(file);
    setUploadError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadItemImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    try {
      setUploadError(null);
      const fileExt = selectedImage.name.split('.').pop()?.toLowerCase();
      
      if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt)) {
        setUploadError('Invalid file type. Allowed: JPG, PNG, GIF, WEBP, BMP');
        return null;
      }

      const fileName = `menu-item-images/${userId}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedImage, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedImage.type,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setUploadError('Failed to upload image. Please try again.');
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err: any) {
      console.error('Upload exception:', err);
      setUploadError('Error uploading image. Please try again.');
      return null;
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menu) return;

    setError(null);
    setAddingItem(true);
    setUploading(!!selectedImage);

    try {
      if (!itemName.trim()) {
        setError('Item name is required');
        setAddingItem(false);
        setUploading(false);
        return;
      }

      if (!itemPrice || isNaN(parseFloat(itemPrice))) {
        setError('Valid price is required');
        setAddingItem(false);
        setUploading(false);
        return;
      }

      let imageUrl: string | undefined;
      if (selectedImage) {
        const url = await uploadItemImage();
        if (url) {
          imageUrl = url;
        } else {
          setAddingItem(false);
          setUploading(false);
          return;
        }
      }

      if (editItem) {
        // Update existing item
        const updateData: { item_name: string; price: number; description: string; category: string; key_info: string; is_available: boolean; image_url?: string } = {
          item_name: itemName,
          price: parseFloat(itemPrice),
          description: itemDescription,
          category: itemCategory,
          key_info: itemKeyInfo,
          is_available: itemAvailable,
        };
        if (imageUrl) {
          updateData.image_url = imageUrl;
        }

        const { error: updateError } = await updateMenuItem(editItem.id, updateData);

        if (updateError) {
          setError(updateError.message || 'Failed to update item');
        } else {
          resetItemForm();
          onItemSaved?.('Item updated successfully');
          onSave();
        }
      } else {
        // Add new item
        const { error: addError } = await addMenuItemToMenu(menu.id, userId, {
          item_name: itemName,
          price: parseFloat(itemPrice),
          description: itemDescription,
          category: itemCategory,
          image_url: imageUrl,
          key_info: itemKeyInfo,
          is_available: itemAvailable,
        });

        if (addError) {
          setError(addError.message || 'Failed to add item');
        } else {
          resetItemForm();
          onSave();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setAddingItem(false);
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-modal-title"
    >
      <div className="flex items-center justify-center min-h-full p-4">
      <div
        className="bg-white rounded-lg shadow-2xl flex flex-col w-[90%] max-w-[560px] max-h-[85vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0] shrink-0">
          <h2 id="menu-modal-title" className="text-lg font-semibold text-[#111111]">
            {editItem ? 'Edit Item' : menu ? t('menu.edit_menu') || 'Edit Menu' : t('menu.create_menu') || 'Create Menu'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F5F5F5] rounded-md transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 text-[#777777]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          {/* Menu Info Section - shown for create only */}
          {!menu && (
            <>
              <div>
                <label className="block text-[#111111] text-sm font-medium mb-1.5">
                  {t('menu.menu_name') || 'Menu Name'}
                </label>
                <input
                  type="text"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder={t('menu.menu_name_placeholder') || 'e.g., Appetizers, Main Courses'}
                  className="w-full border border-[#E0E0E0] rounded px-4 py-2.5 text-[#111111] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-[#111111] text-sm font-medium mb-1.5">
                  {t('menu.description') || 'Description'}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('menu.description_placeholder') || 'Add a description for this menu section...'}
                  rows={3}
                  className="w-full border border-[#E0E0E0] rounded px-4 py-2.5 text-[#111111] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6] focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-[#111111] text-sm font-medium mb-1.5">
                  {t('menu.category') || 'Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-[#E0E0E0] rounded px-4 py-2.5 text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6] focus:border-transparent transition-all bg-white"
                >
                  <option value="General">General</option>
                  <option value="Appetizers">Appetizers</option>
                  <option value="Main Courses">Main Courses</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Salads">Salads</option>
                  <option value="Soups">Soups</option>
                  <option value="Sides">Sides</option>
                </select>
              </div>
            </>
          )}

          {/* Add/Edit Item Section */}
          {(menu || editItem) && (
            <div>
              <h3 className="text-[#111111] text-sm font-semibold mb-4">
                {editItem ? 'Edit Item' : 'Add Item to Menu'}
              </h3>
              <form onSubmit={handleAddItem} className="space-y-4">
                {/* Item Name */}
                <div>
                  <label className="block text-[#111111] text-sm font-medium mb-1.5">Item Name *</label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g., Caesar Salad"
                    className="w-full border border-[#E0E0E0] rounded px-4 py-2.5 text-[#111111] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6] focus:border-transparent"
                  />
                </div>

                {/* Price & Category row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#111111] text-sm font-medium mb-1.5">Price *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777]">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-[#E0E0E0] rounded pl-7 pr-4 py-2.5 text-[#111111] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#111111] text-sm font-medium mb-1.5">Category</label>
                    <select
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      className="w-full border border-[#E0E0E0] rounded px-4 py-2.5 text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6] focus:border-transparent bg-white"
                    >
                      <option value="">Select category</option>
                      <option value="Appetizers">Appetizers</option>
                      <option value="Main Courses">Main Courses</option>
                      <option value="Desserts">Desserts</option>
                      <option value="Beverages">Beverages</option>
                      <option value="Salads">Salads</option>
                      <option value="Soups">Soups</option>
                      <option value="Sides">Sides</option>
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Vegan">Vegan</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[#111111] text-sm font-medium mb-1.5">Description</label>
                  <textarea
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="Describe this item..."
                    rows={2}
                    className="w-full border border-[#E0E0E0] rounded px-4 py-2.5 text-[#111111] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6] focus:border-transparent resize-none"
                  />
                </div>

                {/* Things You Should Know */}
                <div>
                  <label className="block text-[#111111] text-sm font-medium mb-1.5">Things You Should Know</label>
                  <textarea
                    value={itemKeyInfo}
                    onChange={(e) => setItemKeyInfo(e.target.value)}
                    placeholder="Allergens, dietary info, preparation notes..."
                    rows={2}
                    className="w-full border border-[#E0E0E0] rounded px-4 py-2.5 text-[#111111] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#2A6FD6] focus:border-transparent resize-none"
                  />
                </div>

                {/* Image Upload */}
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-md p-2">
                    {uploadError}
                  </div>
                )}

                {imagePreview && (
                  <div className="relative bg-[#F5F5F5] rounded-md p-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      disabled={uploading}
                      className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 w-8 h-8 flex items-center justify-center rounded-full text-white"
                      aria-label="Remove image"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                      </svg>
                    </button>
                  </div>
                )}

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    disabled={uploading || addingItem}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || addingItem}
                    className="px-4 py-2 rounded font-medium text-sm bg-[#F5F5F5] border border-[#E0E0E0] text-[#111111] hover:bg-[#EEEEEE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Add Photo
                  </button>
                </div>

                {/* Is Available toggle */}
                <div className="flex items-center justify-between py-1">
                  <label className="text-[#111111] text-sm font-medium">Is Available</label>
                  <button
                    type="button"
                    onClick={() => setItemAvailable(!itemAvailable)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      itemAvailable ? 'bg-[#2A6FD6]' : 'bg-[#E0E0E0]'
                    }`}
                    role="switch"
                    aria-checked={itemAvailable}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        itemAvailable ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer — always visible */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-white rounded-b-lg shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-[#777] hover:bg-[#F5F5F5] disabled:opacity-50 rounded font-medium text-sm transition-colors border border-[#E0E0E0]"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          {(menu || editItem) ? (
            <button
              onClick={handleAddItem}
              disabled={addingItem || uploading || !itemName.trim() || !itemPrice}
              className="px-5 py-2.5 bg-[#2A6FD6] hover:bg-[#245FCC] disabled:bg-[#2A6FD6]/40 disabled:cursor-not-allowed text-white rounded font-medium text-sm transition-colors"
            >
              {addingItem || uploading ? (uploading ? 'Uploading...' : (editItem ? 'Saving...' : 'Adding...')) : (editItem ? 'Save Changes' : 'Add Item')}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !menuName.trim()}
              className="px-5 py-2.5 bg-[#2A6FD6] hover:bg-[#245FCC] disabled:bg-[#2A6FD6]/40 disabled:cursor-not-allowed text-white rounded font-medium text-sm transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('common.saving') || 'Saving...'}
                </span>
              ) : (
                t('common.create') || 'Create'
              )}
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
