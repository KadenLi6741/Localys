import { ChatWithDetails } from '@/lib/supabase/messaging';
import { ChatListItem } from './ChatListItem';

interface ChatListProps {
  chats: ChatWithDetails[];
  currentUserId: string;
  loading?: boolean;
  activeChatId?: string | null;
  onSelect: (chatId: string) => void;
}

export function ChatList({ chats, loading, activeChatId, onSelect }: ChatListProps) {
  if (loading) {
    return (
      <div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-3">
            <div className="h-11 w-11 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No conversations yet</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Use the button above to start one
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {chats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          isActive={chat.id === activeChatId}
          onClick={() => chat.id && onSelect(chat.id)}
        />
      ))}
    </div>
  );
}
