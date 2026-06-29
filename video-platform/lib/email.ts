/**
 * Best-effort transactional email.
 *
 * Uses the Resend HTTP API when RESEND_API_KEY is configured; otherwise it is a
 * no-op that reports `false` (not sent). Callers must treat a `false` result as
 * non-fatal — the login flow's 77777 backup code means a failed/absent email can
 * never lock anyone out.
 */
const ORANGE = '#f97316';

export async function sendLoginCode(email: string, code: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Localy <onboarding@resend.dev>';
  if (!apiKey) return false;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#000000;padding:32px;max-width:480px;margin:0 auto">
    <h1 style="font-size:20px;font-weight:700;color:#000000;margin:0 0 8px">Your sign-in code</h1>
    <p style="font-size:14px;color:#000000;margin:0 0 20px">Enter this code to finish signing in to Localy.</p>
    <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:${ORANGE};background:#000000;border-radius:12px;padding:18px;text-align:center">${code}</div>
    <p style="font-size:12px;color:#000000;margin:20px 0 0">This code expires in 10 minutes. If you did not try to sign in, you can ignore this email.</p>
  </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Your Localy sign-in code',
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
