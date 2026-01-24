/**
 * User-to-User Messaging System
 * 
 * This module provides TypeScript utilities for a 1-to-1 user messaging system
 * built on Supabase. It includes functions for:
 * - Creating/getting conversations between users
 * - Sending messages
 * - Fetching message history
 * - Real-time subscriptions
 * - Managing unread counts
 * 
 * All functions respect Row Level Security (RLS) policies.
 */

import { supabase } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';

// =====================================================
// TYPES
// =====================================================

/**
 * User profile data structure
 */
export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Conversation between two users
 */
export interface Conversation {
  id: string;
  user_one_id: string;
  user_two_id: string;
  last_message_at: string | null;
  last_message_text: string | null;
  user_one_unread_count: number;
  user_two_unread_count: number;
  created_at: string;
  updated_at: string;
  // Joined profile data (added in queries)
  other_user?: Profile;
  unread_count?: number; // Computed for current user
}

/**
 * Individual message in a conversation
 */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  // Joined sender profile data (added in queries)
  sender?: Profile;
}

/**
 * Payload for sending a new message
 */
export interface SendMessagePayload {
  conversation_id: string;
  content: string;
}

/**
 * Payload for creating a conversation
 */
export interface CreateConversationPayload {
  other_user_id: string;
  first_message?: string;
}

/**
 * Real-time message subscription callback
 */
export type MessageSubscriptionCallback = (message: Message) => void;

/**
 * Real-time conversation subscription callback
 */
export type ConversationSubscriptionCallback = (conversation: Conversation) => void;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get the current authenticated user's ID
 * @throws Error if user is not authenticated
 */
async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

/**
 * Get or create a conversation between the current user and another user
 * Uses the database function to ensure proper ordering and uniqueness
 */
async function getOrCreateConversationId(otherUserId: string): Promise<string> {
  const currentUserId = await getCurrentUserId();
  
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_user_one_id: currentUserId,
    p_user_two_id: otherUserId,
  });

  if (error) {
    throw new Error(`Failed to get or create conversation: ${error.message}`);
  }

  return data as string;
}

/**
 * Get profile information for a user
 */
async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

// =====================================================
// CONVERSATION FUNCTIONS
// =====================================================

/**
 * Get or create a conversation between the current user and another user
 * If first_message is provided, it will be sent after creating the conversation
 * 
 * @param otherUserId - The ID of the user to start a conversation with
 * @param firstMessage - Optional first message to send
 * @returns The conversation object with joined user data
 */
export async function getOrCreateConversation(
  otherUserId: string,
  firstMessage?: string
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    const currentUserId = await getCurrentUserId();

    // Get or create conversation ID using the database function
    const conversationId = await getOrCreateConversationId(otherUserId);

    // Fetch the conversation with joined profile data
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select(`
        *,
        other_user_one:profiles!conversations_user_one_id_fkey(*),
        other_user_two:profiles!conversations_user_two_id_fkey(*)
      `)
      .eq('id', conversationId)
      .single();

    if (fetchError) {
      return { data: null, error: new Error(fetchError.message) };
    }

    // Determine which user is the "other user" and compute unread count
    const otherUser = 
      conversation.user_one_id === currentUserId
        ? conversation.other_user_two
        : conversation.other_user_one;
    
    const unreadCount = 
      conversation.user_one_id === currentUserId
        ? conversation.user_one_unread_count
        : conversation.user_two_unread_count;

    const formattedConversation: Conversation = {
      ...conversation,
      other_user: otherUser,
      unread_count: unreadCount,
    };

    // Send first message if provided
    if (firstMessage) {
      const { error: messageError } = await sendMessage({
        conversation_id: conversationId,
        content: firstMessage,
      });

      if (messageError) {
        return { 
          data: formattedConversation, 
          error: new Error(`Conversation created but failed to send first message: ${messageError.message}`) 
        };
      }
    }

    return { data: formattedConversation, error: null };
  } catch (error: any) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Get all conversations for the current user
 * Conversations are ordered by last_message_at (most recent first)
 * 
 * @returns Array of conversations with joined user data and computed unread counts
 */
