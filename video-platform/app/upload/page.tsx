'use client';

/**
 * Upload page (/upload) — post a new video (and optionally boost it).
 * Purpose: Lets a signed-in user pick/record a video, add a caption/category, upload the file +
 *   metadata to Supabase, and optionally promote it with coins on publish. Gated behind ProtectedRoute.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { uploadVideoFile, uploadVideoMetadata } from '@/lib/supabase/videos';
import { ChevronLeft } from 'lucide-react';

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
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setSelectedVideo(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setSelectedVideo(null);
    setVideoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideo || !user) return;

    setError('');
    setIsUploading(true);
    setUploadProgress(10);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? Math.min(90, prev + Math.random() * 30) : prev));
    }, 500);

    try {
      const { data: uploadData, error: uploadError } = await uploadVideoFile(selectedVideo, user.id);
      clearInterval(progressInterval);
      setUploadProgress(70);

      if (uploadError || !uploadData?.publicUrl) {
        throw new Error(uploadError?.message || 'Failed to upload video');
      }

      setUploadProgress(85);

      const { error: metadataError } = await uploadVideoMetadata({
        user_id: user.id,
        video_url: uploadData.publicUrl,
        caption: caption || undefined,
      });

      if (metadataError) throw metadataError;

      setUploadProgress(100);
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedVideo(null);
      setVideoPreview(null);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploaded(true);
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Failed to upload video');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (uploaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-[#f97316]/10 border-2 border-[#f97316] flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-[#f97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black mb-1">Video uploaded!</h2>
            <p className="text-gray-500 text-sm">Your video is now live in the feed</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setUploaded(false)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-black hover:bg-gray-50 transition-colors"
            >
              Upload another
            </button>
            <button
              onClick={() => router.push('/feed')}
              className="px-5 py-2.5 bg-[#f97316] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              View feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-black">Create Post</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Video upload */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-black">Video</label>
            {!videoPreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer transition-colors hover:border-[#f97316] hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]"
              >
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-black font-semibold mb-1">Click to select a video</p>
                <p className="text-sm text-gray-400">MP4, MOV, AVI up to 100 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <video src={videoPreview} controls className="w-full max-h-80 object-contain bg-black" />
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label htmlFor="caption" className="block text-sm font-semibold text-black">
              Caption
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => { if (e.target.value.length <= 500) setCaption(e.target.value); }}
              placeholder="Describe your business or service..."
              rows={4}
              maxLength={500}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-300 focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30 transition-all resize-none"
            />
            <p className={`text-xs text-right ${caption.length >= 450 ? 'text-[#f97316]' : 'text-gray-400'}`}>
              {caption.length}/500
            </p>
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#f97316] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!selectedVideo || isUploading}
            className="w-full bg-[#f97316] text-white font-semibold py-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all min-h-[52px]"
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Uploading...
              </span>
            ) : (
              'Post Video'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
