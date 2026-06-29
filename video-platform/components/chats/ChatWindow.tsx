'use client';

/**
 * ChatWindow — the message transcript pane for an open conversation.
 * Purpose: Renders the list of messages (sender-aligned bubbles) and lets the user edit or delete
 *   their own messages inline. Auto-scroll is handled by the parent via messagesEndRef.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { Message } from '@/lib/supabase/messages';
import Link from 'next/link';
import { useState } from 'react';
import { editMessage, deleteMessage } from '@/lib/supabase/messages';

interface Sender {
  id: string;
  username?: string;
  full_name?: string;
  profile_picture_url?: string;
}

interface MessageWithSender extends Message {
  sender?: Sender;
}

interface ChatWindowProps {
  messages: MessageWithSender[];
  currentUserId: string;
  loading?: boolean;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
}

export function ChatWindow({ messages, currentUserId, loading, messagesEndRef }: ChatWindowProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleEditStart = (msg: MessageWithSender) => {
    setEditingId(msg.id || null);
    setEditingContent(msg.content);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const handleEditSave = async (id: string | undefined) => {
    if (!id || !editingContent.trim()) return;
    const { error: err } = await editMessage(id, editingContent.trim());
    if (err) { setError('Failed to edit message'); return; }
    handleEditCancel();
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id || !confirm('Delete this message?')) return;
    const { error: err } = await deleteMessage(id);
    if (err) setError('Failed to delete message');
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#f97316]" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm font-normal text-gray-400 dark:text-gray-500">No messages yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-4 py-4">
      {error && (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {messages.map((msg) => {
        const isOwn = msg.sender_id === currentUserId;
        const sender = msg.sender;
        const senderName = sender?.full_name || sender?.username || 'Unknown';
        const isEditing = editingId === msg.id;

        return (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
            onMouseEnter={() => setHoveredId(msg.id || null)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Other user avatar */}
            {!isOwn && (
              <Link
                href={`/profile/${sender?.username || msg.sender_id}`}
                className="mb-0.5 shrink-0"
              >
                <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gray-200 transition-opacity hover:opacity-80 dark:bg-gray-700">
                  {sender?.profile_picture_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sender.profile_picture_url}
                      alt={senderName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-300">
                      {senderName[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
              </Link>
            )}

            {/* Bubble column */}
            <div className={`flex max-w-[72%] flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
              {isEditing ? (
                <div className="w-full min-w-[200px]">
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={2}
                    aria-label="Edit message"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-normal text-gray-900 placeholder-gray-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <div className="mt-1.5 flex gap-2">
                    <button
                      onClick={() => handleEditSave(msg.id)}
                      className="rounded-lg bg-[#f97316] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`group relative rounded-2xl px-3.5 py-2 ${
                    isOwn
                      ? 'rounded-br-md bg-[#f97316] text-white'
                      : 'rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                  } ${msg.deleted ? 'opacity-50' : ''}`}
                >
                  <p
                    className={`text-[14px] font-normal leading-snug break-words whitespace-pre-wrap ${
                      msg.deleted ? 'italic' : ''
                    }`}
                  >
                    {msg.content}
                  </p>
                </div>
              )}

              {/* Timestamp — below the bubble */}
              {!isEditing && (
                <span
                  className={`text-[11px] font-normal ${
                    isOwn ? 'text-gray-400 dark:text-gray-500' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {new Date(msg.created_at!).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {msg.edited_at && ' · edited'}
                </span>
              )}
            </div>

            {/* 3-dot menu for own messages */}
            {isOwn && hoveredId === msg.id && !isEditing && !msg.deleted && (
              <div className="relative mb-5 flex shrink-0 items-center">
                <button
                  onClick={() =>
                    setMenuOpenId(menuOpenId === msg.id ? null : msg.id || null)
                  }
                  aria-label="Message options"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <circle cx="8" cy="2" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="14" r="1.5" />
                  </svg>
                </button>
                {menuOpenId === msg.id && (
                  <div className="absolute bottom-full right-0 z-50 mb-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <button
                      onClick={() => {
                        handleEditStart(msg);
                        setMenuOpenId(null);
                      }}
                      className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm font-normal text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(msg.id);
                        setMenuOpenId(null);
                      }}
                      className="block w-full whitespace-nowrap border-t border-gray-100 px-4 py-2 text-left text-sm font-normal text-red-500 transition-colors hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-950/30"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
}
