# Chat/Messaging Feature Implementation

This document describes the chat/messaging feature implementation for the Localys video platform.

## Overview

The chat feature enables user-to-user messaging with real-time updates, using Supabase as the backend. The implementation follows a 1:1 chat model with support for future group chat expansion.

## Database Schema

### Tables

#### `chats`
Container for conversations (1:1 or group).
- `id`: UUID primary key
- `is_group`: boolean (default: false)
- `metadata`: jsonb for extensibility
- `created_at`: timestamp

#### `chat_members`
Tracks which users belong to which chats.
- `id`: UUID primary key
- `chat_id`: UUID foreign key → chats.id
- `user_id`: UUID (references auth.users)
- `joined_at`: timestamp
- `last_read`: timestamp (for unread count calculation)
- `role`: text (default: 'member')
- Unique constraint on (chat_id, user_id)

#### `messages`
Stores all chat messages.
- `id`: UUID primary key
- `chat_id`: UUID foreign key → chats.id
- `sender_id`: UUID (references auth.users)
- `content`: text
- `created_at`: timestamp
- `edited_at`: timestamp (nullable)
- `deleted`: boolean (default: false)
- `reply_to`: UUID (nullable, for threading)
- `metadata`: jsonb for extensibility

### Indexes
- `idx_messages_chat_id_created_at`: For efficient message retrieval
- `idx_chat_members_user_id`: For efficient user chat lookups
- `idx_chat_members_chat_id`: For efficient chat member lookups

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

**chats:**
- Users can SELECT chats they are members of
- Any authenticated user can INSERT new chats

**messages:**
- Users can SELECT messages from chats they belong to
- Users can INSERT messages only to chats they belong to (and sender_id must match auth.uid())
- Users can UPDATE/DELETE only their own messages

**chat_members:**
- Users can SELECT their own memberships and memberships from chats they belong to
- Users can INSERT memberships for themselves or add others to chats they're creating

## API Functions

### `lib/supabase/messages.ts`

#### Chat Management
- `getChats(userId)`: Get all chats for a user with last message, unread count, and participant info
- `findOneToOneChat(userId1, userId2)`: Find existing 1:1 chat between two users
- `getOrCreateOneToOneChat(userId1, userId2)`: Get existing or create new 1:1 chat

#### Messaging
- `getMessages(chatId)`: Fetch all messages for a chat (with sender profile info)
- `sendMessage(message)`: Send a new message
- `markMessagesAsRead(chatId, userId)`: Update last_read timestamp
- `subscribeToMessages(chatId, callback)`: Real-time subscription to new messages

#### User Search
- `searchUsers(query, currentUserId)`: Search for users by name or username

## React Hooks

### `hooks/useChats.ts`
Manages chat list state and loading.
- Returns: `{ chats, loading, error, refresh }`

### `hooks/useMessages.ts`
Manages messages for a specific chat, including real-time updates.
- Returns: `{ messages, loading, error, sending, send, refresh }`
- Automatically subscribes to real-time message updates
- Handles optimistic UI updates

## Components

### `components/chats/ChatList.tsx`
Displays list of chats with loading and empty states.

### `components/chats/ChatListItem.tsx`
Individual chat list item showing:
- Other user's avatar and name
- Last message preview
- Timestamp (formatted: HH:MM, Yesterday, or MMM DD)
- Unread message count badge

### `components/chats/ChatWindow.tsx`
Message display area showing:
- Sender avatars (clickable to view profile)
- Message bubbles (different styles for sent/received)
- Timestamps
- Loading and empty states

### `components/chats/NewChatModal.tsx`
Modal for starting new chats:
- User search with debouncing
- Avatar display
- Creates or navigates to existing 1:1 chat

## Pages

### `/chats` (`app/chats/page.tsx`)
Main chat list page:
- Shows all user's chats sorted by last message
- "+" button to start new chat
- Bottom navigation bar

### `/chats/[id]` (`app/chats/[id]/page.tsx`)
Individual chat view:
- Message history with auto-scroll
- Real-time message updates
- Message input with send button
- Back button to return to chat list

## Key Features

### Real-time Updates
- Uses Supabase Realtime (postgres_changes)
- Automatically subscribes when chat is opened
- Unsubscribes on unmount
- Deduplicates incoming messages

### Unread Messages
- Tracked via `last_read` timestamp in `chat_members`
- Updated when opening a chat
- Updated when receiving messages while chat is open
- Displayed as red badge in chat list

### 1:1 Chat Deduplication
When creating a new chat, the system:
1. Searches for existing non-group chats where both users are members
2. Verifies exactly 2 members exist
3. Reuses existing chat or creates new one

### Mobile-Friendly
- Responsive design with mobile-first approach
- Fixed bottom navigation
- Fixed message input at bottom
- Touch-optimized interactions (active:scale-95)

### Accessibility
- Semantic HTML elements
- ARIA labels on icon buttons
- Keyboard navigation support
- Focus states on interactive elements

## Security Considerations

1. **RLS Policies**: All database operations are protected by row-level security
2. **User Verification**: sender_id must match auth.uid() for message insertion
3. **Membership Checks**: Users can only access chats they're members of
4. **No Credential Exposure**: Supabase credentials use environment variables

## Future Enhancements

The schema supports:
- Group chats (is_group flag)
- Message threading (reply_to field)
- Message editing (edited_at field)
- Soft deletion (deleted flag)
- Custom metadata (metadata jsonb field)
- Different roles (role field in chat_members)

## Migration

The SQL migration file is located at:
`supabase/migrations/20260119024400_add_chats_and_messages.sql`

Since the database already exists, the tables should already be present. If not, run the migration using:
```bash
supabase db push
```

Or apply manually via Supabase dashboard SQL editor.

## Testing Recommendations

1. **Chat Creation**: Create chat between two users, verify no duplicates
2. **Messaging**: Send messages, verify real-time delivery
3. **Unread Counts**: Send messages, verify unread badge appears
4. **Mark as Read**: Open chat, verify badge clears
5. **Profile Links**: Click user avatar/name, verify profile navigation
6. **Search**: Search for users, verify results
7. **Responsiveness**: Test on mobile viewport
8. **RLS**: Attempt to access chats as different users via API
