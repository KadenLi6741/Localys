'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase/client';
import { EditableProfilePicture } from '@/components/EditableProfilePicture';
import { LanguageSettings } from '@/components/LanguageSettings';
import { BookmarkedVideos } from '@/components/BookmarkedVideos';
import { PostedVideos } from '@/components/PostedVideos';
import { SideCards } from '@/components/SideCards';
import {
  uploadProfilePicture,
  updateProfile,
  Profile,
  ProfileUpdateData,
  MAX_PROFILE_PICTURE_SIZE,
  BYTES_TO_MB,
} from '@/lib/supabase/profiles';
import { OrderHistory } from '@/components/OrderHistory';
import { ChevronRight, Store, DollarSign, MapPin, ShoppingBag, Heart, Trophy, Star, MessageCircle, Award } from 'lucide-react';

// ── Badge system ──────────────────────────────────────────────────────────────
interface BadgeStats {
  purchases: number;
  bizCount: number;
  moneySpent: number;
  reviews: number;
}

const BADGE_DEFS = [
  { id: 'explorer',      Icon: MapPin,        name: 'Local Explorer',    desc: 'Joined Localys',                 check: (_: BadgeStats) => true },
  { id: 'first-order',   Icon: ShoppingBag,   name: 'First Order',       desc: 'Placed your first order',        check: (s: BadgeStats) => s.purchases >= 1 },
  { id: 'regular',       Icon: Store,         name: 'Regular',           desc: 'Supported 3+ businesses',        check: (s: BadgeStats) => s.bizCount >= 3 },
  { id: 'hero',          Icon: Heart,         name: 'Community Hero',    desc: 'Supported 5+ businesses',        check: (s: BadgeStats) => s.bizCount >= 5 },
  { id: 'legend',        Icon: Trophy,        name: 'Local Legend',      desc: 'Supported 10+ businesses',       check: (s: BadgeStats) => s.bizCount >= 10 },
  { id: '100club',       Icon: DollarSign,    name: '$100 Club',         desc: 'Spent $100+ in your community',  check: (s: BadgeStats) => s.moneySpent >= 100 },
  { id: '500club',       Icon: Star,          name: '$500 Club',         desc: 'Spent $500+ in your community',  check: (s: BadgeStats) => s.moneySpent >= 500 },
  { id: 'reviewer',      Icon: MessageCircle, name: 'Reviewer',          desc: 'Left your first review',         check: (s: BadgeStats) => s.reviews >= 1 },
  { id: 'top-reviewer',  Icon: Award,         name: 'Top Reviewer',      desc: 'Left 10+ reviews',               check: (s: BadgeStats) => s.reviews >= 10 },
] as const;

