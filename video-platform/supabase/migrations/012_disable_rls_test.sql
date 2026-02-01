-- DISABLE RLS TEMPORARILY TO TEST
-- This will let us see if the code works without RLS blocking

-- Disable RLS on chats
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Disable RLS on chat_members  
ALTER TABLE public.chat_members DISABLE ROW LEVEL SECURITY;

-- Disable RLS on messages
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
