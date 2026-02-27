import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to create a 1:1 chat between two users
 * Uses service role key to bypass RLS policies
 * This is called server-side to avoid RLS issues when creating new chats
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    // Create admin client with service role key to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await request.json();
    const { userId1, userId2 } = body;

    if (!userId1 || !userId2) {
      return NextResponse.json(
        { error: 'Missing required fields: userId1, userId2' },
        { status: 400 }
      );
    }

    if (userId1 === userId2) {
      return NextResponse.json(
        { error: 'Cannot create chat with yourself' },
        { status: 400 }
      );
    }

    // Check if both users exist
    const { data: user1 } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId1)
      .single();

    const { data: user2 } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId2)
      .single();

    if (!user1 || !user2) {
      return NextResponse.json(
        { error: 'One or both users do not exist' },
        { status: 404 }
      );
    }

    // Check if a 1:1 chat already exists between these users
    const { data: existingChats } = await supabase
      .from('chats')
      .select('id')
      .eq('is_group', false);

    if (existingChats && existingChats.length > 0) {
      for (const chat of existingChats) {
        const { data: members } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('chat_id', chat.id);

        if (members && members.length === 2) {
          const memberIds = members.map(m => m.user_id).sort();
          const targetIds = [userId1, userId2].sort();
          
          if (memberIds[0] === targetIds[0] && memberIds[1] === targetIds[1]) {
            // Chat already exists, return it
            const { data: existingChat } = await supabase
              .from('chats')
              .select('*')
              .eq('id', chat.id)
              .single();
            
            return NextResponse.json({ data: existingChat });
          }
        }
      }
    }

    // Create new chat
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({
        is_group: false,
        metadata: {},
      })
      .select()
      .single();

    if (chatError || !newChat) {
      console.error('Error creating chat:', chatError);
      return NextResponse.json(
        { error: chatError?.message || 'Failed to create chat' },
        { status: 500 }
      );
    }

    // Add both users as chat members
    const { error: membersError } = await supabase
      .from('chat_members')
      .insert([
        {
          chat_id: newChat.id,
          user_id: userId1,
          role: 'member',
        },
        {
          chat_id: newChat.id,
          user_id: userId2,
          role: 'member',
        },
      ]);

    if (membersError) {
      console.error('Error adding members to chat:', membersError);
      // Chat was created but members couldn't be added - this is bad, but we'll return the chat
      // In production, you might want to delete the chat here
      return NextResponse.json(
        { error: membersError.message || 'Failed to add members to chat' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newChat });
  } catch (error) {
    console.error('Error in create-chat endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
