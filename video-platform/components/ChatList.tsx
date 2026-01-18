/**
 * ChatList component - displays a list of conversations for the current user
 * Shows conversation participants, last message, and unread counts
 */

'use client';

import { useState, useEffect } from 'react';
import { getUserConversations, getUnreadCount } from '@/lib/supabase/messaging';
import type { Conversation } from '@/types/messaging';

interface ChatListProps {
  userId: string;
  onConversationSelect?: (conversationId: string) => void;
}

interface ConversationWithUnread extends Conversation {
  unread_count?: number;
}

export function ChatList({ userId, onConversationSelect }: ChatListProps) {
  const [conversations, setConversations] = useState<ConversationWithUnread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadConversations();
  }, [userId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await getUserConversations(userId);

      if (fetchError) throw fetchError;

      // Load unread counts for each conversation
      const conversationsWithUnread = await Promise.all(
        (data || []).map(async (conv) => {
          const { count } = await getUnreadCount(conv.id, userId);
          return { ...conv, unread_count: count };
        })
      );

      setConversations(conversationsWithUnread);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversationId: string) => {
    if (onConversationSelect) {
      onConversationSelect(conversationId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading conversations: {error.message}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No conversations yet</p>
        <p className="text-sm mt-2">Start a new conversation to get started</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          onClick={() => handleConversationClick(conversation.id)}
          className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {conversation.title || 'Conversation'}
              </h3>
              {conversation.last_message_at && (
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(conversation.last_message_at).toLocaleString()}
                </p>
              )}
            </div>
            {conversation.unread_count && conversation.unread_count > 0 && (
              <span className="ml-2 bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-1">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
