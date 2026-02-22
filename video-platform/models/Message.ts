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
