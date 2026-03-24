import { ChatWithDetails } from '@/lib/supabase/messaging';
import { ChatListItem } from './ChatListItem';
import { useRouter } from 'next/navigation';

interface ChatListProps {
  chats: ChatWithDetails[];
  currentUserId: string;
  loading?: boolean;
}

export function ChatList({ chats, currentUserId, loading }: ChatListProps) {
  const router = useRouter();

  const handleChatClick = (chatId: string) => {
    router.push(`/chats/${chatId}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center gap-4 p-4 bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-2xl">
              <div className="w-14 h-14 rounded-full bg-[var(--color-charcoal-lighter)]"></div>
              <div className="flex-1">
                <div className="h-4 bg-[var(--color-charcoal-lighter)] rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-[var(--color-charcoal-lighter)] rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-[#6BAF7A]/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-[var(--color-cream)] font-semibold mb-2">No chats yet</p>
        <p className="text-sm text-[var(--color-body-text)]">
          Start a new conversation by clicking the + button above
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--color-charcoal-lighter-plus)]">
      {chats.map((chat, index) => (
        <div
          key={chat.id}
          style={{ animation: `slideDown 0.4s ease-out ${index * 0.05}s forwards`, opacity: 0 }}
        >
          <ChatListItem
            chat={chat}
            onClick={() => chat.id && handleChatClick(chat.id)}
          />
        </div>
      ))}
    </div>
  );
}
