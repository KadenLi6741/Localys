'use client';

import { useState, useEffect } from 'react';
import { getBusinessPaymentConfig, updateBusinessPaymentConfig } from '@/lib/supabase/profiles';

interface PaymentSettingsFormProps {
  businessId: string;
}

export function PaymentSettingsForm({ businessId }: PaymentSettingsFormProps) {
  const [upfrontPct, setUpfrontPct] = useState(100);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [businessId]);

  const loadConfig = async () => {
    const { data } = await getBusinessPaymentConfig(businessId);
    if (data) setUpfrontPct(data.upfront_payment_pct ?? 100);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await updateBusinessPaymentConfig(businessId, upfrontPct);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="text-white/40 text-sm">Loading settings...</div>;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-6">
      <h3 className="text-white font-semibold">Payment Settings</h3>

      <div>
        <label className="block text-white/60 text-sm mb-2">Upfront Payment Percentage</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={upfrontPct}
            onChange={(e) => setUpfrontPct(parseInt(e.target.value))}
            className="flex-1 accent-green-500"
          />
          <span className="text-white font-semibold text-lg w-16 text-right">{upfrontPct}%</span>
        </div>
        <p className="text-white/30 text-xs mt-2">
          {upfrontPct === 100
            ? 'Customers pay the full amount when placing their pre-order.'
            : upfrontPct === 0
            ? 'No upfront payment. Customers pay the full amount at the restaurant.'
            : `Customers pay ${upfrontPct}% when ordering. The remaining ${100 - upfrontPct}% is collected at the restaurant.`}
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-300 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
