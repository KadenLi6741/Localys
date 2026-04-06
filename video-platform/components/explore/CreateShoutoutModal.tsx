'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

const TAGS = [
  { id: 'hidden-gem', label: '#HiddenGem' },
  { id: 'cheap-eats', label: '#CheapEats' },
  { id: 'must-visit', label: '#MustVisit' },
  { id: 'new-spot', label: '#NewSpot' },
  { id: 'great-service', label: '#GreatService' },
];

interface BusinessSuggestion {
  id: string;
  full_name: string;
  username: string;
}

interface CreateShoutoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    business_name: string;
    business_id: string | null;
    text: string;
    tags: string[];
    star_rating: number | null;
    photos: File[];
    video: File | null;
    invite_to_localy: boolean;
  }) => void;
  submitting: boolean;
  editData?: {
    business_name: string;
    business_id: string | null;
    text: string;
    tags: string[];
    star_rating: number | null;
    photos: string[];
    video_url?: string | null;
  } | null;
}

export function CreateShoutoutModal({ isOpen, onClose, onSubmit, submitting, editData }: CreateShoutoutModalProps) {
  const [businessInput, setBusinessInput] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<BusinessSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [starRating, setStarRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [inviteToLocaly, setInviteToLocaly] = useState(false);
  const [mediaType, setMediaType] = useState<'photos' | 'video'>('photos');
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Pre-fill when editing
  useEffect(() => {
    if (isOpen && editData) {
      setBusinessInput(editData.business_name);
      setSelectedBusiness(editData.business_id ? { id: editData.business_id, full_name: editData.business_name, username: '' } : null);
      setText(editData.text);
      setTags(editData.tags);
      setStarRating(editData.star_rating || 0);
      setPhotoPreviews(editData.photos);
      setPhotos([]);
      if (editData.video_url) {
        setMediaType('video');
        setVideoPreview(editData.video_url);
      } else {
        setMediaType('photos');
        setVideoPreview(null);
      }
      setVideo(null);
    } else if (isOpen && !editData) {
      resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editData]);

  // Search businesses on @ input
  const searchBusinesses = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .not('type', 'is', null)
      .limit(6);
    setSuggestions(data || []);
  }, []);

  useEffect(() => {
    const query = businessInput.startsWith('@') ? businessInput.slice(1) : businessInput;
    if (query.length >= 2) {
      const timer = setTimeout(() => searchBusinesses(query), 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
    }
  }, [businessInput, searchBusinesses]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectBusiness = (biz: BusinessSuggestion) => {
    setSelectedBusiness(biz);
    setBusinessInput(`@${biz.full_name}`);
    setShowSuggestions(false);
    setInviteToLocaly(false);
  };

  const handleBusinessInputChange = (value: string) => {
    setBusinessInput(value);
    setSelectedBusiness(null);
    setShowSuggestions(true);
    setInviteToLocaly(false);
  };

  const toggleTag = (tagId: string) => {
    setTags((prev) => prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]);
  };

  const handlePhotoSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 3 - photos.length);
    setPhotos((prev) => [...prev, ...newFiles].slice(0, 3));

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreviews((prev) => [...prev, e.target?.result as string].slice(0, 3));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mediaType === 'video') {
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('video/')) handleVideoSelect(file);
    } else {
      handlePhotoSelect(e.dataTransfer.files);
    }
  };

  const handleVideoSelect = (file: File) => {
    if (file.size > 100 * 1024 * 1024) return; // 100MB limit
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    if (videoPreview && video) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
  };

  const handleSubmit = () => {
    const businessName = selectedBusiness
      ? selectedBusiness.full_name
      : businessInput.startsWith('@') ? businessInput.slice(1) : businessInput;

    if (!businessName.trim() || !text.trim()) return;

    onSubmit({
      business_name: businessName.trim(),
      business_id: selectedBusiness?.id || null,
      text: text.trim(),
      tags,
      star_rating: starRating > 0 ? starRating : null,
      photos: mediaType === 'photos' ? photos : [],
      video: mediaType === 'video' ? video : null,
      invite_to_localy: inviteToLocaly,
    });
  };

  const resetForm = () => {
    setBusinessInput('');
    setSelectedBusiness(null);
    setText('');
    setTags([]);
    setPhotos([]);
    setPhotoPreviews([]);
    setStarRating(0);
    setInviteToLocaly(false);
    setMediaType('photos');
    if (videoPreview && video) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const isBusinessNotOnLocaly = businessInput.trim().length > 0 && !selectedBusiness;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[var(--color-charcoal)] border border-[var(--color-charcoal-lighter-plus)] rounded-2xl p-6 overflow-y-auto max-h-[90vh]"
        style={{ animation: 'scaleIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-[var(--color-cream)]">{editData ? 'Edit Shoutout' : 'Share a Shoutout'}</h2>
          <button
            onClick={handleClose}
            className="text-[var(--color-body-text)] hover:text-[var(--color-cream)] transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Business input */}
        <div className="mb-4 relative" ref={suggestionsRef}>
          <label className="block text-sm font-medium text-[var(--color-cream)] mb-1.5">Business</label>
          <input
            type="text"
            value={businessInput}
            onChange={(e) => handleBusinessInputChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="@business name or type any name"
            className="w-full bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-cream)] placeholder-[var(--color-body-text)] focus:outline-none focus:border-[#1B5EA8] transition-colors"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full bg-[var(--color-charcoal)] border border-[var(--color-charcoal-lighter-plus)] rounded-xl overflow-hidden shadow-lg">
              {suggestions.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => handleSelectBusiness(biz)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-charcoal-light)] transition-colors flex items-center gap-2"
                >
                  <span className="text-sm font-semibold text-[var(--color-cream)]">{biz.full_name}</span>
                  <span className="text-xs text-[var(--color-body-text)]">@{biz.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--color-cream)] mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
                  tags.includes(tag.id)
                    ? 'bg-[#1B5EA8] text-black'
                    : 'bg-[var(--color-charcoal-light)] text-[var(--color-body-text)] hover:text-[var(--color-cream)] border border-[var(--color-charcoal-lighter-plus)]'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text area */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--color-cream)] mb-1.5">Your Experience</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience..."
            rows={5}
            className="w-full bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-xl px-4 py-3 text-sm text-[var(--color-cream)] placeholder-[var(--color-body-text)] focus:outline-none focus:border-[#1B5EA8] transition-colors resize-none"
          />
        </div>

        {/* Media upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--color-cream)] mb-1.5">Media</label>
          {/* Photos / Video toggle */}
          <div className="flex gap-1 mb-2 bg-[var(--color-charcoal-light)] rounded-lg p-0.5 w-fit">
            <button
              type="button"
              onClick={() => { setMediaType('photos'); removeVideo(); }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${mediaType === 'photos' ? 'bg-[#1B5EA8] text-black' : 'text-[var(--color-body-text)] hover:text-[var(--color-cream)]'}`}
            >
              Photos
            </button>
            <button
              type="button"
              onClick={() => { setMediaType('video'); setPhotos([]); setPhotoPreviews([]); }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${mediaType === 'video' ? 'bg-[#1B5EA8] text-black' : 'text-[var(--color-body-text)] hover:text-[var(--color-cream)]'}`}
            >
              Video
            </button>
          </div>

          {mediaType === 'photos' ? (
            <>
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {photoPreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                      <Image src={preview} alt="" fill unoptimized className="object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length < 3 && (
                <div
                  ref={dropRef}
                  onDragOver={handleDrag}
                  onDragEnter={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#1B5EA8]/40 rounded-xl p-4 text-center cursor-pointer hover:border-[#1B5EA8]/70 transition-colors"
                >
                  <p className="text-sm text-[var(--color-body-text)]">
                    Drag & drop or <span className="text-[#1B5EA8] font-semibold">click to upload</span> (up to 3)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handlePhotoSelect(e.target.files)}
                    className="hidden"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {videoPreview ? (
                <div className="relative rounded-xl overflow-hidden mb-2">
                  <video src={videoPreview} className="w-full max-h-48 object-contain bg-black rounded-xl" muted />
                  <button
                    onClick={removeVideo}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div
                  ref={dropRef}
                  onDragOver={handleDrag}
                  onDragEnter={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed border-[#1B5EA8]/40 rounded-xl p-4 text-center cursor-pointer hover:border-[#1B5EA8]/70 transition-colors"
                >
                  <p className="text-sm text-[var(--color-body-text)]">
                    Drag & drop or <span className="text-[#1B5EA8] font-semibold">click to upload</span> (max 100MB)
                  </p>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleVideoSelect(file);
                    }}
                    className="hidden"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Star rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--color-cream)] mb-1.5">Rating (optional)</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverStar(star)}
                onMouseLeave={() => setHoverStar(0)}
                onClick={() => setStarRating(star === starRating ? 0 : star)}
                className="p-0.5 focus:outline-none transition-transform hover:scale-110"
              >
                <svg
                  className={`w-7 h-7 transition-colors ${
                    star <= (hoverStar || starRating) ? 'text-[#1B5EA8]' : 'text-[var(--color-charcoal-lighter-plus)]'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
            {starRating > 0 && (
              <span className="ml-2 text-sm text-[var(--color-body-text)]">{starRating}/5</span>
            )}
          </div>
        </div>

        {/* Invite to Localy */}
        {isBusinessNotOnLocaly && (
          <label className="flex items-center gap-2 mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={inviteToLocaly}
              onChange={(e) => setInviteToLocaly(e.target.checked)}
              className="w-4 h-4 rounded accent-[#1B5EA8]"
            />
            <span className="text-sm text-[var(--color-body-text)]">Invite this business to join Localy</span>
          </label>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl font-semibold text-sm border border-[var(--color-charcoal-lighter-plus)] text-[var(--color-body-text)] hover:text-[var(--color-cream)] hover:bg-[var(--color-charcoal-light)] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !businessInput.trim() || !text.trim()}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-[#1B5EA8] text-black hover:bg-[#1B5EA8]/90 disabled:opacity-40 transition-all active:scale-[0.98]"
          >
            {submitting ? (editData ? 'Saving...' : 'Posting...') : (editData ? 'Save Changes' : 'Post Shoutout')}
          </button>
        </div>
      </div>
    </div>
  );
}
