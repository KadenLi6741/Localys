import { supabase } from './client';
import type { Message, Chat, ChatMember, ChatWithDetails } from '../../models/Message';

export type { Message, Chat, ChatMember, ChatWithDetails };

/**
 * Get all chats for a user with details
 */
export async function getChats(userId: string) {
  try {
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

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false });

    if (messagesError) throw messagesError;

    const chats: ChatWithDetails[] = memberChats.map(mc => {
      const chat = mc.chats as Chat | null;
      if (!chat) return null;
      
      const chatMembers = allMembers?.filter(m => m.chat_id === mc.chat_id) || [];
      const otherMember = chatMembers.find(m => m.user_id !== userId);
      const lastMessage = messages?.find(m => m.chat_id === mc.chat_id);
      
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
    const { data: userChats, error: userChatsError } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId1);

    if (userChatsError) {
      console.error('userChatsError detailed:', userChatsError);
      throw userChatsError;
    }
    if (!userChats || userChats.length === 0) {
      console.log('No chats found for user:', userId1);
      return { data: null, error: null };
    }

    const chatIds = userChats.map(m => m.chat_id);

    const { data: potentialChats, error: chatsError } = await supabase
      .from('chats')
      .select('id, is_group, metadata, created_at')
      .in('id', chatIds)
      .eq('is_group', false);

    if (chatsError) throw chatsError;
    if (!potentialChats || potentialChats.length === 0) {
      console.log('No 1:1 chats found');
      return { data: null, error: null };
    }

    for (const chat of potentialChats) {
      const { data: members, error: membersError } = await supabase
        .from('chat_members')
        .select('user_id')
        .eq('chat_id', chat.id);

      if (membersError) {
        console.error('Error fetching members for chat:', chat.id, membersError);
        continue;
      }

      if (members && members.length === 2) {
        const memberIds = members.map(m => m.user_id).sort();
        const targetIds = [userId1, userId2].sort();
        
        if (memberIds[0] === targetIds[0] && memberIds[1] === targetIds[1]) {
          console.log('Found matching 1:1 chat:', chat.id);
          return { data: chat, error: null };
        }
      }
    }

    console.log('No matching 1:1 chat found between', userId1, 'and', userId2);
    return { data: null, error: null };
  } catch (error: any) {
    console.error('Error finding one-to-one chat:', error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Create or get existing 1:1 chat
 */
export async function getOrCreateOneToOneChat(userId1: string, userId2: string) {
  try {
    console.log('Creating/fetching 1:1 chat between', userId1, 'and', userId2);
    
    const { data: existing, error: findError } = await findOneToOneChat(userId1, userId2);
    
    if (findError) {
      const errorMsg = extractErrorMessage(findError);
      console.error('Error finding existing chat:', errorMsg);
      throw new Error(errorMsg);
    }
    
    if (existing) {
      console.log('Found existing 1:1 chat:', existing.id);
      return { data: existing, error: null };
    }

    console.log('Creating new 1:1 chat...');
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({
        is_group: false,
        metadata: {},
      })
      .select()
      .single();

    if (chatError) {
      const errorMsg = extractErrorMessage(chatError);
      console.error('Error creating chat:', errorMsg, chatError);
      throw new Error(errorMsg);
    }

    if (!newChat) {
      throw new Error('Failed to create chat - no data returned');
    }

    console.log('Chat created successfully:', newChat.id);

    console.log('Adding members to chat...');
    const { error: membersError } = await supabase
      .from('chat_members')
      .insert([
        { chat_id: newChat.id, user_id: userId1, role: 'member' },
        { chat_id: newChat.id, user_id: userId2, role: 'member' },
      ]);

    if (membersError) {
      const errorMsg = extractErrorMessage(membersError);
      console.error('Error adding members:', errorMsg, membersError);
      throw new Error(errorMsg);
    }

    console.log('Members added successfully');
    return { data: newChat, error: null };
  } catch (error) {
    const errorMsg = extractErrorMessage(error);
    console.error('Error creating one-to-one chat:', errorMsg, error);
    return { 
      data: null, 
      error: new Error(errorMsg)
    };
  }
}

/**
 * Extract readable error message from Supabase or Error objects
 */
function extractErrorMessage(error: any): string {
  if (!error) return 'Unknown error';
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'object') {
    if (error.message) return error.message;
    if (error.error_description) return error.error_description;
    if (error.msg) return error.msg;
    try {
      const str = JSON.stringify(error, null, 2);
      console.log('Full error object:', str);
      return str;
    } catch {
      return 'Unknown error object';
    }
  }
  
  return String(error);
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
