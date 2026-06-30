/**
 * Localy Premium ($5/month) shared helpers.
 *
 * Customer perk: earn 15% more points on everything (1.15x multiplier).
 * Business perk: unlocks the Localy Emails dashboard tools (AI writing +
 * automation) — gated in the UI, not here.
 *
 * Premium status lives on profiles.is_premium (see supabase/20260627_premium.sql),
 * read via getUserPremiumStatus() in lib/supabase/profiles.ts.
 */

export const PREMIUM_PRICE_LABEL = '$5/month';
export const PREMIUM_POINTS_MULTIPLIER = 1.15;

/** Points a user actually earns: +15% when Premium, rounded to a whole point. */
export function applyPremiumPoints(base: number, isPremium: boolean): number {
  return isPremium ? Math.round(base * PREMIUM_POINTS_MULTIPLIER) : base;
}