export async function getConversations(): Promise<{ data: Conversation[] | null; error: Error | null }> {
  try {
    const currentUserId = await getCurrentUserId();

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        other_user_one:profiles!conversations_user_one_id_fkey(*),
        other_user_two:profiles!conversations_user_two_id_fkey(*)
      `)
      .or(`user_one_id.eq.${currentUserId},user_two_id.eq.${currentUserId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Format conversations: identify the "other user" and compute unread count
    const formattedConversations: Conversation[] = (conversations || []).map((conv) => {
      const otherUser = 
        conv.user_one_id === currentUserId
          ? conv.other_user_two
          : conv.other_user_one;
      
      const unreadCount = 
        conv.user_one_id === currentUserId
          ? conv.user_one_unread_count
          : conv.user_two_unread_count;

      return {
        ...conv,
        other_user: otherUser,
        unread_count: unreadCount,
      };
    });

    return { data: formattedConversations, error: null };
  } catch (error: any) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Get a single conversation by ID
 * 
 * @param conversationId - The ID of the conversation
 * @returns The conversation object with joined user data
 */
export async function getConversation(
  conversationId: string
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    const currentUserId = await getCurrentUserId();

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        other_user_one:profiles!conversations_user_one_id_fkey(*),
        other_user_two:profiles!conversations_user_two_id_fkey(*)
      `)
      .eq('id', conversationId)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Verify user has access to this conversation
    if (conversation.user_one_id !== currentUserId && conversation.user_two_id !== currentUserId) {
      return { data: null, error: new Error('Unauthorized: You do not have access to this conversation') };
    }

    // Determine which user is the "other user" and compute unread count
    const otherUser = 
      conversation.user_one_id === currentUserId
        ? conversation.other_user_two
        : conversation.other_user_one;
    
    const unreadCount = 
      conversation.user_one_id === currentUserId
        ? conversation.user_one_unread_count
        : conversation.user_two_unread_count;

    const formattedConversation: Conversation = {
      ...conversation,
      other_user: otherUser,
      unread_count: unreadCount,
    };

    return { data: formattedConversation, error: null };
  } catch (error: any) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

// =====================================================
// MESSAGE FUNCTIONS
// =====================================================

/**
 * Send a message in a conversation
 * Automatically sets sender_id and receiver_id based on the conversation
 * 
 * @param payload - Message payload containing conversation_id and content
 * @returns The created message object with joined sender data
 */
export async function sendMessage(
  payload: SendMessagePayload
): Promise<{ data: Message | null; error: Error | null }> {
  try {
    const currentUserId = await getCurrentUserId();

    // Get conversation to determine receiver_id
    const { data: conversation, error: convError } = await getConversation(payload.conversation_id);
    
    if (convError || !conversation) {
      return { data: null, error: new Error('Conversation not found or access denied') };
    }

    // Determine receiver_id (the other user in the conversation)
    const receiverId = 
      conversation.user_one_id === currentUserId
        ? conversation.user_two_id
        : conversation.user_one_id;

    // Insert the message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: payload.conversation_id,
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: payload.content.trim(),
        is_read: false,
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `)
      .single();

    if (insertError) {
      return { data: null, error: new Error(insertError.message) };
    }

    return { data: message as Message, error: null };
  } catch (error: any) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Get messages for a conversation
 * Messages are ordered by created_at (oldest first)
 * 
 * @param conversationId - The ID of the conversation
 * @param limit - Optional limit on number of messages to fetch (default: 50)
 * @param offset - Optional offset for pagination (default: 0)
 * @returns Array of messages with joined sender data
 */
export async function getMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: Message[] | null; error: Error | null }> {
  try {
    const currentUserId = await getCurrentUserId();

    // Verify user has access to this conversation
    const { error: accessError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .or(`user_one_id.eq.${currentUserId},user_two_id.eq.${currentUserId}`)
      .single();

    if (accessError) {
      return { data: null, error: new Error('Conversation not found or access denied') };
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: messages as Message[], error: null };
  } catch (error: any) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Mark all unread messages in a conversation as read
 * Only marks messages sent to the current user
 * 
 * @param conversationId - The ID of the conversation
 * @returns Success status
 */
export async function markConversationAsRead(
  conversationId: string
): Promise<{ error: Error | null }> {
  try {
    const currentUserId = await getCurrentUserId();

    // Verify user has access to this conversation
    const { error: accessError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .or(`user_one_id.eq.${currentUserId},user_two_id.eq.${currentUserId}`)
      .single();

    if (accessError) {
      return { error: new Error('Conversation not found or access denied') };
    }

    // Mark all unread messages sent to the current user as read
    const { error: updateError } = await supabase
      .from('messages')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false);

    if (updateError) {
      return { error: new Error(updateError.message) };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

// =====================================================
// REALTIME SUBSCRIPTIONS
// =====================================================

/**
 * Subscribe to new messages in a conversation
 * The callback will be called whenever a new message is inserted
 * 
 * @param conversationId - The ID of the conversation to subscribe to
 * @param callback - Function to call when a new message is received
 * @returns The RealtimeChannel for unsubscribing
 */
export function subscribeToMessages(
  conversationId: string,
  callback: MessageSubscriptionCallback
): RealtimeChannel {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Fetch the full message with sender profile data
        const { data: message } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(*)
          `)
          .eq('id', payload.new.id)
          .single();

        if (message) {
          callback(message as Message);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to conversation updates
 * The callback will be called when conversation metadata changes
 * (e.g., last_message_at, unread_count, etc.)
 * 
 * @param conversationId - The ID of the conversation to subscribe to
 * @param callback - Function to call when conversation is updated
 * @returns The RealtimeChannel for unsubscribing
 */
export function subscribeToConversation(
  conversationId: string,
  callback: ConversationSubscriptionCallback
): RealtimeChannel {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`,
      },
      async (payload) => {
        const conversation = payload.new as Conversation;
        
        // Fetch joined profile data
        const { data } = await supabase
          .from('conversations')
          .select(`
            *,
            other_user_one:profiles!conversations_user_one_id_fkey(*),
            other_user_two:profiles!conversations_user_two_id_fkey(*)
          `)
          .eq('id', conversationId)
          .single();

        if (data) {
          // Get current user ID to compute unread count
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const otherUser = 
              data.user_one_id === user.id
                ? data.other_user_two
                : data.other_user_one;
            
            const unreadCount = 
              data.user_one_id === user.id
                ? data.user_one_unread_count
                : data.user_two_unread_count;

            callback({
              ...data,
              other_user: otherUser,
              unread_count: unreadCount,
            });
          }
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to all conversations for the current user
 * Useful for updating the conversations list in real-time
 * 
 * @param callback - Function to call when any conversation is updated
 * @returns The RealtimeChannel for unsubscribing
 */
export function subscribeToAllConversations(
  callback: (conversation: Conversation) => void
): RealtimeChannel {
  const channel = supabase
    .channel('user_conversations')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'conversations',
      },
      async (payload) => {
        // Refetch all conversations to get updated data
        const result = await getConversations();
        if (result.data) {
          // Call callback for each updated conversation
          result.data.forEach((conv) => callback(conv));
        }
      }
    )
    .subscribe();

  return channel;
}

