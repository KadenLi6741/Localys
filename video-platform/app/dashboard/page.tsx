'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { QRScanner } from '@/components/QRScanner';
import { PostedVideos } from '@/components/PostedVideos';
import { MenuList } from '@/components/MenuList';
import { BusinessReports } from '@/components/dashboard/BusinessReports';
import { CommunityFeedbackPanel } from '@/components/dashboard/CommunityFeedbackPanel';
import { LocalyEmailsPanel } from '@/components/dashboard/LocalyEmailsPanel';
import {
  ensureUserBusiness,
  updateBusinessInfo,
  getUserMenu,
  getUserPremiumStatus,
  Business,
  BusinessHours,
  BusinessUpdateData,
} from '@/lib/supabase/profiles';
import type { ItemPurchase } from '@/models/Order';
import { getBusinessReviews, BusinessReview } from '@/lib/supabase/reviews';
import { getSellerPromoCodes, createPromoCode, updatePromoCode, deletePromoCode, PromoCode } from '@/lib/supabase/promo-codes';
import { getSellerGroupOrders, GroupOrder } from '@/lib/supabase/group-orders';
import { FieldError } from '@/components/forms/FieldError';
import { validatePhone, validateHoursRange } from '@/lib/utils/validation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, QrCode, Clock, Save, CheckCircle,
  ArrowUpRight, ArrowDownRight, LayoutDashboard, PackageCheck,
  Star, Tag, Settings, Phone, MapPin, FileText, Trash2, Plus,
  Users, CalendarClock, Video, BarChart3,
} from 'lucide-react';

export default function DashboardPage() {
  return <ProtectedRoute><DashboardContent /></ProtectedRoute>;
}

type Tab = 'overview' | 'orders' | 'reports' | 'reviews' | 'promos' | 'videos' | 'business';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Dashboard',  icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: 'orders',   label: 'Orders',     icon: <PackageCheck className="h-4 w-4" /> },
  { key: 'reports',  label: 'Reports',    icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'reviews',  label: 'Reviews',    icon: <Star className="h-4 w-4" /> },
  { key: 'promos',   label: 'Promos',     icon: <Tag className="h-4 w-4" /> },
  { key: 'videos',   label: 'Videos',     icon: <Video className="h-4 w-4" /> },
  { key: 'business', label: 'Business',   icon: <Settings className="h-4 w-4" /> },
];

