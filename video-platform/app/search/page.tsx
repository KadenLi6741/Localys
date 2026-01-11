'use client';

import { useState, useEffect } from 'react';
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

  const handleSearch = async () => {
    if (!query.trim() && !category && !minRating) {
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
        setResults([]);
      } else {
        setResults(data || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-search when filters change
    const timeoutId = setTimeout(() => {
      if (hasSearched) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [category, minRating, priceRange]);

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
          <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search businesses..."
              className="bg-transparent text-white placeholder-white/60 flex-1 outline-none"
            />
            <button
              onClick={handleSearch}
              className="bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-white/90 transition-all duration-200 active:scale-95"
            >
              Search
            </button>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            
            <div>
              <label className="block text-sm mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
              >
                <option value="">All Categories</option>
                <option value="food">Food</option>
                <option value="retail">Retail</option>
                <option value="services">Services</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">Minimum Rating</label>
              <select
                value={minRating || ''}
                onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">
                Price Range: ${priceRange[0]} - ${priceRange[1]}
              </label>
              <div className="flex gap-4">
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Search Results */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">
              {loading ? 'Searching...' : hasSearched ? `Results (${results.length})` : 'Search Results'}
            </h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    href={`/video/${result.id}`}
                    className="block bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-200"
                  >
                    <div className="flex gap-4">
                      <video
                        src={result.video_url}
                        className="w-32 h-24 object-cover rounded-lg"
                        muted
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
                          {result.businesses?.total_reviews && (
                            <span>• {result.businesses.total_reviews} reviews</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : hasSearched ? (
              <p className="text-white/60 text-center py-8">No results found</p>
            ) : (
              <p className="text-white/60">Enter a search term to find businesses...</p>
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
