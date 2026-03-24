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
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext';
import {
  getMessages,
  sendMessage,
  subscribeToMessages,
  getConversation,
  editMessage,
  deleteMessage,
  Message,
  Conversation,
} from '@/lib/supabase/messaging';
import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatWindowProps {
  conversationId: string;
  onBack?: () => void;
}

export default function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const { user } = useAuth();
  const { markChatAsRead } = useUnreadMessages();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const updateSubscriptionRef = useRef<RealtimeChannel | null>(null);

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
      if (updateSubscriptionRef.current) {
        updateSubscriptionRef.current.unsubscribe();
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
    if (updateSubscriptionRef.current) {
      updateSubscriptionRef.current.unsubscribe();
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

    // Also listen for message updates (edits and deletes)
    updateSubscriptionRef.current = supabase
      .channel(`chat_updates:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
          );
        }
      )
      .subscribe();
  };

  const markAsRead = async () => {
    if (!conversationId || !user) return;
    await markChatAsRead(conversationId);
  };

  const handleEditStart = (message: Message) => {
    setEditingId(message.id || null);
    setEditingContent(message.content);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const handleEditSave = async (messageId: string | undefined) => {
    if (!messageId || !editingContent.trim()) return;

    try {
      const { data, error: err } = await editMessage(messageId, editingContent.trim());
      if (err) {
        setError('Failed to edit message');
        return;
      }

      // Update message locally
      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? data : m))
        );
      }

      handleEditCancel();
    } catch (err: any) {
      setError(err.message || 'Failed to edit message');
    }
  };

  const handleDelete = async (messageId: string | undefined) => {
    if (!messageId) return;

    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const { error: err } = await deleteMessage(messageId);
      if (err) {
        setError('Failed to delete message');
        return;
      }

      // Update message locally
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, deleted: true, content: '[Message deleted]' } : m
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to delete message');
    }
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
    <div className="flex flex-col h-full bg-transparent text-[var(--text-primary)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-charcoal)]/80 backdrop-blur-md border-b border-[var(--glass-border)] px-4 py-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors"
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
              <div className="w-10 h-10 rounded-full bg-[var(--glass-bg)] flex items-center justify-center">
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
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            const isEditing = editingId === message.id;
            return (
              <div
                key={message.id}
                className={`flex py-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
                onMouseEnter={() => setHoveredMessageId(message.id || null)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                <div className={`max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isOwn && message.sender && (
                    <span className="text-xs text-gray-400 mb-1 px-1">
                      {message.sender.full_name || message.sender.username}
                    </span>
                  )}
                  <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {isEditing ? (
                      <div className="max-w-xs lg:max-w-md">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--glass-bg-strong)] text-[var(--text-primary)] placeholder-[var(--placeholder)] focus:outline-none focus:bg-[var(--glass-bg-strong)]"
                          rows={2}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleEditSave(message.id)}
                            className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          isOwn
                            ? 'bg-white text-black rounded-br-none'
                            : 'bg-[var(--glass-bg)] text-[var(--text-primary)] rounded-bl-none'
                        }`}
                      >
                        <p className={`text-sm whitespace-pre-wrap break-words ${message.deleted ? 'italic text-gray-400' : ''}`}>
                          {message.content}
                        </p>
                        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-xs ${isOwn ? 'text-black/60' : 'text-[var(--text-tertiary)]'}`}>
                            {formatTimestamp(message.created_at || '')}
                          </span>
                          {message.edited_at && (
                            <span className={`text-xs ${isOwn ? 'text-black/60' : 'text-[var(--text-tertiary)]'}`}>
                              (edited)
                            </span>
                          )}
                          {isOwn && (
                            <span className={`text-xs ${isOwn ? 'text-black/60' : 'text-[var(--text-tertiary)]'}`}>
                              {message.is_read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {isOwn && hoveredMessageId === message.id && !isEditing && !message.deleted && (
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === message.id ? null : message.id || null)}
                          className="text-xs px-2 py-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] rounded transition-colors"
                          title="Message options"
                        >
                          ⋯
                        </button>
                        {menuOpenId === message.id && (
                          <div className="absolute top-full mt-1 right-0 bg-[var(--glass-bg)] backdrop-blur-sm border border-[var(--glass-border)] rounded-lg shadow-lg z-50">
                            <button
                              onClick={() => {
                                handleEditStart(message);
                                setMenuOpenId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)] flex items-center gap-2 hover:text-blue-400 transition-colors"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(message.id);
                                setMenuOpenId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)] flex items-center gap-2 hover:text-red-400 transition-colors border-t border-[var(--glass-border)]"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
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
        className="sticky bottom-0 bg-[var(--color-charcoal)]/80 backdrop-blur-md border-t border-[var(--glass-border)] p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--glass-border-focus)] disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold disabled:bg-[var(--glass-bg-strong)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed hover:bg-white/90 transition-all duration-200 active:scale-95"
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

