'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { CATEGORY_OPTIONS } from '@/lib/businessCategories';

export default function CreateBusinessPage() {
  return (
    <ProtectedRoute>
      <CreateBusinessForm />
    </ProtectedRoute>
  );
}

function CreateBusinessForm() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [contact, setContact] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputCls =
    'w-full rounded-[12px] border border-border bg-surface px-4 py-2.5 text-body-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none';
  const labelCls = 'mb-1.5 block text-body-sm font-semibold text-foreground';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation — required fields + basic checks.
    if (!user) {
      setError('You must be signed in to create a business.');
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
    // Create the business (owned by the current user), then flip the account
    // type to "business" and open Localys Manager.
    const { data, error: insErr } = await supabase
      .from('businesses')
      .insert({
        owner_id: user.id,
        business_name: name.trim(),
        business_type: cat.type,
        category: cat.id,
        description: description.trim() || null,
        address: address.trim() || null,
        contact: contact.trim() || null,
        business_hours: hours.trim() ? { text: hours.trim() } : null,
        profile_picture_url: logoUrl.trim() || null,
      })
      .select('id')
      .single();

    if (insErr || !data) {
      setSaving(false);
      setError(insErr?.message || 'Could not create the business. Please try again.');
      return;
    }

    await supabase.from('profiles').update({ account_type: 'business' }).eq('id', user.id);
    router.push('/manager');
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-12">
      <div className="mx-auto max-w-[640px] px-4 pt-8 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Store className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-heading-sm font-bold text-foreground">Create a business account</h1>
            <p className="text-body-sm text-muted-foreground">Set up your storefront, then manage it in Localys Manager.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-[12px] border border-destructive/40 bg-destructive/10 p-3 text-body-sm text-foreground" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-soft">
          <div>
            <label htmlFor="biz-name" className={labelCls}>Business name *</label>
            <input id="biz-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Carbon Bar" required />
          </div>

          <div>
            <label htmlFor="biz-category" className={labelCls}>Category *</label>
            <select id="biz-category" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="" disabled>Choose a category…</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="biz-address" className={labelCls}>Address / location</label>
            <input id="biz-address" className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main Street, City" />
          </div>

          <div>
            <label htmlFor="biz-desc" className={labelCls}>Description</label>
            <textarea id="biz-desc" className={cn(inputCls, 'min-h-[88px] resize-y')} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does your business offer?" />
          </div>

          <div>
            <label htmlFor="biz-hours" className={labelCls}>Hours</label>
            <input id="biz-hours" className={inputCls} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. Mon–Fri 9am–6pm" />
          </div>

          <div>
            <label htmlFor="biz-contact" className={labelCls}>Contact (email or phone)</label>
            <input id="biz-contact" className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="hello@business.com" />
          </div>

          <div>
            <label htmlFor="biz-logo" className={labelCls}>Logo image URL (optional)</label>
            <input id="biz-logo" className={inputCls} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…  (upload comes in Settings)" />
          </div>

          <div className="mt-2 flex items-center justify-end gap-3">
            <button type="button" onClick={() => router.push('/')} className="rounded-full px-5 py-2.5 text-body-sm font-semibold text-foreground transition-colors hover:bg-surface">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-primary px-6 py-2.5 text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
