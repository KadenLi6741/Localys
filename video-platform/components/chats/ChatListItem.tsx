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
  const isVerifiedSeller = otherUser?.type === 'business' || otherUser?.type === 'seller';

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
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-4 px-4 py-5 border-b transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] ${
        unreadCount > 0
          ? 'border-b-[#3A3A34] bg-[var(--color-charcoal-light)]/50 hover:bg-[var(--color-charcoal-light)]'
          : 'border-b-[#3A3A34] hover:bg-[var(--color-charcoal-light)]/50'
      }`}
    >
      {/* Avatar with Unread Indicator */}
      <div className={`relative w-14 h-14 rounded-full flex-shrink-0 overflow-hidden ring-2 transition-all duration-200 ${
        unreadCount > 0 
          ? 'ring-[#F5A623] bg-[#F5A623]/10' 
          : 'ring-[var(--color-charcoal-lighter-plus)] bg-[var(--color-charcoal-lighter)]'
      }`}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-body-text)] text-xl font-semibold">
            {displayName[0]?.toUpperCase() || '?'}
          </div>
        )}
        {/* Unread dot indicator */}
        {unreadCount > 0 && (
          <div className="absolute top-0 right-0 w-3 h-3 bg-[#F5A623] rounded-full border border-[var(--color-charcoal)] animate-pulse"></div>
        )}
      </div>

      {/* Chat Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={`font-semibold truncate transition-colors duration-200 ${
            unreadCount > 0 
              ? 'text-[var(--color-cream)] font-bold' 
              : 'text-[var(--color-cream)]'
          }`}>
            {displayName}
          </h3>
          {isVerifiedSeller && (
            <span className="flex items-center gap-1 bg-[#6BAF7A]/20 border border-[#6BAF7A]/40 text-[#6BAF7A] text-xs rounded-full px-2 py-0.5 whitespace-nowrap font-semibold flex-shrink-0">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          )}
        </div>
        <p className={`text-sm truncate transition-colors duration-200 ${
          unreadCount > 0 
            ? 'text-[var(--color-cream)]' 
            : 'text-[var(--color-body-text)]'
        }`}>
          {lastMessageText}
        </p>
      </div>

      {/* Timestamp and Unread Count */}
      <div className="text-right flex-shrink-0">
        {chat.last_message?.created_at && (
          <p className={`text-xs mb-1 transition-colors duration-200 ${
            unreadCount > 0 
              ? 'text-[#F5A623] font-semibold' 
              : 'text-[var(--color-body-text)]'
          }`}>
            {formatTimestamp(chat.last_message.created_at)}
          </p>
        )}
        {unreadCount > 0 && (
          <span className="bg-[#F5A623] text-black text-xs rounded-full px-2.5 py-1 inline-block font-bold shadow-lg shadow-[#F5A623]/30 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </button>
  );
}
