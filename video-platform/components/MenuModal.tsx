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

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
        const updateData: { item_name: string; price: number; description: string; category: string; image_url?: string } = {
          item_name: itemName,
          price: parseFloat(itemPrice),
          description: itemDescription,
          category: itemCategory,
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1A1A18]/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-modal-title"
    >
      <div className="relative w-full sm:max-w-lg bg-[#1A1A18] border border-[#3A3A34] rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[80vh] sm:max-h-[600px] flex flex-col animate-[scaleIn_200ms_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3A3A34]">
          <h2 id="menu-modal-title" className="text-lg font-semibold text-[#F5F0E8]">
            {editItem ? 'Edit Item' : menu ? t('menu.edit_menu') || 'Edit Menu' : t('menu.create_menu') || 'Create Menu'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2E2E28] rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6 text-[#9E9A90]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto bg-[#1A1A18] space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-[#E05C3A]/10 border border-[#E05C3A]/50 text-[#E05C3A] rounded-xl p-3 text-sm">
                {error}
              </div>
            )}

            {/* Menu Info Section - shown for create only */}
            {!menu && (
              <>
                {/* Menu Name */}
                <div>
                  <label className="block text-[#F5F0E8] text-sm font-medium mb-2">
                    {t('menu.menu_name') || 'Menu Name'}
                  </label>
                  <input
                    type="text"
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                    placeholder={t('menu.menu_name_placeholder') || 'e.g., Appetizers, Main Courses'}
                    className="w-full bg-[#242420] border border-[#3A3A34] rounded-xl px-4 py-2 text-[#F5F0E8] placeholder:text-[#9E9A90]/50 focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[#F5F0E8] text-sm font-medium mb-2">
                    {t('menu.description') || 'Description'}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('menu.description_placeholder') || 'Add a description for this menu section...'}
                    rows={3}
                    className="w-full bg-[#242420] border border-[#3A3A34] rounded-xl px-4 py-2 text-[#F5F0E8] placeholder:text-[#9E9A90]/50 focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[#F5F0E8] text-sm font-medium mb-2">
                    {t('menu.category') || 'Category'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#242420] border border-[#3A3A34] rounded-xl px-4 py-2 text-[#F5F0E8] focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent transition-all"
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

            {/* Add/Edit Item Section - Only when editing existing menu or editing an item */}
            {(menu || editItem) && (
              <div className="border-t border-[#3A3A34] pt-4">
                <h3 className="text-[#F5F0E8] text-sm font-semibold mb-4">
                  {editItem ? 'Edit Item' : 'Add Item to Menu'}
                </h3>
                <form onSubmit={handleAddItem} className="space-y-3">
                  <div>
                    <label className="block text-[#F5F0E8] text-xs font-medium mb-2">Item Name *</label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g., Caesar Salad"
                      className="w-full bg-[#242420] border border-[#3A3A34] rounded-xl px-4 py-2 text-[#F5F0E8] placeholder:text-[#9E9A90]/50 focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#F5F0E8] text-xs font-medium mb-2">Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#242420] border border-[#3A3A34] rounded-xl px-4 py-2 text-[#F5F0E8] placeholder:text-[#9E9A90]/50 focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[#F5F0E8] text-xs font-medium mb-2">Category</label>
                      <input
                        type="text"
                        value={itemCategory}
                        onChange={(e) => setItemCategory(e.target.value)}
                        placeholder="e.g., Vegetarian"
                        className="w-full bg-[#242420] border border-[#3A3A34] rounded-xl px-4 py-2 text-[#F5F0E8] placeholder:text-[#9E9A90]/50 focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#F5F0E8] text-xs font-medium mb-2">Description</label>
                    <textarea
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Describe the item..."
                      rows={2}
                      className="w-full bg-[#242420] border border-[#3A3A34] rounded-xl px-4 py-2 text-[#F5F0E8] placeholder:text-[#9E9A90]/50 focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  {/* Image Upload Error */}
                  {uploadError && (
                    <div className="bg-[#E05C3A]/10 border border-[#E05C3A]/50 text-[#E05C3A] text-xs rounded-xl p-2">
                      {uploadError}
                    </div>
                  )}

                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="relative bg-[#242420] rounded-xl p-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        disabled={uploading}
                        className="absolute top-2 right-2 bg-[#E05C3A]/80 hover:bg-[#E05C3A] disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
                        aria-label="Remove image"
                      >
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Image Upload Button */}
                  <div className="flex gap-2">
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
                      className="px-4 py-2 rounded-xl font-medium text-sm bg-[#242420] border border-[#3A3A34] text-[#F5F0E8] hover:bg-[#2E2E28] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      title="Add item photo"
                    >
                      📷 Add Photo
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={addingItem || uploading || !itemName.trim() || !itemPrice}
                    className="w-full px-4 py-2 bg-[#6BAF7A] hover:bg-[#6BAF7A]/90 disabled:bg-[#6BAF7A]/40 disabled:cursor-not-allowed text-black rounded-xl transition-colors font-medium text-sm min-h-[44px]"
                  >
                    {addingItem || uploading ? (uploading ? 'Uploading...' : (editItem ? 'Saving...' : 'Adding...')) : (editItem ? 'Save Changes' : 'Add Item')}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-[#3A3A34] bg-[#1A1A18]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-[#9E9A90] hover:bg-[#2E2E28] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors font-medium min-h-[44px]"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            {!menu && (
              <button
                onClick={handleSubmit}
                disabled={loading || !menuName.trim()}
                className="px-6 py-2 bg-[#F5A623] hover:bg-[#F5A623]/90 disabled:bg-[#F5A623]/40 disabled:cursor-not-allowed text-black rounded-xl transition-colors font-medium min-h-[44px]"
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
