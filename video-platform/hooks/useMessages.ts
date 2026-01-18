/**
 * React hook for managing messages in a conversation
 * Provides real-time message updates, pagination, and sending functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  getMessages,
  sendMessage as sendMessageAPI,
  markMessageAsRead,
  subscribeToMessages,
  subscribeToMessageReads,
} from '@/lib/supabase/messaging';
import type { Message, MessageWithSender, MessageRead } from '@/types/messaging';

interface UseMessagesOptions {
  conversationId: string;
  userId: string;
  pageSize?: number;
  autoMarkAsRead?: boolean;
}

interface UseMessagesReturn {
  messages: MessageWithSender[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  sendMessage: (content: string, attachments?: any[]) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMessages({
  conversationId,
  userId,
  pageSize = 50,
  autoMarkAsRead = true,
}: UseMessagesOptions): UseMessagesReturn {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const readsChannelRef = useRef<RealtimeChannel | null>(null);

  // Load initial messages
  const loadInitialMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await getMessages(conversationId, pageSize);
      
      if (fetchError) throw fetchError;
      
      // Messages come in descending order (newest first), reverse for display
      const sortedMessages = (data || []).reverse();
      setMessages(sortedMessages);
      setHasMore((data?.length || 0) >= pageSize);

      // Auto-mark unread messages as read
      if (autoMarkAsRead && data) {
        const unreadMessages = data.filter(msg => msg.sender_id !== userId);
        await Promise.all(unreadMessages.map(msg => markAsRead(msg.id)));
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, pageSize, userId, autoMarkAsRead]);

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const oldestMessage = messages[0];
      const beforeTimestamp = oldestMessage?.created_at;

      const { data, error: fetchError } = await getMessages(
        conversationId,
        pageSize,
        beforeTimestamp
      );

      if (fetchError) throw fetchError;

      const sortedMessages = (data || []).reverse();
      setMessages(prev => [...sortedMessages, ...prev]);
      setHasMore((data?.length || 0) >= pageSize);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, pageSize, messages, hasMore, isLoadingMore]);

  // Send a new message
  const sendMessage = useCallback(
    async (content: string, attachments?: any[]) => {
      try {
        const { data, error: sendError } = await sendMessageAPI(
          conversationId,
          userId,
          content,
          attachments && attachments.length > 0 ? 'attachment' : 'text',
          attachments
        );

        if (sendError) throw sendError;

        // Message will be added via real-time subscription
        // But we can optimistically add it here for better UX
        if (data) {
          const newMessage: MessageWithSender = {
            ...data,
            sender: undefined, // Will be populated by subscription
          };
          setMessages(prev => [...prev, newMessage]);
        }
      } catch (err) {
        setError(err as Error);
        console.error('Error sending message:', err);
        throw err;
      }
    },
    [conversationId, userId]
  );

  // Mark a message as read
  const markAsRead = useCallback(
    async (messageId: string) => {
      try {
        await markMessageAsRead(messageId, userId);
      } catch (err) {
        console.error('Error marking message as read:', err);
      }
    },
    [userId]
  );

  // Refresh messages
  const refresh = useCallback(async () => {
    await loadInitialMessages();
  }, [loadInitialMessages]);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!conversationId) return;

    loadInitialMessages();

    // Subscribe to new messages
    const channel = subscribeToMessages(conversationId, (newMessage: Message) => {
      // Avoid duplicates
      setMessages(prev => {
        const exists = prev.some(m => m.id === newMessage.id);
        if (exists) return prev;
        
        // Auto-mark as read if it's from someone else
        if (autoMarkAsRead && newMessage.sender_id !== userId) {
          markAsRead(newMessage.id);
        }

        return [...prev, newMessage as MessageWithSender];
      });
    });

    channelRef.current = channel;

    // Subscribe to message reads (for read receipts)
    const readsChannel = subscribeToMessageReads(conversationId, (read: MessageRead) => {
      // Update message read status in state if needed
      console.log('Message read:', read);
    });

    readsChannelRef.current = readsChannel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (readsChannelRef.current) {
        readsChannelRef.current.unsubscribe();
      }
    };
  }, [conversationId, userId, autoMarkAsRead, loadInitialMessages, markAsRead]);

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    sendMessage,
    markAsRead,
    refresh,
  };
}
