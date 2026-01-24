-- =====================================================
-- User Messaging System Schema
-- =====================================================
-- This file contains the database schema for a user-to-user
-- messaging system using Supabase.
--
-- Tables:
-- 1. profiles - Extended user profiles linked to auth.users
-- 2. conversations - 1-to-1 conversations between two users
-- 3. messages - Individual messages within conversations
--
-- All tables use UUIDs for primary keys and follow Supabase best practices.
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
-- Stores user profile information linked to Supabase Auth users.
-- Each authenticated user should have exactly one profile.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Basic user information
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- Index for fast username lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profile updates
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================
-- Stores 1-to-1 conversations between two users.
-- Uses a composite unique constraint to ensure only one
-- conversation exists between any two users.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- The two users in the conversation
  -- user_one_id is always the user with the smaller UUID (lexicographically)
  -- This ensures consistency and simplifies queries
  user_one_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_two_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Metadata
  last_message_at TIMESTAMPTZ,
  last_message_text TEXT,
  -- Unread counts for each user
  user_one_unread_count INTEGER DEFAULT 0 NOT NULL,
  user_two_unread_count INTEGER DEFAULT 0 NOT NULL,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Constraints
  CONSTRAINT different_users CHECK (user_one_id != user_two_id),
  CONSTRAINT ordered_users CHECK (user_one_id < user_two_id),
  -- Ensure only one conversation between two users
  CONSTRAINT unique_conversation UNIQUE (user_one_id, user_two_id)
);

-- Indexes for fast conversation lookups
CREATE INDEX IF NOT EXISTS conversations_user_one_idx ON public.conversations(user_one_id);
CREATE INDEX IF NOT EXISTS conversations_user_two_idx ON public.conversations(user_two_id);
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx ON public.conversations(last_message_at DESC NULLS LAST);

-- Trigger to update updated_at on conversation updates
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
-- Stores individual messages within conversations.
-- Each message belongs to exactly one conversation and
-- has one sender and one receiver.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Message content
  content TEXT NOT NULL,
  -- Read status
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  read_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Constraints
  CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0),
  CONSTRAINT max_content_length CHECK (char_length(content) <= 5000),
  CONSTRAINT sender_not_receiver CHECK (sender_id != receiver_id)
);

-- Indexes for fast message queries
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS messages_is_read_idx ON public.messages(is_read) WHERE is_read = FALSE;

-- Function to update conversation metadata when a new message is inserted
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation's last message info
  UPDATE public.conversations
  SET
    last_message_at = NEW.created_at,
    last_message_text = LEFT(NEW.content, 100), -- Store first 100 chars as preview
    updated_at = NOW(),
    -- Increment unread count for the receiver
    user_one_unread_count = CASE
      WHEN NEW.receiver_id = user_one_id THEN user_one_unread_count + 1
      ELSE user_one_unread_count
    END,
    user_two_unread_count = CASE
      WHEN NEW.receiver_id = user_two_id THEN user_two_unread_count + 1
      ELSE user_two_unread_count
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation when new message is created
CREATE TRIGGER messages_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message();

-- Function to decrement unread count when message is read
CREATE OR REPLACE FUNCTION public.handle_message_read()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if message is being marked as read
  IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
    UPDATE public.conversations
    SET
      user_one_unread_count = CASE
        WHEN NEW.receiver_id = user_one_id THEN GREATEST(0, user_one_unread_count - 1)
        ELSE user_one_unread_count
      END,
      user_two_unread_count = CASE
        WHEN NEW.receiver_id = user_two_id THEN GREATEST(0, user_two_unread_count - 1)
        ELSE user_two_unread_count
      END,
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    -- Set read_at timestamp if not already set
    IF NEW.read_at IS NULL THEN
      NEW.read_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update unread counts when message is marked as read
CREATE TRIGGER messages_update_read_status
  BEFORE UPDATE OF is_read ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_message_read();

-- =====================================================
-- HELPER FUNCTION: Get or Create Conversation
-- =====================================================
-- This function ensures that user_one_id is always lexicographically
-- smaller than user_two_id, which simplifies queries and ensures
-- uniqueness.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user_one_id UUID,
  p_user_two_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_participant_ids UUID[];
BEGIN
  -- Sort the UUIDs to ensure consistent ordering
  v_participant_ids := ARRAY[
    LEAST(p_user_one_id, p_user_two_id),
    GREATEST(p_user_one_id, p_user_two_id)
  ];
  
  -- Try to find existing direct conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE is_direct = true
    AND participant_ids = v_participant_ids;
  
  -- Create conversation if it doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (is_direct, participant_ids)
    VALUES (true, v_participant_ids)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

