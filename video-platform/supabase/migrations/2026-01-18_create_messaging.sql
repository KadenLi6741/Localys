-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text, -- optional for group chats
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz
);

-- Conversation members (who can access conversation)
CREATE TABLE IF NOT EXISTS conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  is_admin boolean DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  content_type text DEFAULT 'text', -- 'text'|'attachment'|'system'
  attachments jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Per-user read receipts (could be used to display unread counts)
CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Triggers to keep conversations.updated_at / last_message_at in sync
CREATE OR REPLACE FUNCTION update_conversation_timestamps() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE conversations SET last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.conversation_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE conversations SET updated_at = now() WHERE id = OLD.conversation_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_timestamps ON messages;
CREATE TRIGGER trg_messages_timestamps
AFTER INSERT OR DELETE ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamps();

-- Recommended RLS policies
-- Enable RLS on these tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Helper to check membership (this function references auth.uid() for supabase)
CREATE OR REPLACE FUNCTION is_conversation_member(conv uuid, userid uuid) RETURNS boolean AS $$
  SELECT EXISTS(SELECT 1 FROM conversation_members WHERE conversation_id = conv AND user_id = userid);
$$ LANGUAGE sql STABLE;

-- Allow members to select a conversation
CREATE POLICY "select_conversations_if_member" ON conversations
  FOR SELECT USING (is_conversation_member(id, auth.uid()));

-- Allow inserting conversations only for authenticated users (server side will add members)
CREATE POLICY "insert_conversations_authenticated" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Members table: only the user themselves or server-side services can insert membership (we allow inserts if auth.uid() = user_id OR a service role)
CREATE POLICY "select_conversation_members_if_member" ON conversation_members
  FOR SELECT USING (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "insert_conversation_members_admin_or_self" ON conversation_members
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Messages policies: only members can select & insert; only sender or admin (conversation_members.is_admin) can delete/update
CREATE POLICY "select_messages_if_member" ON messages
  FOR SELECT USING (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "insert_messages_if_member" ON messages
  FOR INSERT WITH CHECK (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "delete_message_if_sender_or_admin" ON messages
  FOR DELETE USING (
    sender_id = auth.uid() OR 
    EXISTS(SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid() AND cm.is_admin)
  );

CREATE POLICY "update_message_if_sender" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- message_reads: allow inserts for members only (to mark read), and selects for members
CREATE POLICY "select_message_reads_if_member" ON message_reads
  FOR SELECT USING (is_conversation_member((SELECT conversation_id FROM messages WHERE id = message_reads.message_id), auth.uid()));

CREATE POLICY "insert_message_reads_if_member" ON message_reads
  FOR INSERT WITH CHECK (is_conversation_member((SELECT conversation_id FROM messages WHERE id = message_reads.message_id), auth.uid()));


-- NOTE: Supabase "auth.uid()" is used in policies. If your project uses a different function, adapt accordingly.
