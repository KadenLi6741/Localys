export interface Message {
  id?: string;
  chat_id?: string;
  conversation_id?: string;
  sender_id?: string;
  content: string;
  created_at?: string;
  edited_at?: string;
  deleted?: boolean;
  is_read?: boolean;
  reply_to?: string;
  metadata?: any;
  sender?: {
    id: string;
    username?: string;
    full_name?: string;
    profile_picture_url?: string;
  };
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

export interface Conversation extends Chat {
  last_message_at?: string;
  last_message_text?: string;
  unread_count?: number;
  members?: ChatMember[];
  other_user?: {
    id: string;
    username?: string;
    full_name?: string;
    profile_picture_url?: string;
    avatar_url?: string;
  };
}
