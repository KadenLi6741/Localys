'use client';

/**
 * ChatList Component
 * 
 * Displays a list of all conversations for the current user.
 * Shows unread counts and last message preview.
 * Updates in real-time when new messages arrive.
 * 
 * Features:
 * - Real-time updates using Supabase Realtime
 * - Unread message counts
 * - Last message preview
 * - Click to navigate to conversation
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  getConversations,
  subscribeToAllConversations,
  Conversation,
} from '@/lib/supabase/messaging';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatListProps {
  onSelectConversation?: (conversationId: string) => void;
}

export default function ChatList({ onSelectConversation }: ChatListProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useState<RealtimeChannel | null>(null)[0];

  useEffect(() => {
    if (!user) return;

    loadConversations();

    const channel = subscribeToAllConversations((updatedConversation) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === updatedConversation.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = updatedConversation;
          return updated.sort(
            (a, b) =>
              new Date(b.last_message_at || 0).getTime() -
              new Date(a.last_message_at || 0).getTime()
          );
        } else {
          return [...prev, updatedConversation].sort(
            (a, b) =>
              new Date(b.last_message_at || 0).getTime() -
              new Date(a.last_message_at || 0).getTime()
          );
        }
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await getConversations();

      if (err) {
        setError(err.message);
        return;
      }

      setConversations(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversationId: string) => {
    if (onSelectConversation) {
      onSelectConversation(conversationId);
    } else {
      router.push(`/chats/${conversationId}`);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>Error: {error}</p>
        <button
          onClick={loadConversations}
          className="mt-2 text-sm underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>No conversations yet</p>
        <p className="text-sm mt-2">Start a new conversation to begin messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-xl font-bold">Messages</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => handleConversationClick(conversation.id)}
            className="w-full px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 flex items-center gap-3"
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              {conversation.other_user?.avatar_url ? (
                <img
                  src={conversation.other_user.avatar_url}
                  alt={conversation.other_user.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-lg font-semibold">
                    {conversation.other_user?.username?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>

            {/* Conversation Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold truncate">
                  {conversation.other_user?.full_name || conversation.other_user?.username || 'Unknown User'}
                </h3>
                {conversation.last_message_at && (
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {formatTimestamp(conversation.last_message_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400 truncate">
                  {conversation.last_message_text || 'No messages yet'}
                </p>
                {conversation.unread_count && conversation.unread_count > 0 && (
                  <span className="flex-shrink-0 ml-2 bg-white text-black text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                    {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

