import { useState, useEffect, useCallback } from 'react';
import { getChats, ChatWithDetails } from '@/lib/supabase/messages';

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
      const { data, error: fetchError } = await getChats(userId);
      
      if (fetchError) throw fetchError;
      
      setChats(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading chats:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
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
