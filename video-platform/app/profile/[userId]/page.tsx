'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getOrCreateConversation } from '@/lib/supabase/messaging';
import { getProfileByUserId } from '@/lib/supabase/profiles';
import { EditableProfilePicture } from '@/components/EditableProfilePicture';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  profile_picture_url?: string;
  bio?: string;
}

export default function UserProfilePage() {
  return (
    <ProtectedRoute>
      <UserProfileContent />
    </ProtectedRoute>
  );
}

function UserProfileContent() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const userId = params.userId as string;
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messagingLoading, setMessagingLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      // Check if user is authenticated
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        console.warn('User not authenticated');
        setError('Please log in to view profiles');
        setLoading(false);
        return;
      }

      const { data, error } = await getProfileByUserId(userId);

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          code: error.code,
        });
        throw error;
      }

      if (!data) {
        setError('Profile not found');
        setLoading(false);
        return;
      }

      setProfile(data);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      setError(error?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = async () => {
    if (!user || !profile) return;
    
    setMessagingLoading(true);
    try {
      const { data, error } = await getOrCreateConversation(profile.id);
      if (error) {
        alert(`Failed to start conversation: ${error.message}`);
        return;
      }
      
      if (data) {
        router.push(`/chats/${data.id}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setMessagingLoading(false);
    }
  };

  // Redirect to own profile page if viewing own profile
  useEffect(() => {
    if (user && userId === user.id) {
      router.push('/profile');
    }
  }, [user, userId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Profile Not Found</h2>
          <p className="text-white/60 mb-6">{error || 'This profile does not exist.'}</p>
          <Link
            href="/"
            className="bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-white/90 transition-all duration-200"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">{profile.username || 'Profile'}</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Profile Content */}
      <div className="p-6 pb-32">
        <div className="flex flex-col items-center mb-6">
          <EditableProfilePicture
            userId={userId}
            currentImageUrl={profile.profile_picture_url}
            fullName={profile.full_name}
            username={profile.username}
            isOwnProfile={false}
            className="w-32 h-32"
          />
          <h2 className="text-2xl font-bold mb-1 mt-4">{profile.full_name}</h2>
          <p className="text-white/60 mb-4">@{profile.username}</p>
          {profile.bio && (
            <p className="text-white/80 text-center max-w-md mb-6">{profile.bio}</p>
          )}
          
          {/* Message Button */}
          <button
            onClick={handleMessageClick}
            disabled={messagingLoading}
            className="bg-white text-black font-semibold px-6 py-2 rounded-lg hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {messagingLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Starting chat...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Message
              </>
            )}
          </button>
        </div>

        {/* Placeholder for videos/posts */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Videos</h3>
          <div className="text-white/60 text-center py-12">
            <p>No videos yet</p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Hotbar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-around py-3">
          <Link href="/" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/' ? 'text-white' : 'text-white/60'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className={`text-xs ${pathname === '/' ? 'text-white' : 'text-white/60'}`}>Home</span>
          </Link>
          <Link href="/search" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/search' ? 'text-white' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className={`text-xs ${pathname === '/search' ? 'text-white' : 'text-white/60'}`}>Search</span>
          </Link>
          <Link href="/upload" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${pathname === '/upload' ? 'bg-white' : 'bg-white/20'}`}>
              <svg className={`w-6 h-6 ${pathname === '/upload' ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </Link>
          <Link href="/chats" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/chats' ? 'text-white' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className={`text-xs ${pathname === '/chats' ? 'text-white' : 'text-white/60'}`}>Chats</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname?.startsWith('/profile') ? 'text-white' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className={`text-xs ${pathname?.startsWith('/profile') ? 'text-white' : 'text-white/60'}`}>Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
