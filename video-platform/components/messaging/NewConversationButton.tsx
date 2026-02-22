'use client';

/**
 * NewConversationButton Component
 * 
 * Allows users to start a new conversation by selecting another user.
 * Can be used to search for users and initiate a chat.
 * 
 * Features:
 * - User search/selection
 * - Create conversation with first message
 * - Navigate to new conversation
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateOneToOneChat } from '@/lib/supabase/messages';
import { supabase } from '@/lib/supabase/client';

interface NewConversationButtonProps {
  onConversationCreated?: (conversationId: string) => void;
}

export default function NewConversationButton({
  onConversationCreated,
}: NewConversationButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .ilike('username', `%${query}%`)
        .neq('id', user?.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async (otherUserId: string, firstMessage?: string) => {
    if (!user) return;

    setCreating(true);
    try {
      const { data, error } = await getOrCreateOneToOneChat(user.id, otherUserId);

      if (error) {
        alert(`Failed to create conversation: ${error.message}`);
        return;
      }

      if (data?.chat_id) {
        setIsOpen(false);
        setSearchQuery('');
        setSearchResults([]);

        if (onConversationCreated) {
          onConversationCreated(data.chat_id);
        } else {
          router.push(`/chats/${data.chat_id}`);
        }
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition-colors"
      >
        New Message
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-white/20 rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">New Conversation</h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for a user..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                autoFocus
              />
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}

            {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>No users found</p>
              </div>
            )}

            {!loading && searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleStartConversation(profile.id)}
                    disabled={creating}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="font-semibold">
                          {profile.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-semibold">
                        {profile.full_name || profile.username}
                      </p>
                      {profile.full_name && (
                        <p className="text-sm text-gray-400">@{profile.username}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {creating && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span className="ml-2">Creating conversation...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

