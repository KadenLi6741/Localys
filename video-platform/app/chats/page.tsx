'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useChats } from '@/hooks/useChats';
import { ChatList } from '@/components/chats/ChatList';
import dynamic from 'next/dynamic';
const NewChatModal = dynamic(() => import('@/components/chats/NewChatModal').then(mod => mod.NewChatModal), { ssr: false });

export default function ChatsPage() {
  return (
    <ProtectedRoute>
      <ChatsContent />
    </ProtectedRoute>
  );
}

function ChatsContent() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { chats, loading, error, refresh } = useChats(user?.id);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="w-full px-4 lg:px-12 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="w-11 h-11 rounded-full bg-surface hover:bg-surface-2 border border-border flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="New chat"
          >
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chats Content */}
      <div className="w-full px-4 lg:px-12 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/50 rounded-[4px]">
            <p className="text-destructive font-semibold mb-2">Error loading chats</p>
            <p className="text-destructive/80 text-sm mb-3">{error.message}</p>
            <button
              onClick={refresh}
              className="px-4 py-2 text-sm font-medium rounded-[4px] bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            >
              Retry
            </button>
          </div>
        )}
        {!error && (
          <ChatList chats={chats} currentUserId={user?.id || ''} loading={loading} />
        )}
      </div>

      {/* New Chat Modal */}
      {user && (
        <NewChatModal
          isOpen={showNewChatModal}
          onClose={() => setShowNewChatModal(false)}
          currentUserId={user.id}
        />
      )}
    </div>
  );
}
