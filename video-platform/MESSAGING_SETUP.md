# Complete Setup Guide: Supabase User Messaging System

This guide walks you through setting up the complete user-to-user messaging system.

## Quick Start

### Step 1: Database Setup

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query and run `supabase/migrations/001_user_messaging_schema.sql`
4. Create another query and run `supabase/migrations/002_user_messaging_rls.sql`
5. Verify tables were created: `profiles`, `conversations`, `messages`

### Step 2: Enable Realtime

1. Go to **Database** → **Replication** in Supabase dashboard
2. Enable replication for:
   - `messages` table
   - `conversations` table
3. This enables real-time subscriptions for these tables

### Step 3: Create Profile Trigger (Optional but Recommended)

Create a trigger to automatically create a profile when a user signs up:

```sql
-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text from 1 for 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Step 4: Verify Setup

Test the setup by running these queries in the SQL editor:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'conversations', 'messages');

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'conversations', 'messages');

-- Check if triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

## File Structure

```
video-platform/
├── supabase/
│   └── migrations/
│       ├── 001_user_messaging_schema.sql    # Database schema
│       └── 002_user_messaging_rls.sql       # Security policies
├── lib/
│   └── supabase/
│       ├── client.ts                         # Supabase client config
│       └── messaging.ts                      # Messaging utilities
├── components/
│   └── messaging/
│       ├── ChatList.tsx                      # Conversation list component
│       ├── ChatWindow.tsx                    # Individual chat component
│       ├── NewConversationButton.tsx         # Start new chat component
│       └── README.md                         # Component documentation
└── MESSAGING_SETUP.md                        # This file
```

## Example Usage in Your App

### Example 1: Full Chat Page Implementation

Update `app/chats/[id]/page.tsx`:

```tsx
'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import ChatWindow from '@/components/messaging/ChatWindow';

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatWindow 
        conversationId={params.id} 
        onBack={() => router.back()} 
      />
    </ProtectedRoute>
  );
}
```

### Example 2: Conversations List Page

Update `app/chats/page.tsx`:

```tsx
'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import ChatList from '@/components/messaging/ChatList';
import NewConversationButton from '@/components/messaging/NewConversationButton';
import { useRouter } from 'next/navigation';

export default function ChatsPage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-2xl mx-auto">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Messages</h1>
            <NewConversationButton
              onConversationCreated={(id) => router.push(`/chats/${id}`)}
            />
          </div>
          <ChatList
            onSelectConversation={(id) => router.push(`/chats/${id}`)}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
```

## API Reference

### Core Functions

#### `getOrCreateConversation(otherUserId, firstMessage?)`

Get or create a conversation between current user and another user.

```typescript
const { data, error } = await getOrCreateConversation(
  'user-uuid-here',
  'Optional first message'
);
```

#### `sendMessage(payload)`

Send a message in a conversation.

```typescript
const { data, error } = await sendMessage({
  conversation_id: 'conversation-uuid',
  content: 'Hello!'
});
```

#### `getMessages(conversationId, limit?, offset?)`

Fetch messages with pagination.

```typescript
const { data, error } = await getMessages('conversation-uuid', 50, 0);
```

#### `getConversations()`

Get all conversations for current user.

```typescript
const { data, error } = await getConversations();
```

#### `subscribeToMessages(conversationId, callback)`

Subscribe to real-time message updates.

```typescript
const channel = subscribeToMessages('conversation-uuid', (message) => {
  console.log('New message:', message);
});

// Cleanup
channel.unsubscribe();
```

## Security Checklist

- ✅ RLS enabled on all tables
- ✅ Policies prevent unauthorized access
- ✅ Users can only access their own conversations
- ✅ Users can only send messages as themselves
- ✅ All operations require authentication
- ✅ Real-time subscriptions respect RLS

## Testing

### Test Scenario 1: Create Conversation

```typescript
// User A creates conversation with User B
const { data, error } = await getOrCreateConversation(userBId, 'Hello!');
console.log('Conversation ID:', data?.id);
```

### Test Scenario 2: Send and Receive Messages

```typescript
// User A sends message
await sendMessage({
  conversation_id: conversationId,
  content: 'Test message'
});

// User B subscribes to messages
const channel = subscribeToMessages(conversationId, (message) => {
  console.log('Received:', message.content);
});
```

### Test Scenario 3: Unread Counts

```typescript
// Get conversations with unread counts
const { data } = await getConversations();
data?.forEach(conv => {
  console.log(conv.other_user?.username, ':', conv.unread_count);
});
```

## Troubleshooting

### Issue: "relation does not exist"

**Solution**: Run the schema migration SQL file first.

### Issue: "permission denied"

**Solution**: Verify RLS policies are installed and user is authenticated.

### Issue: Messages not updating in real-time

**Solution**: 
1. Check Realtime is enabled in Supabase dashboard
2. Verify replication is enabled for `messages` table
3. Check browser console for subscription errors

### Issue: "Unauthorized" errors

**Solution**: 
1. Verify user is authenticated: `await supabase.auth.getUser()`
2. Check user ID matches conversation participants
3. Verify RLS policies allow access

## Performance Tips

1. **Pagination**: Always use limit/offset when fetching message history
2. **Unsubscribe**: Always clean up real-time subscriptions on unmount
3. **Indexes**: All foreign keys are indexed for fast queries
4. **Unread Counts**: Stored at conversation level to avoid COUNT queries

## Next Steps

- Add message reactions/emojis
- Implement typing indicators
- Add file/image attachments
- Implement push notifications
- Add message search functionality

## Support

For issues or questions:
1. Check the README in `components/messaging/README.md`
2. Review the SQL migration files for schema details
3. Check Supabase logs in the dashboard

