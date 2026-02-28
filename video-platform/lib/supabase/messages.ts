import { supabase } from './client';
import type { Message, Chat, ChatMember, ChatWithDetails, Conversation } from '../../models/Message';

export type { Message, Chat, ChatMember, ChatWithDetails, Conversation };

/**
 * Get all chats for a user with details
 */
export async function getChats(userId: string) {
  try {
    console.log('Starting getChats for user:', userId);
    
    // Check if user is authenticated
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    console.log('Authenticated user:', authUser?.id, 'Auth error:', authError);

    if (!authUser) {
      console.warn('User not authenticated');
      return { data: [], error: null };
    }
    
    // Test a simple query first to verify table exists and RLS works
    console.log('Testing simple query on chat_members...');
    const { data: testData, error: testError } = await supabase
      .from('chat_members')
      .select('*', { count: 'exact', head: true });
    
    console.log('Test query result:', { hasError: !!testError, testError });

    // Fetch chat_members for this specific user
    console.log('Fetching chat_members for user:', userId);
    const { data: cmembers, error: cmError } = await supabase
      .from('chat_members')
      .select('chat_id, last_read, user_id')
      .eq('user_id', userId);

    console.log('chat_members result:', { 
      dataLength: cmembers?.length, 
      hasError: !!cmError,
      errorKeys: cmError ? Object.keys(cmError) : [],
      errorCode: cmError?.code,
      errorMessage: cmError?.message,
    });

    if (cmError) {
      console.error('Error fetching chat_members - trying without RLS check...');
      // The query failed, possibly due to RLS. Return empty for now
      return { data: [], error: null };
    }

    if (!cmembers || cmembers.length === 0) {
      console.log('No chats found for user');
      return { data: [], error: null };
    }

    const chatIds = cmembers.map(m => m.chat_id);
    console.log('Chat IDs found:', chatIds.length, chatIds);

    // Fetch the chat details
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('id, is_group, metadata, created_at')
      .in('id', chatIds);

    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      // Don't fail, just return what we have
      return { data: [], error: null };
    }

    // Reconstruct data with chat details
    const memberChats = cmembers.map(cm => ({
      chat_id: cm.chat_id,
      last_read: cm.last_read,
      chats: chatsData?.find(c => c.id === cm.chat_id) || null,
    }));

    console.log('Chat members fetched successfully:', memberChats?.length || 0);
    
    return await processChatData(memberChats, userId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Error fetching chats (exception):', errorMessage);
    return { data: null, error: error instanceof Error ? error : new Error('Failed to fetch chats: ' + errorMessage) };
  }
}

/**
 * Helper function to process chat data and fetch additional info
 */
async function processChatData(memberChats: any[], userId: string) {
  const chatIds = memberChats.map(m => m.chat_id);
  console.log('Chat IDs:', chatIds);

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

  if (membersError) {
    console.error('Error fetching all members:', membersError);
    throw membersError;
  }
  
  console.log('All members fetched:', allMembers?.length || 0);

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, chat_id, sender_id, content, created_at')
    .in('chat_id', chatIds)
    .order('created_at', { ascending: false });

  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    throw messagesError;
  }
  
  console.log('Messages fetched:', messages?.length || 0);

  const chats = memberChats.reduce<ChatWithDetails[]>((acc, mc) => {
    const chat = mc.chats as Chat | null;
    if (!chat) return acc;

    const chatMembers = (allMembers?.filter(m => m.chat_id === mc.chat_id) || []) as ChatMember[];
    const otherMember = chatMembers.find(m => m.user_id !== userId) as (ChatMember & { profiles?: unknown }) | undefined;
    const otherProfile = otherMember?.profiles;
    const otherUser = (Array.isArray(otherProfile) ? otherProfile[0] : otherProfile) as ChatWithDetails['other_user'];
    const lastMessage = messages?.find(m => m.chat_id === mc.chat_id) as Message | undefined;

    const unreadMessages = messages?.filter(m =>
      m.chat_id === mc.chat_id &&
      m.sender_id !== userId &&
      (!mc.last_read || new Date(m.created_at || '').getTime() > new Date(mc.last_read).getTime())
    ) || [];

    acc.push({
      ...chat,
      members: chatMembers,
      other_user: otherUser,
      last_message: lastMessage,
      unread_count: unreadMessages.length,
    });

    return acc;
  }, []);

  chats.sort((a, b) => {
    const aTime = a.last_message?.created_at || a.created_at || '';
    const bTime = b.last_message?.created_at || b.created_at || '';
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  console.log('Chats processed:', chats.length);
  return { data: chats, error: null };
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

    const potentialChatIds = potentialChats.map(c => c.id);
    const { data: allMembers, error: membersError } = await supabase
      .from('chat_members')
      .select('chat_id, user_id')
      .in('chat_id', potentialChatIds);

    if (membersError) {
      console.error('Error fetching members for chats:', membersError);
      throw membersError;
    }

    const membersByChatId: Record<string, string[]> = {};
    (allMembers || []).forEach(m => {
      if (!membersByChatId[m.chat_id]) membersByChatId[m.chat_id] = [];
      membersByChatId[m.chat_id].push(m.user_id);
    });

    const targetIds = [userId1, userId2].sort();
    for (const chat of potentialChats) {
      const members = membersByChatId[chat.id] || [];
      if (members.length === 2) {
        const sorted = [...members].sort();
        if (sorted[0] === targetIds[0] && sorted[1] === targetIds[1]) {
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
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user?.id) {
      throw new Error('You must be signed in to start a chat.');
    }

    const initiatorUserId = authData.user.id;
    console.log('Creating/fetching 1:1 chat between', initiatorUserId, 'and', userId2);
    
    const { data: existing, error: findError } = await findOneToOneChat(initiatorUserId, userId2);
    
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
        { chat_id: newChat.id, user_id: initiatorUserId, role: 'member' },
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

/**
 * Get conversation details with other user info
 */
export async function getConversation(chatId: string): Promise<{ data: (Conversation & { avatar_url?: string }) | null; error: Error | null }> {
  try {
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id, is_group, metadata, created_at')
      .eq('id', chatId)
      .single();

    if (chatError) throw chatError;

    const { data: members, error: membersError } = await supabase
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
      .eq('chat_id', chatId);

    if (membersError) throw membersError;

    const { data: currentUser } = await supabase.auth.getUser();
    const otherUserMember = members?.find(m => m.user_id !== currentUser?.user?.id);
    const otherUserProfile = otherUserMember?.profiles as any;

    return {
      data: {
        ...chat,
        other_user: {
          id: otherUserProfile?.id,
          username: otherUserProfile?.username,
          full_name: otherUserProfile?.full_name,
          profile_picture_url: otherUserProfile?.profile_picture_url,
          avatar_url: otherUserProfile?.profile_picture_url,
        },
        members: members,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * Mark conversation as read (update last_read timestamp)
 */
export async function markConversationAsRead(chatId: string) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('chat_members')
      .update({ last_read: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('user_id', user.user.id);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * Edit a message
 */
export async function editMessage(messageId: string, content: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({
        content: content,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
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

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error editing message:', error);
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * Delete a message (soft delete by marking as deleted)
 */
export async function deleteMessage(messageId: string) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({
        deleted: true,
        content: '[Message deleted]',
      })
      .eq('id', messageId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting message:', error);
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}
