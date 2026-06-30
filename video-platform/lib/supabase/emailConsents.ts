import { supabase } from './client';

/**
 * Email consents — customers who opted in (at checkout) to receive emails from a
 * specific business. See supabase/20260629_email_consents.sql.
 *
 * Demo/slug sellers are stored too (business_id is text), so checkout never
 * crashes. All writes are best-effort: failures are swallowed so the checkout
 * flow is never blocked by a consent insert.
 */

export interface EmailConsent {
  id?: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  business_id: string;
  business_name: string | null;
  opted_in: boolean;
  created_at?: string;
}

export interface SaveConsentInput {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  businessId: string;
  businessName?: string | null;
}

/**
 * Record (upsert) a customer's opt-in to a business's email list. Best-effort:
 * returns true/false and never throws, so callers can fire-and-forget.
 */
export async function saveConsent(input: SaveConsentInput): Promise<boolean> {
  try {
    const { error } = await supabase.from('email_consents').upsert(
      {
        user_id: input.userId,
        user_email: input.userEmail ?? null,
        user_name: input.userName ?? null,
        business_id: input.businessId,
        business_name: input.businessName ?? null,
        opted_in: true,
      },
      { onConflict: 'user_id,business_id' }
    );
    if (error) {
      console.error('[emailConsents] saveConsent failed:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[emailConsents] saveConsent threw:', err);
    return false;
  }
}

/**
 * All opted-in customers for a business, newest first. Returns [] on any error
 * (e.g. the table doesn't exist yet) so the dashboard never breaks.
 */
export async function getBusinessConsents(businessId: string): Promise<EmailConsent[]> {
  if (!businessId) return [];
  try {
    const { data, error } = await supabase
      .from('email_consents')
      .select('id, user_id, user_email, user_name, business_id, business_name, opted_in, created_at')
      .eq('business_id', businessId)
      .eq('opted_in', true)
      .order('created_at', { ascending: false });
    if (error || !data) {
      if (error) console.error('[emailConsents] getBusinessConsents:', error.message || error);
      return [];
    }
    return data as EmailConsent[];
  } catch (err) {
    console.error('[emailConsents] getBusinessConsents threw:', err);
    return [];
  }
}
