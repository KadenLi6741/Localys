'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

import { supabase } from '@/lib/supabase/client';
import { searchVideos, searchBusinesses, SearchFilters, SearchMode } from '@/lib/supabase/search';
import { haversineDistance } from '@/lib/utils/geo';

// Filter option definitions
const CUISINE_TYPES = ['Italian', 'Mexican', 'Chinese', 'Japanese', 'Korean', 'Indian', 'Thai', 'Vietnamese', 'Mediterranean', 'American', 'French', 'Middle Eastern'];
const FORMALITY_TYPES = ['Restaurant', 'Cafe', 'Bar'];
const SPECIAL_TYPES = ['Bakery', 'Bubble Tea', 'Fast Food'];
const DIETARY_OPTIONS = ['Vegan', 'Vegetarian', 'Halal', 'Kosher', 'Gluten-Free', 'Dairy-Free', 'Low-Calorie'];
const FEATURE_OPTIONS = ['Outdoor Seating', 'Reservations', 'Walk-ins Only', 'Family-Friendly', 'Large Groups', 'Private Dining'];
const DRINK_OPTIONS = ['Alcohol Served', 'Cocktails', 'Wine', 'Coffee / Specialty Drinks'];
const AMENITY_OPTIONS = ['Free Wi-Fi', 'Parking Available', 'Wheelchair Accessible', 'Pet-Friendly'];
const PAYMENT_OPTIONS = ['Credit / Debit', 'Cash', 'Apple Pay / Google Pay', 'Split Bills'];
const MODERN_TAGS = ['Locally Owned', 'Eco-Friendly', 'Black-Owned', 'Women-Owned', 'Michelin / Awards', 'Featured'];

export default function SearchPage() {
  return (
    <ProtectedRoute>
      <SearchContent />
    </ProtectedRoute>
  );
}

