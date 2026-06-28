'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Send } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { useChats } from '@/hooks/useChats';
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

  const { messages, loading, sending, send } = useMessages(chatId, user?.id);
  const { chats } = useChats(user?.id);
  const chat = chats.find((c) => c.id === chatId);
  const other = chat?.other_user;
  const displayName = other?.full_name || other?.username || 'Chat';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    const result = await send(newMessage);
    if (result.success) setNewMessage('');
  };

  return (
    <div
      className="flex flex-col bg-white text-gray-900 dark:bg-[#1A1A18] dark:text-white"
      style={{ height: 'calc(100dvh - 108px)' }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-[#1A1A18]">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Avatar */}
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          {other?.profile_picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={other.profile_picture_url}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-500">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-gray-900 dark:text-white">
            {displayName}
          </p>
          {other?.username && other.full_name && (
            <p className="text-[12px] text-gray-400">@{other.username}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <ChatWindow
          messages={messages}
          currentUserId={user?.id || ''}
          loading={loading}
          messagesEndRef={messagesEndRef}
        />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="flex shrink-0 items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#1A1A18]"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Message..."
          disabled={sending}
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-[13px] text-gray-900 placeholder-gray-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-white transition hover:opacity-90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
