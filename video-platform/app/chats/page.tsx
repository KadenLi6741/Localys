'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useChats } from '@/hooks/useChats';
import { ChatList } from '@/components/chats/ChatList';
import { NewChatModal } from '@/components/chats/NewChatModal';

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
  const { chats, loading } = useChats(user?.id);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Messages</h1>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="New chat"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chats Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ChatList chats={chats} currentUserId={user?.id || ''} loading={loading} />
      </div>

      {/* New Chat Modal */}
      {user && (
        <NewChatModal
          isOpen={showNewChatModal}
          onClose={() => setShowNewChatModal(false)}
          currentUserId={user.id}
        />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-around py-3">
          <Link href="/" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className="text-white/60 text-xs">Home</span>
          </Link>
          <Link href="/search" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-white/60 text-xs">Search</span>
          </Link>
          <Link href="/upload" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </Link>
          <Link href="/chats" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/chats' ? 'text-white' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className={`text-xs ${pathname === '/chats' ? 'text-white' : 'text-white/60'}`}>Chats</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-white/60 text-xs">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
