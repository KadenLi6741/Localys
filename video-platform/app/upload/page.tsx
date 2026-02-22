'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { uploadVideoFile, uploadVideoMetadata } from '@/lib/supabase/videos';
import { getUserCoins } from '@/lib/supabase/profiles';
import { PromotionModal } from '@/components/PromotionModal';
import { supabase } from '@/lib/supabase/client';

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <UploadContent />
    </ProtectedRoute>
  );
}

function UploadContent() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [userCoins, setUserCoins] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadCoins = async () => {
      if (!user) return;
      const { data: coins } = await getUserCoins(user.id);
      setUserCoins(coins || 100);
      console.log('Loaded user coins:', coins);
    };
    loadCoins();
  }, [user]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedVideo(file);
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideo || !user) return;

    setError('');
    setIsUploading(true);

    try {
      const { data: uploadData, error: uploadError } = await uploadVideoFile(selectedVideo, user.id);
      
      if (uploadError || !uploadData?.publicUrl) {
        throw new Error(uploadError?.message || 'Failed to upload video');
      }

      let businessId: string | undefined;
      if (businessName && category) {
        const { data: existingBusiness } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .eq('business_name', businessName)
          .single();

        if (existingBusiness) {
          businessId = existingBusiness.id;
        } else {
          const { data: newBusiness, error: businessError } = await supabase
            .from('businesses')
            .insert({
              owner_id: user.id,
              business_name: businessName,
              category: category as 'food' | 'retail' | 'services',
              video_url: uploadData.publicUrl,
              latitude: 0,
              longitude: 0,
            })
            .select()
            .single();

          if (businessError) throw businessError;
          businessId = newBusiness.id;
        }
      }

      const { data: videoData, error: metadataError } = await uploadVideoMetadata({
        user_id: user.id,
        video_url: uploadData.publicUrl,
        caption: caption || undefined,
        business_id: businessId,
      });

      if (metadataError) throw metadataError;

      const { data: coins } = await getUserCoins(user.id);
      setUserCoins(coins || 100);
      setUploadedVideoId(videoData.id);
      
      setSelectedVideo(null);
      setVideoPreview(null);
      setCaption('');
      setBusinessName('');
      setCategory('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setIsUploading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to upload video');
      setIsUploading(false);
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setSelectedVideo(null);
    setVideoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Create Post</h1>
        </div>
      </div>

      {/* Success Screen */}
      {uploadedVideoId && !showPromotionModal && (
        <div className="max-w-2xl mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-500/20 border border-green-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-2">Video Uploaded!</h2>
              <p className="text-white/60">Your video is now live in the feed</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6 my-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Your Coins</p>
                  <p className="text-3xl font-bold text-yellow-400">🪙 {userCoins}</p>
                </div>
                <svg className="w-12 h-12 text-yellow-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h-2m0 0h-2m2 0v-2m0 2v2m0-6h4v4m0 0h-2m2 0v-2m0 2v2" />
                </svg>
              </div>
            </div>

            <p className="text-white/70 text-sm">Boost your video to get more exposure in the feed</p>

            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-all"
              >
                View Feed
              </button>
              <button
                onClick={() => setShowPromotionModal(true)}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <span>🚀</span>
                <span>Boost Video</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!uploadedVideoId && (
        <div className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Video Upload Area */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-white/80">
              Upload Video
            </label>
            
            {!videoPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-lg p-12 text-center cursor-pointer hover:border-white/40 transition-all duration-300 hover:bg-white/5"
              >
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-white/40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-white/60 mb-2">Click to upload video</p>
                <p className="text-sm text-white/40">MP4, MOV, AVI up to 100MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  src={videoPreview}
                  controls
                  className="w-full max-h-96 object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Caption Input */}
          <div className="space-y-2">
            <label htmlFor="caption" className="block text-sm font-medium text-white/80">
              Caption
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setCaption(e.target.value);
                }
              }}
              placeholder="Describe your business or service..."
              rows={4}
              maxLength={500}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200"
            />
            <p className={`text-xs ${caption.length >= 450 ? 'text-yellow-400' : 'text-white/40'}`}>
              {caption.length}/500 characters
            </p>
          </div>

          {/* Business Info (Optional) */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="businessName" className="block text-sm font-medium text-white/80">
                Business Name (Optional)
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter business name"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200"
              />
            </div>

            {businessName && (
              <div className="space-y-2">
                <label htmlFor="category" className="block text-sm font-medium text-white/80">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required={!!businessName}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200"
                >
                  <option value="">Select category</option>
                  <option value="food">Food</option>
                  <option value="retail">Retail</option>
                  <option value="services">Services</option>
                </select>
              </div>
            )}

            {/* Boost Button */}
            <button
              type="button"
              onClick={() => {
                setUploadedVideoId('temp');
                setShowPromotionModal(true);
              }}
              className="w-full mt-4 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>🚀</span>
              <span>Learn About Boosting</span>
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedVideo || isUploading}
            className="w-full bg-white text-black font-semibold py-4 rounded-lg disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed hover:bg-white/90 active:scale-98 transition-all duration-200"
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </span>
            ) : (
              'Upload Video'
            )}
          </button>
        </form>
      </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-around py-3">
          <Link href="/" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className="text-white/60 text-xs">Home</span>
          </Link>
          <Link href="/search" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-white/60 text-xs">Search</span>
          </Link>
          <Link href="/upload" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${pathname === '/upload' ? 'bg-white' : 'bg-white/20'}`}>
              <svg className={`w-6 h-6 ${pathname === '/upload' ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </Link>
          <Link href="/chats" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-white/60 text-xs">Chats</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-white/60 text-xs">Profile</span>
          </Link>
        </div>
      </div>

      {/* Promotion Modal */}
      {uploadedVideoId && (
        <PromotionModal
          isOpen={showPromotionModal}
          onClose={() => {
            setShowPromotionModal(false);
            if (uploadedVideoId !== 'temp') {
              router.push('/');
              router.refresh();
            }
            if (uploadedVideoId === 'temp') {
              setUploadedVideoId(null);
            }
          }}
          videoId={uploadedVideoId}
          userCoins={userCoins}
          onSuccess={(newBoost, coinsSpent, remainingCoins) => {
            setUserCoins(remainingCoins);
            setShowPromotionModal(false);
            router.push('/');
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
