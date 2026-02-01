/**
 * User-to-User Messaging System (Wrapper for messages.ts)
 * 
 * This module wraps the messages.ts functions to maintain backward compatibility
 * with existing code while using the correct Supabase schema.
 */

// Re-export types from messages.ts
export type { Message, Chat, ChatMember, ChatWithDetails } from './messages';

// Re-export functions from messages.ts
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

// Aliases for backward compatibility
export { getOrCreateOneToOneChat as getOrCreateConversation } from './messages';
