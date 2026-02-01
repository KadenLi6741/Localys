-- TEST: Run these statements one by one in Supabase SQL Editor
-- Copy ONE statement at a time, run it, check the result, then move to next

-- ============================================
-- TEST 1: Check existing policies
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename IN ('chats', 'chat_members', 'messages')
ORDER BY tablename, policyname;

-- ============================================
-- TEST 2: Check RLS status
-- ============================================
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('chats', 'chat_members', 'messages');

-- ============================================
-- TEST 3: Try creating a chat directly (if you're admin)
-- ============================================
-- This will help us see if it's an auth issue or RLS issue
-- INSERT INTO public.chats (is_group, metadata) 
-- VALUES (false, '{}');
