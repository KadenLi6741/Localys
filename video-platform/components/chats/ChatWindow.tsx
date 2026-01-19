import { Message } from '@/lib/supabase/messages';
import Link from 'next/link';

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
  messagesEndRef?: React.RefObject<HTMLDivElement>;
}

export function ChatWindow({ messages, currentUserId, loading, messagesEndRef }: ChatWindowProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-white/40">
          <p>No messages yet</p>
          <p className="text-sm mt-2">Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((message) => {
        const isOwn = message.sender_id === currentUserId;
        const sender = message.sender;
        const senderName = sender?.full_name || sender?.username || 'Unknown';
        const senderAvatar = sender?.profile_picture_url;

        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            {!isOwn && (
              <Link 
                href={`/profile/${message.sender_id}`}
                className="flex-shrink-0"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                  {senderAvatar ? (
                    <img
                      src={senderAvatar}
                      alt={senderName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/60 text-sm font-semibold">
                      {senderName[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
              </Link>
            )}

            {/* Message Bubble */}
            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-xs lg:max-w-md`}>
              {!isOwn && (
                <Link 
                  href={`/profile/${message.sender_id}`}
                  className="text-xs text-white/60 mb-1 px-2 hover:text-white/80 transition-colors"
                >
                  {senderName}
                </Link>
              )}
              <div
                className={`px-4 py-2 rounded-lg ${
                  isOwn
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                <p className={`text-xs mt-1 ${isOwn ? 'text-black/60' : 'text-white/60'}`}>
                  {new Date(message.created_at!).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
