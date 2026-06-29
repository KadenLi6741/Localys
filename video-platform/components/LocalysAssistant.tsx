'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useAllergens } from '@/contexts/AllergenContext';

// Pages the assistant is allowed to navigate to (mirrors the server prompt).
const ALLOWED_PATHS = new Set([
  '/home', '/feed', '/communities', '/chats', '/cart', '/checkout',
  '/orders', '/profile', '/settings', '/points', '/buy-coins',
  '/premium', '/dashboard', '/upload',
]);

interface AssistantAction {
  command: 'navigate' | 'clear_cart';
  arg?: string;
  label: string;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  showSuggestions?: boolean;
  actions?: AssistantAction[];
}

/**
 * Pull `[[ACTION: <command> | <label>]]` markers out of a reply, returning the
 * cleaned text and the validated actions. Anything unrecognized is dropped so a
 * misbehaving model can't trigger something unexpected.
 */
function parseActions(reply: string): { text: string; actions: AssistantAction[] } {
  const actions: AssistantAction[] = [];
  const text = reply
    .replace(/\[\[ACTION:\s*([^\]]+?)\]\]/g, (_full, inner: string) => {
      const [cmdPart, labelPart] = String(inner).split('|');
      const label = (labelPart ?? '').trim();
      const tokens = (cmdPart ?? '').trim().split(/\s+/);
      const verb = tokens[0];
      if (!label) return '';
      if (verb === 'navigate' && ALLOWED_PATHS.has(tokens[1])) {
        actions.push({ command: 'navigate', arg: tokens[1], label });
      } else if (verb === 'clear_cart') {
        actions.push({ command: 'clear_cart', label });
      }
      return '';
    })
    .trim();
  return { text, actions: actions.slice(0, 2) };
}

const SUGGESTIONS = [
  'How do I place an order?',
  'How do points and rewards work?',
  'How do I find businesses near me?',
  'How do I leave a review?',
  'How do I join a community?',
  'How do ranks work?',
  'How do I message a business?',
  'What is a group order?',
  'How do I use a promo code?',
  'How does QR code pickup work?',
  'What is Express Delivery?',
  'How do I edit my profile?',
  'What is Localy Premium?',
];

const GREETING: Message = {
  role: 'assistant',
  text: "Hi! I'm the Localy Assistant. Ask me anything about how the app works, or pick a question below.",
  showSuggestions: true,
};

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function LocalysAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Already-in-memory app state — no extra network calls / no added cost.
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const { userAllergies, hideEnabled } = useAllergens();

  const runAction = (action: AssistantAction) => {
    if (action.command === 'navigate' && action.arg) {
      router.push(action.arg);
      setOpen(false);
    } else if (action.command === 'clear_cart') {
      if (window.confirm('Empty your cart? This removes all items.')) {
        clearCart();
      }
    }
  };

  // Build a lightweight snapshot of who the user is and what they're doing,
  // so the assistant can answer personally instead of guessing.
  const buildContext = () => ({
    page: pathname,
    signedIn: !!user,
    name:
      (user?.user_metadata?.full_name as string | undefined) ||
      (user?.user_metadata?.username as string | undefined) ||
      user?.email ||
      null,
    cart: {
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      total: items.reduce((sum, i) => sum + i.itemPrice * i.quantity, 0),
      items: items.slice(0, 20).map((i) => ({
        name: i.itemName,
        quantity: i.quantity,
        price: i.itemPrice,
      })),
    },
    allergies: userAllergies,
    hideFlaggedRestaurants: hideEnabled,
  });

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, isLoading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Pass recent non-greeting history for context (skip initial greeting)
      const history = messages
        .slice(1)
        .filter((m) => !m.showSuggestions || m.role === 'user')
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history, context: buildContext() }),
      });

      const data = await res.json();
      const reply: string = data?.reply ?? "I'm having trouble right now — try a suggested question below.";
      const { text, actions } = parseActions(reply);

      setMessages((prev) => [...prev, { role: 'assistant', text, actions }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: "I'm having trouble right now — try a suggested question below.", showSuggestions: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close Localy Assistant' : 'Open Localy Assistant'}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#f97316] p-0 text-white shadow-xl transition hover:opacity-90 active:scale-95"
      >
        {open ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          style={{ maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 bg-[#f97316] px-4 py-3">
            <MessageCircle className="h-5 w-5 shrink-0 text-white" />
            <div className="flex-1">
              <p className="text-sm font-bold leading-none text-white">Localy Assistant</p>
              <p className="mt-0.5 text-[11px] leading-none text-white/80">Powered by AI</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-white/80 transition hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'rounded-br-sm bg-[#f97316] text-white'
                        : 'rounded-bl-sm bg-gray-100 text-black'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.actions.map((action, ai) => (
                      <button
                        key={ai}
                        type="button"
                        onClick={() => runAction(action)}
                        className="rounded-full bg-[#f97316] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 active:scale-95"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
                {msg.showSuggestions && (
                  <div className="mt-2 space-y-1">
                    {SUGGESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => send(q)}
                        disabled={isLoading}
                        className="block w-full rounded-xl border border-gray-200 px-3 py-2 text-left text-xs font-medium text-black transition-colors hover:border-[#f97316] hover:bg-orange-50 disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex shrink-0 items-center gap-2 border-t border-gray-100 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-black placeholder-gray-400 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f97316] p-0 text-white transition hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
