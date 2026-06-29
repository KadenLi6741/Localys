/**
 * supabase/messaging.ts — compatibility re-export barrel for the messaging API.
 * Purpose: Re-exports the messaging types/functions from './messages' under this module path, so older
 *   imports of '@/lib/supabase/messaging' keep working without duplicating logic.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

export type { Message, Chat, ChatMember, ChatWithDetails, Conversation } from './messages';

export {
  getChats,
  getMessages,
  sendMessage,
  findOneToOneChat,
  getOrCreateOneToOneChat,
  markMessagesAsRead,
  subscribeToMessages,
  searchUsers,
  editMessage,
  deleteMessage,
  getConversation,
  markConversationAsRead,
} from './messages';

export { getOrCreateOneToOneChat as getOrCreateConversation } from './messages';

import { supabase } from './client';
import type { Conversation } from './messages';

export async function getConversations() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: null };

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .order('updated_at', { ascending: false });

    return { data: (data || []) as Conversation[], error };
  } catch (error: unknown) {
    return { data: [], error: error as Error };
  }
}

export function subscribeToAllConversations(callback: (conversation: Conversation) => void) {
  const channel = supabase
    .channel('all-conversations')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (payload) => {
      callback(payload.new as Conversation);
    })
    .subscribe();
  return channel;
}
