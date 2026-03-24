import { useState, useEffect, useCallback } from 'react';
import { getChats, ChatWithDetails } from '@/lib/supabase/messaging';

export function useChats(userId: string | undefined) {
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadChats = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('useChats: Loading chats for user', userId);
      
      const { data, error: fetchError } = await getChats(userId);
      
      if (fetchError) {
        const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        console.error('useChats: fetchError returned:', fetchError);
        // Network-level failure — show empty state, not error UI
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
          console.warn('useChats: Network error loading chats — showing empty state');
          setChats([]);
          setLoading(false);
          return;
        }
        throw fetchError;
      }
      
      if (!data) {
        console.warn('useChats: No data returned, setting to empty array');
        setChats([]);
      } else {
        console.log('useChats: Successfully loaded', data.length, 'chats');
        setChats(data);
      }
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('Error loading chats:', errorMsg, err);
      setChats([]);
      // Only set error state for non-network failures (network failures show empty state silently)
      const isNetworkError = errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('fetch');
      if (!isNetworkError) {
        const finalError = err instanceof Error ? err : new Error(errorMsg || 'Unknown error loading chats');
        setError(finalError);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  return {
    chats,
    loading,
    error,
    refresh: loadChats,
  };
}
