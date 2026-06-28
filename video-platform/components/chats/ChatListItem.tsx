'use client';

import { ChatWithDetails } from '@/lib/supabase/messaging';
import { BadgeCheck } from 'lucide-react';

interface ChatListItemProps {
  chat: ChatWithDetails;
  isActive?: boolean;
  onClick?: () => void;
}

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return '';
  const date = new Date(ts);
  const now = new Date();
  const diffH = (now.getTime() - date.getTime()) / 3_600_000;
  if (diffH < 24) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffH < 168) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ChatListItem({ chat, isActive, onClick }: ChatListItemProps) {
  const other = chat.other_user;
  const name = other?.full_name || other?.username || 'Unknown';
  const avatar = other?.profile_picture_url;
  const preview = chat.last_message?.content ?? null;
  const unread = chat.unread_count || 0;
  const isBusiness = other?.type === 'business' || other?.type === 'seller';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        isActive ? 'bg-orange-50 dark:bg-orange-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
      }`}
    >
      {/* Avatar */}
      <div className="relative h-[44px] w-[44px] shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-300">
            {name[0]?.toUpperCase() || '?'}
          </div>
        )}
        {unread > 0 && (
          <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-[#f97316] dark:border-gray-900" />
        )}
      </div>

      {/* Text block */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <span
              className={`truncate text-[14px] ${
                unread > 0
                  ? 'font-semibold text-gray-900 dark:text-white'
                  : 'font-medium text-gray-800 dark:text-gray-200'
              }`}
            >
              {name}
            </span>
            {isBusiness && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#f97316]" />}
          </div>
          {chat.last_message?.created_at && (
            <span
              className={`shrink-0 text-[11px] ${
                unread > 0 ? 'font-medium text-[#f97316]' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {formatTimestamp(chat.last_message.created_at)}
            </span>
          )}
        </div>
        {preview && (
          <p
            className={`mt-0.5 truncate text-[13px] ${
              unread > 0
                ? 'font-medium text-gray-700 dark:text-gray-300'
                : 'font-normal text-gray-400 dark:text-gray-500'
            }`}
          >
            {preview}
          </p>
        )}
      </div>
    </button>
  );
}
