/**
 * Single source of truth for the Gemini model used across all server-side API
 * routes (assistant, ai-search, business-summary, ai-email).
 *
 * gemini-3.1-flash-lite: newer generation with a larger free-tier quota
 * (~500/day vs ~20/day). To change the model app-wide, edit ONLY this constant.
 *
 * GEMINI_API_KEY stays server-side — this module is imported only by route
 * handlers, never by client components.
 */
export const GEMINI_MODEL = 'gemini-3.1-flash-lite';

/** Build the generateContent endpoint URL for the configured model. */
export const geminiUrl = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
