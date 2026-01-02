import { supabase } from './client';

export interface Message {
  id?: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  is_quick_message?: boolean;
  quick_message_type?: string;
  is_read?: boolean;
  created_at?: string;
}

export interface Conversation {
  id?: string;
  user_id: string;
  business_id: string;
  last_message_id?: string;
  last_message_at?: string;
  unread_count_user?: number;
  unread_count_business?: number;
  created_at?: string;
}

/**
 * Get all conversations for a user
 */
export async function getConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      user:user_id (
        id,
        username,
        full_name,
        profile_picture_url
      ),
      business:business_id (
        id,
        business_name,
        profile_picture_url
      ),
      last_message:messages!conversations_last_message_id_fkey (
        message_text,
        created_at
      )
    `)
    .or(`user_id.eq.${userId},business_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  return { data, error };
}

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey (
        id,
        username,
        full_name,
        profile_picture_url
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return { data, error };
}

/**
 * Send a message
 */
export async function sendMessage(message: Message) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();

  if (error) return { data: null, error };

  // Update conversation's last message
  await supabase
    .from('conversations')
    .update({
      last_message_id: data.id,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', message.conversation_id);

  return { data, error: null };
}

/**
 * Create or get existing conversation
 */
export async function getOrCreateConversation(userId: string, businessId: string) {
  // Check if conversation exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .single();

  if (existing) {
    return { data: existing, error: null };
  }

  // Create new conversation
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      business_id: businessId,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId);

  return { error };
}

/**
 * Subscribe to new messages in a conversation (real-time)
 */
export function subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();
}




