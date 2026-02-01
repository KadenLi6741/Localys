'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { searchVideos, SearchFilters } from '@/lib/supabase/search';

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
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('');
  const [minRating, setMinRating] = useState<number | undefined>();
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim() && !category && !minRating && (priceRange[0] === 0 && priceRange[1] === 1000)) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const filters: SearchFilters = {
        query: query.trim() || undefined,
        category: (category as 'food' | 'retail' | 'services' | undefined) || undefined,
        minRating: minRating,
        priceMin: priceRange[0] > 0 ? priceRange[0] : undefined,
        priceMax: priceRange[1] < 1000 ? priceRange[1] : undefined,
      };

      const { data, error } = await searchVideos(filters);
      
      if (error) {
        console.error('Search error:', error);
        alert(`Search Error: ${error.message || JSON.stringify(error)}`);
        setResults([]);
      } else {
        setResults(data || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert(`Search Error: ${error instanceof Error ? error.message : String(error)}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, category, minRating, priceRange]);

  // Handle category selection with immediate search
  const handleCategoryChange = (cat: string) => {
    console.log('handleCategoryChange called with:', cat);
    setCategory(cat);
    // Create new filters object with updated category
    const newFilters: SearchFilters = {
      query: query.trim() || undefined,
      category: (cat as 'food' | 'retail' | 'services' | undefined) || undefined,
      minRating: minRating,
      priceMin: priceRange[0] > 0 ? priceRange[0] : undefined,
      priceMax: priceRange[1] < 1000 ? priceRange[1] : undefined,
    };
    
    console.log('newFilters:', newFilters);
    
    // Check if empty
    if (!query.trim() && !cat && !minRating && priceRange[0] === 0 && priceRange[1] === 1000) {
      console.log('All filters empty, clearing results');
      setResults([]);
      setHasSearched(false);
      return;
    }
    
    setLoading(true);
    setHasSearched(true);
    
    searchVideos(newFilters).then(({ data, error }) => {
      if (error) {
        console.error('Search error:', error);
        setResults([]);
      } else {
        console.log('Search returned', data?.length, 'results');
        setResults(data || []);
      }
      setLoading(false);
    });
  };

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
              placeholder="Search by keywords, business name, category..."
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
              {(category || minRating || priceRange[0] > 0 || priceRange[1] < 1000) && (
                <button
                  onClick={() => {
                    setCategory('');
                    setMinRating(undefined);
                    setPriceRange([0, 1000]);
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      console.log('Clicking All');
                      handleCategoryChange('');
                    }}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      category === ''
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      console.log('Clicking Food');
                      handleCategoryChange('food');
                    }}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      category === 'food'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    Food
                  </button>
                  <button
                    onClick={() => {
                      console.log('Clicking Retail');
                      handleCategoryChange('retail');
                    }}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      category === 'retail'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    Retail
                  </button>
                  <button
                    onClick={() => {
                      console.log('Clicking Services');
                      handleCategoryChange('services');
                    }}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      category === 'services'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    Services
                  </button>
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
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      className="flex-1 accent-blue-500"
                    />
                    <span className="text-sm text-gray-400 w-12">${priceRange[0]}</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="flex-1 accent-blue-500"
                    />
                    <span className="text-sm text-gray-400 w-12">${priceRange[1]}</span>
                  </div>
                </div>
              </div>
            </div>
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
                {results.map((result) => {
                  // Highlight matching keywords
                  const highlightText = (text: string | undefined) => {
                    if (!text || !query) return text;
                    const regex = new RegExp(`(${query})`, 'gi');
                    return text.replace(regex, '<mark>$1</mark>');
                  };

                  return (
                    <Link
                      key={result.id}
                      href={`/video/${result.id}`}
                      className="block bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-200 group"
                    >
                      <div className="flex gap-4">
                        <div className="relative w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
                          <video
                            src={result.video_url}
                            className="w-full h-full object-cover"
                            muted
                          />
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
                              ✓ Matched: {result.caption?.includes(query) ? 'Caption' : ''} {result.businesses?.business_name?.includes(query) ? 'Business Name' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : hasSearched ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-white/40 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-white/60">No results found for "{query}"</p>
                <p className="text-white/40 text-sm mt-1">Try different keywords or filters</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-white/40 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-white/60">Search for businesses, keywords, or categories</p>
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
