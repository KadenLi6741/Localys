import { ChatWithDetails } from '@/lib/supabase/messages';

interface ChatListItemProps {
  chat: ChatWithDetails;
  onClick?: () => void;
}

export function ChatListItem({ chat, onClick }: ChatListItemProps) {
  const otherUser = chat.other_user;
  const displayName = otherUser?.full_name || otherUser?.username || 'Unknown User';
  const avatarUrl = otherUser?.profile_picture_url;
  const lastMessageText = chat.last_message?.content || 'No messages yet';
  const unreadCount = chat.unread_count || 0;

  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200 cursor-pointer active:scale-98"
    >
      {/* Avatar */}
      <div className="w-14 h-14 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/60 text-xl font-semibold">
            {displayName[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      {/* Chat Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold mb-1 truncate">{displayName}</h3>
        <p className="text-sm text-white/60 truncate">
          {lastMessageText}
        </p>
      </div>

      {/* Timestamp and Unread Count */}
      <div className="text-right flex-shrink-0">
        {chat.last_message?.created_at && (
          <p className="text-xs text-white/40 mb-1">
            {formatTimestamp(chat.last_message.created_at)}
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
}
