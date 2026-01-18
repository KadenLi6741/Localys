/**
 * Supabase messaging functions for user-to-user messaging
 * This is the new messaging system supporting 1:1 and group conversations
 */

import { supabase } from './client';
import type { 
  Conversation, 
  ConversationMember, 
  Message, 
  MessageRead,
  ConversationWithMembers,
  MessageWithSender 
} from '@/types/messaging';

/**
 * Get all conversations for the current user
 */
export async function getUserConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversation_members')
    .select(`
      conversation_id,
      conversations (
        id,
        title,
        metadata,
        created_at,
        updated_at,
        last_message_at
      )
    `)
    .eq('user_id', userId)
    .order('conversations(last_message_at)', { ascending: false, nullsFirst: false });

  if (error) return { data: null, error };

  // Transform the data to return conversations with metadata
  const conversations = data?.map(item => item.conversations).filter(Boolean) as Conversation[];
  return { data: conversations, error: null };
}

/**
 * Get a single conversation with members
 */
export async function getConversation(conversationId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      conversation_members (
        id,
        user_id,
        joined_at,
        is_admin
      )
    `)
    .eq('id', conversationId)
    .single();

  return { data: data as ConversationWithMembers | null, error };
}

/**
 * Create a new conversation
 */
export async function createConversation(title?: string, metadata?: Record<string, any>) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      title,
      metadata: metadata || {},
    })
    .select()
    .single();

  return { data: data as Conversation | null, error };
}

/**
 * Add a member to a conversation
 */
export async function addConversationMember(conversationId: string, userId: string, isAdmin = false) {
  const { data, error } = await supabase
    .from('conversation_members')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      is_admin: isAdmin,
    })
    .select()
    .single();

  return { data: data as ConversationMember | null, error };
}

/**
 * Create or get existing 1:1 conversation between two users
 * This is idempotent - will return existing conversation if it exists
 */
export async function createOrGetDirectConversation(userId1: string, userId2: string) {
  // First, try to find an existing 1:1 conversation between these users
  // A 1:1 conversation has exactly 2 members
  const { data: existingConversations, error: searchError } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .in('user_id', [userId1, userId2]);

  if (!searchError && existingConversations) {
    // Count occurrences of each conversation_id
    const conversationCounts = existingConversations.reduce((acc, item) => {
      acc[item.conversation_id] = (acc[item.conversation_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find a conversation with exactly both users (count = 2)
    const existingConvId = Object.keys(conversationCounts).find(
      convId => conversationCounts[convId] === 2
    );

    if (existingConvId) {
      // Verify this conversation has exactly 2 members total
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', existingConvId);

      if (members && members.length === 2) {
        return await getConversation(existingConvId);
      }
    }
  }

  // No existing conversation found, create a new one
  const { data: newConversation, error: createError } = await createConversation();

  if (createError || !newConversation) {
    return { data: null, error: createError };
  }

  // Add both members
  await addConversationMember(newConversation.id, userId1, false);
  await addConversationMember(newConversation.id, userId2, false);

  return await getConversation(newConversation.id);
}

/**
 * Get messages for a conversation with pagination
 */
export async function getMessages(
  conversationId: string, 
  limit = 50, 
  beforeTimestamp?: string
) {
  let query = supabase
    .from('messages')
    .select(`
      *,
      sender:profiles (
        id,
        username,
        full_name,
        profile_picture_url
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (beforeTimestamp) {
    query = query.lt('created_at', beforeTimestamp);
  }

  const { data, error } = await query;

  return { data: data as MessageWithSender[] | null, error };
}

/**
 * Send a message to a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  contentType: 'text' | 'attachment' | 'system' = 'text',
  attachments?: any[],
  metadata?: Record<string, any>
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      content_type: contentType,
      attachments: attachments || [],
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) return { data: null, error };

  // Mark the message as read by the sender
  await markMessageAsRead(data.id, senderId);

  return { data: data as Message, error: null };
}

/**
 * Mark a message as read by a user
 */
export async function markMessageAsRead(messageId: string, userId: string) {
  const { data, error } = await supabase
    .from('message_reads')
    .insert({
      message_id: messageId,
      user_id: userId,
    })
    .select()
    .single();

  return { data: data as MessageRead | null, error };
}

/**
 * Get unread message count for a user in a conversation
 */
export async function getUnreadCount(conversationId: string, userId: string) {
  // Get all messages in the conversation not sent by the user
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId);

  if (messagesError || !messages) {
    return { count: 0, error: messagesError };
  }

  const messageIds = messages.map(m => m.id);

  if (messageIds.length === 0) {
    return { count: 0, error: null };
  }

  // Get read receipts for these messages by this user
  const { data: reads, error: readsError } = await supabase
    .from('message_reads')
    .select('message_id')
    .in('message_id', messageIds)
    .eq('user_id', userId);

  if (readsError) {
    return { count: 0, error: readsError };
  }

  const readMessageIds = new Set(reads?.map(r => r.message_id) || []);
  const unreadCount = messageIds.filter(id => !readMessageIds.has(id)).length;

  return { count: unreadCount, error: null };
}

/**
 * Subscribe to new messages in a conversation (real-time)
 */
export function subscribeToMessages(
  conversationId: string, 
  callback: (message: Message) => void
) {
  return supabase
    .channel(`conversation:${conversationId}:messages`)
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

/**
 * Subscribe to message reads in a conversation (real-time)
 */
export function subscribeToMessageReads(
  conversationId: string,
  callback: (read: MessageRead) => void
) {
  return supabase
    .channel(`conversation:${conversationId}:reads`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reads',
        filter: `message_id=in.(select id from messages where conversation_id='${conversationId}')`,
      },
      (payload) => {
        callback(payload.new as MessageRead);
      }
    )
    .subscribe();
}

/**
 * Delete a message (only sender or admin can delete)
 */
export async function deleteMessage(messageId: string) {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  return { error };
}

/**
 * Update a message (only sender can update)
 */
export async function updateMessage(messageId: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .update({ content })
    .eq('id', messageId)
    .select()
    .single();

  return { data: data as Message | null, error };
}
