'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Send } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useChats } from '@/hooks/useChats';
import { useMessages } from '@/hooks/useMessages';
import { ChatList } from '@/components/chats/ChatList';
import { ChatWindow } from '@/components/chats/ChatWindow';
import dynamic from 'next/dynamic';

const NewChatModal = dynamic(
  () => import('@/components/chats/NewChatModal').then((m) => m.NewChatModal),
  { ssr: false }
);

export default function ChatsPage() {
  return (
    <ProtectedRoute>
      <ChatsLayout />
    </ProtectedRoute>
  );
}

function ChatsLayout() {
  const { user } = useAuth();
  const router = useRouter();
  const { chats, loading } = useChats(user?.id);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [query, setQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { messages, loading: msgLoading, sending, send } = useMessages(
    activeChatId ?? undefined,
    user?.id
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredChats = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return chats;
    return chats.filter((c) => {
      const u = c.other_user;
      return (
        u?.username?.toLowerCase().includes(s) ||
        u?.full_name?.toLowerCase().includes(s)
      );
    });
  }, [query, chats]);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const activeUser = activeChat?.other_user;

  const isDesktop = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const handleSelect = (chatId: string) => {
    if (isDesktop()) {
      setActiveChatId(chatId);
    } else {
      router.push(`/chats/${chatId}`);
    }
  };

  const handleChatCreated = (chatId: string) => {
    setShowNewChat(false);
    if (isDesktop()) {
      setActiveChatId(chatId);
    } else {
      router.push(`/chats/${chatId}`);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    const result = await send(newMessage);
    if (result.success) setNewMessage('');
  };

  return (
    <div
      className="flex bg-white text-gray-900 dark:bg-[#1A1A18] dark:text-white"
      style={{ height: 'calc(100dvh - 108px)' }}
    >
      {/* ── LEFT COLUMN: conversation list ── */}
      <div className="flex w-full shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 lg:w-[320px]">

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 px-5 py-4">
          <span className="text-[15px] font-semibold text-gray-900 dark:text-white">Messages</span>
          <button
            type="button"
            onClick={() => setShowNewChat(true)}
            aria-label="New message"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f97316] text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search conversations"
              className="w-full rounded-xl border-0 bg-gray-100 py-2 pl-9 pr-3 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto border-t border-gray-100 dark:border-gray-800">
          <ChatList
            chats={filteredChats}
            currentUserId={user?.id || ''}
            loading={loading}
            activeChatId={activeChatId}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* ── RIGHT PANEL: open chat or empty state (desktop only) ── */}
      <div className="hidden flex-1 flex-col lg:flex">
        {activeChatId && activeChat ? (
          <>
            {/* Chat header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                {activeUser?.profile_picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeUser.profile_picture_url}
                    alt={activeUser.full_name || activeUser.username || ''}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[13px] font-medium text-gray-500">
                    {(activeUser?.full_name || activeUser?.username || '?')[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-gray-900 dark:text-white">
                  {activeUser?.full_name || activeUser?.username || 'Chat'}
                </p>
                {activeUser?.username && activeUser.full_name && (
                  <p className="text-[12px] text-gray-400 dark:text-gray-500">
                    @{activeUser.username}
                  </p>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto">
              <ChatWindow
                messages={messages}
                currentUserId={user?.id || ''}
                loading={msgLoading}
                messagesEndRef={messagesEndRef}
              />
            </div>

            {/* Input bar */}
            <form
              onSubmit={handleSend}
              className="flex shrink-0 items-center gap-3 border-t border-gray-200 px-5 py-3 dark:border-gray-800"
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
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gray-900 dark:border-gray-200">
              <Send className="h-9 w-9 -rotate-12 text-gray-900 dark:text-gray-200" />
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">Your messages</p>
              <p className="mt-2 max-w-xs text-sm font-normal text-gray-500 dark:text-gray-400">
                Send private photos and messages to a friend or group
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewChat(true)}
              className="rounded-xl bg-[#f97316] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Send message
            </button>
          </div>
        )}
      </div>

      {user && (
        <NewChatModal
          isOpen={showNewChat}
          onClose={() => setShowNewChat(false)}
          currentUserId={user.id}
          onChatCreated={handleChatCreated}
        />
      )}
    </div>
  );
}
