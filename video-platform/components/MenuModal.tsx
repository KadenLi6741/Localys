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
  const [selectedImages, setSelectedImages] = useState<(File | null)[]>([null, null, null]);
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

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
        // Pre-fill existing images
        const existingUrls = editItem.image_urls || [];
        const primary = editItem.image_url || null;
        const previews: (string | null)[] = [primary, existingUrls[1] || null, existingUrls[2] || null];
        // If primary is in image_urls, use image_urls directly
        if (existingUrls.length > 0) {
          previews[0] = existingUrls[0] || primary;
          previews[1] = existingUrls[1] || null;
          previews[2] = existingUrls[2] || null;
        }
        setImagePreviews(previews);
        setSelectedImages([null, null, null]);
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
    setSelectedImages([null, null, null]);
    setImagePreviews([null, null, null]);
    setUploadError(null);
    fileInputRefs.forEach(ref => { if (ref.current) ref.current.value = ''; });
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

  const handleImageSelect = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    const newImages = [...selectedImages];
    newImages[index] = file;
    setSelectedImages(newImages);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const newPreviews = [...imagePreviews];
      newPreviews[index] = e.target?.result as string;
      setImagePreviews(newPreviews);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    newImages[index] = null;
    setSelectedImages(newImages);
    const newPreviews = [...imagePreviews];
    newPreviews[index] = null;
    setImagePreviews(newPreviews);
    if (fileInputRefs[index]?.current) {
      fileInputRefs[index].current!.value = '';
    }
  };

  const uploadItemImage = async (file: File): Promise<string | null> => {
    try {
      setUploadError(null);
      const fileExt = file.name.split('.').pop()?.toLowerCase();

      if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt)) {
        setUploadError('Invalid file type. Allowed: JPG, PNG, GIF, WEBP, BMP');
        return null;
      }

      const fileName = `menu-item-images/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
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
    setUploading(selectedImages.some(img => img !== null));

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

      // Upload all selected images
      const uploadedUrls: string[] = [];
      for (let i = 0; i < 3; i++) {
        if (selectedImages[i]) {
          const url = await uploadItemImage(selectedImages[i]!);
          if (url) {
            uploadedUrls.push(url);
          } else {
            setAddingItem(false);
            setUploading(false);
            return;
          }
        } else if (imagePreviews[i] && !selectedImages[i]) {
          // Keep existing image URL (editing mode)
          uploadedUrls.push(imagePreviews[i]!);
        }
      }

      const primaryImageUrl = uploadedUrls[0] || undefined;

      if (editItem) {
        const updateData: { item_name: string; price: number; description: string; category: string; key_info: string; is_available: boolean; image_url?: string; image_urls?: string[] } = {
          item_name: itemName,
          price: parseFloat(itemPrice),
          description: itemDescription,
          category: itemCategory,
          key_info: itemKeyInfo,
          is_available: itemAvailable,
        };
        if (primaryImageUrl) {
          updateData.image_url = primaryImageUrl;
        }
        updateData.image_urls = uploadedUrls;

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
          image_url: primaryImageUrl,
          image_urls: uploadedUrls,
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
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-modal-title"
    >
      <div className="flex items-center justify-center min-h-full p-4">
      <div
        className="bg-card rounded-[4px] shadow-[inset_0_0_0_1px_var(--border)] flex flex-col w-[90%] max-w-[560px] max-h-[85vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 id="menu-modal-title" className="text-lg font-semibold text-foreground">
            {editItem ? 'Edit Item' : menu ? t('menu.edit_menu') || 'Edit Menu' : t('menu.create_menu') || 'Create Menu'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-[4px] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive rounded-[4px] p-3 text-sm">
              {error}
            </div>
          )}

          {/* Menu Info Section - shown for create only */}
          {!menu && (
            <>
              <div>
                <label className="block text-foreground text-sm font-medium mb-1.5">
                  {t('menu.menu_name') || 'Menu Name'}
                </label>
                <input
                  type="text"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder={t('menu.menu_name_placeholder') || 'e.g., Appetizers, Main Courses'}
                  className="w-full bg-surface border border-border rounded-[4px] px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-foreground text-sm font-medium mb-1.5">
                  {t('menu.description') || 'Description'}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('menu.description_placeholder') || 'Add a description for this menu section...'}
                  rows={3}
                  className="w-full bg-surface border border-border rounded-[4px] px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-foreground text-sm font-medium mb-1.5">
                  {t('menu.category') || 'Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface border border-border rounded-[4px] px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
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
              <h3 className="text-foreground text-sm font-semibold mb-4">
                {editItem ? 'Edit Item' : 'Add Item to Menu'}
              </h3>
              <form onSubmit={handleAddItem} className="space-y-4">
                {/* Item Name */}
                <div>
                  <label className="block text-foreground text-sm font-medium mb-1.5">Item Name *</label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g., Caesar Salad"
                    className="w-full bg-surface border border-border rounded-[4px] px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                {/* Price & Category row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-foreground text-sm font-medium mb-1.5">Price *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-surface border border-border rounded-[4px] pl-7 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-foreground text-sm font-medium mb-1.5">Category</label>
                    <select
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      className="w-full bg-surface border border-border rounded-[4px] px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
                  <label className="block text-foreground text-sm font-medium mb-1.5">Description</label>
                  <textarea
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="Describe this item..."
                    rows={2}
                    className="w-full bg-surface border border-border rounded-[4px] px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  />
                </div>

                {/* Things You Should Know */}
                <div>
                  <label className="block text-foreground text-sm font-medium mb-1.5">Things You Should Know</label>
                  <textarea
                    value={itemKeyInfo}
                    onChange={(e) => setItemKeyInfo(e.target.value)}
                    placeholder="Allergens, dietary info, preparation notes..."
                    rows={2}
                    className="w-full bg-surface border border-border rounded-[4px] px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  />
                </div>

                {/* Image Upload — up to 3 images */}
                {uploadError && (
                  <div className="bg-destructive/10 border border-destructive text-destructive text-xs rounded-[4px] p-2">
                    {uploadError}
                  </div>
                )}

                <div>
                  <label className="block text-foreground text-sm font-medium mb-1.5">Photos (up to 3)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="relative">
                        {imagePreviews[index] ? (
                          <div className="relative aspect-square bg-surface rounded-[4px] overflow-hidden">
                            <img
                              src={imagePreviews[index]!}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {index === 0 && (
                              <span className="absolute top-1 left-1 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-[4px]">Primary</span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              disabled={uploading}
                              className="absolute top-1 right-1 bg-destructive hover:bg-destructive/90 disabled:opacity-50 w-6 h-6 flex items-center justify-center rounded-full text-white"
                              aria-label="Remove image"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRefs[index]?.current?.click()}
                            disabled={uploading || addingItem}
                            className="aspect-square w-full border-2 border-dashed border-border rounded-[4px] flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-[10px] text-muted-foreground">{index === 0 ? 'Primary' : `Photo ${index + 1}`}</span>
                          </button>
                        )}
                        <input
                          type="file"
                          ref={fileInputRefs[index]}
                          onChange={handleImageSelect(index)}
                          accept="image/*"
                          disabled={uploading || addingItem}
                          className="hidden"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Is Available toggle */}
                <div className="flex items-center justify-between py-1">
                  <label className="text-foreground text-sm font-medium">Is Available</label>
                  <button
                    type="button"
                    onClick={() => setItemAvailable(!itemAvailable)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      itemAvailable ? 'bg-primary' : 'bg-border'
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-card rounded-b-[4px] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-muted-foreground hover:bg-surface disabled:opacity-50 rounded-[4px] font-medium text-sm transition-colors border border-border"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          {(menu || editItem) ? (
            <button
              onClick={handleAddItem}
              disabled={addingItem || uploading || !itemName.trim() || !itemPrice}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:cursor-not-allowed text-primary-foreground rounded-[4px] font-medium text-sm transition-colors"
            >
              {addingItem || uploading ? (uploading ? 'Uploading...' : (editItem ? 'Saving...' : 'Adding...')) : (editItem ? 'Save Changes' : 'Add Item')}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !menuName.trim()}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:cursor-not-allowed text-primary-foreground rounded-[4px] font-medium text-sm transition-colors"
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
