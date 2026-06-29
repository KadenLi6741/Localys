/**
 * Auth.ts — TypeScript types for authentication form data (sign up / sign in).
 * Purpose: Shapes the credentials/registration payloads used by the auth flow and auth data layer.
 *   Types only — no runtime code.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  username: string;
  accountType: 'business' | 'user';
  businessType?: 'food' | 'retail' | 'service';
  captchaToken?: string;
}

export interface SignInData {
  identifier: string;
  password: string;
  captchaToken?: string;
}
