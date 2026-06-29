/**
 * useMessages — hook managing the messages of one open conversation.
 * Purpose: Loads a chat's messages, sends new ones, subscribes to realtime updates, and marks messages
 *   read. Transparently handles demo chats (client-side) vs real Supabase chats so the chat window code
 *   stays the same for both.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessages, sendMessage, subscribeToMessages, markMessagesAsRead, Message } from '@/lib/supabase/messaging';
import { supabase } from '@/lib/supabase/client';
import { isDemoChatId, getDemoMessages, addDemoMessage } from '@/lib/demoChat';

export function useMessages(chatId: string | undefined, userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);
  const subscriptionRef = useRef<ReturnType<typeof subscribeToMessages> | null>(null);
  const updateSubscriptionRef = useRef<any>(null);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMessages = useCallback(async () => {
    if (!chatId) {
      setLoading(false);
      return;
    }

    // Demo conversations live in localStorage — no Supabase fetch.
    if (isDemoChatId(chatId)) {
      setMessages(getDemoMessages(chatId));
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await getMessages(chatId);
      
      if (fetchError) throw fetchError;
      
      setMessages(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [chatId, userId]);

  const debouncedMarkAsRead = useCallback((chatId: string, userId: string) => {
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }

    markAsReadTimeoutRef.current = setTimeout(() => {
      markMessagesAsRead(chatId, userId);
    }, 1000);
  }, []);

  const send = async (content: string) => {
    if (!chatId || !userId || !content.trim()) {
      return { success: false, error: new Error('Missing required fields') };
    }

    // Demo conversations: append locally, no Supabase insert.
    if (isDemoChatId(chatId)) {
      const msg = addDemoMessage(chatId, userId, content.trim());
      setMessages((prev) => [...prev, msg]);
      return { success: true, data: msg };
    }

    try {
      setSending(true);
      const { data, error: sendError } = await sendMessage({
        chat_id: chatId,
        sender_id: userId,
        content: content.trim(),
      });

      if (sendError) throw sendError;

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

    if (chatId && userId && !isDemoChatId(chatId)) {
      subscriptionRef.current = subscribeToMessages(chatId, (newMessage) => {
        setMessages(prev => {
          if (prev.find(m => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });

        if (newMessage.sender_id !== userId) {
          debouncedMarkAsRead(chatId, userId);
        }
      });

      // Listen for message updates (edits and deletes)
      updateSubscriptionRef.current = supabase
        .channel(`chat_updates:${chatId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            const updatedMessage = payload.new as Message;
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
            );
          }
        )
        .subscribe();
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (updateSubscriptionRef.current) {
        updateSubscriptionRef.current.unsubscribe();
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
