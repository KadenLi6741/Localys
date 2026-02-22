import type { Message, ChatWithDetails } from '../models/Message';
import {
  getChats,
  getMessages,
  sendMessage,
  findOneToOneChat,
  getOrCreateOneToOneChat,
  markMessagesAsRead,
  subscribeToMessages,
  searchUsers,
} from '../lib/supabase/messages';

export class MessageService {
  async getChats(userId: string): Promise<{ data: ChatWithDetails[] | null; error: Error | null }> {
    return getChats(userId);
  }

  async getMessages(chatId: string) {
    return getMessages(chatId);
  }

  async sendMessage(message: Omit<Message, 'id' | 'created_at'>) {
    return sendMessage(message);
  }

  async findOneToOneChat(userId1: string, userId2: string) {
    return findOneToOneChat(userId1, userId2);
  }

  async getOrCreateOneToOneChat(userId1: string, userId2: string) {
    return getOrCreateOneToOneChat(userId1, userId2);
  }

  async markMessagesAsRead(chatId: string, userId: string) {
    return markMessagesAsRead(chatId, userId);
  }

  subscribeToMessages(chatId: string, callback: (message: Message) => void) {
    return subscribeToMessages(chatId, callback);
  }

  async searchUsers(query: string, currentUserId: string) {
    return searchUsers(query, currentUserId);
  }
}

export const messageService = new MessageService();
