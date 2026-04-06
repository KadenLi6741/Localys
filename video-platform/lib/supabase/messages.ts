import { supabase } from './client';
import type { Message, Chat, ChatMember, ChatWithDetails, Conversation } from '../../models/Message';

export type { Message, Chat, ChatMember, ChatWithDetails, Conversation };

/**
 * Get all chats for a user with details.
 * Uses simple sequential queries to avoid complex joins that cause "Failed to fetch".
 */
export async function getChats(userId: string) {
  try {
    console.log('getChats: starting for user', userId);

    // ── DEBUG: raw table access (temporary — remove once chats load) ──
    const { data: debugChats, error: debugChatsError } = await supabase
      .from('chats')
      .select('*')
      .limit(5);
    console.log('DEBUG chats:', JSON.stringify({ debugChats, debugChatsError }, null, 2));

    const { data: debugMembers, error: debugMembersError } = await supabase
      .from('chat_members')
      .select('*')
      .eq('user_id', userId)
      .limit(5);
    console.log('DEBUG members:', JSON.stringify({ debugMembers, debugMembersError }, null, 2));
    // ── END DEBUG ──

    // 1. Get all chat IDs for the current user
    const { data: myMemberships, error: membershipsError } = await supabase
      .from('chat_members')
      .select('chat_id, last_read')
      .eq('user_id', userId);

    if (membershipsError) {
      console.error('getChats: chat_members query failed', membershipsError);
      return { data: null, error: membershipsError };
    }

    if (!myMemberships || myMemberships.length === 0) {
      console.log('getChats: user has no chat memberships');
      return { data: [], error: null };
    }

    const chatIds = myMemberships.map(m => m.chat_id);
    const lastReadMap = Object.fromEntries(myMemberships.map(m => [m.chat_id, m.last_read]));
    console.log('getChats: found', chatIds.length, 'chat IDs');

    // 2. Fetch chat rows (id, is_group, metadata, created_at)
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('id, is_group, metadata, created_at')
      .in('id', chatIds);

    if (chatsError) {
      console.error('getChats: chats query failed', chatsError);
      return { data: null, error: chatsError };
    }

    const chatsById = Object.fromEntries((chatsData || []).map(c => [c.id, c]));

    // 3. For each chat, get the OTHER participant's user_id
    const { data: allMembers, error: allMembersError } = await supabase
      .from('chat_members')
      .select('chat_id, user_id')
      .in('chat_id', chatIds);

    if (allMembersError) {
      console.error('getChats: allMembers query failed', allMembersError);
      return { data: null, error: allMembersError };
    }

    // Build a map: chatId → other user id
    const otherUserByChatId: Record<string, string> = {};
    for (const m of allMembers || []) {
      if (m.user_id !== userId) {
        otherUserByChatId[m.chat_id] = m.user_id;
      }
    }

    // 4. Fetch profiles for all other participants in one query
    const otherUserIds = [...new Set(Object.values(otherUserByChatId))];
    let profilesById: Record<string, { id: string; username: string | null; full_name: string | null; profile_picture_url: string | null }> = {};

    if (otherUserIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, profile_picture_url')
        .in('id', otherUserIds);

      if (profilesError) {
        console.error('getChats: profiles query failed (non-fatal)', profilesError);
      }
      profilesById = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
    }

    // 5. Fetch the last message for each chat (all messages desc, pick first per chat)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, chat_id, sender_id, content, created_at')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('getChats: messages query failed (non-fatal)', messagesError);
    }

    // 6. Assemble the chat list
    const results: ChatWithDetails[] = [];

    for (const chatId of chatIds) {
      const chat = chatsById[chatId];
      if (!chat) continue;

      const otherUserId = otherUserByChatId[chatId];
      const otherUser = otherUserId ? (profilesById[otherUserId] ?? null) : null;
      const lastMessage = (messages || []).find(m => m.chat_id === chatId) as Message | undefined;

      const unreadCount = (messages || []).filter(m =>
        m.chat_id === chatId &&
        m.sender_id !== userId &&
        (!lastReadMap[chatId] || new Date(m.created_at || '').getTime() > new Date(lastReadMap[chatId]).getTime())
      ).length;

      const chatMembers = (allMembers || []).filter(m => m.chat_id === chatId) as ChatMember[];

      results.push({
        ...chat,
        members: chatMembers,
        other_user: otherUser as ChatWithDetails['other_user'],
        last_message: lastMessage,
        unread_count: unreadCount,
      });
    }

    // Sort newest first
    results.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at || '';
      const bTime = b.last_message?.created_at || b.created_at || '';
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    console.log('getChats: returning', results.length, 'chats');
    return { data: results, error: null };
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('getChats: exception', msg);
    return { data: null, error: error instanceof Error ? error : new Error('Failed to fetch chats: ' + msg) };
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
