/**
 * API route: POST /api/verify-turnstile — server-side verification of a Cloudflare Turnstile token.
 * Purpose: Confirms a Turnstile challenge token with Cloudflare (using the secret key) so bot protection
 *   can't be bypassed from the client. Rate-limited, and can be toggled off in dev.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

interface TurnstileVerifyResponse {
	success: boolean;
	'error-codes'?: string[];
	hostname?: string;
	action?: string;
}

export async function POST(request: NextRequest) {
	// Rate limiting
	const ip = getClientIp(request);
	const rl = checkRateLimit(`verifyTurnstile:${ip}`, RATE_LIMITS.verifyTurnstile);
	if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

	try {
		const isProduction = process.env.NODE_ENV === 'production';
		const turnstileEnabledInDev = process.env.TURNSTILE_ENABLED_IN_DEV === 'true';

		if (!isProduction && !turnstileEnabledInDev) {
			return NextResponse.json({ success: true, bypassed: true });
		}

		const { token } = (await request.json()) as { token?: string };

		if (!token) {
			return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 });
		}

		const secret = process.env.TURNSTILE_SECRET_KEY;
		if (!secret) {
			return NextResponse.json({ success: false, error: 'Turnstile is not configured' }, { status: 500 });
		}

		const formData = new URLSearchParams();
		formData.append('secret', secret);
		formData.append('response', token);

		const forwardedFor = request.headers.get('x-forwarded-for');
		if (forwardedFor) {
			formData.append('remoteip', forwardedFor.split(',')[0].trim());
		}

		const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: formData.toString(),
			cache: 'no-store',
		});

		if (!verifyResponse.ok) {
			return NextResponse.json({ success: false, error: 'Verification request failed' }, { status: 502 });
		}

		const data = (await verifyResponse.json()) as TurnstileVerifyResponse;

		if (!data.success) {
			return NextResponse.json({
				success: false,
				errors: data['error-codes'] ?? [],
			});
		}

		if (isProduction) {
			const hostnameHeader = request.headers.get('host')?.split(':')[0]?.toLowerCase();
			const verifiedHostname = data.hostname?.toLowerCase();
			if (hostnameHeader && verifiedHostname && verifiedHostname !== hostnameHeader) {
				return NextResponse.json({
					success: false,
					error: 'Hostname mismatch',
					errors: data['error-codes'] ?? [],
				});
			}
		}

		return NextResponse.json({ success: true, errors: data['error-codes'] ?? [] });
	} catch (error) {
		console.error('Turnstile verification failed:', error);
		return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
	}
}
