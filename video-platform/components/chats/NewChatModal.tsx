import { useState, useEffect, useCallback } from 'react';
import { searchUsers, getOrCreateOneToOneChat, sendMessage } from '@/lib/supabase/messages';
import { useRouter } from 'next/navigation';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

interface UserSearchResult {
  id: string;
  username?: string;
  full_name?: string;
  profile_picture_url?: string;
}

export function NewChatModal({ isOpen, onClose, currentUserId }: NewChatModalProps) {
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
    } catch (err: any) {
      console.error('Error searching users:', err);
      setError(err.message || 'Failed to search users');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentUserId]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        handleSearch();
      } else {
        setSearchResults([]);
        setError(null);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, handleSearch]);

  const handleSelectUser = async (userId: string) => {
    setCreating(true);
    setError(null);
    try {
      console.log('Creating/finding chat between', currentUserId, 'and', userId);
      
      const { data, error: chatError } = await getOrCreateOneToOneChat(currentUserId, userId);
      if (chatError) {
        console.error('Chat creation error:', chatError);
        throw chatError;
      }
      
      if (data) {
        console.log('Chat found/created:', data.id);
        // Auto-send a default opening message for brand-new chats
        if (!data.last_message) {
          await sendMessage({
            chat_id: data.id,
            sender_id: currentUserId,
            content: 'Hi! Is this available? 👋',
          });
        }
        onClose();
        router.push(`/chats/${data.id}`);
      } else {
        console.error('No chat data returned');
        setError('Failed to create chat');
      }
    } catch (err: any) {
      console.error('Error creating chat:', err);
      setError(err.message || 'Failed to create chat');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--color-charcoal)]/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 mb-4 sm:mb-0 bg-[var(--color-charcoal)] border border-[var(--color-charcoal-lighter-plus)] rounded-2xl shadow-2xl max-h-[80vh] flex flex-col animate-[scaleIn_200ms_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-charcoal-lighter-plus)]">
          <h2 className="text-xl font-bold text-[var(--color-cream)]">New Chat</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full text-[var(--color-body-text)] hover:text-[var(--color-cream)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-[var(--color-charcoal-lighter-plus)]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or username..."
            className="w-full bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-xl px-4 py-3 text-[var(--color-cream)] placeholder-[#9E9A90]/50 focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent"
            aria-label="Search users"
            autoFocus
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-[#E05C3A]/10 border-b border-[#E05C3A]/20 text-[#E05C3A] text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F5A623] mx-auto"></div>
            </div>
          ) : searchResults.length === 0 && searchQuery.trim() ? (
            <div className="text-center py-8 text-[var(--color-body-text)]">
              No users found
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-body-text)]">
              Search for users to start a chat
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  disabled={creating}
                  className="w-full flex items-center gap-4 p-4 bg-[var(--color-charcoal-light)] hover:bg-[var(--color-charcoal-lighter)] rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-[var(--color-charcoal-lighter)] flex-shrink-0 overflow-hidden">
                    {user.profile_picture_url ? (
                      <img
                        src={user.profile_picture_url}
                        alt={user.full_name || user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--color-body-text)] text-lg font-semibold">
                        {(user.full_name || user.username || '?')[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-[var(--color-cream)]">{user.full_name || user.username}</p>
                    {user.username && user.full_name && (
                      <p className="text-sm text-[var(--color-body-text)]">@{user.username}</p>
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
