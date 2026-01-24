import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessages, sendMessage, subscribeToMessages, markMessagesAsRead, Message } from '@/lib/supabase/messages';

export function useMessages(chatId: string | undefined, userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);
  const subscriptionRef = useRef<ReturnType<typeof subscribeToMessages> | null>(null);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMessages = useCallback(async () => {
    if (!chatId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await getMessages(chatId);
      
      if (fetchError) throw fetchError;
      
      setMessages(data || []);
      setError(null);

      // Mark messages as read when loading
      if (userId && chatId) {
        await markMessagesAsRead(chatId, userId);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [chatId, userId]);

  // Debounced mark as read function
  const debouncedMarkAsRead = useCallback((chatId: string, userId: string) => {
    // Clear existing timeout
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }

    // Set new timeout to mark as read after 1 second
    markAsReadTimeoutRef.current = setTimeout(() => {
      markMessagesAsRead(chatId, userId);
    }, 1000);
  }, []);

  const send = async (content: string) => {
    if (!chatId || !userId || !content.trim()) {
      return { success: false, error: new Error('Missing required fields') };
    }

    try {
      setSending(true);
      const { data, error: sendError } = await sendMessage({
        chat_id: chatId,
        sender_id: userId,
        content: content.trim(),
      });

      if (sendError) throw sendError;

      // Optimistically add message to list if not already there
      if (data && !messages.find(m => m.id === data.id)) {
        setMessages(prev => [...prev, data]);
      }

      return { success: true, data };
    } catch (err) {
      console.error('Error sending message:', err);
      return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadMessages();

    // Subscribe to new messages
    if (chatId && userId) {
      subscriptionRef.current = subscribeToMessages(chatId, (newMessage) => {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });

        // Mark as read if not from current user (debounced)
        if (newMessage.sender_id !== userId) {
          debouncedMarkAsRead(chatId, userId);
        }
      });
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
    };
  }, [chatId, userId, loadMessages, debouncedMarkAsRead]);

  return {
    messages,
    loading,
    error,
    sending,
    send,
    refresh: loadMessages,
  };
}
