'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext';
import { ChatWindow } from '@/components/chats/ChatWindow';

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatContent />
    </ProtectedRoute>
  );
}

function ChatContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { markChatAsRead } = useUnreadMessages();
  
  const { messages, loading, sending, send } = useMessages(chatId, user?.id);

  // Mark chat as read immediately on mount
  useEffect(() => {
    if (chatId) {
      markChatAsRead(chatId);
    }
  }, [chatId, markChatAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const result = await send(newMessage);
    if (result.success) {
      setNewMessage('');
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-white text-[#1A1A1A] flex flex-col">
      {/* Header */}
      <div className="shrink-0 z-10 bg-white/80 backdrop-blur-md border-b border-[#E8E8E4] px-4 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-[#1A1A1A]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Chat</h1>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ChatWindow 
          messages={messages} 
          currentUserId={user?.id || ''} 
          loading={loading}
          messagesEndRef={messagesEndRef}
        />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="shrink-0 bg-white/80 backdrop-blur-md border-t border-[#E8E8E4] p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 bg-[#F8F8F6] border border-[#E8E8E4] rounded-lg px-4 py-3 text-[#1A1A1A] placeholder-[#9E9A90] focus:outline-none focus:border-[#1A1A1A]/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-[#1A1A1A] text-white px-6 py-3 rounded-lg font-semibold disabled:bg-[#E8E8E4] disabled:text-[#9E9A90] disabled:cursor-not-allowed hover:bg-[#1A1A1A]/90 transition-all duration-200 active:scale-95"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}




