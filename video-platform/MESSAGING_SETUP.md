# Messaging Feature - Setup Guide

This guide provides instructions for setting up the messaging feature in your Supabase project.

## Database Migration

1. Apply the migration to your Supabase project:
   ```bash
   cd video-platform/supabase/migrations
   # Apply via Supabase CLI:
   supabase db push
   # Or manually run the SQL in the Supabase dashboard
   ```

2. The migration creates:
   - `conversations` table for storing conversation metadata
   - `conversation_members` table for tracking who belongs to each conversation
   - `messages` table for storing message content
   - `message_reads` table for per-user read receipts
   - Row Level Security (RLS) policies for secure access
   - Indexes for performance
   - Triggers for auto-updating timestamps

## Storage Bucket Setup

### Creating the Message Attachments Bucket

1. Go to your Supabase dashboard → Storage
2. Create a new bucket named `message-attachments`
3. Set it as **Private** (not public)
4. Configure the following storage policies:

#### Policy: Allow authenticated users to upload
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy: Allow conversation members to download
```sql
CREATE POLICY "Allow members to download"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  EXISTS (
    SELECT 1 FROM conversation_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.conversation_id::text = (storage.foldername(name))[1]
  )
);
```

### File Upload Pattern

When uploading attachments:
```typescript
// Upload path: {conversationId}/{userId}/{timestamp}-{filename}
const path = `${conversationId}/${userId}/${Date.now()}-${file.name}`;

const { data, error } = await supabase.storage
  .from('message-attachments')
  .upload(path, file);

if (data) {
  const { data: urlData } = await supabase.storage
    .from('message-attachments')
    .createSignedUrl(data.path, 3600); // 1 hour expiry

  // Store urlData.signedUrl in message attachments
}
```

## Edge Functions (Optional but Recommended)

### 1. Create or Get Conversation Function

Create a Supabase Edge Function to handle conversation creation:

```typescript
// supabase/functions/create-conversation/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userIds, title } = await req.json()

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // For 1:1 conversations, check if one exists
  if (userIds.length === 2) {
    const { data: existing } = await supabaseClient.rpc(
      'find_direct_conversation',
      { user_1: userIds[0], user_2: userIds[1] }
    )

    if (existing) {
      return new Response(JSON.stringify({ conversationId: existing }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // Create new conversation
  const { data: conversation, error } = await supabaseClient
    .from('conversations')
    .insert({ title })
    .select()
    .single()

  if (error) throw error

  // Add members
  const members = userIds.map((userId: string) => ({
    conversation_id: conversation.id,
    user_id: userId,
    is_admin: false,
  }))

  await supabaseClient.from('conversation_members').insert(members)

  return new Response(
    JSON.stringify({ conversationId: conversation.id }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

Deploy:
```bash
supabase functions deploy create-conversation
```

### 2. Helper SQL Function for Finding Existing Conversations

Add this to your migration or run separately:

```sql
CREATE OR REPLACE FUNCTION find_direct_conversation(user_1 uuid, user_2 uuid)
RETURNS uuid AS $$
DECLARE
  conv_id uuid;
BEGIN
  SELECT conversation_id INTO conv_id
  FROM conversation_members cm1
  WHERE cm1.user_id = user_1
    AND EXISTS (
      SELECT 1 FROM conversation_members cm2
      WHERE cm2.conversation_id = cm1.conversation_id
        AND cm2.user_id = user_2
    )
    AND (
      SELECT COUNT(*) FROM conversation_members cm3
      WHERE cm3.conversation_id = cm1.conversation_id
    ) = 2
  LIMIT 1;
  
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 3. Push Notification Function (Optional)

For real-time notifications to offline users:

```typescript
// supabase/functions/send-message-notification/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { messageId, conversationId } = await req.json()

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Get conversation members
  const { data: members } = await supabaseClient
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId)

  // Get message details
  const { data: message } = await supabaseClient
    .from('messages')
    .select('*, sender:profiles(*)')
    .eq('id', messageId)
    .single()

  // Send push notifications to all members except sender
  // Integration with your push notification service (FCM, APNS, etc.)
  // This is a placeholder for your notification logic

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

## Testing the Implementation

### Manual Testing Steps

1. **Create a conversation:**
   ```typescript
   import { createOrGetDirectConversation } from '@/lib/supabase/messaging';
   
   const { data: conversation } = await createOrGetDirectConversation(
     'user-id-1',
     'user-id-2'
   );
   ```

2. **Send a message:**
   ```typescript
   import { sendMessage } from '@/lib/supabase/messaging';
   
   await sendMessage(
     conversation.id,
     'user-id-1',
     'Hello, world!'
   );
   ```

3. **Subscribe to real-time updates:**
   ```typescript
   import { subscribeToMessages } from '@/lib/supabase/messaging';
   
   const channel = subscribeToMessages(conversation.id, (message) => {
     console.log('New message:', message);
   });
   ```

4. **Test RLS policies:**
   - Try to access messages from a conversation you're not a member of (should be denied)
   - Try to delete someone else's message (should be denied unless you're admin)

### Using the React Components

Example integration:

```tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatList } from '@/components/ChatList';
import { ChatWindow } from '@/components/ChatWindow';
import { MessageComposer } from '@/components/MessageComposer';
import { sendMessage } from '@/lib/supabase/messaging';

export default function MessagingPage() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!user || !selectedConversationId) return;
    
    // Handle file uploads to storage bucket first
    // Then send message with attachment URLs
    await sendMessage(selectedConversationId, user.id, content);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar with conversation list */}
      <div className="w-80 border-r">
        <ChatList
          userId={user?.id || ''}
          onConversationSelect={setSelectedConversationId}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            <ChatWindow
              conversationId={selectedConversationId}
              userId={user?.id || ''}
            />
            <MessageComposer onSend={handleSendMessage} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
```

## Security Considerations

1. **RLS Policies**: All tables have Row Level Security enabled. Only conversation members can access messages.

2. **Storage Security**: Attachments are stored in a private bucket with policies that only allow members to access files.

3. **Input Validation**: Always validate and sanitize user input on the client and server side.

4. **Rate Limiting**: Consider implementing rate limiting for message sending to prevent spam.

5. **File Upload Limits**: Configure maximum file sizes in your storage bucket settings.

## Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Troubleshooting

### Messages not appearing in real-time
- Check that Realtime is enabled in your Supabase project settings
- Verify the user has an active subscription to the conversation channel
- Check browser console for WebSocket connection errors

### Permission denied errors
- Verify RLS policies are correctly applied
- Ensure the user is a member of the conversation
- Check that auth.uid() returns the expected user ID

### File upload failures
- Verify storage bucket exists and is configured correctly
- Check storage policies allow the user to upload
- Ensure file size is within limits

## Next Steps

1. Implement file upload handling in MessageComposer
2. Add typing indicators
3. Add message reactions/emoji
4. Implement message search
5. Add group chat management UI
6. Set up push notifications for offline users
