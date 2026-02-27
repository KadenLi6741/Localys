'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { searchVideos, searchBusinesses, SearchFilters, SearchMode } from '@/lib/supabase/search';
import { haversineDistance } from '@/lib/utils/geo';
import { AppBottomNav } from '@/components/AppBottomNav';
import { ThemeToggle } from '@/components/ThemeToggle';

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
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('businesses');
  const [category, setCategory] = useState<string>('');
  const [minRating, setMinRating] = useState<number | undefined>();
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [cuisineType, setCuisineType] = useState('');
  const [formality, setFormality] = useState('');
  const [specialType, setSpecialType] = useState('');
  const [dietary, setDietary] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [payment, setPayment] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const [nearMe, setNearMe] = useState(false);
  const [radius, setRadius] = useState(10);
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();

  const [hoveredBusiness, setHoveredBusiness] = useState<any>(null);

  const toggleArrayFilter = (arr: string[], setArr: (v: string[]) => void, value: string) => {
    setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const buildFilters = (overrideCategory?: string): SearchFilters => ({
    query: query.trim() || undefined,
    category: ((overrideCategory ?? category) as 'food' | 'retail' | 'service' | undefined) || undefined,
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
        
        console.log('Skipping comment fetch due to null value issues');
      
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
    executeSearch(filters, searchMode);
  }, [query, category, minRating, priceRange, cuisineType, formality, specialType, dietary, features, amenities, payment, tags, nearMe, radius, userLat, userLng, searchMode, executeSearch]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    const filters = buildFilters(cat);
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

  const handleMinRatingStarClick = (starValue: number) => {
    if (minRating === starValue) {
      setMinRating(starValue - 0.5);
      return;
    }

    if (minRating === starValue - 0.5) {
      setMinRating(starValue);
      return;
    }

    setMinRating(starValue);
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
    <div className="min-h-screen bg-background text-foreground pb-20">
      <StarSymbolDefs />

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[var(--border-color)] bg-[var(--surface-overlay)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Search</h1>
          <ThemeToggle />
        </div>
      </div>

      {/* Search Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-8">
          <aside className="space-y-6 pr-1 lg:sticky lg:top-24 lg:self-start lg:h-[calc(100dvh-8.5rem)] lg:overflow-hidden lg:pr-2">
            {/* Search Mode Toggle */}
            <div className="flex rounded-xl border border-[var(--border-color)] bg-[var(--surface-1)] p-1">
              <button
                onClick={() => setSearchMode('businesses')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  searchMode === 'businesses'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                🏪 Businesses
              </button>
              <button
                onClick={() => setSearchMode('videos')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  searchMode === 'videos'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                🎬 Videos
              </button>
            </div>

            {/* Search Bar */}
            <div className="mx-1 flex gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-1)] px-4 py-3 transition-all duration-200 hover:bg-[var(--surface-2)]">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={searchMode === 'businesses' ? 'Search businesses, cuisine, keywords...' : 'Search videos by keywords, business name...'}
                className="min-w-0 flex-1 bg-transparent text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex-shrink-0 rounded-lg bg-[var(--foreground)] px-4 py-2 font-semibold text-[var(--background)] transition-all duration-200 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    {showAdvancedFilters ? 'Less' : 'More'} Filters
                    <svg className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-1)] p-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['', 'food', 'retail', 'service'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          category === cat
                            ? 'bg-blue-500 text-white'
                            : 'bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {cat === '' ? 'All' : cat === 'service' ? 'Services' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minimum Rating Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Minimum Rating</label>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const fill = minRating ? Math.max(0, Math.min(1, minRating - (starValue - 1))) : 0;
                      return (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => handleMinRatingStarClick(starValue)}
                          className="p-0.5"
                          aria-label={`Set minimum rating to ${starValue} stars`}
                        >
                          <RatingStar fill={fill} />
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setMinRating(undefined)}
                      className="ml-2 text-xs text-blue-400 hover:text-blue-300"
                    >
                      Any
                    </button>
                  </div>
                  <p className="text-xs text-white/60">
                    {minRating ? `${minRating}+ stars` : 'Any rating'}
                  </p>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <div className="relative h-6 flex items-center">
                    {/* Track background */}
                    <div className="absolute left-0 right-0 h-1.5 rounded-full bg-white/10" />
                    {/* Active range highlight */}
                    <div
                      className="absolute h-1.5 rounded-full bg-blue-500"
                      style={{
                        left: `${(priceRange[0] / 1000) * 100}%`,
                        right: `${100 - (priceRange[1] / 1000) * 100}%`,
                      }}
                    />
                    {/* Min thumb */}
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={priceRange[0]}
                      onChange={(e) => {
                        const val = Math.min(Number(e.target.value), priceRange[1]);
                        setPriceRange([val, priceRange[1]]);
                      }}
                      className="dual-range-thumb absolute w-full pointer-events-none appearance-none bg-transparent"
                      style={{ zIndex: priceRange[0] > 900 ? 5 : 3 }}
                    />
                    {/* Max thumb */}
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={priceRange[1]}
                      onChange={(e) => {
                        const val = Math.max(Number(e.target.value), priceRange[0]);
                        setPriceRange([priceRange[0], val]);
                      }}
                      className="dual-range-thumb absolute w-full pointer-events-none appearance-none bg-transparent"
                      style={{ zIndex: 4 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1">
                    <span>$0</span>
                    <span>$1000</span>
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
                          nearMe ? 'bg-blue-500 text-white' : 'bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        📍 Near Me
                      </button>
                      {nearMe && (
                        <div>
                          <label className="mb-1 block text-sm text-[var(--muted-foreground)]">Radius: {radius} km</label>
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
          </aside>

          {/* Search Results */}
          <section className="min-w-0">
            <div className="mb-4">
              <h2 className="mb-2 text-lg font-semibold">
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
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-current"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {searchMode === 'businesses'
                  ? results.map((biz) => (
                      <BusinessResultCard
                        key={biz.id}
                        business={biz}
                        userLat={userLat}
                        userLng={userLng}
                        hoveredId={hoveredBusiness?.id}
                        onHover={setHoveredBusiness}
                      />
                    ))
                  : results.map((result) => (
                      <VideoResultCard key={result.id} result={result} query={query} />
                    ))}
              </div>
            ) : hasSearched ? (
              <div className="text-center py-12">
                <svg className="mx-auto mb-3 h-12 w-12 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-[var(--muted-foreground)]">No results found{query ? ` for "${query}"` : ''}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Try different keywords or filters</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto mb-3 h-12 w-12 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-[var(--muted-foreground)]">
                  Search for {searchMode === 'businesses' ? 'businesses, cuisine types, or categories' : 'videos by keywords or business name'}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Use filters to narrow down results</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <AppBottomNav />
    </div>
  );
}

/* ─── Reusable Sub-Components ─── */

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-1)] p-4">
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
          : 'bg-[var(--surface-2)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
      }`}
    >
      {label}
    </button>
  );
}

function RatingStar({ fill }: { fill: number }) {
  const clampedFill = Math.max(0, Math.min(1, fill));

  return (
    <div className="relative w-6 h-6" aria-hidden="true">
      <svg className="absolute inset-0 w-full h-full text-white/25" viewBox="0 0 24 24">
        <use href="#search-rating-star" />
      </svg>
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${clampedFill * 100}%` }}>
        <svg className="w-6 h-6 text-yellow-400" viewBox="0 0 24 24">
          <use href="#search-rating-star" />
        </svg>
      </div>
    </div>
  );
}

function StarSymbolDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <symbol id="search-rating-star" viewBox="0 0 24 24">
          <path
            d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
      </defs>
    </svg>
  );
}

function BusinessResultCard({
  business,
  userLat,
  userLng,
  hoveredId,
  onHover,
}: {
  business: any;
  userLat?: number;
  userLng?: number;
  hoveredId?: string;
  onHover: (biz: any) => void;
}) {
  const router = useRouter();
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

  const handleClick = () => {
    if (business.id) {
      router.push(`/profile/${business.id}`);
    }
  };

  return (
    <div
      className="group relative block cursor-pointer rounded-xl border border-[var(--border-color)] bg-[var(--surface-1)] p-4 transition-all duration-200 hover:bg-[var(--surface-2)]"
      onMouseEnter={() => onHover(business)}
      onMouseLeave={() => onHover(null)}
      onClick={handleClick}
    >
      <div className="flex gap-4">
        {/* Business avatar */}
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-2)]">
          {business.profile_picture_url ? (
            <img src={business.profile_picture_url} alt={business.business_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">🏪</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="truncate font-semibold text-[var(--foreground)]">{businessName}</h3>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
            {business.average_rating != null && (
              <span>⭐ {Number(business.average_rating).toFixed(1)}</span>
            )}
            {business.total_reviews != null && (
              <span>({business.total_reviews} reviews)</span>
            )}
            {business.category && (
              <span className="rounded px-2 py-0.5 text-xs font-medium capitalize bg-[var(--surface-2)] text-[var(--foreground)]">
                {business.category}
              </span>
            )}
            {distance != null && (
              <span>📍 {distance.toFixed(1)} km</span>
            )}
          </div>

          {avgPrice && (
            <p className="text-xs text-green-400/80 mt-1">💰 {avgPrice}</p>
          )}
        </div>
      </div>

      {/* Hover preview tooltip */}
      {isHovered && (
        <div className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface-overlay)] p-4 shadow-xl transition-all duration-200">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Rating</p>
              <p className="font-medium text-[var(--foreground)]">
                {business.average_rating ? `⭐ ${Number(business.average_rating).toFixed(1)} / 5` : 'No ratings yet'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Reviews</p>
              <p className="font-medium text-[var(--foreground)]">
                {business.total_reviews ?? 0} reviews
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Avg Price</p>
              <p className="font-medium text-[var(--foreground)]">{avgPrice || 'N/A'}</p>
            </div>
            {distance != null && (
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Distance</p>
                <p className="font-medium text-[var(--foreground)]">{distance.toFixed(1)} km away</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-xs text-[var(--muted-foreground)]">Category</p>
              <p className="font-medium capitalize text-[var(--foreground)]">{business.category || 'General'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoResultCard({ result, query }: { result: any; query: string }) {
  const authorName = result.profiles?.full_name || result.profiles?.username || 'Unknown author';
  const postedDate = result.created_at
    ? new Date(result.created_at).toLocaleDateString()
    : 'Unknown date';
  const views = typeof result.view_count === 'number' ? result.view_count : 0;

  return (
    <Link
      href={`/video/${result.id}`}
      className="group block rounded-xl border border-[var(--border-color)] bg-[var(--surface-1)] p-4 transition-all duration-200 hover:bg-[var(--surface-2)]"
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
          <h3 className="mb-1 font-semibold text-[var(--foreground)]">
            {result.businesses?.business_name || result.profiles?.full_name || 'Business'}
          </h3>
          <p className="mb-1 text-xs text-[var(--muted-foreground)]">
            By {authorName}
          </p>
          <p className="mb-2 line-clamp-2 text-sm text-[var(--muted-foreground)]">
            {result.caption || 'No description'}
          </p>
          <div className="mb-2 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span>{postedDate}</span>
            <span>•</span>
            <span>{views.toLocaleString()} views</span>
          </div>
          <div className="mb-2 flex items-center gap-3 text-sm text-[var(--foreground)]">
            {result.businesses?.average_rating && (
              <>
                <span>⭐ {result.businesses.average_rating.toFixed(1)}</span>
                <span className="text-[var(--muted-foreground)]">•</span>
              </>
            )}
            {result.businesses?.total_reviews && (
              <>
                <span>{result.businesses.total_reviews} reviews</span>
                <span className="text-[var(--muted-foreground)]">•</span>
              </>
            )}
            {result.businesses?.category && (
              <span className="rounded bg-[var(--surface-2)] px-2 py-1 text-xs font-medium">
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
