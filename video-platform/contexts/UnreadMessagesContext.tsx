'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase/client';
import { markMessagesAsRead } from '@/lib/supabase/messaging';

interface UnreadMessagesContextType {
  unreadMessages: number;
  markChatAsRead: (chatId: string) => Promise<void>;
  refreshUnread: () => void;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType>({
  unreadMessages: 0,
  markChatAsRead: async () => {},
  refreshUnread: () => {},
});

export function useUnreadMessages() {
  return useContext(UnreadMessagesContext);
}

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user) { setUnreadMessages(0); return; }
    const { data: memberships } = await supabase
      .from('chat_members')
      .select('chat_id, last_read')
      .eq('user_id', user.id);
    if (!memberships || memberships.length === 0) { setUnreadMessages(0); return; }
    let total = 0;
    for (const m of memberships) {
      let query = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', m.chat_id)
        .neq('sender_id', user.id);
      if (m.last_read) query = query.gt('created_at', m.last_read);
      const { count } = await query;
      total += count || 0;
    }
    setUnreadMessages(total);
  }, [user]);

  const markChatAsRead = useCallback(async (chatId: string) => {
    if (!user) return;
    await markMessagesAsRead(chatId, user.id);
    // Optimistically refresh the count
    fetchUnread();
  }, [user, fetchUnread]);

  useEffect(() => {
    fetchUnread();
    if (!user) return;

    const msgChannel = supabase.channel('unread-messages-new')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchUnread())
      .subscribe();
    const readChannel = supabase.channel('unread-chat-read')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_members' }, () => fetchUnread())
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(readChannel);
    };
  }, [user, fetchUnread]);

  return (
    <UnreadMessagesContext.Provider value={{ unreadMessages, markChatAsRead, refreshUnread: fetchUnread }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}
