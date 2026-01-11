'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getMessages, sendMessage, subscribeToMessages, markMessagesAsRead } from '@/lib/supabase/messages';
import { supabase } from '@/lib/supabase/client';

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
  const conversationId = params.id as string;
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (user && conversationId) {
      loadMessages();
      subscribeToNewMessages();
      markMessagesAsRead(conversationId, user.id);
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await getMessages(conversationId);
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNewMessages = () => {
    subscriptionRef.current = subscribeToMessages(conversationId, (message) => {
      setMessages(prev => [...prev, message]);
      if (user && message.sender_id !== user.id) {
        markMessagesAsRead(conversationId, user.id);
      }
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !conversationId) return;

    try {
      const { data, error } = await sendMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id: '', // Will be set by backend based on conversation
        message_text: newMessage.trim(),
        is_read: false,
      });

      if (error) throw error;
      if (data) {
        setMessages(prev => [...prev, data]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Chat</h1>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender_id === user?.id;
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isOwn
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white'
                }`}
              >
                <p className="text-sm">{message.message_text}</p>
                <p className={`text-xs mt-1 ${isOwn ? 'text-black/60' : 'text-white/60'}`}>
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="sticky bottom-0 bg-black/80 backdrop-blur-md border-t border-white/10 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed hover:bg-white/90 transition-all duration-200 active:scale-95"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}




