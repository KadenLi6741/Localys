'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getOrCreateOneToOneChat } from '@/lib/supabase/messaging';
import { getProfileByUserId, Business, BusinessHours } from '@/lib/supabase/profiles';
import { MenuList } from '@/components/MenuList';
import { PostedVideos } from '@/components/PostedVideos';

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
  const [business, setBusiness] = useState<Business | null>(null);
  const [showBusinessHours, setShowBusinessHours] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messagingLoading, setMessagingLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadBusiness();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, profile_picture_url, bio')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadBusiness = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          id,
          owner_id,
          business_name,
          business_type,
          business_hours,
          average_rating,
          total_reviews,
          created_at,
          updated_at
        `)
        .eq('owner_id', userId)
        .single();

      console.log('Business fetch result:', { data, error }); // DEBUG

      if (!error && data) {
        // Parse business_hours if it's a string
        if (data.business_hours && typeof data.business_hours === 'string') {
          try {
            data.business_hours = JSON.parse(data.business_hours);
          } catch (parseError) {
            console.error('Error parsing business_hours:', parseError);
            data.business_hours = null;
          }
        }
        console.log('Business after parsing:', data); // DEBUG
        console.log('Business hours value:', data.business_hours); // DEBUG
        setBusiness(data as Business);
      } else if (error) {
        console.error('Business fetch error:', error);
      }
    } catch (error) {
      console.error('Business load error:', error); // DEBUG
      // Business doesn't exist, which is fine
      setBusiness(null);
    }
  };

  const handleMessageClick = async () => {
    if (!user || !profile) return;
    
    setMessagingLoading(true);
    try {
      console.log('Starting chat with user:', profile.id);
      const { data, error } = await getOrCreateOneToOneChat(user.id, profile.id);
      
      if (error) {
        console.error('Chat creation error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        alert(`Failed to start conversation: ${errorMsg}`);
        return;
      }
      
      if (data && data.id) {
        console.log('Chat created/found successfully:', data.id);
        router.push(`/chats/${data.id}`);
      } else {
        console.error('No chat data returned:', data);
        alert('Failed to create or get chat');
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${errorMsg}`);
    } finally {
      setMessagingLoading(false);
    }
  };

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
          <img
            src={profile.profile_picture_url || 'https://via.placeholder.com/120'}
            alt={profile.full_name}
            className="w-32 h-32 rounded-full border-4 border-white/20 object-cover mb-4"
          />
          
          {/* Average Rating Badge - Prominently displayed below profile pic */}
          {business && typeof (business as any).average_rating === 'number' && (business as any).average_rating !== null && (
            <div className="flex items-center justify-center gap-1 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/50 rounded-full px-4 py-2 mb-3 shadow-lg">
              <span className="text-2xl">⭐</span>
              <span className="font-bold text-yellow-300 text-lg">{((business as any).average_rating as number).toFixed(2)}</span>
              <span className="text-yellow-200/80 text-sm">({(business as any).total_reviews})</span>
            </div>
          )}
          
          <h2 className="text-2xl font-bold mb-1">{profile.full_name}</h2>
          <p className="text-white/60 mb-4">@{profile.username}</p>
          {profile.bio && (
            <p className="text-white/80 text-center max-w-md mb-2">{profile.bio}</p>
          )}
          
          {/* Business Info */}
          {business && (
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <p className="text-blue-400 text-sm">🏪 {business.business_name}</p>
                {business.business_type && (
                  <span className="bg-blue-500/30 text-blue-200 text-xs px-2 py-1 rounded-full capitalize">
                    {business.business_type === 'hybrid' ? '📦 Pickup & Delivery' : `🏷️ ${business.business_type}`}
                  </span>
                )}
              </div>
              
              <button
                onClick={() => setShowBusinessHours(!showBusinessHours)}
                className="bg-blue-500/20 text-blue-200 text-xs px-3 py-2 rounded-full hover:bg-blue-500/30 transition-colors font-semibold"
              >
                {showBusinessHours ? '⏰ Hide Hours' : '⏰ Show Hours'}
              </button>
            </div>
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

        {/* Business Hours Section */}
        {business && showBusinessHours && (
          <div className="mt-8 mb-8">
            <h3 className="text-xl font-semibold mb-4">⏰ Business Hours</h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-2">
              {business.business_hours && Object.keys(business.business_hours).length > 0 ? (
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                  const dayHours = business.business_hours?.[day];
                  return (
                    <div key={day} className="flex justify-between items-center text-sm">
                      <span className="text-white/80 capitalize font-medium w-24">{day}</span>
                      <span className="text-white/60 text-right">
                        {dayHours?.closed ? (
                          <span className="text-red-400">Closed</span>
                        ) : dayHours?.open && dayHours?.close ? (
                          `${dayHours.open} - ${dayHours.close}`
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-white/60 text-center py-4">Business hours not yet set</p>
              )}
            </div>
          </div>
        )}

        {/* Services Section */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">⚙️ Services</h3>
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <MenuList userId={userId} isOwnProfile={false} />
          </div>
        </div>

        {/* Videos Section */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">📹 Videos</h3>
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <PostedVideos userId={userId} />
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
