/**
 * useChats — hook that loads and live-updates a user's conversation list.
 * Purpose: Fetches the user's chats and merges in client-side demo chats, refreshing when demo chats
 *   change, so the chats screen shows both real and demo conversations with loading/error state.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useState, useEffect, useCallback } from 'react';
import { getChats, ChatWithDetails } from '@/lib/supabase/messaging';
import { getDemoChats, DEMO_CHAT_EVENT } from '@/lib/demoChat';

export function useChats(userId: string | undefined) {
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadChats = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Client-side demo conversations (demo stores) always show, regardless of Supabase.
    const demoChats = getDemoChats();

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await getChats(userId);

      if (fetchError) {
        const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        throw new Error(msg || 'Unknown error loading chats');
      }

      setChats([...demoChats, ...(data ?? [])]);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error loading chats';
      console.error('Error loading chats:', errorMsg);
      setError(err instanceof Error ? err : new Error(errorMsg));
      // Still surface demo chats even if the Supabase fetch failed.
      setChats(demoChats);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadChats();
    if (typeof window === 'undefined') return;
    const onDemoChange = () => loadChats();
    window.addEventListener(DEMO_CHAT_EVENT, onDemoChange);
    return () => window.removeEventListener(DEMO_CHAT_EVENT, onDemoChange);
  }, [loadChats]);

  return {
    chats,
    loading,
    error,
    refresh: loadChats,
  };
}
