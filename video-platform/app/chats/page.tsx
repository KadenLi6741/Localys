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
  const { chats, loading, error } = useChats(user?.id);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-charcoal)] text-[var(--color-cream)] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-charcoal)]/80 backdrop-blur-md border-b border-[var(--color-charcoal-lighter-plus)]">
        <div className="w-full px-4 lg:px-12 py-4 flex items-center justify-between">
          <h1 className="entrance-slide text-2xl font-bold text-[var(--color-cream)]" style={{ animation: 'slideInLeft 0.4s ease-out forwards', opacity: 0 }}>Messages</h1>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="entrance-scale w-11 h-11 rounded-full bg-[var(--color-charcoal-light)] hover:bg-[var(--color-charcoal-lighter)] border border-[var(--color-charcoal-lighter-plus)] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-charcoal)]"
            style={{ animation: 'scaleIn 0.3s ease-out 0.15s forwards', opacity: 0 }}
            aria-label="New chat"
          >
            <svg className="w-6 h-6 text-[var(--color-cream)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chats Content */}
      <div className="w-full px-4 lg:px-12 py-8">
        {error && (
          <div className="entrance-fade mb-6 p-4 bg-[#E05C3A]/10 border border-[#E05C3A]/50 rounded-xl" style={{ animation: 'fadeInUp 0.4s ease-out forwards', opacity: 0 }}>
            <p className="text-[#E05C3A] font-semibold mb-2">Error loading chats</p>
            <p className="text-[#E05C3A]/80 text-sm">{error.message}</p>
          </div>
        )}
        <div className="entrance-fade" style={{ animation: 'fadeInUp 0.4s ease-out 0.1s forwards', opacity: 0 }}>
          <ChatList chats={chats} currentUserId={user?.id || ''} loading={loading} />
        </div>
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
