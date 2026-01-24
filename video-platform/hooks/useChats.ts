import { useState, useEffect, useCallback } from 'react';
import { getConversations, Conversation } from '@/lib/supabase/messaging';

export function useChats(userId: string | undefined) {
  const [chats, setChats] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadChats = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await getConversations();
      
      if (fetchError) throw fetchError;
      
      setChats(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading conversations:', err);
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
