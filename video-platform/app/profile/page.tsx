'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';
import { EditableProfilePicture } from '@/components/EditableProfilePicture';
import { 
  uploadProfilePicture, 
  updateProfile, 
  getUserBusiness, 
  updateBusinessInfo,
  Profile,
  Business,
  ProfileUpdateData,
  BusinessUpdateData,
  MAX_PROFILE_PICTURE_SIZE,
  BYTES_TO_MB
} from '@/lib/supabase/profiles';

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, signOut: contextSignOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadBusiness();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      // Failed to load profile - will show loading state or empty profile
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const loadBusiness = async () => {
    if (!user) return;

    try {
      const { data, error } = await getUserBusiness(user.id);
      if (!error && data) {
        setBusiness(data);
      }
    } catch (error) {
      // Failed to load business - user may not have one, which is fine
      setBusiness(null);
    }
  };

  const handleSignOut = async () => {
    await contextSignOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
      </div>

      {/* Profile Content */}
      {isEditMode ? (
        <ProfileEditForm 
          profile={profile}
          business={business}
          user={user}
          onSave={async () => {
            await loadProfile();
            await loadBusiness();
            setIsEditMode(false);
          }}
          onCancel={() => setIsEditMode(false)}
        />
      ) : (
        <ProfileView 
          profile={profile}
          business={business}
          user={user}
          onEditClick={() => setIsEditMode(true)}
          onSignOut={handleSignOut}
          onProfileUpdated={loadProfile}
          pathname={pathname}
        />
      )}
    </div>
  );
}

interface ProfileViewProps {
  profile: Profile | null;
  business: Business | null;
  user: any;
  onEditClick: () => void;
  onSignOut: () => void;
  onProfileUpdated: () => void;
  pathname: string;
}

function ProfileView({ profile, business, user, onEditClick, onSignOut, onProfileUpdated, pathname }: ProfileViewProps) {
  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex items-center gap-6 mb-8">
          <EditableProfilePicture
            userId={user.id}
            currentImageUrl={profile?.profile_picture_url}
            fullName={profile?.full_name}
            username={profile?.username}
            isOwnProfile={true}
            onImageUpdated={onProfileUpdated}
            className="w-24 h-24"
          />
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{profile?.full_name || 'User'}</h2>
            <p className="text-white/60 mb-2">@{profile?.username || 'username'}</p>
            {profile?.bio && (
              <p className="text-white/80 text-sm mb-2">{profile.bio}</p>
            )}
            {business && (
              <p className="text-blue-400 text-sm">🏪 {business.business_name}</p>
            )}
          </div>
        </div>

        {/* Edit Profile Button */}
        <button 
          onClick={onEditClick}
          className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg py-3 mb-6 transition-all duration-200 hover:scale-[1.02] active:scale-98"
        >
          Edit Profile
        </button>

        {/* Settings Section */}
        <div className="space-y-2 mb-8">
          <h3 className="text-xl font-semibold mb-4">Settings</h3>
          <Link
            href="/settings/payment"
            className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200"
          >
            <span>Payment Methods</span>
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/settings/language"
            className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200"
          >
            <span>Language Preferences</span>
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/settings/location"
            className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200"
          >
            <span>Location Settings</span>
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={onSignOut}
          className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 rounded-lg py-3 transition-all duration-200 hover:scale-[1.02] active:scale-98"
        >
          Sign Out
        </button>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation pathname={pathname} />
    </>
  );
}

interface ProfileEditFormProps {
  profile: Profile | null;
  business: Business | null;
  user: any;
  onSave: () => void;
  onCancel: () => void;
}

function ProfileEditForm({ profile, business, user, onSave, onCancel }: ProfileEditFormProps) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [businessName, setBusinessName] = useState(business?.business_name || '');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(
    profile?.profile_picture_url || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URL on unmount or when new file is selected
  useEffect(() => {
    return () => {
      if (profilePicturePreview && profilePicturePreview.startsWith('blob:')) {
        URL.revokeObjectURL(profilePicturePreview);
      }
    };
  }, [profilePicturePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size using constant
      if (file.size > MAX_PROFILE_PICTURE_SIZE) {
        const maxSizeMB = MAX_PROFILE_PICTURE_SIZE / BYTES_TO_MB;
        setError(`Image size must be less than ${maxSizeMB}MB`);
        return;
      }
      // Revoke previous object URL before creating new one
      if (profilePicturePreview && profilePicturePreview.startsWith('blob:')) {
        URL.revokeObjectURL(profilePicturePreview);
      }
      setProfilePicture(file);
      setProfilePicturePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let profilePictureUrl = profile?.profile_picture_url;

      // Upload profile picture if changed
      if (profilePicture) {
        const { data, error: uploadError } = await uploadProfilePicture(profilePicture, user.id);
        if (uploadError) {
          throw new Error('Failed to upload profile picture: ' + uploadError.message);
        }
        if (data?.publicUrl) {
          profilePictureUrl = data.publicUrl;
        }
      }

      // Prepare profile updates
      const profileUpdates: ProfileUpdateData = {
        full_name: fullName,
        username: username,
        bio: bio,
      };

      // Only include profile_picture_url if it changed
      if (profilePictureUrl !== profile?.profile_picture_url) {
        profileUpdates.profile_picture_url = profilePictureUrl;
      }

      // Update profile
      const { error: profileError } = await updateProfile(user.id, profileUpdates);
      if (profileError) {
        throw new Error('Failed to update profile: ' + profileError.message);
      }

      // Update business if it exists and business name changed
      if (business && businessName !== business.business_name) {
        const businessUpdates: BusinessUpdateData = {
          business_name: businessName,
        };
        const { error: businessError } = await updateBusinessInfo(business.id, businessUpdates);
        if (businessError) {
          // Business update failed but profile succeeded - inform user
          setSuccess('Profile updated successfully! Note: Business name update failed.');
          setTimeout(() => {
            onSave();
          }, 1500);
          return;
        }
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      // Error is already displayed to user via setError
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
              {profilePicturePreview ? (
                <img
                  src={profilePicturePreview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-white/60">
                  {fullName?.[0] || username?.[0] || '?'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 rounded-full p-2 transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-white/60 text-sm">Click the camera icon to change picture</p>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your full name"
            required
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your username"
            required
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Bio / Description</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Tell us about yourself or your restaurant"
            rows={4}
          />
        </div>

        {/* Business Name (if business exists) */}
        {business && (
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your business name"
            />
            <p className="text-white/40 text-xs mt-1">
              Update your restaurant or business name
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg p-4">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg p-4">
            {success}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg py-3 transition-all duration-200 hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-500 hover:bg-blue-600 border border-blue-500 rounded-lg py-3 transition-all duration-200 hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

interface BottomNavigationProps {
  pathname: string;
}

function BottomNavigation({ pathname }: BottomNavigationProps) {
  return (
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
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg className={`w-6 h-6 ${pathname === '/profile' ? 'text-white' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className={`text-xs ${pathname === '/profile' ? 'text-white' : 'text-white/60'}`}>Profile</span>
        </Link>
      </div>
    </div>
  );
}
