# Supabase User Messaging System

A complete, production-ready user-to-user messaging system built with Supabase, featuring real-time updates, Row Level Security, and TypeScript support.

## Features

✅ **1-to-1 User Messaging** - Direct messages between authenticated users  
✅ **Real-time Updates** - Messages appear instantly using Supabase Realtime  
✅ **Row Level Security** - Secure access control with RLS policies  
✅ **Unread Counts** - Track unread messages per conversation  
✅ **TypeScript Support** - Full type safety throughout  
✅ **Production Ready** - Error handling, pagination, and best practices

## Database Schema

### Tables

1. **profiles** - User profile information linked to `auth.users`
2. **conversations** - 1-to-1 conversations between two users
3. **messages** - Individual messages within conversations

### Key Design Decisions

- **Ordered User IDs**: Conversations store users in lexicographic order (`user_one_id < user_two_id`) to ensure uniqueness and simplify queries
- **Unread Counts**: Stored at conversation level for efficient queries
- **Automatic Updates**: Triggers automatically update conversation metadata when messages are created/read
- **UUIDs**: All IDs use UUIDs for security and distributed system compatibility

## Setup Instructions

### 1. Run SQL Migrations

Execute the SQL files in your Supabase SQL editor:

1. **Schema Migration** (`supabase/migrations/001_user_messaging_schema.sql`)
   - Creates tables, indexes, functions, and triggers
   - Run this first

2. **RLS Policies** (`supabase/migrations/002_user_messaging_rls.sql`)
   - Enables Row Level Security
   - Creates security policies
   - Enables realtime subscriptions
   - Run after schema migration

### 2. Enable Realtime

The RLS migration enables realtime for `messages` and `conversations` tables. Ensure Realtime is enabled in your Supabase dashboard:

1. Go to Database → Replication
2. Enable replication for `messages` and `conversations` tables

### 3. Install Dependencies

The system uses the Supabase JavaScript client:

```bash
npm install @supabase/supabase-js
```

### 4. Configure Supabase Client

Ensure your Supabase client is configured with proper credentials:

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

## Usage Examples

### Creating or Getting a Conversation

```typescript
import { getOrCreateConversation } from '@/lib/supabase/messaging';

// Get or create a conversation with optional first message
const { data: conversation, error } = await getOrCreateConversation(
  otherUserId,
  'Hello! This is my first message.'
);

if (conversation) {
  console.log('Conversation ID:', conversation.id);
  console.log('Other user:', conversation.other_user);
  console.log('Unread count:', conversation.unread_count);
}
```

### Sending a Message

```typescript
import { sendMessage } from '@/lib/supabase/messaging';

const { data: message, error } = await sendMessage({
  conversation_id: conversationId,
  content: 'Hello, how are you?',
});

if (message) {
  console.log('Message sent:', message.id);
}
```

### Fetching Messages

```typescript
import { getMessages } from '@/lib/supabase/messaging';

// Get messages with pagination
const { data: messages, error } = await getMessages(
  conversationId,
  50, // limit
  0   // offset
);
```

### Real-time Message Subscription

```typescript
import { subscribeToMessages } from '@/lib/supabase/messaging';

const channel = subscribeToMessages(conversationId, (message) => {
  console.log('New message received:', message);
  // Update your UI with the new message
});

// Cleanup when done
// channel.unsubscribe();
```

### Getting All Conversations

```typescript
import { getConversations } from '@/lib/supabase/messaging';

const { data: conversations, error } = await getConversations();

// Each conversation includes:
// - other_user: Profile of the other participant
// - unread_count: Number of unread messages for current user
// - last_message_text: Preview of last message
// - last_message_at: Timestamp of last message
```

### Marking Messages as Read

```typescript
import { markConversationAsRead } from '@/lib/supabase/messaging';

// Mark all unread messages in a conversation as read
await markConversationAsRead(conversationId);
```

## React Components

### ChatList

Displays all conversations for the current user:

```tsx
import ChatList from '@/components/messaging/ChatList';

function MessagesPage() {
  return (
    <ChatList
      onSelectConversation={(conversationId) => {
        // Handle conversation selection
      }}
    />
  );
}
```

### ChatWindow

Displays a conversation with message history and input:

```tsx
import ChatWindow from '@/components/messaging/ChatWindow';

function ChatPage({ conversationId }) {
  return (
    <ChatWindow
      conversationId={conversationId}
      onBack={() => router.back()}
    />
  );
}
```

### NewConversationButton

Button to start a new conversation:

```tsx
import NewConversationButton from '@/components/messaging/NewConversationButton';

function MessagesPage() {
  return (
    <NewConversationButton
      onConversationCreated={(conversationId) => {
        router.push(`/chats/${conversationId}`);
      }}
    />
  );
}
```

## Security Features

### Row Level Security Policies

- **Profiles**: Users can read all profiles but only update their own
- **Conversations**: Users can only access conversations they're part of
- **Messages**: Users can only read messages from their conversations and send messages as themselves

### Authentication Required

All operations require an authenticated user. The system uses `auth.uid()` to verify access.

## Best Practices

1. **Always check for errors** - All functions return `{ data, error }` objects
2. **Clean up subscriptions** - Unsubscribe from real-time channels when components unmount
3. **Mark messages as read** - Call `markConversationAsRead` when user views a conversation
4. **Handle pagination** - Use limit/offset for large message histories
5. **Error boundaries** - Wrap messaging components in error boundaries for production

## Database Functions

### `get_or_create_conversation(user_one_id, user_two_id)`

Helper function that ensures proper user ordering and conversation uniqueness. This function:
- Automatically orders user IDs (user_one < user_two)
- Returns existing conversation if found
- Creates new conversation if it doesn't exist
- Returns the conversation UUID

## Troubleshooting

### Messages not appearing in real-time

1. Check that Realtime is enabled for `messages` table in Supabase dashboard
2. Verify RLS policies allow the user to read messages
3. Ensure the subscription is properly set up and not unsubscribed

### "Unauthorized" errors

1. Verify user is authenticated: `await supabase.auth.getUser()`
2. Check RLS policies are correctly configured
3. Ensure user is part of the conversation they're trying to access

### Unread counts not updating

1. Check that triggers are installed: `messages_update_conversation` and `messages_update_read_status`
2. Verify RLS policies allow updates to conversations table
3. Ensure `markConversationAsRead` is being called when viewing conversations

## Type Definitions

See `lib/supabase/messaging.ts` for complete TypeScript type definitions:

- `Profile` - User profile data
- `Conversation` - Conversation with joined user data
- `Message` - Message with sender information
- `SendMessagePayload` - Payload for sending messages
- `MessageSubscriptionCallback` - Real-time subscription callback type

## Performance Considerations

- **Indexes**: All foreign keys and commonly queried fields are indexed
- **Pagination**: Use limit/offset when fetching message history
- **Real-time**: Subscriptions are lightweight and use PostgreSQL logical replication
- **Unread Counts**: Stored at conversation level to avoid counting queries

## Future Enhancements

Potential additions to consider:

- Message reactions/emojis
- File attachments
- Typing indicators
- Message editing/deletion
- Read receipts per message
- Push notifications
- Message search
- Group conversations

## License

This code is provided as-is for use in your projects.

