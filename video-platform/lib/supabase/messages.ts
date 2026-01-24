import { supabase } from './client';

export interface Message {
  id?: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at?: string;
  edited_at?: string;
  deleted?: boolean;
  reply_to?: string;
  metadata?: any;
}

export interface Chat {
  id?: string;
  is_group?: boolean;
  metadata?: any;
  created_at?: string;
}

export interface ChatMember {
  id?: string;
  chat_id: string;
  user_id: string;
  joined_at?: string;
  last_read?: string;
  role?: string;
}

export interface ChatWithDetails extends Chat {
  members?: ChatMember[];
  last_message?: Message;
  unread_count?: number;
  other_user?: {
    id: string;
    username?: string;
    full_name?: string;
    profile_picture_url?: string;
  };
}

/**
 * Get all chats for a user with details
 */
export async function getChats(userId: string) {
  try {
    // Get all chats where the user is a member
    const { data: memberChats, error: memberError } = await supabase
      .from('chat_members')
      .select(`
        chat_id,
        last_read,
        chats:chat_id (
          id,
          is_group,
          metadata,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (memberError) throw memberError;
    if (!memberChats || memberChats.length === 0) {
      return { data: [], error: null };
    }

    const chatIds = memberChats.map(m => m.chat_id);

    // Get all members for these chats with profile info
    const { data: allMembers, error: membersError } = await supabase
      .from('chat_members')
      .select(`
        chat_id,
        user_id,
        profiles:user_id (
          id,
          username,
          full_name,
          profile_picture_url
        )
      `)
      .in('chat_id', chatIds);

    if (membersError) throw membersError;

    // Get last message for each chat
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false });

    if (messagesError) throw messagesError;

    // Build chat objects with details
    const chats: ChatWithDetails[] = memberChats.map(mc => {
      const chat = mc.chats as Chat | null;
      if (!chat) return null;
      
      const chatMembers = allMembers?.filter(m => m.chat_id === mc.chat_id) || [];
      const otherMember = chatMembers.find(m => m.user_id !== userId);
      const lastMessage = messages?.find(m => m.chat_id === mc.chat_id);
      
      // Count unread messages (messages after last_read timestamp)
      const unreadMessages = messages?.filter(m => 
        m.chat_id === mc.chat_id && 
        m.sender_id !== userId &&
        (!mc.last_read || new Date(m.created_at || '').getTime() > new Date(mc.last_read).getTime())
      ) || [];

      return {
        ...chat,
        members: chatMembers,
        other_user: otherMember?.profiles as ChatWithDetails['other_user'],
        last_message: lastMessage,
        unread_count: unreadMessages.length,
      };
    }).filter((chat): chat is ChatWithDetails => chat !== null);

    // Sort by last message timestamp
    chats.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at || '';
      const bTime = b.last_message?.created_at || b.created_at || '';
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return { data: chats, error: null };
  } catch (error) {
    console.error('Error fetching chats:', error);
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * Get messages for a chat
 */
export async function getMessages(chatId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id (
        id,
        username,
        full_name,
        profile_picture_url
      )
    `)
    .eq('chat_id', chatId)
    .eq('deleted', false)
    .order('created_at', { ascending: true });

  return { data, error };
}

/**
 * Send a message
 */
export async function sendMessage(message: Omit<Message, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select(`
      *,
      sender:sender_id (
        id,
        username,
        full_name,
        profile_picture_url
      )
    `)
    .single();

  return { data, error };
}

/**
 * Find existing 1:1 chat between two users (optimized version)
 */
export async function findOneToOneChat(userId1: string, userId2: string) {
  try {
    // Optimized query: Find non-group chats that have both users and exactly 2 members
    const { data: chats, error } = await supabase
      .from('chats')
      .select(`
        id,
        is_group,
        metadata,
        created_at,
        chat_members!inner(user_id)
      `)
      .eq('is_group', false);

    if (error) throw error;
    if (!chats || chats.length === 0) {
      return { data: null, error: null };
    }

    // Filter in application to find chat with exactly both users
    for (const chat of chats) {
      const members = (chat as { chat_members: { user_id: string }[] }).chat_members;
      if (members.length === 2) {
        const userIds = members.map(m => m.user_id).sort();
        const targetIds = [userId1, userId2].sort();
        if (userIds[0] === targetIds[0] && userIds[1] === targetIds[1]) {
          // Found the matching chat, fetch full details
          const { data: fullChat, error: chatError } = await supabase
            .from('chats')
            .select('*')
            .eq('id', chat.id)
            .single();
          
          return { data: fullChat, error: chatError };
        }
      }
    }

    return { data: null, error: null };
  } catch (error) {
    console.error('Error finding one-to-one chat:', error);
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * Create or get existing 1:1 chat
 */
export async function getOrCreateOneToOneChat(userId1: string, userId2: string) {
  try {
    // First, try to find existing chat
    const { data: existing, error: findError } = await findOneToOneChat(userId1, userId2);
    
    if (findError) throw findError;
    if (existing) {
      return { data: existing, error: null };
    }

    // Create new chat
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({
        is_group: false,
        metadata: {},
      })
      .select()
      .single();

    if (chatError) throw chatError;

    // Add both users as members
    const { error: membersError } = await supabase
      .from('chat_members')
      .insert([
        { chat_id: newChat.id, user_id: userId1, role: 'member' },
        { chat_id: newChat.id, user_id: userId2, role: 'member' },
      ]);

    if (membersError) throw membersError;

    return { data: newChat, error: null };
  } catch (error) {
    console.error('Error creating one-to-one chat:', error);
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * Mark messages as read by updating last_read timestamp
 */
export async function markMessagesAsRead(chatId: string, userId: string) {
  const { error } = await supabase
    .from('chat_members')
    .update({ last_read: new Date().toISOString() })
    .eq('chat_id', chatId)
    .eq('user_id', userId);

  return { error };
}

/**
 * Subscribe to new messages in a chat (real-time)
 */
export function subscribeToMessages(chatId: string, callback: (message: Message) => void) {
  return supabase
    .channel(`chat:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();
}

/**
 * Get all users (for search when starting new chat)
 */
export async function searchUsers(query: string, currentUserId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, profile_picture_url')
    .neq('id', currentUserId)
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(10);

  return { data, error };
}




