/**
 * TypeScript types for the messaging system
 */

export interface Conversation {
  id: string;
  title?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  is_admin: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content?: string;
  content_type: 'text' | 'attachment' | 'system';
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface MessageRead {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface ConversationWithMembers extends Conversation {
  members?: ConversationMember[];
  unread_count?: number;
  last_message?: Message;
}

export interface MessageWithSender extends Message {
  sender?: {
    id: string;
    username?: string;
    full_name?: string;
    profile_picture_url?: string;
  };
}
