import { ChatWithDetails } from '@/lib/supabase/messages';
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
            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="w-14 h-14 rounded-full bg-white/10"></div>
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-2/3"></div>
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
        <p className="text-white/60 mb-4">No chats yet</p>
        <p className="text-sm text-white/40">
          Start a new conversation by clicking the + button above
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          onClick={() => handleChatClick(chat.id!)}
        />
      ))}
    </div>
  );
}