function SearchContent() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Core state
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('businesses');
  const [category, setCategory] = useState<string>('');
  const [minRating, setMinRating] = useState<number | undefined>();
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});

  // Advanced filter state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [cuisineType, setCuisineType] = useState('');
  const [formality, setFormality] = useState('');
  const [specialType, setSpecialType] = useState('');
  const [dietary, setDietary] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [payment, setPayment] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Location state
  const [nearMe, setNearMe] = useState(false);
  const [radius, setRadius] = useState(10);
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();

  // Hover preview state
  const [hoveredBusiness, setHoveredBusiness] = useState<any>(null);

  const toggleArrayFilter = (arr: string[], setArr: (v: string[]) => void, value: string) => {
    setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const buildFilters = (overrideCategory?: string): SearchFilters => ({
    query: query.trim() || undefined,
    category: ((overrideCategory ?? category) as 'food' | 'retail' | 'services' | undefined) || undefined,
    minRating,
    priceMin: priceRange[0] > 0 ? priceRange[0] : undefined,
    priceMax: priceRange[1] < 1000 ? priceRange[1] : undefined,
    cuisineType: cuisineType || undefined,
    formality: formality || undefined,
    specialType: specialType || undefined,
    dietary: dietary.length > 0 ? dietary : undefined,
    features: features.length > 0 ? features : undefined,
    amenities: amenities.length > 0 ? amenities : undefined,
    payment: payment.length > 0 ? payment : undefined,
    tags: tags.length > 0 ? tags : undefined,
    latitude: nearMe ? userLat : undefined,
    longitude: nearMe ? userLng : undefined,
    maxDistance: nearMe ? radius : undefined,
  });

  const executeSearch = useCallback(async (filters: SearchFilters, mode: SearchMode) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = mode === 'businesses'
        ? await searchBusinesses(filters)
        : await searchVideos(filters);

      if (error) {
        const errorMsg = error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null && 'message' in error
            ? (error as any).message
            : JSON.stringify(error);
        console.error('Search error:', errorMsg);
        setResults([]);
      } else {
        const resultsData = data || [];
        setResults(resultsData);
        
        // Load comment counts for search results
        // TODO: Fix null value issue in videoIds array
        console.log('Skipping comment fetch due to null value issues');
        // const videoIds = resultsData.map((r: any) => r.id).filter(Boolean);
        // if (videoIds.length > 0) {
        //   const { data: comments, error: commentsError } = await supabase
        //     .from('comments')
        //     .select('video_id')
        //     .eq('parent_comment_id', null)
        //     .in('video_id', videoIds);
        //   
        //   if (commentsError) {
        //     const errMsg = commentsError instanceof Error 
        //       ? commentsError.message 
        //       : (commentsError as any)?.message
        //         ? (commentsError as any).message
        //         : JSON.stringify(commentsError);
        //     console.error('Error fetching comments:', errMsg, commentsError);
        //   }
        //   
        //   const counts: { [key: string]: number } = {};
        //   if (comments) {
        //     console.log('Fetched comments from search:', comments.length);
        //     comments.forEach((comment: any) => {
        //       counts[comment.video_id] = (counts[comment.video_id] || 0) + 1;
        //     });
        //   }
        //   setCommentCounts(counts);
        // }
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    const filters = buildFilters();
    // Execute search immediately, allowing blank or filter-only queries
    executeSearch(filters, searchMode);
  }, [query, category, minRating, priceRange, cuisineType, formality, specialType, dietary, features, amenities, payment, tags, nearMe, radius, userLat, userLng, searchMode, executeSearch]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    const filters = buildFilters(cat);
    // Execute search immediately when category changes
    executeSearch(filters, searchMode);
  };

  const handleNearMe = () => {
    if (!nearMe && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setNearMe(true);
        },
        () => setNearMe(false)
      );
    } else {
      setNearMe(!nearMe);
    }
  };

  const clearAllFilters = () => {
    setCategory('');
    setMinRating(undefined);
    setPriceRange([0, 1000]);
    setCuisineType('');
    setFormality('');
    setSpecialType('');
    setDietary([]);
    setFeatures([]);
    setAmenities([]);
    setPayment([]);
    setTags([]);
    setNearMe(false);
    setRadius(10);
  };

  const hasActiveFilters = category || minRating || priceRange[0] > 0 || priceRange[1] < 1000
    || cuisineType || formality || specialType || dietary.length > 0 || features.length > 0
    || amenities.length > 0 || payment.length > 0 || tags.length > 0 || nearMe;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Search</h1>
        </div>
      </div>

      {/* Search Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Search Mode Toggle */}
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setSearchMode('businesses')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                searchMode === 'businesses'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              🏪 Businesses
            </button>
            <button
              onClick={() => setSearchMode('videos')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                searchMode === 'videos'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              🎬 Videos
            </button>
          </div>

          {/* Search Bar */}
          <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 flex gap-2 hover:bg-white/15 hover:border-white/30 transition-all duration-200">
            <svg className="w-5 h-5 text-white/60 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={searchMode === 'businesses' ? 'Search businesses, cuisine, keywords...' : 'Search videos by keywords, business name...'}
              className="bg-transparent text-white placeholder-white/60 flex-1 outline-none"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-white/90 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {loading ? '...' : 'Search'}
            </button>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters</h2>
              <div className="flex gap-3 items-center">
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="text-sm text-blue-400 hover:text-blue-300">
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="text-sm text-white/60 hover:text-white flex items-center gap-1"
                >
                  {showAdvancedFilters ? 'Less' : 'More'} Filters
                  <svg className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {['', 'food', 'retail', 'services'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        category === cat
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {cat === '' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimum Rating Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Minimum Rating</label>
                <select
                  value={minRating || ''}
                  onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
                >
                  <option value="">Any Rating</option>
                  <option value="3">3+ Stars</option>
                  <option value="3.5">3.5+ Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="5">5 Stars</option>
                </select>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Price Range: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <div className="space-y-2">
                  <div className="flex gap-4 items-center">
                    <input type="range" min="0" max="1000" value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      className="flex-1 accent-blue-500" />
                    <span className="text-sm text-gray-400 w-12">${priceRange[0]}</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <input type="range" min="0" max="1000" value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="flex-1 accent-blue-500" />
                    <span className="text-sm text-gray-400 w-12">${priceRange[1]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="space-y-4">
                {/* Cuisine Type */}
                <FilterSection title="🍽️ Cuisine Type">
                  <div className="flex flex-wrap gap-2">
                    {CUISINE_TYPES.map((c) => (
                      <ChipButton key={c} label={c} active={cuisineType === c} onClick={() => setCuisineType(cuisineType === c ? '' : c)} />
                    ))}
                  </div>
                </FilterSection>

                {/* Formality */}
                <FilterSection title="🏠 Formality">
                  <div className="flex flex-wrap gap-2">
                    {FORMALITY_TYPES.map((f) => (
                      <ChipButton key={f} label={f} active={formality === f} onClick={() => setFormality(formality === f ? '' : f)} />
                    ))}
                  </div>
                </FilterSection>

                {/* Special Types */}
                <FilterSection title="🧁 Special Types">
                  <div className="flex flex-wrap gap-2">
                    {SPECIAL_TYPES.map((s) => (
                      <ChipButton key={s} label={s} active={specialType === s} onClick={() => setSpecialType(specialType === s ? '' : s)} />
                    ))}
                  </div>
                </FilterSection>

                {/* Dietary */}
                <FilterSection title="🥗 Dietary & Health">
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map((d) => (
                      <ChipButton key={d} label={d} active={dietary.includes(d)} onClick={() => toggleArrayFilter(dietary, setDietary, d)} />
                    ))}
                  </div>
                </FilterSection>

                {/* Location */}
                <FilterSection title="📍 Location">
                  <div className="space-y-3">
                    <button
                      onClick={handleNearMe}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        nearMe ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      📍 Near Me
                    </button>
                    {nearMe && (
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Radius: {radius} km</label>
                        <input type="range" min="1" max="50" value={radius}
                          onChange={(e) => setRadius(Number(e.target.value))}
                          className="w-full accent-blue-500" />
                      </div>
                    )}
                  </div>
                </FilterSection>

                {/* Restaurant Features */}
                <FilterSection title="🪑 Restaurant Features">
                  <div className="flex flex-wrap gap-2">
                    {FEATURE_OPTIONS.map((f) => (
                      <ChipButton key={f} label={f} active={features.includes(f)} onClick={() => toggleArrayFilter(features, setFeatures, f)} />
                    ))}
                  </div>
                </FilterSection>

                {/* Food & Drink */}
                <FilterSection title="🍺 Food & Drink Options">
                  <div className="flex flex-wrap gap-2">
                    {DRINK_OPTIONS.map((d) => (
                      <ChipButton key={d} label={d} active={features.includes(d)} onClick={() => toggleArrayFilter(features, setFeatures, d)} />
                    ))}
                  </div>
                </FilterSection>

                {/* Amenities */}
                <FilterSection title="📶 Amenities">
                  <div className="flex flex-wrap gap-2">
                    {AMENITY_OPTIONS.map((a) => (
                      <ChipButton key={a} label={a} active={amenities.includes(a)} onClick={() => toggleArrayFilter(amenities, setAmenities, a)} />
                    ))}
                  </div>
                </FilterSection>

                {/* Payment */}
                <FilterSection title="💳 Payment & Policies">
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_OPTIONS.map((p) => (
                      <ChipButton key={p} label={p} active={payment.includes(p)} onClick={() => toggleArrayFilter(payment, setPayment, p)} />
                    ))}
                  </div>
                </FilterSection>

                {/* Modern Tags */}
                <FilterSection title="✨ More">
                  <div className="flex flex-wrap gap-2">
                    {MODERN_TAGS.map((t) => (
                      <ChipButton key={t} label={t} active={tags.includes(t)} onClick={() => toggleArrayFilter(tags, setTags, t)} />
                    ))}
                  </div>
                </FilterSection>
              </div>
            )}
          </div>

          {/* Search Results */}
          <div className="mt-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">
                {loading ? 'Searching...' : hasSearched ? `Results (${results.length})` : 'Search Results'}
              </h2>
              {category && (
                <p className="text-sm text-blue-400">
                  Filtering by: <span className="font-semibold capitalize">{category}</span>
                </p>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {searchMode === 'businesses'
                  ? results.map((biz) => (
                      <BusinessResultCard
                        key={biz.id}
                        business={biz}
                        query={query}
                        userLat={userLat}
                        userLng={userLng}
                        hoveredId={hoveredBusiness?.id}
                        onHover={setHoveredBusiness}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">
                          {result.businesses?.business_name || 'Business'}
                        </h3>
                        <p className="text-sm text-white/60 mb-2 line-clamp-2">
                          {result.caption || ''}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-white/80">
                          {result.businesses?.average_rating && (
                            <span>⭐ {result.businesses.average_rating.toFixed(1)}</span>
                          )}
                          {(commentCounts[result.id] || 0) > 0 && (
                            <span>• {commentCounts[result.id]} reviews</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                    ))
                  : results.map((result) => (
                      <VideoResultCard key={result.id} result={result} query={query} />
                    ))}
              </div>
            ) : hasSearched ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-white/40 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-white/60">No results found{query ? ` for "${query}"` : ''}</p>
                <p className="text-white/40 text-sm mt-1">Try different keywords or filters</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-white/40 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-white/60">
                  Search for {searchMode === 'businesses' ? 'businesses, cuisine types, or categories' : 'videos by keywords or business name'}
                </p>
                <p className="text-white/40 text-sm mt-1">Use filters to narrow down results</p>
              </div>
            )}
          </div>
        </div>
      </div>

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
            <svg className={`w-6 h-6 ${pathname === '/search' ? 'text-white' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className={`text-xs ${pathname === '/search' ? 'text-white' : 'text-white/60'}`}>Search</span>
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
            <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-white/60 text-xs">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable Sub-Components ─── */

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <label className="block text-sm font-medium mb-3">{title}</label>
      {children}
    </div>
  );
}

function ChipButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        active
          ? 'bg-blue-500 text-white'
          : 'bg-white/10 text-gray-300 hover:bg-white/20'
      }`}
    >
      {label}
    </button>
  );
}

