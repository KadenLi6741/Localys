/**
 * Login email-verification-code flow (every sign-in).
 *
 * Gates login behind a 6-digit email code WITHOUT logging the user into the
 * browser until the code is verified:
 *   - action 'send'   : verify email+password server-side (no persisted session).
 *                       On success, generate a 6-digit code, email it (best-effort),
 *                       and return an ENCRYPTED ticket that holds the pending session
 *                       tokens + the code. The browser never sees the code or the raw
 *                       tokens until a valid code is entered.
 *   - action 'resend' : keep the same pending session, mint a fresh code + ticket.
 *   - action 'verify' : accept the emailed code OR the permanent backup '77777'.
 *                       On success, release the session tokens so the client can
 *                       complete the login.
 *
 * Demo-safe: '77777' is ALWAYS accepted (even if the email never arrived or the
 * code expired), so no one can be locked out.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendLoginCode } from '@/lib/email';

export const runtime = 'nodejs';

const BACKUP_CODE = '77777';
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// Server-only secret used to derive the ticket encryption key.
const TICKET_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || 'localy-fallback-secret';

interface TicketPayload {
  at: string; // access_token
  rt: string; // refresh_token
  code: string; // emailed 6-digit code
  exp: number; // expiry (ms epoch)
}

const ticketKey = crypto.createHash('sha256').update(TICKET_SECRET).digest(); // 32 bytes

function encryptTicket(payload: TicketPayload): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ticketKey, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

function decryptTicket(ticket: string): TicketPayload | null {
  try {
    const raw = Buffer.from(ticket, 'base64url');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', ticketKey, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(dec.toString('utf8')) as TicketPayload;
  } catch {
    return null;
  }
}

function sixDigitCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function serverClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const action = body.action;

  // ----- send: verify password, then issue code + ticket -----
  if (action === 'send') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const captchaToken = body.captchaToken ? String(body.captchaToken) : undefined;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Password check FIRST. Wrong password = normal error, no code sent.
    const { data, error } = await serverClient().auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message || 'Invalid email or password.' },
        { status: 401 },
      );
    }

    const code = sixDigitCode();
    const ticket = encryptTicket({
      at: data.session.access_token,
      rt: data.session.refresh_token,
      code,
      exp: Date.now() + CODE_TTL_MS,
    });

    const sent = await sendLoginCode(email, code);
    return NextResponse.json({ ok: true, ticket, sent });
  }

  // ----- resend: keep pending session, new code + ticket -----
  if (action === 'resend') {
    const payload = decryptTicket(String(body.ticket ?? ''));
    if (!payload) {
      return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 400 });
    }
    const email = String(body.email ?? '').trim().toLowerCase();
    const code = sixDigitCode();
    const ticket = encryptTicket({ ...payload, code, exp: Date.now() + CODE_TTL_MS });
    const sent = email ? await sendLoginCode(email, code) : false;
    return NextResponse.json({ ok: true, ticket, sent });
  }

  // ----- verify: accept emailed code OR 77777 backup -----
  if (action === 'verify') {
    const code = String(body.code ?? '').trim();
    const payload = decryptTicket(String(body.ticket ?? ''));

    // BACKUP CODE FIRST, INDEPENDENTLY: '77777' always completes login — no
    // dependence on a generated code, the email status, or expiry. The only
    // thing it needs is the pending session captured when the password was
    // verified (held in the encrypted ticket).
    if (code === BACKUP_CODE) {
      if (payload) {
        return NextResponse.json({ ok: true, access_token: payload.at, refresh_token: payload.rt });
      }
      // No decryptable session means the password step wasn't completed, so
      // there is nothing to log in to — send them back to the start.
      return NextResponse.json(
        { error: 'Your sign-in session expired. Please sign in again, then use 77777.' },
        { status: 400 },
      );
    }

    // Emailed-code path requires a valid, unexpired ticket.
    if (!payload) {
      return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 400 });
    }
    const isExpired = Date.now() > payload.exp;
    const isMatch = !isExpired && code.length === 6 && code === payload.code;
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect code, try again or use your backup code.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, access_token: payload.at, refresh_token: payload.rt });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
