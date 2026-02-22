'use client';

/**
 * ChatWindow Component
 * 
 * Displays a conversation with message history and input field.
 * Handles sending messages and listening for real-time updates.
 * 
 * Features:
 * - Real-time message updates using Supabase Realtime
 * - Auto-scroll to latest message
 * - Mark messages as read when viewing
 * - Message input with send button
 * - Displays sender info and timestamps
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMessages,
  sendMessage,
  subscribeToMessages,
  markConversationAsRead,
  getConversation,
  Message,
  Conversation,
} from '@/lib/supabase/messaging';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatWindowProps {
  conversationId: string;
  onBack?: () => void;
}

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user || !conversationId) return;

    loadConversation();
    loadMessages();
    subscribeToNewMessages();
    markAsRead();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (conversationId && user) {
      markAsRead();
    }
  }, [conversationId, user]);

  const loadConversation = async () => {
    const { data, error: err } = await getConversation(conversationId);
    if (err) {
      setError(err.message);
      return;
    }
    setConversation(data);
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await getMessages(conversationId);

      if (err) {
        setError(err.message);
        return;
      }

      setMessages(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNewMessages = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = subscribeToMessages(conversationId, (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      if (message.sender_id !== user?.id) {
        markAsRead();
      }
    });
  };

  const markAsRead = async () => {
    if (!conversationId || !user) return;
    await markConversationAsRead(conversationId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const { data, error: err } = await sendMessage({
        conversation_id: conversationId,
        content: messageContent,
      });

      if (err) {
        setError(err.message);
        setNewMessage(messageContent);
        return;
      }

      if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) {
            return prev;
          }
          return [...prev, data];
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = 
      date.toDateString() === new Date(now.getTime() - 86400000).toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <button
          onClick={loadMessages}
          className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="text-white hover:text-white/80 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-3 flex-1">
            {conversation?.other_user?.avatar_url ? (
              <img
                src={conversation.other_user.avatar_url}
                alt={conversation.other_user.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <span className="font-semibold">
                  {conversation?.other_user?.username?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div>
              <h1 className="font-bold">
                {conversation?.other_user?.full_name || conversation?.other_user?.username || 'Unknown User'}
              </h1>
              {conversation?.other_user?.username && (
                <p className="text-sm text-gray-400">@{conversation.other_user.username}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/20 text-red-400 px-4 py-2 text-sm border-b border-red-500/30">
          {error}
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isOwn && message.sender && (
                    <span className="text-xs text-gray-400 mb-1 px-1">
                      {message.sender.full_name || message.sender.username}
                    </span>
                  )}
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isOwn
                        ? 'bg-white text-black rounded-br-none'
                        : 'bg-white/10 text-white rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-xs ${isOwn ? 'text-black/60' : 'text-white/60'}`}>
                        {formatTimestamp(message.created_at)}
                      </span>
                      {isOwn && (
                        <span className={`text-xs ${isOwn ? 'text-black/60' : 'text-white/60'}`}>
                          {message.is_read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSendMessage}
        className="sticky bottom-0 bg-black/80 backdrop-blur-md border-t border-white/10 p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed hover:bg-white/90 transition-all duration-200 active:scale-95"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