function BusinessResultCard({
  business,
  query,
  userLat,
  userLng,
  hoveredId,
  onHover,
}: {
  business: any;
  query: string;
  userLat?: number;
  userLng?: number;
  hoveredId?: string;
  onHover: (biz: any) => void;
}) {
  const isHovered = hoveredId === business.id;
  const businessName = business.business_name || business.profiles?.full_name || 'Unknown Business';

  const distance =
    userLat && userLng && business.latitude && business.longitude
      ? haversineDistance(userLat, userLng, business.latitude, business.longitude)
      : null;

  const avgPrice =
    business.price_range_min != null && business.price_range_max != null
      ? `$${business.price_range_min} – $${business.price_range_max}`
      : business.price_range_min != null
        ? `From $${business.price_range_min}`
        : null;

  return (
    <div
      className="relative block bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-200 group cursor-pointer"
      onMouseEnter={() => onHover(business)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex gap-4">
        {/* Business avatar */}
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center">
          {business.profile_picture_url ? (
            <img src={business.profile_picture_url} alt={business.business_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">🏪</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{businessName}</h3>

          <div className="flex items-center gap-2 text-sm text-white/70 mt-1 flex-wrap">
            {business.average_rating != null && (
              <span>⭐ {Number(business.average_rating).toFixed(1)}</span>
            )}
            {business.total_reviews != null && (
              <span className="text-white/40">({business.total_reviews} reviews)</span>
            )}
            {business.category && (
              <span className="px-2 py-0.5 bg-white/10 rounded text-xs font-medium capitalize">
                {business.category}
              </span>
            )}
            {distance != null && (
              <span className="text-white/50">📍 {distance.toFixed(1)} km</span>
            )}
          </div>

          {avgPrice && (
            <p className="text-xs text-green-400/80 mt-1">💰 {avgPrice}</p>
          )}
        </div>
      </div>

      {/* Hover preview tooltip */}
      {isHovered && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-gray-900 border border-white/20 rounded-lg p-4 shadow-xl">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-white/50 text-xs">Rating</p>
              <p className="text-white font-medium">
                {business.average_rating ? `⭐ ${Number(business.average_rating).toFixed(1)} / 5` : 'No ratings yet'}
              </p>
            </div>
            <div>
              <p className="text-white/50 text-xs">Reviews</p>
              <p className="text-white font-medium">
                {business.total_reviews ?? 0} reviews
              </p>
            </div>
            <div>
              <p className="text-white/50 text-xs">Avg Price</p>
              <p className="text-white font-medium">{avgPrice || 'N/A'}</p>
            </div>
            {distance != null && (
              <div>
                <p className="text-white/50 text-xs">Distance</p>
                <p className="text-white font-medium">{distance.toFixed(1)} km away</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-white/50 text-xs">Category</p>
              <p className="text-white font-medium capitalize">{business.category || 'General'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoResultCard({ result, query }: { result: any; query: string }) {
  return (
    <Link
      href={`/video/${result.id}`}
      className="block bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-200 group"
    >
      <div className="flex gap-4">
        <div className="relative w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
          <video src={result.video_url} className="w-full h-full object-cover" muted />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1 text-white">
            {result.businesses?.business_name || result.profiles?.full_name || 'Business'}
          </h3>
          <p className="text-sm text-white/60 mb-2 line-clamp-2">
            {result.caption || 'No description'}
          </p>
          <div className="flex items-center gap-3 text-sm text-white/80 mb-2">
            {result.businesses?.average_rating && (
              <>
                <span>⭐ {result.businesses.average_rating.toFixed(1)}</span>
                <span className="text-white/40">•</span>
              </>
            )}
            {result.businesses?.total_reviews && (
              <>
                <span>{result.businesses.total_reviews} reviews</span>
                <span className="text-white/40">•</span>
              </>
            )}
            {result.businesses?.category && (
              <span className="px-2 py-1 bg-white/10 rounded text-xs font-medium">
                {result.businesses.category}
              </span>
            )}
          </div>
          {query && (
            <p className="text-xs text-green-400/80">
              ✓ Matched: {result.caption?.toLowerCase().includes(query.toLowerCase()) ? 'Caption' : ''}{' '}
              {result.businesses?.business_name?.toLowerCase().includes(query.toLowerCase()) ? 'Business Name' : ''}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
