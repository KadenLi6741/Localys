'use client';

/**
 * Localy Emails — business dashboard panel.
 *
 * Shows the opted-in customer list (real Supabase email_consents + a mock list
 * for the demo), a compose area with simulated send, AI email writing (Gemini,
 * Premium only), and automation toggles (Premium only). Black/white/orange only.
 */

import { useEffect, useMemo, useState } from 'react';
import { Mail, Sparkles, Send, Users, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getBusinessConsents } from '@/lib/supabase/emailConsents';
import { MOCK_CUSTOMER_EMAILS, useAutomationSettings, type CustomerEmail } from '@/lib/customerEmails';
import { PremiumLock } from '@/components/PremiumLock';
import { Toast } from '@/components/Toast';

type Audience = 'all' | 'past';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export function LocalyEmailsPanel({
  businessId,
  businessName,
  isPremium,
}: {
  businessId: string;
  businessName: string;
  isPremium: boolean;
}) {
  // Opted-in list: real consents merged with the mock list, deduped by email.
  const [optedIn, setOptedIn] = useState<CustomerEmail[]>(MOCK_CUSTOMER_EMAILS);
  const [pastCustomers, setPastCustomers] = useState<CustomerEmail[]>([]);

  // Compose state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  // AI state
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  // Automation state (localStorage)
  const { settings, update } = useAutomationSettings(businessId);

  // Load real opted-in customers and merge with the mock list (dedupe by email).
  useEffect(() => {
    let active = true;
    getBusinessConsents(businessId).then((rows) => {
      if (!active) return;
      const real: CustomerEmail[] = rows
        .filter((r) => r.user_email)
        .map((r) => ({
          name: r.user_name || r.user_email || 'Customer',
          email: (r.user_email || '').toLowerCase(),
          optedInAt: r.created_at || new Date().toISOString(),
        }));
      const byEmail = new Map<string, CustomerEmail>();
      for (const c of [...real, ...MOCK_CUSTOMER_EMAILS]) {
        const key = c.email.toLowerCase();
        if (!byEmail.has(key)) byEmail.set(key, c);
      }
      setOptedIn([...byEmail.values()]);
    });
    return () => {
      active = false;
    };
  }, [businessId]);

  // Past customers = anyone who ordered from this business (paid/completed),
  // resolved to their account email. Best-effort; empty on error.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: orders } = await supabase
          .from('item_purchases')
          .select('buyer_id')
          .eq('seller_id', businessId)
          .in('status', ['paid', 'completed']);
        const ids = [...new Set((orders || []).map((o: { buyer_id: string }) => o.buyer_id))].filter(Boolean);
        if (ids.length === 0) {
          if (active) setPastCustomers([]);
          return;
        }
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', ids);
        if (!active) return;
        setPastCustomers(
          (profiles || [])
            .filter((p: { email?: string }) => p.email)
            .map((p: { email?: string; full_name?: string }) => ({
              name: p.full_name || p.email || 'Customer',
              email: (p.email || '').toLowerCase(),
              optedInAt: new Date().toISOString(),
            }))
        );
      } catch {
        if (active) setPastCustomers([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [businessId]);

  const recipients = audience === 'all' ? optedIn : pastCustomers;
  const recipientCount = recipients.length;

  const automationActive = settings.monthlyReminder || settings.pastCustomerMessages;

  const handleSend = () => {
    if (!subject.trim() && !message.trim()) {
      setToast('Add a subject or message first');
      return;
    }
    setSending(true);
    // DEMO: simulated send — no real email server. Logs + success toast.
    console.log('[LocalyEmails] simulated send', {
      businessId,
      audience,
      recipientCount,
      subject,
      message,
    });
    setTimeout(() => {
      setSending(false);
      setToast(`Sent to ${recipientCount} customer${recipientCount === 1 ? '' : 's'}`);
      setSubject('');
      setMessage('');
    }, 600);
  };

  const handleWriteWithAi = async () => {
    if (!aiTopic.trim()) return;
    setAiBusy(true);
    try {
      // Only call Gemini on explicit click. Always returns a usable draft.
      const res = await fetch('/api/ai-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, topic: aiTopic.trim() }),
      });
      const data = await res.json();
      if (data?.subject) setSubject(data.subject);
      if (data?.body) setMessage(data.body);
      setShowAiInput(false);
      setAiTopic('');
    } catch {
      setToast('Could not generate — try again');
    } finally {
      setAiBusy(false);
    }
  };

  const composeDisabledNote = useMemo(
    () => (audience === 'past' && recipientCount === 0 ? 'No past customers yet' : ''),
    [audience, recipientCount]
  );

  return (
    <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Mail className="h-4 w-4 text-[#f97316]" />
        <h2 className="text-sm font-semibold text-foreground">Localy Emails</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {optedIn.length} opted in
        </span>
      </div>

      {/* Email list */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Opted-in customers
        </p>
        <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {optedIn.map((c) => (
            <div key={c.email} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.email}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">opted in {formatDate(c.optedInAt)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compose */}
      <div className="mb-5 rounded-xl border border-border p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Compose Email</p>
          {/* Write with AI — Premium only */}
          {isPremium ? (
            <button
              type="button"
              onClick={() => setShowAiInput((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#f97316] px-3 py-1.5 text-xs font-semibold text-[#f97316] transition hover:bg-[#f97316]/10"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Write with AI
            </button>
          ) : null}
        </div>

        {!isPremium && (
          <PremiumLock
            className="mb-3"
            title="Write with AI"
            description="Generate a friendly marketing email from a short topic. Upgrade to unlock."
          />
        )}

        {isPremium && showAiInput && (
          <div className="mb-3 rounded-xl bg-muted p-3">
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              What is this email about?
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="e.g. 20% off this weekend"
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-gray-400 focus:border-[#f97316] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleWriteWithAi}
                disabled={aiBusy || !aiTopic.trim()}
                className="shrink-0 rounded-lg bg-[#f97316] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {aiBusy ? 'Writing…' : 'Generate'}
              </button>
            </div>
          </div>
        )}

        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="mb-2 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-gray-400 focus:border-[#f97316] focus:outline-none"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your message…"
          rows={5}
          className="mb-3 w-full resize-y rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-gray-400 focus:border-[#f97316] focus:outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Send to</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              className="rounded-lg border border-border bg-muted px-2 py-1.5 text-sm text-foreground focus:border-[#f97316] focus:outline-none"
            >
              <option value="all">All opted-in customers</option>
              <option value="past">Past customers</option>
            </select>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Sending to {recipientCount} customer{recipientCount === 1 ? '' : 's'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || recipientCount === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {composeDisabledNote && (
          <p className="mt-2 text-xs text-muted-foreground">{composeDisabledNote}</p>
        )}
      </div>

      {/* Automation — Premium only */}
      <div className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#f97316]" />
          <p className="text-sm font-semibold text-foreground">Automation</p>
          {isPremium && automationActive && (
            <span className="rounded-full bg-[#f97316] px-2 py-0.5 text-xs font-semibold text-white">Active</span>
          )}
        </div>

        {!isPremium ? (
          <PremiumLock
            title="Email automation"
            description="Schedule monthly reminders and auto-messages to past customers. Upgrade to unlock."
          />
        ) : (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm text-foreground">Send a monthly reminder email to opted-in customers</span>
              <input
                type="checkbox"
                checked={settings.monthlyReminder}
                onChange={(e) => update({ monthlyReminder: e.target.checked })}
                className="h-4 w-4 shrink-0 accent-[#f97316]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm text-foreground">Send automatic messages to past customers</span>
              <input
                type="checkbox"
                checked={settings.pastCustomerMessages}
                onChange={(e) => update({ pastCustomerMessages: e.target.checked })}
                className="h-4 w-4 shrink-0 accent-[#f97316]"
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">Frequency</span>
              <select
                value={settings.frequency}
                onChange={(e) => update({ frequency: e.target.value as 'weekly' | 'monthly' })}
                className="rounded-lg border border-border bg-muted px-2 py-1.5 text-sm text-foreground focus:border-[#f97316] focus:outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </section>
  );
}
