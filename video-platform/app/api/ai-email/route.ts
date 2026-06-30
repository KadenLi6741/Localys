import { NextRequest, NextResponse } from 'next/server';
import { geminiUrl } from '@/lib/gemini';

/**
 * Generate a friendly marketing email (subject + body) for a business via Gemini
 * (server-side; GEMINI_API_KEY never leaves the server). The business edits the
 * result before sending. Model id is centralized in lib/gemini.ts.
 *
 * This route only runs when the business explicitly clicks "Write with AI" — it
 * is never called on render. It ALWAYS returns a usable email: if the key is
 * missing or Gemini errors/parses badly, a simple template is returned so the UI
 * never hangs.
 */

interface EmailDraft {
  subject: string;
  body: string;
}

/** No-API fallback so the response is never empty and never hangs. */
function templateEmail(businessName: string, topic: string): EmailDraft {
  const name = businessName?.trim() || 'our shop';
  const t = topic?.trim() || 'an update';
  return {
    subject: t.length <= 60 ? t : `${t.slice(0, 57)}...`,
    body:
      `Hi there,\n\n` +
      `We wanted to share ${t} with you from ${name}. As a valued customer, ` +
      `you're the first to know — we'd love to see you again soon.\n\n` +
      `Thanks for supporting local.\n${name}`,
  };
}

export async function POST(req: NextRequest) {
  let businessName = '';
  let topic = '';

  try {
    const body = await req.json();
    businessName = typeof body?.businessName === 'string' ? body.businessName.trim() : '';
    topic = typeof body?.topic === 'string' ? body.topic.trim() : '';
  } catch {
    return NextResponse.json({ ...templateEmail('', ''), source: 'fallback' }, { status: 200 });
  }

  if (!topic) {
    return NextResponse.json({ ...templateEmail(businessName, ''), source: 'fallback' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ...templateEmail(businessName, topic), source: 'fallback' });
  }

  const prompt = `Write a short, friendly marketing email for a local business to send to customers who opted in.

Business name: ${businessName || 'a local business'}
Topic: ${topic}

Rules: warm and concise (3-5 short sentences), no emojis, plain text body. Address the customer generically (e.g. "Hi there,"). Return STRICT JSON: {"subject": "...", "body": "..."}. No markdown, no extra text.`;

  try {
    const geminiRes = await fetch(geminiUrl(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!geminiRes.ok) {
      console.error('[ai-email] Gemini API error', geminiRes.status, await geminiRes.text());
      return NextResponse.json({ ...templateEmail(businessName, topic), source: 'fallback' });
    }

    const data = await geminiRes.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      try {
        const parsed = JSON.parse(text) as Partial<EmailDraft>;
        const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : '';
        const bodyText = typeof parsed.body === 'string' ? parsed.body.trim() : '';
        if (subject && bodyText) {
          return NextResponse.json({ subject, body: bodyText, source: 'ai' });
        }
      } catch {
        // fall through to template
      }
    }
    return NextResponse.json({ ...templateEmail(businessName, topic), source: 'fallback' });
  } catch (err) {
    console.error('[ai-email] request failed', err);
    return NextResponse.json({ ...templateEmail(businessName, topic), source: 'fallback' });
  }
}
