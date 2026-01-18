/**
 * ChatWindow component - displays messages in a conversation
 * Handles real-time updates, scrolling, and message rendering
 */

'use client';

import { useRef, useEffect } from 'react';
import { useMessages } from '@/hooks/useMessages';
import type { MessageWithSender } from '@/types/messaging';

interface ChatWindowProps {
  conversationId: string;
  userId: string;
  onLoadMore?: () => void;
}

export function ChatWindow({ conversationId, userId }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
  } = useMessages({
    conversationId,
    userId,
    pageSize: 50,
    autoMarkAsRead: true,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleScroll = () => {
    if (!messagesContainerRef.current || !hasMore) return;

    const { scrollTop } = messagesContainerRef.current;
    
    // Load more messages when scrolled to top
    if (scrollTop === 0) {
      loadMore();
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">
          Error loading messages: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {hasMore && (
        <div className="text-center">
          <button
            onClick={loadMore}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Load older messages
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No messages yet. Start the conversation!
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender_id === userId}
          />
        ))
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const bubbleClass = isOwn
    ? 'bg-blue-600 text-white ml-auto'
    : 'bg-gray-200 text-gray-900';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${bubbleClass}`}>
        {!isOwn && message.sender && (
          <div className="text-xs font-semibold mb-1 opacity-75">
            {message.sender.full_name || message.sender.username || 'Unknown'}
          </div>
        )}
        
        {message.content_type === 'text' && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {message.content_type === 'attachment' && message.attachments && (
          <div className="space-y-2">
            {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
            {message.attachments.map((attachment: any, index: number) => (
              <div key={index} className="text-sm">
                📎 {attachment.name}
              </div>
            ))}
          </div>
        )}

        {message.content_type === 'system' && (
          <p className="italic text-sm">{message.content}</p>
        )}

        <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
