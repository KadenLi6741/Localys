import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ success: false, error: 'No token provided' }, { status: 400 });
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 });
  }

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
    }
  );

  const data = await response.json();

  if (!data.success) {
    return NextResponse.json(
      { success: false, error: 'Turnstile verification failed' },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
