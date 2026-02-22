/**
 * User-to-User Messaging System (Wrapper for messages.ts)
 * 
 * This module wraps the messages.ts functions to maintain backward compatibility
 * with existing code while using the correct Supabase schema.
 */

export type { Message, Chat, ChatMember, ChatWithDetails } from './messages';

export { 
  getChats,
  getMessages,
  sendMessage,
  findOneToOneChat,
  getOrCreateOneToOneChat,
  markMessagesAsRead,
  subscribeToMessages,
  searchUsers,
} from './messages';

export { getOrCreateOneToOneChat as getOrCreateConversation } from './messages';
