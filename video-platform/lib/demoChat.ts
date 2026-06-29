'use client';

/**
 * Client-side demo conversations for demo stores (slug ids, not Supabase UUIDs).
 *
 * Demo stores have no Supabase profile, so messaging them can't insert into chats/
 * chat_members (the uuid columns reject a slug). Instead we keep a lightweight
 * conversation + its messages in localStorage, shaped like the real Supabase types
 * so the existing Messages UI renders them with zero special-casing beyond id checks.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
import type { ChatWithDetails, Message } from '@/models/Message';

const CHATS_KEY = 'demo-chats';
const MSGS_PREFIX = 'demo-msgs:';
export const DEMO_CHAT_EVENT = 'demo-chats-changed';

export function isDemoChatId(id: string | null | undefined): boolean {
  return !!id && id.startsWith('demo:');
}
export function demoChatId(slug: string): string {
  return `demo:${slug}`;
}

interface StoredChat {
  id: string;
  slug: string;
  businessName: string;
  avatarUrl?: string;
  created_at: string;
  last_message_text?: string;
  last_message_at?: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeChats(chats: StoredChat[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    window.dispatchEvent(new Event(DEMO_CHAT_EVENT));
  } catch { /* ignore quota errors */ }
}

function toChatWithDetails(c: StoredChat): ChatWithDetails {
  return {
    id: c.id,
    is_group: false,
    created_at: c.created_at,
    other_user: {
      id: c.slug,
      full_name: c.businessName,
      profile_picture_url: c.avatarUrl,
      type: 'business',
    },
    last_message: c.last_message_text
      ? { content: c.last_message_text, created_at: c.last_message_at }
      : undefined,
    unread_count: 0,
  };
}

/** All demo conversations, newest activity first — shaped for the chat list. */
export function getDemoChats(): ChatWithDetails[] {
  const chats = readJson<StoredChat[]>(CHATS_KEY, []);
  return chats
    .slice()
    .sort((a, b) =>
      (b.last_message_at || b.created_at).localeCompare(a.last_message_at || a.created_at),
    )
    .map(toChatWithDetails);
}

/** Create (or fetch) the demo conversation for a store and return it. */
export function openDemoChat(slug: string, businessName: string, avatarUrl?: string): ChatWithDetails {
  const id = demoChatId(slug);
  const chats = readJson<StoredChat[]>(CHATS_KEY, []);
  let chat = chats.find((c) => c.id === id);
  if (!chat) {
    chat = { id, slug, businessName, avatarUrl, created_at: new Date().toISOString() };
    writeChats([chat, ...chats]);
  } else if (avatarUrl && chat.avatarUrl !== avatarUrl) {
    chat.avatarUrl = avatarUrl;
    writeChats(chats);
  }
  return toChatWithDetails(chat);
}

export function getDemoMessages(chatId: string): Message[] {
  return readJson<Message[]>(MSGS_PREFIX + chatId, []);
}

export function addDemoMessage(chatId: string, senderId: string, content: string): Message {
  const msg: Message = {
    id: `dm-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    chat_id: chatId,
    sender_id: senderId,
    content,
    created_at: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    try {
      const list = getDemoMessages(chatId);
      window.localStorage.setItem(MSGS_PREFIX + chatId, JSON.stringify([...list, msg]));
      // Update the conversation's last-message preview + ordering.
      const chats = readJson<StoredChat[]>(CHATS_KEY, []);
      const c = chats.find((x) => x.id === chatId);
      if (c) { c.last_message_text = content; c.last_message_at = msg.created_at; writeChats(chats); }
    } catch { /* ignore */ }
  }
  return msg;
}
