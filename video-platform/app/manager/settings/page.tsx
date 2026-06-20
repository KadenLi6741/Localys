'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { CATEGORY_OPTIONS } from '@/lib/businessCategories';
import { getOwnerBusiness } from '@/lib/supabase/manager';
import { ManagerHeader, LoadingRow } from '../_components/ui';

function hoursText(hours: unknown): string {
  if (hours && typeof hours === 'object' && 'text' in hours) {
    const t = (hours as { text?: unknown }).text;
    return typeof t === 'string' ? t : '';
  }
  return '';
}

export default function ManagerSettings() {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [contact, setContact] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const b = await getOwnerBusiness(user.id);
      if (!cancelled && b) {
        setBusinessId(b.id);
        setName(b.business_name ?? '');
        setCategory(b.category ?? '');
        setAddress(b.address ?? '');
        setDescription(b.description ?? '');
        setHours(hoursText(b.business_hours));
        setContact(b.contact ?? '');
        setLogoUrl(b.profile_picture_url ?? '');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const inputCls =
    'w-full rounded-[12px] border border-border bg-surface px-4 py-2.5 text-body-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none';
  const labelCls = 'mb-1.5 block text-body-sm font-semibold text-foreground';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!businessId) {
      setError('No business found to update.');
      return;
    }
    if (name.trim().length < 2) {
      setError('Please enter a business name (at least 2 characters).');
      return;
    }
    const cat = CATEGORY_OPTIONS.find((c) => c.id === category);
    if (!cat) {
      setError('Please choose a category.');
      return;
    }
    if (logoUrl.trim() && !/^https?:\/\//i.test(logoUrl.trim())) {
      setError('Logo URL must start with http:// or https://');
      return;
    }

    setSaving(true);
    const { error: updErr } = await supabase
      .from('businesses')
      .update({
        business_name: name.trim(),
        business_type: cat.type,
        category: cat.id,
        description: description.trim() || null,
        address: address.trim() || null,
        contact: contact.trim() || null,
        business_hours: hours.trim() ? { text: hours.trim() } : null,
        profile_picture_url: logoUrl.trim() || null,
      })
      .eq('id', businessId);
    setSaving(false);

    if (updErr) {
      setError(updErr.message || 'Could not save changes. Please try again.');
      return;
    }
    setSaved(true);
  };

  return (
    <div>
      <ManagerHeader title="Settings" description="Edit your business profile shown to customers." />

      {loading ? (
        <LoadingRow label="Loading your business…" />
      ) : (
        <form onSubmit={handleSave} className="flex max-w-[640px] flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-soft">
          {error && (
            <div className="rounded-[12px] border border-destructive/40 bg-destructive/10 p-3 text-body-sm text-foreground" role="alert">
              {error}
            </div>
          )}
          {saved && (
            <div className="rounded-[12px] border border-success/40 bg-success/10 p-3 text-body-sm text-foreground" role="status">
              Changes saved.
            </div>
          )}

          <div>
            <label htmlFor="s-name" className={labelCls}>Business name *</label>
            <input id="s-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <label htmlFor="s-category" className={labelCls}>Category *</label>
            <select id="s-category" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="" disabled>Choose a category…</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="s-address" className={labelCls}>Address / location</label>
            <input id="s-address" className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main Street, City" />
          </div>

          <div>
            <label htmlFor="s-desc" className={labelCls}>Description</label>
            <textarea id="s-desc" className={cn(inputCls, 'min-h-[88px] resize-y')} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <label htmlFor="s-hours" className={labelCls}>Hours</label>
            <input id="s-hours" className={inputCls} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. Mon–Fri 9am–6pm" />
          </div>

          <div>
            <label htmlFor="s-contact" className={labelCls}>Contact (email or phone)</label>
            <input id="s-contact" className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>

          <div>
            <label htmlFor="s-logo" className={labelCls}>Logo image URL</label>
            <input id="s-logo" className={inputCls} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-primary px-6 py-2.5 text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
