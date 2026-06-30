'use client';

/**
 * Localy Emails (demo) — mock customer email list + automation settings.
 *
 * The dashboard merges these MOCK customers with the real opted-in customers
 * from Supabase (email_consents) so the list looks full for judges even with
 * little real data. Automation settings are persisted client-side; real
 * scheduling is wired later.
 */

import { useCallback, useEffect, useState } from 'react';

export interface CustomerEmail {
  name: string;
  email: string;
  optedInAt: string; // ISO timestamp
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ── MOCK customer email list for demo ──
// Believable opted-in customers so the dashboard isn't empty.
export const MOCK_CUSTOMER_EMAILS: CustomerEmail[] = [
  { name: 'Jane Doe', email: 'jane.doe@gmail.com', optedInAt: daysAgo(2) },
  { name: 'Marcus Lee', email: 'marcus.lee@gmail.com', optedInAt: daysAgo(3) },
  { name: 'Priya Sharma', email: 'priya.sharma@outlook.com', optedInAt: daysAgo(4) },
  { name: 'Diego Morales', email: 'diego.morales@gmail.com', optedInAt: daysAgo(5) },
  { name: 'Hannah Kim', email: 'hannah.kim@yahoo.com', optedInAt: daysAgo(6) },
  { name: 'Tom Bennett', email: 'tom.bennett@gmail.com', optedInAt: daysAgo(7) },
  { name: 'Sofia Costa', email: 'sofia.costa@gmail.com', optedInAt: daysAgo(8) },
  { name: 'Aisha Nasser', email: 'aisha.nasser@outlook.com', optedInAt: daysAgo(9) },
  { name: 'Liam Murphy', email: 'liam.murphy@gmail.com', optedInAt: daysAgo(10) },
  { name: 'Emma Wright', email: 'emma.wright@gmail.com', optedInAt: daysAgo(11) },
  { name: 'Noah Patel', email: 'noah.patel@yahoo.com', optedInAt: daysAgo(12) },
  { name: 'Olivia Chen', email: 'olivia.chen@gmail.com', optedInAt: daysAgo(13) },
  { name: 'Ethan Rossi', email: 'ethan.rossi@gmail.com', optedInAt: daysAgo(14) },
  { name: 'Maya Johnson', email: 'maya.johnson@outlook.com', optedInAt: daysAgo(15) },
  { name: 'Carlos Diaz', email: 'carlos.diaz@gmail.com', optedInAt: daysAgo(16) },
  { name: 'Grace Park', email: 'grace.park@gmail.com', optedInAt: daysAgo(18) },
  { name: 'Ryan Foster', email: 'ryan.foster@yahoo.com', optedInAt: daysAgo(20) },
  { name: 'Isabella Romano', email: 'isabella.romano@gmail.com', optedInAt: daysAgo(22) },
  { name: 'Daniel Cohen', email: 'daniel.cohen@gmail.com', optedInAt: daysAgo(25) },
  { name: 'Chloe Tremblay', email: 'chloe.tremblay@outlook.com', optedInAt: daysAgo(28) },
];

/* ------------------------------------------------------------------ */
/* Automation settings (DEMO: saved; real scheduling wired later)      */
/* ------------------------------------------------------------------ */

export interface AutomationSettings {
  monthlyReminder: boolean;
  pastCustomerMessages: boolean;
  frequency: 'weekly' | 'monthly';
}

export const DEFAULT_AUTOMATION: AutomationSettings = {
  monthlyReminder: false,
  pastCustomerMessages: false,
  frequency: 'monthly',
};

const STORAGE_PREFIX = 'localy.emailAutomation.v1';
const EVENT = 'localy:email-automation';

function keyFor(businessId: string): string {
  return `${STORAGE_PREFIX}:${businessId || 'demo'}`;
}

function readSettings(businessId: string): AutomationSettings {
  if (typeof window === 'undefined') return DEFAULT_AUTOMATION;
  try {
    const raw = window.localStorage.getItem(keyFor(businessId));
    if (!raw) return DEFAULT_AUTOMATION;
    const parsed = JSON.parse(raw) as Partial<AutomationSettings>;
    return { ...DEFAULT_AUTOMATION, ...parsed };
  } catch {
    return DEFAULT_AUTOMATION;
  }
}

function writeSettings(businessId: string, settings: AutomationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    // DEMO: automation settings saved; real scheduling to be wired later.
    window.localStorage.setItem(keyFor(businessId), JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* ignore quota / serialization errors in demo */
  }
}

/** React hook: read + update a business's automation settings (localStorage). */
export function useAutomationSettings(businessId: string) {
  const [settings, setSettings] = useState<AutomationSettings>(DEFAULT_AUTOMATION);

  useEffect(() => {
    setSettings(readSettings(businessId));
    const sync = () => setSettings(readSettings(businessId));
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [businessId]);

  const update = useCallback(
    (patch: Partial<AutomationSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        writeSettings(businessId, next);
        return next;
      });
    },
    [businessId]
  );

  return { settings, update };
}