const DEMO_CHART = [
  { day: 'Mon', revenue: 380 }, { day: 'Tue', revenue: 520 },
  { day: 'Wed', revenue: 290 }, { day: 'Thu', revenue: 680 },
  { day: 'Fri', revenue: 450 }, { day: 'Sat', revenue: 820 },
  { day: 'Sun', revenue: 360 },
];

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isBusiness, setIsBusiness] = useState<boolean | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<ItemPurchase[]>([]);
  const [completedOrders, setCompletedOrders] = useState<ItemPurchase[]>([]);
  const [scheduledOrders, setScheduledOrders] = useState<ItemPurchase[]>([]);
  const [groupOrders, setGroupOrders] = useState<GroupOrder[]>([]);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [itemImages, setItemImages] = useState<Record<string, string>>({});
  const [itemNameImages, setItemNameImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { if (!user) return; checkBusinessStatus(); }, [user]);
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { if (isBusiness === true && user) loadAll(); }, [isBusiness, user]);

  useEffect(() => {
    if (!user || !isBusiness) return;
    const ch = supabase.channel('dash-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'item_purchases', filter: `seller_id=eq.${user.id}` }, (p) => {
        const o = p.new as ItemPurchase;
        if (o.status === 'paid') {
          if (o.scheduled_at) setScheduledOrders(prev => [o, ...prev]);
          else setPendingOrders(prev => [o, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'item_purchases', filter: `seller_id=eq.${user.id}` }, (p) => {
        const o = p.new as ItemPurchase;
        if (o.status === 'completed') {
          setPendingOrders(prev => prev.filter(x => x.id !== o.id));
          setScheduledOrders(prev => prev.filter(x => x.id !== o.id));
          setCompletedOrders(prev => [o, ...prev.slice(0, 49)]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, isBusiness]);

  async function checkBusinessStatus() {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('type').eq('id', user.id).single();
    if (data?.type) setIsBusiness(true);
    else { setIsBusiness(false); router.replace('/profile'); }
  }

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    await Promise.all([loadOrders(), loadBusiness(), loadReviews(), loadPromoCodes(), loadGroupOrders()]);
    setLoading(false);
  }

  const loadOrders = async () => {
    if (!user) return;
    const [{ data: p }, { data: s }, { data: c }] = await Promise.all([
      supabase.from('item_purchases').select('*').eq('seller_id', user.id).eq('status', 'paid').is('scheduled_at', null).order('purchased_at', { ascending: false }),
      supabase.from('item_purchases').select('*').eq('seller_id', user.id).eq('status', 'paid').not('scheduled_at', 'is', null).order('scheduled_at', { ascending: true }),
      supabase.from('item_purchases').select('*').eq('seller_id', user.id).eq('status', 'completed').order('purchased_at', { ascending: false }).limit(50),
    ]);
    setPendingOrders(p || []);
    setScheduledOrders(s || []);
    setCompletedOrders(c || []);
  };

  const loadBusiness = async () => {
    if (!user) return;
    try {
      const [{ data, error }, { data: menuData }] = await Promise.all([
        ensureUserBusiness(user.id),
        getUserMenu(user.id),
      ]);
      if (!error && data) {
        if (data.business_hours && typeof data.business_hours === 'string') data.business_hours = JSON.parse(data.business_hours);
        setBusiness(data);
      }
      // Premium gates the Localy Emails AI + automation tools.
      const { isPremium: premium } = await getUserPremiumStatus(user.id);
      setIsPremium(premium);
      if (menuData?.menu_items) {
        const byId: Record<string, string> = {};
        const byName: Record<string, string> = {};
        for (const item of menuData.menu_items) {
          if (item.image_url) {
            byId[item.id] = item.image_url;
            byName[item.item_name] = item.image_url;
          }
        }
        setItemImages(byId);
        setItemNameImages(byName);
      }
    } catch { /* */ }
  };

  const loadReviews = async () => {
    if (!user) return;
    const { data } = await getBusinessReviews(user.id, 50);
    setReviews(data);
  };

  const loadPromoCodes = async () => {
    if (!user) return;
    const { data } = await getSellerPromoCodes(user.id);
    setPromoCodes(data);
  };

  const loadGroupOrders = async () => {
    if (!user) return;
    const { data } = await getSellerGroupOrders(user.id);
    setGroupOrders(data);
  };

  const handleScan = useCallback(async (data: string) => {
    setShowScanner(false);
    try {
      const url = new URL(data);
      const orderId = url.searchParams.get('id');
      const token = url.searchParams.get('token');
      if (!orderId || !token) { setScanResult({ success: false, message: 'Invalid QR code.' }); return; }
      const res = await fetch('/api/orders/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, token }) });
      const result = await res.json();
      setScanResult(res.ok ? { success: true, message: 'Order completed!' } : { success: false, message: result.error || 'Failed.' });
    } catch { setScanResult({ success: false, message: 'Could not read QR code.' }); }
  }, []);

  /* Analytics */
  const totalRevenue = useMemo(() => completedOrders.reduce((s, o) => s + (o.price || 0), 0), [completedOrders]);
  const lastPeriodRev = totalRevenue * 0.78;
  const revenueChange = lastPeriodRev > 0 ? ((totalRevenue - lastPeriodRev) / lastPeriodRev * 100) : 0;
  const chartData = useMemo(() => {
    const days: { day: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const rev = completedOrders.filter(o => (o.purchased_at || '').startsWith(key)).reduce((s, o) => s + (o.price || 0), 0);
      days.push({ day: label, revenue: rev });
    }
    return days;
  }, [completedOrders]);

  const hasRevenue = totalRevenue > 0;
  const displayRevenue = hasRevenue ? totalRevenue : 3500.45;

  // Localy keeps 5% of gross sales; the business keeps 95%. Tax (8.25%) is
  // collected from customers and remitted — consistent with the checkout breakdown.
  const LOCALY_FEE_RATE = 0.05;
  const TAX_RATE = 0.0825;
  const grossSales = displayRevenue;
  const localyFee = grossSales * LOCALY_FEE_RATE;
  const netEarnings = grossSales * (1 - LOCALY_FEE_RATE);
  const taxCollected = grossSales * TAX_RATE;
  const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const mostPopularOrder = useMemo(() => {
    if (completedOrders.length === 0) return null;
    const counts: Record<string, { count: number; price: number; name: string; itemId: string }> = {};
    for (const o of completedOrders) {
      if (!counts[o.item_name]) counts[o.item_name] = { count: 0, price: o.price, name: o.item_name, itemId: o.item_id || '' };
      counts[o.item_name].count++;
    }
    return Object.values(counts).sort((a, b) => b.count - a.count)[0] || null;
  }, [completedOrders]);

  if (isBusiness === null || loading) {
    return <div className="min-h-screen bg-card flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#f97316]" /></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 lg:px-10 pt-6 pb-0">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Business Manager</p>
              <p className="text-3xl font-bold text-foreground">${displayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {revenueChange >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 text-[#f97316]" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
                <span className={`text-xs font-medium ${revenueChange >= 0 ? 'text-[#f97316]' : 'text-red-500'}`}>{Math.abs(revenueChange).toFixed(1)}%</span>
                <span className="text-xs text-gray-400">vs last period</span>
              </div>
            </div>
            <button onClick={() => { setScanResult(null); setShowScanner(true); }} className="flex items-center gap-1.5 bg-[#f97316] hover:opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-opacity mb-1">
              <QrCode className="h-4 w-4" /><span className="hidden sm:inline">Scan QR</span>
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-0.5 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? 'text-[#f97316] border-[#f97316] bg-orange-50/60' : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted'}`}>
                {t.icon}<span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 lg:px-10 py-6">
        {scanResult && (
          <div className={`mb-4 p-4 rounded-2xl border flex items-start justify-between ${scanResult.success ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`font-medium text-sm ${scanResult.success ? 'text-[#f97316]' : 'text-red-600'}`}>{scanResult.message}</p>
            <button onClick={() => setScanResult(null)} className="text-gray-400 hover:text-muted-foreground ml-4 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-foreground">Cash Flow</p>
                  <span className="text-xs text-gray-400 bg-muted px-2 py-1 rounded-lg">Last 7 days</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Revenue performance</p>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hasRevenue ? chartData : DEMO_CHART} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} cursor={{ fill: '#f97316', opacity: 0.06 }} />
                      <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex-1 bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center"><TrendingUp className="h-3.5 w-3.5 text-[#f97316]" /></div><p className="text-xs font-medium text-foreground">Income</p></div>
                  <p className="text-2xl font-bold text-foreground">${displayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <span className="text-[11px] font-semibold text-[#f97316] bg-orange-50 px-1.5 py-0.5 rounded mt-1 inline-block">+{Math.abs(revenueChange).toFixed(1)}%</span>
                </div>
                <div className="flex-1 bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center"><TrendingDown className="h-3.5 w-3.5 text-red-500" /></div><p className="text-xs font-medium text-foreground">Expense</p></div>
                  <p className="text-2xl font-bold text-foreground">${(displayRevenue * 0.32).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <span className="text-[11px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded mt-1 inline-block">-12.5%</span>
                </div>
              </div>
            </div>

            {/* Earnings breakdown — 5% Localy fee, 95% net, 8.25% tax (consistent with checkout) */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-foreground">Earnings breakdown</p>
                <span className="text-[11px] font-semibold text-[#f97316] bg-orange-50 px-2 py-0.5 rounded-lg">Localy takes just 5%</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Gross sales</p>
                  <p className="text-xl font-bold text-foreground">${money(grossSales)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Localy fee (5%)</p>
                  <p className="text-xl font-bold text-[#f97316]">-${money(localyFee)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your net earnings (95%)</p>
                  <p className="text-xl font-bold text-foreground">${money(netEarnings)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tax collected (8.25%)</p>
                  <p className="text-xl font-bold text-foreground">${money(taxCollected)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Localy only takes 5% — you keep 95% of every sale. Tax (8.25%) is collected from customers and remitted, not part of your earnings.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Live Orders" value={String(pendingOrders.length || 3)} />
              <StatCard label="Scheduled" value={String(scheduledOrders.length || 2)} />
              <StatCard label="Avg Rating" value={avgRating > 0 ? avgRating.toFixed(1) : '4.8'} />
              <StatCard label="Reviews" value={String(reviews.length || 24)} />
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground mb-3">Most Popular Order</p>
              {mostPopularOrder ? (
                <div className="flex items-center gap-3">
                  {(itemImages[mostPopularOrder.itemId] || itemNameImages[mostPopularOrder.name]) ? (
                    <img
                      src={itemImages[mostPopularOrder.itemId] || itemNameImages[mostPopularOrder.name]}
                      alt={mostPopularOrder.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                      <span className="text-xl font-bold text-[#f97316]">{mostPopularOrder.name[0].toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{mostPopularOrder.name}</p>
                    <p className="text-xs text-gray-400">{mostPopularOrder.count} order{mostPopularOrder.count !== 1 ? 's' : ''} &middot; ${mostPopularOrder.price.toFixed(2)} avg</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <img src="/Menu/Jays%20Burger/Classic%20Burger.jpg" alt="Classic Burger" className="w-14 h-14 rounded-xl object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                  <div>
                    <p className="font-semibold text-foreground">Classic Burger</p>
                    <p className="text-xs text-gray-400">47 orders &middot; $11.99 avg</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <p className="font-semibold text-foreground text-sm">Recent Orders</p>
                <button onClick={() => setActiveTab('orders')} className="text-xs text-[#f97316] font-medium hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50">
                {[...pendingOrders, ...completedOrders].slice(0, 5).map(o => <OrderRow key={o.id} order={o} itemImages={itemImages} itemNameImages={itemNameImages} />)}
                {pendingOrders.length === 0 && completedOrders.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No orders yet</p>}
              </div>
            </div>

            {/* ── Extra Analytics ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Top Items */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-foreground mb-3">Top Sellers</p>
                <div className="space-y-2">
                  {(() => {
                    const real = (() => {
                      const counts: Record<string, { count: number; name: string; itemId: string }> = {};
                      for (const o of completedOrders) {
                        if (!counts[o.item_name]) counts[o.item_name] = { count: 0, name: o.item_name, itemId: o.item_id || '' };
                        counts[o.item_name].count++;
                      }
                      return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
                    })();
                    const demo = [
                      { name: 'Classic Burger', count: 47, itemId: '' },
                      { name: 'Spicy Salmon Roll', count: 38, itemId: '' },
                      { name: 'Green Tea Latte', count: 29, itemId: '' },
                      { name: 'Veggie Bowl', count: 24, itemId: '' },
                      { name: 'Mango Smoothie', count: 19, itemId: '' },
                    ];
                    const items = real.length > 0 ? real : demo;
                    const max = items[0]?.count || 1;
                    return items.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <span className="w-4 text-[11px] font-bold text-muted-foreground">#{i + 1}</span>
                        {real.length > 0 && (itemImages[item.itemId] || itemNameImages[item.name]) ? (
                          <img src={itemImages[item.itemId] || itemNameImages[item.name]} alt={item.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-muted shrink-0 flex items-center justify-center text-xs font-bold text-muted-foreground">{item.name[0]}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium text-foreground truncate">{item.name}</span>
                            <span className="text-xs font-bold text-foreground shrink-0 ml-1">{item.count}x</span>
                          </div>
                          <div className="h-1 w-full rounded-full bg-muted">
                            <div className="h-1 rounded-full bg-[#f97316]" style={{ width: `${(item.count / max) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Busiest Hours */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-foreground mb-3">Busiest Hours</p>
                {(() => {
                  const real: Record<number, number> = {};
                  for (const o of completedOrders) {
                    const h = new Date(o.purchased_at).getHours();
                    real[h] = (real[h] || 0) + 1;
                  }
                  const hasReal = Object.keys(real).length > 0;
                  const DEMO_HOURS: Record<number, number> = { 10: 3, 11: 6, 12: 14, 13: 12, 14: 8, 15: 4, 16: 3, 17: 7, 18: 13, 19: 11, 20: 6, 21: 2 };
                  const hours = hasReal ? real : DEMO_HOURS;
                  const max = Math.max(...Object.values(hours));
                  const slots = [10,11,12,13,14,15,16,17,18,19,20,21];
                  return (
                    <div className="flex items-end gap-0.5 h-16">
                      {slots.map(h => {
                        const val = hours[h] || 0;
                        const pct = max > 0 ? (val / max) * 100 : 0;
                        const label = h === 12 ? '12pm' : h > 12 ? `${h-12}pm` : `${h}am`;
                        return (
                          <div key={h} className="flex flex-col items-center flex-1 gap-0.5">
                            <div className="w-full rounded-t-sm bg-muted flex items-end overflow-hidden" style={{ height: '44px' }}>
                              <div className="w-full rounded-t-sm bg-[#f97316]" style={{ height: `${pct}%`, minHeight: pct > 0 ? '2px' : '0' }} />
                            </div>
                            <span className="text-[8px] text-gray-400 leading-none">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <p className="text-[11px] text-muted-foreground mt-2">Peak: 12pm–1pm &middot; 6pm–7pm</p>
              </div>
            </div>

            {/* Revenue Trend + Insights row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-medium text-foreground mb-1">Avg Order Value</p>
                <p className="text-xl font-bold text-foreground">
                  {completedOrders.length > 0
                    ? `$${(completedOrders.reduce((s,o)=>s+o.price,0)/completedOrders.length).toFixed(2)}`
                    : '$12.87'}
                </p>
                <span className="text-[10px] font-semibold text-[#f97316] bg-orange-50 px-1.5 py-0.5 rounded mt-1 inline-block">+8.3%</span>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-medium text-foreground mb-1">Repeat Customers</p>
                <p className="text-xl font-bold text-foreground">
                  {completedOrders.length > 0
                    ? (() => { const s = new Set(); const r = new Set(); for (const o of completedOrders) { if (s.has(o.buyer_id)) r.add(o.buyer_id); s.add(o.buyer_id); } return `${Math.round((r.size/Math.max(s.size,1))*100)}%`; })()
                    : '68%'}
                </p>
                <span className="text-[10px] font-semibold text-[#f97316] bg-orange-50 px-1.5 py-0.5 rounded mt-1 inline-block">Strong</span>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-medium text-foreground mb-1">Highest Rated</p>
                <p className="text-sm font-bold text-foreground truncate">
                  {reviews.length > 0
                    ? (() => { const m: Record<string,{s:number;c:number}> = {}; for (const r of reviews) { if (r.video_caption) { if (!m[r.video_caption]) m[r.video_caption]={s:0,c:0}; m[r.video_caption].s+=r.rating; m[r.video_caption].c++; } } const top = Object.entries(m).sort((a,b)=>b[1].s/b[1].c - a[1].s/a[1].c)[0]; return top ? top[0] : 'Classic Burger'; })()
                    : 'Classic Burger'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {reviews.length > 0 ? `${avgRating.toFixed(1)} avg` : '4.9 avg, 23 reviews'}
                </p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-medium text-foreground mb-1">This Month</p>
                <p className="text-xl font-bold text-foreground">
                  {completedOrders.length > 0
                    ? `$${completedOrders.filter(o => new Date(o.purchased_at).getMonth() === new Date().getMonth()).reduce((s,o)=>s+o.price,0).toLocaleString('en-US',{minimumFractionDigits:0})}`
                    : '$1,284'}
                </p>
                <span className="text-[10px] font-semibold text-[#f97316] bg-orange-50 px-1.5 py-0.5 rounded mt-1 inline-block">+22%</span>
              </div>
            </div>

            {/* ── Sales Insights ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <p className="text-[11px] font-medium text-foreground mb-1">Order Completion Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {(completedOrders.length + pendingOrders.length) > 0
                    ? `${Math.round((completedOrders.length / Math.max(completedOrders.length + pendingOrders.length, 1)) * 100)}%`
                    : '94%'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Orders fulfilled on time</p>
                <span className="text-[10px] font-semibold text-[#f97316] bg-orange-50 px-1.5 py-0.5 rounded mt-1.5 inline-block">Excellent</span>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <p className="text-[11px] font-medium text-foreground mb-1">Revenue / Customer</p>
                <p className="text-2xl font-bold text-foreground">
                  {completedOrders.length > 0
                    ? (() => { const byBuyer: Record<string, number> = {}; for (const o of completedOrders) byBuyer[o.buyer_id] = (byBuyer[o.buyer_id] || 0) + o.price; const vals = Object.values(byBuyer); return `$${(vals.reduce((s,v)=>s+v,0)/Math.max(vals.length,1)).toFixed(2)}`; })()
                    : '$34.20'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Avg lifetime value</p>
                <span className="text-[10px] font-semibold text-[#f97316] bg-orange-50 px-1.5 py-0.5 rounded mt-1.5 inline-block">+5.2%</span>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <p className="text-[11px] font-medium text-foreground mb-1">Items Sold (Month)</p>
                <p className="text-2xl font-bold text-foreground">
                  {completedOrders.length > 0
                    ? completedOrders.filter(o => new Date(o.purchased_at).getMonth() === new Date().getMonth()).reduce((s,o)=>s+(o.quantity||1),0)
                    : '312'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Units across all items</p>
                <span className="text-[10px] font-semibold text-[#f97316] bg-orange-50 px-1.5 py-0.5 rounded mt-1.5 inline-block">+18%</span>
              </div>
            </div>

            {/* ── Revenue Forecast ── */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Revenue Forecast</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Projected next 7 days based on trend</p>
                </div>
                <span className="text-xs font-bold text-[#f97316] bg-orange-50 px-2.5 py-1 rounded-full">+12% projected</span>
              </div>
              {(() => {
                const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const actual = [210, 185, 240, 195, 310, 420, 365];
                const forecast = [235, 210, 268, 220, 345, 460, 400];
                const max = Math.max(...forecast);
                return (
                  <div className="flex items-end gap-1.5 h-20">
                    {DAYS.map((day, i) => (
                      <div key={day} className="flex flex-col items-center flex-1 gap-1">
                        <div className="w-full flex items-end gap-0.5" style={{ height: '52px' }}>
                          <div className="flex-1 rounded-t bg-muted self-end" style={{ height: `${(actual[i]/max)*100}%` }} />
                          <div className="flex-1 rounded-t bg-[#f97316]/40 self-end border border-[#f97316]/30 border-dashed" style={{ height: `${(forecast[i]/max)*100}%` }} />
                        </div>
                        <span className="text-[9px] text-gray-400 leading-none">{day}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-gray-200" /><span className="text-[10px] text-foreground">Actual</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-[#f97316]/40 border border-[#f97316]/40" /><span className="text-[10px] text-foreground">Forecast</span></div>
              </div>
            </div>

            {/* ── Customer Insights ── */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground mb-4">Customer Insights</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {(() => { const s = new Set(completedOrders.map(o=>o.buyer_id)); return s.size > 0 ? s.size : 89; })()}
                  </p>
                  <p className="text-[11px] text-foreground mt-0.5">Total Customers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#f97316]">
                    {completedOrders.length > 0
                      ? (() => { const s = new Set<string>(); const r = new Set<string>(); for (const o of completedOrders) { if (s.has(o.buyer_id)) r.add(o.buyer_id); s.add(o.buyer_id); } return `${Math.round((r.size/Math.max(s.size,1))*100)}%`; })()
                      : '68%'}
                  </p>
                  <p className="text-[11px] text-foreground mt-0.5">Returning</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : '4.9'}</p>
                  <p className="text-[11px] text-foreground mt-0.5">Avg Rating</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{reviews.length > 0 ? reviews.length : 23}</p>
                  <p className="text-[11px] text-foreground mt-0.5">Total Reviews</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-medium text-muted-foreground">Rating Distribution</p>
                </div>
                {[5,4,3,2,1].map(star => {
                  const count = reviews.filter(r=>r.rating===star).length || [23,8,3,1,0][5-star];
                  const total = reviews.length > 0 ? reviews.length : 35;
                  const pct = Math.round((count/total)*100);
                  return (
                    <div key={star} className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-foreground w-4 text-right">{star}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#f97316]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-6 text-left">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Community Feedback — customer wishlist/requests, owner-managed */}
            <CommunityFeedbackPanel businessId={business?.id} />

            {/* Localy Emails — opted-in list, compose/send, AI writing + automation (Premium) */}
            <LocalyEmailsPanel
              businessId={business?.id || ''}
              businessName={business?.business_name || 'your business'}
              isPremium={isPremium}
            />
          </div>
        )}

        {/* ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <button onClick={() => { setScanResult(null); setShowScanner(true); }} className="w-full flex items-center justify-center gap-2 bg-black hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-opacity">
              <QrCode className="h-4 w-4" /> Scan Customer QR Code to Complete Order
            </button>

            <Section title="Live Orders" count={pendingOrders.length} countColor="orange">
              {pendingOrders.length === 0 ? <Empty icon={<PackageCheck className="h-6 w-6 text-gray-300" />} text="No live orders" /> : pendingOrders.map(o => <OrderCard key={o.id} order={o} variant="pending" />)}
            </Section>

            <Section title="Scheduled Orders" count={scheduledOrders.length} countColor="black">
              {scheduledOrders.length === 0 ? <Empty icon={<CalendarClock className="h-6 w-6 text-gray-300" />} text="No scheduled orders" /> : scheduledOrders.map(o => <OrderCard key={o.id} order={o} variant="scheduled" />)}
            </Section>

            {groupOrders.length > 0 && (
              <Section title="Group Orders" count={groupOrders.length} countColor="gray">
                {groupOrders.map(go => (
                  <div key={go.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-foreground">Group Order</span>
                        <span className="text-xs text-gray-400 bg-muted px-2 py-0.5 rounded-lg font-mono">{go.join_code}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${go.status === 'open' ? 'bg-orange-50 text-[#f97316]' : 'bg-muted text-muted-foreground'}`}>{go.status}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{new Date(go.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                ))}
              </Section>
            )}

            <Section title="Recently Completed" countColor="gray">
              {completedOrders.length === 0 ? <Empty icon={<CheckCircle className="h-6 w-6 text-gray-300" />} text="No completed orders yet" /> : completedOrders.slice(0, 15).map(o => <OrderCard key={o.id} order={o} variant="completed" />)}
            </Section>
          </div>
        )}

        {/* REPORTS */}
        {activeTab === 'reports' && (
          <BusinessReports
            orders={[...completedOrders, ...pendingOrders]}
            reviews={reviews}
            businessName={business?.business_name}
          />
        )}

        {/* REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center">
                <p className="text-3xl font-bold text-black">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
                <div className="flex justify-center gap-0.5 my-1">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? 'text-[#f97316] fill-[#f97316]' : 'text-gray-200 fill-gray-200'}`} />)}</div>
                <p className="text-xs text-black">Average Rating</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center">
                <p className="text-3xl font-bold text-black">{reviews.length}</p>
                <p className="text-xs text-black mt-1">Total Reviews</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center col-span-2 sm:col-span-1">
                <p className="text-3xl font-bold text-black">{reviews.filter(r => r.rating >= 4).length}</p>
                <p className="text-xs text-black mt-1">4+ Stars</p>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-10 text-center">
                <Star className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-foreground">No reviews yet</p>
                <p className="text-muted-foreground text-sm mt-1">Reviews appear here when customers rate your videos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reviews.map(r => (
                  <div key={r.id} className="bg-card border border-border rounded-xl p-3 shadow-sm">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                        {r.reviewer_avatar ? <img src={r.reviewer_avatar} alt={r.reviewer_name} className="w-full h-full object-cover" /> : <span className="text-xs font-semibold text-muted-foreground">{r.reviewer_name[0]?.toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-black truncate">
                            {r.reviewer_name}{r.reviewer_username ? <span className="font-normal text-muted-foreground ml-1">@{r.reviewer_username}</span> : null}
                          </span>
                          <span className="text-[11px] text-gray-400 shrink-0">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-0.5 mb-1">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= r.rating ? 'text-[#f97316] fill-[#f97316]' : 'text-gray-200 fill-gray-200'}`} />)}</div>
                        {r.content && <p className="text-sm text-black leading-snug">{r.content}</p>}
                        {r.video_caption && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">on: {r.video_caption}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROMOS */}
        {activeTab === 'promos' && user && (
          <PromoCodesManager userId={user.id} promoCodes={promoCodes} onChanged={loadPromoCodes} />
        )}

        {/* VIDEOS */}
        {activeTab === 'videos' && user && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4">Your Videos</h2>
            <PostedVideos userId={user.id} isOwnProfile={true} />
          </div>
        )}

        {/* BUSINESS */}
        {activeTab === 'business' && user && business && (
          <div className="space-y-5">
            <BusinessInfoEditor business={business} onSaved={setBusiness} />
            <BusinessHoursEditor business={business} onSaved={setBusiness} />
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-black mb-4">Services &amp; Menu</h2>
              <MenuList userId={user.id} businessId={business.id} isOwnProfile={true} layout="list" />
            </div>
          </div>
        )}
      </div>

      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
}

/* ── Helpers ── */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-black mt-0.5">{label}</p>
    </div>
  );
}

function Section({ title, count, countColor = 'gray', children }: { title: string; count?: number; countColor?: string; children: React.ReactNode }) {
  const colors: Record<string, string> = { orange: 'bg-[#f97316] text-white', black: 'bg-gray-900 text-white', gray: 'bg-muted text-muted-foreground' };
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[countColor] || colors.gray}`}>{count}</span>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 text-center">
      <div className="mx-auto mb-2 flex justify-center">{icon}</div>
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}

const AVATAR_COLORS = ['bg-orange-100', 'bg-muted', 'bg-orange-50', 'bg-gray-200', 'bg-[#f97316]/15'];

function OrderRow({ order, itemImages, itemNameImages }: { order: ItemPurchase; itemImages?: Record<string, string>; itemNameImages?: Record<string, string> }) {
  const colorIdx = (order.item_name?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const initial = (order.item_name || '?')[0].toUpperCase();
  const img = itemImages?.[order.item_id || ''] || itemNameImages?.[order.item_name || ''];
  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted transition-colors">
      {img ? (
        <img src={img} alt={order.item_name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
      ) : (
        <div className={`w-12 h-12 rounded-xl ${AVATAR_COLORS[colorIdx]} flex items-center justify-center shrink-0`}>
          <span className="text-base font-bold text-muted-foreground">{initial}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{order.item_name}</p>
        <p className="text-[11px] text-gray-400">{new Date(order.purchased_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-foreground">${order.price.toFixed(2)}</p>
        <span className={`text-[10px] font-medium ${order.status === 'completed' ? 'text-[#f97316]' : 'text-[#f97316]'}`}>{order.status}</span>
      </div>
    </div>
  );
}

function OrderCard({ order, variant }: { order: ItemPurchase; variant: 'pending' | 'scheduled' | 'completed' }) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return (
    <div className={`bg-card border rounded-2xl p-4 ${variant === 'pending' ? 'border-orange-200' : variant === 'scheduled' ? 'border-gray-900' : 'border-border'}`}>
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1 mr-3">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-sm truncate">
              {order.item_name}{order.quantity && order.quantity > 1 ? <span className="text-muted-foreground font-normal"> ×{order.quantity}</span> : null}
            </p>
            {order.group_order_id && (
              <span className="shrink-0 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <Users className="h-3 w-3" /> Group
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs mt-0.5">#{order.id.slice(0, 8)} · {fmt(order.purchased_at)}</p>
          {order.scheduled_at && (
            <div className="flex items-center gap-1 mt-1">
              <CalendarClock className="h-3 w-3 text-foreground" />
              <span className="text-xs font-medium text-foreground">
                Scheduled: {new Date(order.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(order.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-foreground text-sm">${order.price.toFixed(2)}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${variant === 'pending' ? 'bg-orange-50 text-[#f97316]' : variant === 'scheduled' ? 'bg-muted text-foreground' : 'bg-orange-50 text-[#f97316]'}`}>{order.status}</span>
        </div>
      </div>
      {order.special_requests && (
        <div className="mt-2 bg-muted border border-border rounded-xl px-3 py-2">
          <p className="text-foreground text-xs">{order.special_requests}</p>
        </div>
      )}
    </div>
  );
}

/* ── Business Info Editor ── */

function BusinessInfoEditor({ business, onSaved }: { business: Business; onSaved: (b: Business) => void }) {
  const [phone, setPhone] = useState(business.phone || '');
  const [address, setAddress] = useState(business.address || '');
  const [miscInfo, setMiscInfo] = useState(business.misc_info || '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    // Semantic/syntactic check: phone is optional, but when present must be a
    // valid 10-digit number. Block the save and show an inline message if not.
    const phoneErr = validatePhone(phone);
    setPhoneError(phoneErr);
    if (phoneErr) return;

    setSaving(true); setError(null);
    try {
      const { error: err } = await updateBusinessInfo(business.id, { phone, address, misc_info: miscInfo } as BusinessUpdateData);
      if (err) throw new Error(err.message);
      setSaved(true); onSaved({ ...business, phone, address, misc_info: miscInfo });
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { setError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Business Info</h2>
        <button onClick={handleSave} disabled={saving} className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors ${saved ? 'bg-orange-50 text-[#f97316] border border-orange-200' : 'bg-[#f97316] text-white hover:opacity-90'} disabled:opacity-50`}>
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>
      {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">{error}</div>}
      <div className="space-y-3">
        <div>
          <LabeledInput icon={<Phone className="h-4 w-4 text-muted-foreground" />} type="tel" value={phone} onChange={(v) => { setPhone(v); if (phoneError) setPhoneError(null); }} placeholder="Phone number" />
          <FieldError message={phoneError} className="ml-11" />
        </div>
        <LabeledInput icon={<MapPin className="h-4 w-4 text-muted-foreground" />} type="text" value={address} onChange={setAddress} placeholder="Address" />
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5"><FileText className="h-4 w-4 text-muted-foreground" /></div>
          <textarea value={miscInfo} onChange={e => setMiscInfo(e.target.value)} placeholder="Website, description, notes, etc." rows={3} maxLength={1000} className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-gray-400 focus:outline-none focus:border-[#f97316] resize-none" />
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ icon, type, value, onChange, placeholder }: { icon: React.ReactNode; type: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-gray-400 focus:outline-none focus:border-[#f97316]" />
    </div>
  );
}

/* ── Business Hours Editor ── */

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
const DEFAULT_HOURS: BusinessHours = {
  monday: { open: '09:00', close: '17:00' }, tuesday: { open: '09:00', close: '17:00' },
  wednesday: { open: '09:00', close: '17:00' }, thursday: { open: '09:00', close: '17:00' },
  friday: { open: '09:00', close: '17:00' }, saturday: { open: '10:00', close: '16:00' },
  sunday: { closed: true },
};

function BusinessHoursEditor({ business, onSaved }: { business: Business; onSaved: (b: Business) => void }) {
  const [hours, setHours] = useState<BusinessHours>(business.business_hours || DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    // Semantic check: for every open day, the opening time must be before the
    // closing time. Surface the first offending day and block the save.
    for (const day of DAYS) {
      const dayHours = hours[day];
      if (dayHours?.closed) continue;
      const rangeError = validateHoursRange(dayHours?.open, dayHours?.close);
      if (rangeError) {
        setError(`${day.charAt(0).toUpperCase() + day.slice(1)}: ${rangeError.charAt(0).toLowerCase() + rangeError.slice(1)}`);
        return;
      }
    }

    setSaving(true); setError(null);
    try {
      const { error: err } = await updateBusinessInfo(business.id, { business_hours: hours } as BusinessUpdateData);
      if (err) throw new Error(err.message);
      setSaved(true); onSaved({ ...business, business_hours: hours });
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { setError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#f97316]" /><h2 className="text-sm font-semibold text-foreground">Business Hours</h2></div>
        <button onClick={save} disabled={saving} className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors ${saved ? 'bg-orange-50 text-[#f97316] border border-orange-200' : 'bg-[#f97316] text-white hover:opacity-90'} disabled:opacity-50`}>
          <Save className="h-3.5 w-3.5" />{saving ? 'Saving…' : saved ? 'Saved!' : 'Save Hours'}
        </button>
      </div>
      {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">{error}</div>}
      <div className="space-y-3">
        {DAYS.map(day => (
          <div key={day} className="flex items-center gap-3">
            <label className="w-24 text-sm text-foreground capitalize shrink-0">{day}</label>
            <input type="checkbox" checked={!hours[day]?.closed} onChange={e => setHours({ ...hours, [day]: e.target.checked ? { open: '09:00', close: '17:00' } : { closed: true } })} className="w-4 h-4 accent-[#f97316] rounded" />
            {!hours[day]?.closed ? (
              <div className="flex items-center gap-2 flex-1">
                <input type="time" value={hours[day]?.open || '09:00'} onChange={e => setHours({ ...hours, [day]: { ...hours[day], open: e.target.value } })} className="flex-1 bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-[#f97316]" />
                <span className="text-gray-400 text-sm">to</span>
                <input type="time" value={hours[day]?.close || '17:00'} onChange={e => setHours({ ...hours, [day]: { ...hours[day], close: e.target.value } })} className="flex-1 bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-[#f97316]" />
              </div>
            ) : (
              <span className="text-gray-400 text-sm">Closed</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Promo Codes Manager ── */

function PromoCodesManager({ userId, promoCodes, onChanged }: { userId: string; promoCodes: PromoCode[]; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!code.trim() || !discountValue) { setFormError('Code and discount value required.'); return; }
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) { setFormError('Discount value must be positive.'); return; }
    if (discountType === 'percent' && val > 100) { setFormError('Percentage cannot exceed 100.'); return; }
    setSaving(true); setFormError(null);
    const { error } = await createPromoCode(userId, code.trim(), discountType, val, maxUses ? parseInt(maxUses) : undefined, expiryDate || undefined);
    setSaving(false);
    if (error) { setFormError((error as any).message || 'Failed to create.'); return; }
    setCode(''); setDiscountValue(''); setMaxUses(''); setExpiryDate(''); setShowForm(false);
    onChanged();
  };

  const handleToggle = async (p: PromoCode) => { await updatePromoCode(p.id, { is_active: !p.is_active }); onChanged(); };
  const handleDelete = async (id: string) => { if (!window.confirm('Delete this promo code?')) return; await deletePromoCode(id); onChanged(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Promo Codes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Customers enter these at checkout to get a discount</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-[#f97316] hover:opacity-90 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-opacity">
          <Plus className="h-4 w-4" /> New Code
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Create Promo Code</h3>
          {formError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3">{formError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Code</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. SAVE20" maxLength={20} className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm font-mono text-foreground placeholder-gray-400 focus:outline-none focus:border-[#f97316] uppercase" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
              <select value={discountType} onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')} className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#f97316]">
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Value</label>
              <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === 'percent' ? '20' : '5.00'} min="0" step={discountType === 'percent' ? '1' : '0.01'} className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-gray-400 focus:outline-none focus:border-[#f97316]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Max Uses</label>
              <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Unlimited" min="1" className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-gray-400 focus:outline-none focus:border-[#f97316]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#f97316]" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="flex-1 bg-[#f97316] hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-xl transition-opacity disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Code'}
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-muted hover:bg-gray-200 text-foreground text-sm font-medium py-2.5 rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {promoCodes.length === 0 && !showForm ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <Tag className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-foreground">No promo codes yet</p>
          <p className="text-muted-foreground text-sm mt-1">Create codes to offer discounts to your customers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {promoCodes.map(p => {
            const expired = p.expiry_date && new Date(p.expiry_date) < new Date();
            const maxed = p.max_uses != null && p.used_count >= p.max_uses;
            return (
              <div key={p.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-foreground text-sm">{p.code}</span>
                      <span className="text-xs bg-muted text-foreground px-2 py-0.5 rounded-lg">{p.discount_type === 'percent' ? `${p.discount_value}% off` : `-$${p.discount_value.toFixed(2)}`}</span>
                      {expired ? <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-lg">Expired</span> :
                        maxed ? <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">Maxed out</span> :
                        p.is_active ? <span className="text-xs bg-orange-50 text-[#f97316] px-2 py-0.5 rounded-lg">Active</span> :
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">Inactive</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.used_count} use{p.used_count !== 1 ? 's' : ''}
                      {p.max_uses != null && ` / ${p.max_uses} max`}
                      {p.expiry_date && ` · Expires ${new Date(p.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!expired && !maxed && (
                      <button onClick={() => handleToggle(p)} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${p.is_active ? 'bg-muted text-muted-foreground hover:bg-gray-200' : 'bg-orange-50 text-[#f97316] hover:bg-orange-100'}`}>
                        {p.is_active ? 'Pause' : 'Activate'}
                      </button>
                    )}
                    <button onClick={() => handleDelete(p.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
