'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

interface MenuItem {
  id: string;
  menu_id: string;
  user_id: string;
  item_name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  key_info?: string[] | null;
}

interface Review {
  id: string;
  user_id: string;
  content: string;
  rating: number | null;
  created_at: string;
  profiles: {
    username: string | null;
    full_name: string | null;
    profile_picture_url: string | null;
  } | null;
  is_verified_purchaser: boolean;
}

interface RelatedItem {
  id: string;
  item_name: string;
  price: number;
  image_url: string | null;
}

interface BusinessInfo {
  id: string;
  business_name: string | null;
  description: string | null;
  profile_picture_url: string | null;
  username: string | null;
}

const TABS = ['Description', 'Reviews', 'Things You Should Know', 'About This Company'] as const;
type TabId = typeof TABS[number];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const itemId = params.id as string;

  const [item, setItem] = useState<MenuItem | null>(null);
  const [seller, setSeller] = useState<{ id: string; business_name: string | null; username: string | null } | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('Description');
  const [tabFade, setTabFade] = useState(false);

  // Review form
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isVerifiedPurchaser, setIsVerifiedPurchaser] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const fetchProduct = useCallback(async () => {
    setLoading(true);

    // Fetch the menu item
    const { data: itemData, error: itemError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !itemData) {
      setLoading(false);
      return;
    }

    setItem(itemData);

    // Fetch seller profile
    const { data: sellerData } = await supabase
      .from('profiles')
      .select('id, business_name, username')
      .eq('id', itemData.user_id)
      .single();

    setSeller(sellerData);

    // Fetch full business info (description for About tab)
    const { data: bizData } = await supabase
      .from('businesses')
      .select('id, business_name, description')
      .eq('user_id', itemData.user_id)
      .single();

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, profile_picture_url, username')
      .eq('id', itemData.user_id)
      .single();

    if (bizData || profileData) {
      setBusinessInfo({
        id: itemData.user_id,
        business_name: bizData?.business_name || sellerData?.business_name || null,
        description: bizData?.description || null,
        profile_picture_url: profileData?.profile_picture_url || null,
        username: profileData?.username || null,
      });
    }

    // Fetch reviews (comments on this item)
    const { data: reviewsData } = await supabase
      .from('comments')
      .select('id, user_id, content, rating, created_at, profiles:user_id(username, full_name, profile_picture_url)')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (reviewsData) {
      // Check which reviewers are verified purchasers
      const reviewerIds = reviewsData.map((r: any) => r.user_id);
      const { data: purchases } = await supabase
        .from('item_purchases')
        .select('buyer_id')
        .eq('item_id', itemId)
        .in('status', ['completed', 'paid'])
        .in('buyer_id', reviewerIds);

      const verifiedBuyerIds = new Set((purchases || []).map((p: any) => p.buyer_id));

      setReviews(
        reviewsData.map((r: any) => ({
          ...r,
          is_verified_purchaser: verifiedBuyerIds.has(r.user_id),
        }))
      );
    }

    // Check if current user is verified purchaser
    if (user) {
      const { data: myPurchase } = await supabase
        .from('item_purchases')
        .select('id')
        .eq('item_id', itemId)
        .eq('buyer_id', user.id)
        .in('status', ['completed', 'paid'])
        .limit(1);
      setIsVerifiedPurchaser((myPurchase || []).length > 0);
    }

    // Fetch related items from same seller
    const { data: related } = await supabase
      .from('menu_items')
      .select('id, item_name, price, image_url')
      .eq('user_id', itemData.user_id)
      .neq('id', itemId)
      .eq('is_available', true)
      .limit(4);

    setRelatedItems(related || []);
    setLoading(false);
  }, [itemId, user]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleAddToCart = () => {
    if (!user || !item || !seller) return;
    addToCart({
      itemId: item.id,
      itemName: item.item_name,
      itemPrice: item.price,
      itemImage: item.image_url || undefined,
      sellerId: seller.id,
      buyerId: user.id,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleAddRelatedToCart = (related: RelatedItem) => {
    if (!user || !seller) return;
    addToCart({
      itemId: related.id,
      itemName: related.item_name,
      itemPrice: related.price,
      itemImage: related.image_url || undefined,
      sellerId: seller.id,
      buyerId: user.id,
      quantity: 1,
    });
  };

  const handleSubmitReview = async () => {
    if (!user || !item || !reviewContent.trim()) return;
    setSubmittingReview(true);

    await supabase.from('comments').insert({
      user_id: user.id,
      item_id: item.id,
      content: reviewContent.trim(),
      rating: reviewRating,
    });

    setReviewContent('');
    setReviewRating(5);
    setSubmittingReview(false);
    setShowReviewForm(false);
    fetchProduct();
  };

  const switchTab = (tab: TabId) => {
    if (tab === activeTab) return;
    setTabFade(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTabFade(false);
    }, 200);
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.filter(r => r.rating).length
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-light text-[#1A1A1A] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Product not found</h2>
          <button onClick={() => router.back()} className="text-sm text-[#1B5EA8] hover:underline mt-4">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-8">
      {/* Back bar */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-[#E8E8E4]">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-3 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-[#6B6B65] hover:text-[#1A1A1A] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          {seller && (
            <Link
              href={`/profile/${seller.username || seller.id}`}
              className="relative text-sm text-[#1B5EA8] hover:text-[#1B5EA8]/80 transition-colors overflow-hidden group"
            >
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Go Back to Store
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
        {/* ===== PRODUCT SECTION ===== */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Left 55%: Image */}
          <div className="md:w-[55%]">
            <div className="relative aspect-square bg-[#F8F8F6] overflow-hidden">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.item_name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-20 h-20 text-[#E8E8E4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Right 45%: Details */}
          <div className="md:w-[45%]">
            {/* Brand */}
            {seller && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6B6B65] mb-2">
                {seller.business_name || seller.username}
              </p>
            )}

            {/* Product Name */}
            <h1 className="text-[32px] font-bold uppercase text-[#1A1A1A] mb-3 leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {item.item_name}
            </h1>

            {/* Star Rating */}
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${avgRating !== null && star <= Math.round(avgRating) ? 'text-yellow-400' : 'text-[#E8E8E4]'}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
              <span className="text-xs text-[#6B6B65] ml-1">
                {avgRating !== null
                  ? `${avgRating.toFixed(1)} (${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'})`
                  : 'No reviews yet'}
              </span>
            </div>

            {/* Price */}
            <p className="text-[24px] font-bold text-[#1A1A1A] mb-5">
              ${item.price.toFixed(2)}
            </p>

            {/* QTY Selector */}
            <div className="mb-5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6B6B65] mb-2 block">
                QTY
              </label>
              <div className="flex items-center border border-[#E8E8E4] w-fit">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors"
                >
                  −
                </button>
                <span className="w-12 text-center text-sm font-medium text-[#1A1A1A]">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 flex items-center justify-center text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              disabled={!user || item.is_available === false || added}
              className={`btn-add-to-cart w-full py-3.5 text-sm font-semibold uppercase tracking-[0.1em] transition-all duration-300 ${
                added
                  ? 'bg-green-600 text-white'
                  : 'bg-[#1B5EA8] text-white hover:bg-[#1B5EA8]/90'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {added ? 'Added to Cart' : `Add to Cart — $${(item.price * quantity).toFixed(2)}`}
            </button>

            {/* Go Back to Store */}
            {seller && (
              <Link
                href={`/profile/${seller.username || seller.id}`}
                className="relative group mt-3 w-full py-3 flex items-center justify-center gap-2 border border-[#1B5EA8] text-[#1B5EA8] text-sm font-semibold uppercase tracking-[0.1em] overflow-hidden hover:bg-[#1B5EA8]/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Go Back to Store
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1B5EA8]/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              </Link>
            )}

            {!user && (
              <p className="text-xs text-[#6B6B65] text-center mt-3">Sign in to purchase</p>
            )}
          </div>
        </div>

        {/* ===== TABS ===== */}
        <div className="mt-16 border-t border-[#E8E8E4]">
          {/* Tab Navigation */}
          <div className="flex gap-0 border-b border-[#E8E8E4] overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`relative px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'text-[#1A1A1A]'
                    : 'text-[#9E9A90] hover:text-[#6B6B65]'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1A1A1A]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div
            className="py-8 transition-opacity duration-200"
            style={{ opacity: tabFade ? 0 : 1 }}
          >
            {/* Description Tab */}
            {activeTab === 'Description' && (
              <div className="max-w-3xl">
                {item.description ? (
                  <p className="text-sm text-[#6B6B65] leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>
                ) : (
                  <p className="text-sm text-[#9E9A90]">No description provided.</p>
                )}
                {item.category && (
                  <p className="text-xs text-[#9E9A90] mt-4">
                    Category: <span className="capitalize">{item.category}</span>
                  </p>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'Reviews' && (
              <div className="max-w-3xl">
                {/* Average Rating Summary */}
                <div className="flex items-center gap-6 mb-8 pb-6 border-b border-[#E8E8E4]">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-[#1A1A1A]">{avgRating !== null ? avgRating.toFixed(1) : '—'}</p>
                    <div className="flex items-center gap-0.5 mt-1 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-4 h-4 ${avgRating !== null && star <= Math.round(avgRating) ? 'text-yellow-400' : 'text-[#E8E8E4]'}`}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-xs text-[#9E9A90] mt-1">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</p>
                  </div>

                  <div className="flex-1">
                    {isVerifiedPurchaser ? (
                      <button
                        onClick={() => setShowReviewForm(!showReviewForm)}
                        className="px-5 py-2.5 bg-[#1B5EA8] text-white text-sm font-semibold hover:bg-[#1B5EA8]/90 transition-colors"
                      >
                        Write a Review
                      </button>
                    ) : user ? (
                      <p className="text-sm text-[#9E9A90]">Purchase this item to leave a review</p>
                    ) : (
                      <p className="text-sm text-[#9E9A90]">Sign in and purchase this item to leave a review</p>
                    )}
                  </div>
                </div>

                {/* Review Form */}
                {showReviewForm && isVerifiedPurchaser && (
                  <div className="mb-8 border border-[#E8E8E4] p-6">
                    <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">Write a Review</h3>
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setReviewRating(star)} className="p-0.5">
                          <svg
                            className={`w-5 h-5 ${star <= reviewRating ? 'text-yellow-400' : 'text-[#E8E8E4]'}`}
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      placeholder="Share your experience..."
                      rows={3}
                      className="w-full border border-[#E8E8E4] bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#9E9E96] focus:outline-none focus:border-[#1A1A1A] resize-none mb-3"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSubmitReview}
                        disabled={submittingReview || !reviewContent.trim()}
                        className="px-6 py-2 bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#1A1A1A]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                      <button
                        onClick={() => setShowReviewForm(false)}
                        className="px-6 py-2 border border-[#E8E8E4] text-sm text-[#6B6B65] hover:bg-[#F8F8F6] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Reviews List */}
                {reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-[#E8E8E4] pb-6 last:border-b-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-[#F8F8F6] border border-[#E8E8E4] flex items-center justify-center overflow-hidden">
                            {review.profiles?.profile_picture_url ? (
                              <Image
                                src={review.profiles.profile_picture_url}
                                alt=""
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <span className="text-xs font-semibold text-[#6B6B65]">
                                {(review.profiles?.full_name || review.profiles?.username || 'U').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#1A1A1A]">
                                {review.profiles?.full_name || review.profiles?.username || 'Anonymous'}
                              </span>
                              {review.is_verified_purchaser && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1B5EA8] bg-[#1B5EA8]/10 px-2 py-0.5 rounded-full">
                                  Verified Purchaser
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[#9E9A90]">
                              {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        {review.rating && (
                          <div className="flex items-center gap-0.5 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-3.5 h-3.5 ${star <= review.rating! ? 'text-yellow-400' : 'text-[#E8E8E4]'}`}
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-[#6B6B65] leading-relaxed">{review.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#9E9A90]">No reviews yet. Be the first to review this product.</p>
                )}
              </div>
            )}

            {/* Things You Should Know Tab */}
            {activeTab === 'Things You Should Know' && (
              <div className="max-w-3xl">
                {item.key_info && item.key_info.length > 0 ? (
                  <ul className="space-y-3">
                    {item.key_info.map((info, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <svg className="w-4 h-4 text-[#1B5EA8] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-[#6B6B65] leading-relaxed">{info}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#9E9A90]">No additional information provided.</p>
                )}
              </div>
            )}

            {/* About This Company Tab */}
            {activeTab === 'About This Company' && (
              <div className="max-w-3xl">
                {businessInfo ? (
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#F8F8F6] border border-[#E8E8E4] flex items-center justify-center overflow-hidden shrink-0">
                      {businessInfo.profile_picture_url ? (
                        <Image
                          src={businessInfo.profile_picture_url}
                          alt=""
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-lg font-semibold text-[#6B6B65]">
                          {(businessInfo.business_name || 'B').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">
                        {businessInfo.business_name || businessInfo.username || 'Business'}
                      </h3>
                      {avgRating !== null && (
                        <div className="flex items-center gap-1 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-3.5 h-3.5 ${star <= Math.round(avgRating) ? 'text-yellow-400' : 'text-[#E8E8E4]'}`}
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                          <span className="text-xs text-[#6B6B65] ml-1">
                            {avgRating.toFixed(1)} average rating
                          </span>
                        </div>
                      )}
                      {businessInfo.description ? (
                        <p className="text-sm text-[#6B6B65] leading-relaxed">{businessInfo.description}</p>
                      ) : (
                        <p className="text-sm text-[#9E9A90]">This business has not added a company description yet.</p>
                      )}
                      <Link
                        href={`/profile/${businessInfo.username || businessInfo.id}`}
                        className="inline-block mt-3 text-sm text-[#1B5EA8] hover:underline"
                      >
                        Visit Store
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#9E9A90]">Business information not available.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== FREQUENTLY BOUGHT TOGETHER ===== */}
        {relatedItems.length > 0 && (
          <div className="mt-12 border-t border-[#E8E8E4] pt-10">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B6B65] mb-6">
              Frequently Bought Together
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedItems.slice(0, 3).map((related) => (
                <div key={related.id} className="border border-[#E8E8E4] group">
                  <Link href={`/product/${related.id}`}>
                    <div className="relative aspect-square bg-[#F8F8F6] overflow-hidden">
                      {related.image_url ? (
                        <Image
                          src={related.image_url}
                          alt={related.item_name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-[#E8E8E4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link href={`/product/${related.id}`}>
                      <p className="text-sm font-medium text-[#1A1A1A] truncate hover:text-[#1B5EA8] transition-colors">{related.item_name}</p>
                    </Link>
                    <p className="text-sm text-[#6B6B65] mb-2">${related.price.toFixed(2)}</p>
                    <button
                      onClick={() => handleAddRelatedToCart(related)}
                      className="w-full py-2 bg-[#1B5EA8] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#1B5EA8]/90 transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
