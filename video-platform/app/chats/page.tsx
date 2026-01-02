'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getConversations, getOrCreateConversation } from '@/lib/supabase/messages';
import { supabase } from '@/lib/supabase/client';

export default function ChatsPage() {
  return (
    <ProtectedRoute>
      <ChatsContent />
    </ProtectedRoute>
  );
}

function ChatsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await getConversations(user.id);
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = async (conversation: any) => {
    router.push(`/chats/${conversation.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>
      </div>

      {/* Chats Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/60 mb-4">No conversations yet</p>
            <p className="text-sm text-white/40">Start chatting with businesses from the home feed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => {
              const otherUser = conversation.user_id === user?.id 
                ? conversation.business 
                : conversation.user;
              const unreadCount = conversation.user_id === user?.id
                ? conversation.unread_count_user
                : conversation.unread_count_business;

              return (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200 cursor-pointer active:scale-98"
                >
                  <div className="w-14 h-14 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                    {otherUser?.profile_picture_url ? (
                      <img
                        src={otherUser.profile_picture_url}
                        alt={otherUser.business_name || otherUser.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60">
                        {otherUser?.business_name?.[0] || otherUser?.full_name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1 truncate">
                      {otherUser?.business_name || otherUser?.full_name || 'Unknown'}
                    </h3>
                    <p className="text-sm text-white/60 truncate">
                      {conversation.last_message?.message_text || 'No messages yet'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {conversation.last_message_at && (
                      <p className="text-xs text-white/40 mb-1">
                        {new Date(conversation.last_message_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    )}
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 inline-block">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
