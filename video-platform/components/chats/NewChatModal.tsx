'use client';

import { useState, useEffect, useCallback } from 'react';
import { searchUsers, getOrCreateOneToOneChat } from '@/lib/supabase/messages';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onChatCreated?: (chatId: string) => void;
}

interface UserSearchResult {
  id: string;
  username?: string;
  full_name?: string;
  profile_picture_url?: string;
}

export function NewChatModal({ isOpen, onClose, currentUserId, onChatCreated }: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
    }
  }, [isOpen]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: searchError } = await searchUsers(searchQuery, currentUserId);
      if (searchError) throw searchError;
      setSearchResults(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentUserId]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        handleSearch();
      } else {
        setSearchResults([]);
        setError(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearch]);

  const handleSelectUser = async (userId: string) => {
    setCreating(true);
    setError(null);
    try {
      const { data, error: chatError } = await getOrCreateOneToOneChat(currentUserId, userId);
      if (chatError) throw chatError;
      if (data) {
        if (onChatCreated) {
          onChatCreated(data.id);
        } else {
          onClose();
          router.push(`/chats/${data.id}`);
        }
      } else {
        setError('Failed to create chat');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create chat');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 mb-4 sm:mb-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">New Chat</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or username..."
            autoFocus
            aria-label="Search users"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 transition"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-2 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#f97316]" />
            </div>
          ) : searchResults.length === 0 && searchQuery.trim() ? (
            <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No users found</p>
          ) : searchResults.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Search for people to start a conversation</p>
          ) : (
            <div className="space-y-1">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u.id)}
                  disabled={creating}
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    {u.profile_picture_url ? (
                      <img src={u.profile_picture_url} alt={u.full_name || u.username} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-300">
                        {(u.full_name || u.username || '?')[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm text-gray-900 dark:text-white">{u.full_name || u.username}</p>
                    {u.username && u.full_name && (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">@{u.username}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