function BadgesSection({ userId }: { userId: string }) {
  const [stats, setStats] = useState<BadgeStats>({ purchases: 0, bizCount: 0, moneySpent: 0, reviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: purchases }, { count: reviewCount }] = await Promise.all([
        supabase.from('item_purchases').select('seller_id, price').eq('buyer_id', userId),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);
      if (purchases) {
        const uniqueSellers = new Set(purchases.map((p: any) => p.seller_id));
        setStats({
          purchases: purchases.length,
          bizCount: uniqueSellers.size,
          moneySpent: purchases.reduce((s: number, p: any) => s + (p.price || 0), 0),
          reviews: reviewCount ?? 0,
        });
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Achievements</h3>
      <div className="grid grid-cols-3 gap-2.5">
        {BADGE_DEFS.map(({ id, Icon, name, desc, check }) => {
          const earned = check(stats);
          return (
            <div
              key={id}
              className={`flex flex-col items-center text-center gap-1.5 p-2.5 rounded-xl border transition-colors ${
                earned ? 'border-[#f97316]/20 bg-[#f97316]/5' : 'border-gray-100 bg-gray-50 opacity-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${earned ? 'bg-[#f97316]' : 'bg-gray-200'}`}>
                <Icon className={`h-5 w-5 ${earned ? 'text-white' : 'text-gray-400'}`} />
              </div>
              <p className={`text-[11px] font-bold leading-tight ${earned ? 'text-gray-900' : 'text-gray-400'}`}>{name}</p>
              <p className={`text-[10px] leading-tight ${earned ? 'text-gray-500' : 'text-gray-300'}`}>{desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, signOut: contextSignOut } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
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
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await contextSignOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Page header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="w-full px-4 lg:px-12 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
          <LanguageSettings />
        </div>
      </div>

      {isEditMode ? (
        <ProfileEditForm
          profile={profile}
          user={user}
          onSave={async () => { await loadProfile(); setIsEditMode(false); }}
          onCancel={() => setIsEditMode(false)}
        />
      ) : (
        <>
          {user && <SideCards userId={user.id} />}
          <ProfileView
            profile={profile}
            user={user}
            onEditClick={() => setIsEditMode(true)}
            onSignOut={handleSignOut}
            onProfileUpdated={loadProfile}
          />
        </>
      )}
    </div>
  );
}

interface ProfileViewProps {
  profile: Profile | null;
  user: any;
  onEditClick: () => void;
  onSignOut: () => void;
  onProfileUpdated: () => void;
}

function ProfileView({ profile, user, onEditClick, onSignOut, onProfileUpdated }: ProfileViewProps) {
  const { t } = useTranslation();
  const [bizCount, setBizCount] = useState(0);
  const [moneySpent, setMoneySpent] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('item_purchases')
        .select('seller_id, price')
        .eq('buyer_id', user.id);
      if (data) {
        const uniqueSellers = new Set(data.map((p: any) => p.seller_id));
        setBizCount(uniqueSellers.size);
        setMoneySpent(data.reduce((s: number, p: any) => s + (p.price || 0), 0));
      }
      setStatsLoading(false);
    };
    load();
  }, [user?.id]);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="w-full px-4 lg:px-12 py-8 max-w-3xl mx-auto">
      {/* Profile header */}
      <div className="flex items-center gap-5 mb-5">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-0.5">
            {profile?.full_name || 'User'}
          </h2>
          <p className="text-gray-500 text-sm mb-1">@{profile?.username || 'username'}</p>
          {profile?.bio && <p className="text-gray-900 text-sm">{profile.bio}</p>}
          {memberSince && <p className="text-gray-400 text-xs mt-1">Member since {memberSince}</p>}
        </div>
      </div>

      {/* Impact stats */}
      {!statsLoading && (bizCount > 0 || moneySpent > 0) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Your Local Impact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#f97316]/10 flex items-center justify-center shrink-0">
                <Store className="h-4.5 w-4.5 text-[#f97316]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{bizCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {bizCount === 1 ? 'business' : 'businesses'} supported
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#f97316]/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-4.5 w-4.5 text-[#f97316]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 leading-none">${moneySpent.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-0.5">kept in your community</p>
              </div>
            </div>
          </div>
          {bizCount > 0 && (
            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
              You've supported {bizCount} local {bizCount === 1 ? 'business' : 'businesses'} and kept ${moneySpent.toFixed(2)} in your community.
            </p>
          )}
        </div>
      )}

      {/* Badges */}
      <BadgesSection userId={user.id} />

      {/* Edit Profile */}
      <button
        onClick={onEditClick}
        className="w-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-900 font-medium rounded-xl py-2.5 mb-6 transition-colors"
      >
        {t('profile.edit_profile')}
      </button>

      {/* Posted Videos */}
      <section className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">{t('profile.videos')}</h3>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <PostedVideos userId={user.id} isOwnProfile={true} />
        </div>
      </section>

      {/* Bookmarked Videos */}
      <section className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">{t('profile.bookmarked')}</h3>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <BookmarkedVideos userId={user.id} />
        </div>
      </section>

      {/* Order History */}
      <section className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Order History</h3>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <OrderHistory userId={user.id} isBusiness={false} />
        </div>
      </section>

      {/* Settings */}
      <section className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">{t('common.settings')}</h3>
        <div className="space-y-2">
          <Link
            href="/settings"
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm text-gray-900">Display &amp; Theme</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
          <Link
            href="/settings/payment"
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm text-gray-900">Payment Methods</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
          <Link
            href="/settings/location"
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm text-gray-900">Location Settings</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        </div>
      </section>

      {/* Sign Out */}
      <button
        onClick={onSignOut}
        className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-medium rounded-xl py-3 transition-colors mb-8"
      >
        {t('profile.sign_out')}
      </button>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-6 pb-8 text-center">
        <div className="flex items-center justify-center gap-6 mb-2">
          <a href="#" className="text-gray-400 text-xs hover:text-gray-700 transition-colors">Company</a>
          <a href="#" className="text-gray-400 text-xs hover:text-gray-700 transition-colors">Program</a>
          <a href="#" className="text-gray-400 text-xs hover:text-gray-700 transition-colors">Terms &amp; Policies</a>
        </div>
        <p className="text-gray-400 text-xs">2026 Localys</p>
      </div>
    </div>
  );
}

interface ProfileEditFormProps {
  profile: Profile | null;
  user: any;
  onSave: () => void;
  onCancel: () => void;
}

function ProfileEditForm({ profile, user, onSave, onCancel }: ProfileEditFormProps) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
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
      if (profilePicturePreview?.startsWith('blob:')) URL.revokeObjectURL(profilePicturePreview);
    };
  }, [profilePicturePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > MAX_PROFILE_PICTURE_SIZE) {
      setError(`Image must be under ${MAX_PROFILE_PICTURE_SIZE / BYTES_TO_MB}MB`);
      return;
    }
    if (profilePicturePreview?.startsWith('blob:')) URL.revokeObjectURL(profilePicturePreview);
    setProfilePicture(file);
    setProfilePicturePreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let profilePictureUrl = profile?.profile_picture_url;
      if (profilePicture) {
        const { data, error: uploadError } = await uploadProfilePicture(profilePicture, user.id);
        if (uploadError) throw new Error('Upload failed: ' + uploadError.message);
        if (data?.publicUrl) profilePictureUrl = data.publicUrl;
      }
      const updates: ProfileUpdateData = { full_name: fullName, username, bio };
      if (profilePictureUrl !== profile?.profile_picture_url) updates.profile_picture_url = profilePictureUrl;
      const { error: profileError } = await updateProfile(user.id, updates);
      if (profileError) throw new Error('Update failed: ' + profileError.message);
      setSuccess('Profile updated!');
      setTimeout(onSave, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Profile picture */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
              {profilePicturePreview ? (
                <img src={profilePicturePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">
                  {fullName?.[0] || username?.[0] || '?'}
                </div>
              )}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-[#f97316] hover:opacity-90 rounded-full p-2 transition-opacity">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <p className="text-gray-500 text-sm">Tap the icon to change your photo</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">Full Name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-colors"
            placeholder="Your full name" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-colors"
            placeholder="username" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] resize-none transition-colors"
            placeholder="Tell people a bit about yourself" rows={3} />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">{error}</div>}
        {success && <div className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3 text-sm">{success}</div>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel} disabled={loading}
            className="flex-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-900 rounded-xl py-3 font-medium transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-[#f97316] hover:opacity-90 text-white rounded-xl py-3 font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Saving...</>
            ) : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
