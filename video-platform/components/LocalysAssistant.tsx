'use client';

/**
 * LocalysAssistant — floating AI help chat bubble available across the app.
 * Purpose: Answers user questions about how Localy works. It shows quick-pick suggestions, sends the
 *   message plus recent history to the /api/assistant endpoint, and renders the AI reply. Designed to
 *   degrade gracefully — on any error it apologises and re-offers the suggested questions.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  showSuggestions?: boolean;
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

// Three bouncing dots shown while the assistant is "thinking" (waiting on the API response).
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

// The assistant widget: a floating button that toggles a chat panel.
export function LocalysAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message whenever the conversation grows or the panel opens.
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, isLoading]);

  // Sends a question to the assistant API and appends the reply. Ignores empty input or sends made
  // while a request is already in flight (prevents double-submits).
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
        body: JSON.stringify({ message: trimmed, history }),
      });

      const data = await res.json();
      const reply: string = data?.reply ?? "I'm having trouble right now — try a suggested question below.";

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: "I'm having trouble right now — try a suggested question below.", showSuggestions: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Form submit handler for the text input — sends whatever the user typed.
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
