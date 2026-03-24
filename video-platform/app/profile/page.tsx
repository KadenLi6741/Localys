'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { signOut } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';
import { useRouter as useNavRouter } from 'next/navigation';
import { EditableProfilePicture } from '@/components/EditableProfilePicture';
import { LanguageSettings } from '@/components/LanguageSettings';
import { BookmarkedVideos } from '@/components/BookmarkedVideos';
import { PostedVideos } from '@/components/PostedVideos';
import { MenuList } from '@/components/MenuList';
import { 
  uploadProfilePicture,
  updateProfile,
  getUserBusiness,
  updateBusinessInfo,
  createBusiness,
  ensureUserBusiness,
  Profile,
  Business,
  ProfileUpdateData,
  BusinessUpdateData,
  BusinessHours,
  MAX_PROFILE_PICTURE_SIZE,
  BYTES_TO_MB
} from '@/lib/supabase/profiles';
import { OrderHistory } from '@/components/OrderHistory';
import { AnalyticsDashboard } from '@/components/analytics';
import { FinancialOverview } from '@/components/analytics/FinancialOverview';

const LocationManager = dynamic(
  () => import('@/components/LocationManager'),
  { ssr: false, loading: () => <div className="h-24 bg-[var(--glass-bg-subtle)] rounded-lg animate-pulse" /> }
);

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function OrderHistoryCollapsible({ userId, isBusiness }: { userId: string; isBusiness: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] rounded-2xl overflow-hidden transition-all duration-300">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--glass-bg)] transition-colors"
      >
        <h3 className="text-xl font-semibold text-[var(--color-cream)]">📋 Order History</h3>
        <svg
          className={`w-5 h-5 text-[var(--color-body-text)] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: expanded ? '2000px' : '280px' }}
      >
        <div className="px-6 pb-6">
          <OrderHistory userId={userId} isBusiness={isBusiness} />
        </div>
      </div>
      {!expanded && (
        <div className="relative">
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--color-charcoal)] to-transparent pointer-events-none" />
          <button
            onClick={() => setExpanded(true)}
            className="relative w-full py-3 text-center text-sm font-semibold text-[#F5A623] hover:text-[#F5A623]/80 transition-colors"
          >
            Show all orders
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileContent() {
  const { user, signOut: contextSignOut } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  useEffect(() => {
    if (profile?.type) {
      loadBusiness();
    } else {
      setBusiness(null);
    }
  }, [profile?.type]);

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
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const loadBusiness = async () => {
    if (!user) return;

    try {
      const { data, error } = await ensureUserBusiness(user.id);
      if (!error && data) {
        // Parse business_hours if it's a string
        if (data.business_hours && typeof data.business_hours === 'string') {
          data.business_hours = JSON.parse(data.business_hours);
        }
        setBusiness(data);
      }
    } catch (error) {
      setBusiness(null);
    }
  };

  const handleSignOut = async () => {
    await contextSignOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-[var(--text-primary)] pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-charcoal)]/80 backdrop-blur-md border-b border-[var(--glass-border)]">
        <div className="w-full px-4 lg:px-12 py-4 flex items-center justify-between">
          <h1 className="entrance-slide text-2xl font-bold" style={{ animation: 'slideInLeft 0.4s ease-out forwards', opacity: 0 }}>{t('profile.title')}</h1>
          <LanguageSettings />
        </div>
      </div>

      {/* Profile Content */}
      {isEditMode ? (
        <div className="entrance-fade" style={{ animation: 'fadeInUp 0.4s ease-out 0.1s forwards', opacity: 0 }}>
          <ProfileEditForm 
          profile={profile}
          business={business}
          user={user}
          onSave={async () => {
            await loadProfile();
            if (profile?.type) await loadBusiness();
            setIsEditMode(false);
          }}
          onCancel={() => setIsEditMode(false)}
        />
        </div>
      ) : (
        <div className="entrance-fade" style={{ animation: 'fadeInUp 0.4s ease-out 0.1s forwards', opacity: 0 }}>
          <ProfileView 
            profile={profile}
            business={business}
            user={user}
            onEditClick={() => setIsEditMode(true)}
            onSignOut={handleSignOut}
            onProfileUpdated={loadProfile}
            pathname={pathname}
          />
        </div>
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

interface FollowingUser {
  id: string;
  username: string;
  full_name: string;
  profile_picture_url?: string;
  type?: string | null;
}

function ProfileView({ profile, business, user, onEditClick, onSignOut, onProfileUpdated, pathname }: ProfileViewProps) {
  const { t } = useTranslation();
  const navRouter = useNavRouter();
  const [showBusinessHours, setShowBusinessHours] = useState(false);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [followingLoading, setFollowingLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadFollowing();
    }
  }, [user?.id]);

  const loadFollowing = async () => {
    try {
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data && data.length > 0) {
        const ids = data.map(f => f.following_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, profile_picture_url, type')
          .in('id', ids);
        setFollowing(profiles ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setFollowingLoading(false);
    }
  };

  return (
    <>
      <div className="w-full px-4 lg:px-12 py-8">
        {/* Profile Header */}
        <div className="flex items-center gap-6 mb-8" style={{ animation: 'fadeInUp 0.4s ease-out forwards', opacity: 0 }}>
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
            <p className="text-[var(--text-tertiary)] mb-2">@{profile?.username || 'username'}</p>
            {profile?.bio && (
              <p className="text-[var(--text-secondary)] text-sm mb-2">{profile.bio}</p>
            )}
            {business && (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-blue-400 text-sm">🏪 {business.business_name}</p>
                {business.business_type && (
                  <span className="bg-blue-500/30 text-blue-200 text-xs px-2 py-1 rounded-full capitalize">
                    {business.business_type === 'hybrid' ? '📦 Pickup & Delivery' : `🏷️ ${business.business_type}`}
                  </span>
                )}
                <button
                  onClick={() => setShowBusinessHours(!showBusinessHours)}
                  className="bg-blue-500/20 text-blue-200 text-xs px-2 py-1 rounded-full hover:bg-blue-500/30 transition-colors"
                >
                  {showBusinessHours ? 'Hide Hours' : 'Show Hours'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Business Hours Display */}
        {showBusinessHours && (
          <div className="bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] rounded-lg p-6 mb-8 space-y-2">
            <h3 className="text-lg font-semibold mb-4">⏰ Business Hours</h3>
            {business?.business_hours ? (
              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <div key={day} className="flex justify-between items-center text-sm">
                  <span className="text-[var(--text-secondary)] capitalize font-medium">{day}</span>
                  <span className="text-[var(--text-tertiary)]">
                    {business.business_hours?.[day]?.closed ? (
                      'Closed'
                    ) : (
                      `${business.business_hours?.[day]?.open || ''} - ${business.business_hours?.[day]?.close || ''}`
                    )}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[var(--text-tertiary)] text-center py-4">Business hours not set</p>
            )}
          </div>
        )}

        {/* Edit Profile Button */}
        <button 
          onClick={onEditClick}
          className="entrance-scale w-full bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-lg py-3 mb-6 transition-all duration-200 hover:scale-[1.02] active:scale-98"
          style={{ animation: 'scaleIn 0.3s ease-out 0.15s forwards', opacity: 0 }}
        >
          {t('profile.edit_profile')}
        </button>

        {/* Coin Balance & Buy Coins Buttons */}
        {profile?.type !== null && (
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg py-3 px-4 text-center">
              <p className="text-yellow-400/80 text-xs mb-1">Coin Balance</p>
              <p className="text-yellow-400 text-2xl font-bold">
                🪙 {profile?.coin_balance || 0}
              </p>
            </div>
            <Link
              href="/buy-coins"
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg py-3 px-4 transition-all duration-200 hover:scale-[1.02] active:scale-98 text-center"
            >
              {t('nav.buy_coins')}
            </Link>
          </div>
        )}

        {/* Analytics Dashboard Section */}
        <div style={{ animation: 'fadeInUp 0.4s ease-out 0.2s forwards', opacity: 0 }}>
          <AnalyticsDashboard userId={user.id} />
        </div>

        {/* Financial Overview Section (business only) */}
        {business && (
          <div style={{ animation: 'fadeInUp 0.4s ease-out 0.22s forwards', opacity: 0 }}>
            <FinancialOverview userId={user.id} />
          </div>
        )}

        {/* Services Section (business only) */}
        {business && (
          <div className="mb-8" style={{ animation: 'fadeInUp 0.4s ease-out 0.25s forwards', opacity: 0 }}>
            <h3 className="entrance-slide text-xl font-semibold mb-4" style={{ animation: 'slideInLeft 0.4s ease-out 0.25s forwards', opacity: 0 }}>⚙️ Services</h3>
            <div className="bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] rounded-lg p-6">
              <MenuList userId={user.id} businessId={business?.id} isOwnProfile={true} />
            </div>
          </div>
        )}

        {/* Posted Videos Section */}
        <div className="mb-8" style={{ animation: 'fadeInUp 0.4s ease-out 0.3s forwards', opacity: 0 }}>
          <h3 className="entrance-slide text-xl font-semibold mb-4" style={{ animation: 'slideInLeft 0.4s ease-out 0.3s forwards', opacity: 0 }}>{t('profile.videos')}</h3>
          <div className="bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] rounded-lg p-6">
            <PostedVideos userId={user.id} isOwnProfile={true} />
          </div>
        </div>

        {/* Bookmarked Videos Section */}
        <div className="mb-8" style={{ animation: 'fadeInUp 0.4s ease-out 0.35s forwards', opacity: 0 }}>
          <h3 className="entrance-slide text-xl font-semibold mb-4" style={{ animation: 'slideInLeft 0.4s ease-out 0.35s forwards', opacity: 0 }}>{t('profile.bookmarked')}</h3>
          <div className="bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] rounded-lg p-6">
            <BookmarkedVideos userId={user.id} />
          </div>
        </div>

        {/* Orders History Section — Collapsible */}
        <div className="mb-8" style={{ animation: 'fadeInUp 0.4s ease-out 0.4s forwards', opacity: 0 }}>
          <OrderHistoryCollapsible userId={user.id} isBusiness={!!business} />
        </div>

        {/* Following Preview Section */}
        <div className="mb-8" style={{ animation: 'fadeInUp 0.4s ease-out 0.42s forwards', opacity: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Following</h3>
            {following.length > 0 && (
              <Link href="/search" className="text-[#F5A623] text-sm hover:underline">View All</Link>
            )}
          </div>
          {followingLoading ? (
            <div className="flex gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[var(--glass-bg)] animate-pulse" />
                  <div className="w-10 h-2 bg-[var(--glass-bg)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : following.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {following.map(f => (
                <button
                  key={f.id}
                  onClick={() => navRouter.push(`/profile/${f.username}`)}
                  className="flex flex-col items-center gap-1.5 min-w-[64px] hover:opacity-80 transition-opacity"
                >
                  <div className={`w-12 h-12 rounded-full overflow-hidden ${f.type ? 'ring-2 ring-[#F5A623]' : 'ring-1 ring-white/20'}`}>
                    {f.profile_picture_url ? (
                      <img src={f.profile_picture_url} alt={f.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[var(--glass-bg-strong)] flex items-center justify-center text-sm text-[var(--text-tertiary)]">
                        {f.full_name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[64px]">{f.username}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)] rounded-lg p-6 text-center">
              <p className="text-[var(--text-muted)] text-sm mb-3">You are not following anyone yet</p>
              <Link href="/search" className="text-[#F5A623] text-sm font-medium hover:underline">Discover People</Link>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={onSignOut}
          className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 rounded-lg py-3 transition-all duration-200 hover:scale-[1.02] active:scale-98 mb-8"
        >
          {t('profile.sign_out')}
        </button>

        {/* Footer */}
        <div className="border-t border-[var(--color-charcoal-lighter-plus)] pt-6 pb-8">
          <div className="flex items-center justify-center gap-6 mb-3">
            <a href="#" className="text-[var(--color-body-text)] text-xs hover:text-[#F5A623] transition-colors">Company</a>
            <a href="#" className="text-[var(--color-body-text)] text-xs hover:text-[#F5A623] transition-colors">Program</a>
            <a href="#" className="text-[var(--color-body-text)] text-xs hover:text-[#F5A623] transition-colors">Terms & Policies</a>
          </div>
          <p className="text-[var(--color-body-text)] text-xs text-center">© 2026 Localys</p>
        </div>
      </div>
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
  const [businessType, setBusinessType] = useState(business?.business_type || 'general');
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    business?.business_hours || {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '10:00', close: '16:00' },
      sunday: { closed: true },
    }
  );
  const [customMessages, setCustomMessages] = useState<string[]>(
    business?.custom_messages || ['Hi, interested in this!']
  );
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(
    profile?.profile_picture_url || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (profilePicturePreview && profilePicturePreview.startsWith('blob:')) {
        URL.revokeObjectURL(profilePicturePreview);
      }
    };
  }, [profilePicturePreview]);

  // Update state when business data loads
  useEffect(() => {
    if (business) {
      setBusinessName(business.business_name || '');
      setBusinessType(business.business_type || 'general');
      setCustomMessages(business.custom_messages || ['Hi, interested in this!']);
      // Always set business hours, even if null
      setBusinessHours(business.business_hours || {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' },
        thursday: { open: '09:00', close: '17:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: { open: '10:00', close: '16:00' },
        sunday: { closed: true },
      });
    }
  }, [business]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > MAX_PROFILE_PICTURE_SIZE) {
        const maxSizeMB = MAX_PROFILE_PICTURE_SIZE / BYTES_TO_MB;
        setError(`Image size must be less than ${maxSizeMB}MB`);
        return;
      }
      if (profilePicturePreview && profilePicturePreview.startsWith('blob:')) {
        URL.revokeObjectURL(profilePicturePreview);
      }
      setProfilePicture(file);
      setProfilePicturePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('handleSubmit called!'); // DEBUG
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Starting profile update...'); // DEBUG
      let profilePictureUrl = profile?.profile_picture_url;

      if (profilePicture) {
        const { data, error: uploadError } = await uploadProfilePicture(profilePicture, user.id);
        if (uploadError) {
          throw new Error('Failed to upload profile picture: ' + uploadError.message);
        }
        if (data?.publicUrl) {
          profilePictureUrl = data.publicUrl;
        }
      }

      const profileUpdates: ProfileUpdateData = {
        full_name: fullName,
        username: username,
        bio: bio,
      };

      if (profilePictureUrl !== profile?.profile_picture_url) {
        profileUpdates.profile_picture_url = profilePictureUrl;
      }

      const { error: profileError } = await updateProfile(user.id, profileUpdates);
      if (profileError) {
        throw new Error('Failed to update profile: ' + profileError.message);
      }

      if (profile?.type && business) {
        const businessHasChanges =
          businessName !== business.business_name ||
          businessType !== business.business_type ||
          JSON.stringify(businessHours) !== JSON.stringify(business.business_hours) ||
          JSON.stringify(customMessages) !== JSON.stringify(business.custom_messages);

        console.log('Business has changes:', businessHasChanges); // DEBUG

        if (businessHasChanges) {
          const businessUpdates: BusinessUpdateData = {
            business_name: businessName,
            business_type: businessType,
            business_hours: businessHours,
            custom_messages: customMessages,
          };
          console.log('Calling updateBusinessInfo with:', businessUpdates); // DEBUG
          const { error: businessError } = await updateBusinessInfo(business.id, businessUpdates);
          if (businessError) {
            console.error('Business update error:', businessError); // DEBUG
            setSuccess('Profile updated successfully! Note: Business info update failed.');
            setTimeout(() => {
              onSave();
            }, 1500);
            return;
          }
        }
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 lg:px-12 py-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[var(--glass-bg-strong)] flex items-center justify-center overflow-hidden">
              {profilePicturePreview ? (
                <img
                  src={profilePicturePreview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-[var(--text-tertiary)]">
                  {fullName?.[0] || username?.[0] || '?'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 rounded-full p-2 transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <p className="text-[var(--text-tertiary)] text-sm">Click the camera icon to change picture</p>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-[var(--text-secondary)] text-sm font-medium mb-2">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your full name"
            required
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-[var(--text-secondary)] text-sm font-medium mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your username"
            required
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-[var(--text-secondary)] text-sm font-medium mb-2">Bio / Description</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Tell us about yourself or your restaurant"
            rows={4}
          />
        </div>

        {/* Business Name (if business user) */}
        {profile?.type && business && (
          <>
            <div>
              <label className="block text-[var(--text-secondary)] text-sm font-medium mb-2">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your business name"
              />
              <p className="text-[var(--text-muted)] text-xs mt-1">
                Update your restaurant or business name
              </p>
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-[var(--text-secondary)] text-sm font-medium mb-2">Business Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full bg-white text-black border border-[var(--glass-border)] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="general">General</option>
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
                <option value="dine-in">Dine-In</option>
                <option value="services">Services</option>
                <option value="retail">Retail</option>
                <option value="hybrid">Pickup & Delivery</option>
              </select>
              <p className="text-[var(--text-muted)] text-xs mt-1">
                Select how customers can access your business
              </p>
            </div>

            {/* Business Hours */}
            <div>
              <label className="block text-[var(--text-secondary)] text-sm font-medium mb-3">Business Hours</label>
              <div className="space-y-3 bg-[var(--glass-bg-subtle)] p-4 rounded-lg border border-[var(--glass-border)]">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <label className="w-20 text-[var(--text-tertiary)] text-sm capitalize">{day}</label>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={!businessHours[day]?.closed}
                        onChange={(e) => {
                          setBusinessHours({
                            ...businessHours,
                            [day]: e.target.checked 
                              ? { open: '09:00', close: '17:00' }
                              : { closed: true },
                          });
                        }}
                        className="w-4 h-4 rounded"
                      />
                      {!businessHours[day]?.closed ? (
                        <>
                          <input
                            type="time"
                            value={businessHours[day]?.open || '09:00'}
                            onChange={(e) => {
                              setBusinessHours({
                                ...businessHours,
                                [day]: { ...businessHours[day], open: e.target.value },
                              });
                            }}
                            className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded px-2 py-1 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-[var(--text-muted)]">to</span>
                          <input
                            type="time"
                            value={businessHours[day]?.close || '17:00'}
                            onChange={(e) => {
                              setBusinessHours({
                                ...businessHours,
                                [day]: { ...businessHours[day], close: e.target.value },
                              });
                            }}
                            className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded px-2 py-1 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)] text-sm">Closed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[var(--text-muted)] text-xs mt-2">
                Check the box to set hours, uncheck to mark as closed
              </p>
            </div>

            {/* Custom Messages */}
            <div>
              <label className="block text-[var(--text-secondary)] text-sm font-medium mb-3">Quick Messages for Customers</label>
              <div className="space-y-2 bg-[var(--glass-bg-subtle)] p-4 rounded-lg border border-[var(--glass-border)]">
                {customMessages.map((message, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => {
                        const newMessages = [...customMessages];
                        newMessages[index] = e.target.value;
                        setCustomMessages(newMessages);
                      }}
                      className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-4 py-2 text-[var(--text-primary)] placeholder-[var(--placeholder)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="e.g., Hi, interested in this!"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomMessages(customMessages.filter((_, i) => i !== index));
                      }}
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCustomMessages([...customMessages, 'Hi, interested in this!'])}
                className="mt-3 w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors border border-blue-500/50"
              >
                + Add Message
              </button>
              <p className="text-[var(--text-muted)] text-xs mt-2">
                Add up to 5 quick messages that customers can click on your videos
              </p>
            </div>

            {/* Business Locations */}
            <div>
              <label className="block text-[var(--text-secondary)] text-sm font-medium mb-3">Business Locations</label>
              <LocationManager profileId={user.id} />
              <p className="text-[var(--text-muted)] text-xs mt-2">
                Add one or more locations so customers can find you on the map
              </p>
            </div>
          </>
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
            className="flex-1 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-lg py-3 transition-all duration-200 hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
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
