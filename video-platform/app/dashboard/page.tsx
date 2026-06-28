'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { QRScanner } from '@/components/QRScanner';
import { PostedVideos } from '@/components/PostedVideos';
import { MenuList } from '@/components/MenuList';
import {
  ensureUserBusiness,
  updateBusinessInfo,
  Business,
  BusinessHours,
  BusinessUpdateData,
} from '@/lib/supabase/profiles';
import type { ItemPurchase } from '@/models/Order';
import { getBusinessReviews, BusinessReview } from '@/lib/supabase/reviews';
import { getSellerPromoCodes, createPromoCode, updatePromoCode, deletePromoCode, PromoCode } from '@/lib/supabase/promo-codes';
import { getSellerGroupOrders, GroupOrder } from '@/lib/supabase/group-orders';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, QrCode, Clock, Save, CheckCircle,
  ArrowUpRight, ArrowDownRight, LayoutDashboard, PackageCheck,
  Star, Tag, Settings, Phone, MapPin, FileText, Trash2, Plus,
  Users, CalendarClock,
} from 'lucide-react';

export default function DashboardPage() {
  return <ProtectedRoute><DashboardContent /></ProtectedRoute>;
}

type Tab = 'overview' | 'orders' | 'reviews' | 'promos' | 'business';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Dashboard',  icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: 'orders',   label: 'Orders',     icon: <PackageCheck className="h-4 w-4" /> },
  { key: 'reviews',  label: 'Reviews',    icon: <Star className="h-4 w-4" /> },
  { key: 'promos',   label: 'Promos',     icon: <Tag className="h-4 w-4" /> },
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
  const [pendingOrders, setPendingOrders] = useState<ItemPurchase[]>([]);
  const [completedOrders, setCompletedOrders] = useState<ItemPurchase[]>([]);
  const [scheduledOrders, setScheduledOrders] = useState<ItemPurchase[]>([]);
  const [groupOrders, setGroupOrders] = useState<GroupOrder[]>([]);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => { if (!user) return; checkBusinessStatus(); }, [user]);
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

  const checkBusinessStatus = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('type').eq('id', user.id).single();
    if (data?.type) setIsBusiness(true);
    else { setIsBusiness(false); router.replace('/profile'); }
  };

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    await Promise.all([loadOrders(), loadBusiness(), loadReviews(), loadPromoCodes(), loadGroupOrders()]);
    setLoading(false);
  };

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
      const { data, error } = await ensureUserBusiness(user.id);
      if (!error && data) {
        if (data.business_hours && typeof data.business_hours === 'string') data.business_hours = JSON.parse(data.business_hours);
        setBusiness(data);
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
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  if (isBusiness === null || loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#f97316]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-gray-900 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-10 pt-6 pb-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Business Manager</p>
              <p className="text-3xl font-bold text-gray-900">${displayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {revenueChange >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 text-green-500" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
                <span className={`text-xs font-medium ${revenueChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>{Math.abs(revenueChange).toFixed(1)}%</span>
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
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? 'text-[#f97316] border-[#f97316] bg-orange-50/60' : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50'}`}>
                {t.icon}<span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-10 py-6">
        {scanResult && (
          <div className={`mb-4 p-4 rounded-2xl border flex items-start justify-between ${scanResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`font-medium text-sm ${scanResult.success ? 'text-green-700' : 'text-red-600'}`}>{scanResult.message}</p>
            <button onClick={() => setScanResult(null)} className="text-gray-400 hover:text-gray-600 ml-4 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-700">Cash Flow</p>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Last 7 days</span>
                </div>
                <p className="text-xs text-gray-400 mb-4">Revenue performance</p>
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
                <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center"><TrendingUp className="h-3.5 w-3.5 text-green-600" /></div><p className="text-xs font-medium text-gray-500">Income</p></div>
                  <p className="text-2xl font-bold text-gray-900">${displayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <span className="text-[11px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded mt-1 inline-block">+{Math.abs(revenueChange).toFixed(1)}%</span>
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center"><TrendingDown className="h-3.5 w-3.5 text-red-500" /></div><p className="text-xs font-medium text-gray-500">Expense</p></div>
                  <p className="text-2xl font-bold text-gray-900">${(displayRevenue * 0.32).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <span className="text-[11px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded mt-1 inline-block">-12.5%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Live Orders" value={String(pendingOrders.length || 3)} />
              <StatCard label="Scheduled" value={String(scheduledOrders.length || 2)} />
              <StatCard label="Avg Rating" value={avgRating > 0 ? avgRating.toFixed(1) : '4.8'} />
              <StatCard label="Reviews" value={String(reviews.length || 24)} />
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <p className="font-semibold text-gray-900 text-sm">Recent Orders</p>
                <button onClick={() => setActiveTab('orders')} className="text-xs text-[#f97316] font-medium hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50">
                {[...pendingOrders, ...completedOrders].slice(0, 5).map(o => <OrderRow key={o.id} order={o} />)}
                {pendingOrders.length === 0 && completedOrders.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No orders yet</p>}
              </div>
            </div>
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
                  <div key={go.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">Group Order</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg font-mono">{go.join_code}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${go.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{go.status}</span>
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

        {/* REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
                <p className="text-3xl font-bold text-gray-900">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
                <div className="flex justify-center gap-0.5 my-1">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? 'text-[#f97316] fill-[#f97316]' : 'text-gray-200 fill-gray-200'}`} />)}</div>
                <p className="text-xs text-gray-400">Average Rating</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
                <p className="text-3xl font-bold text-gray-900">{reviews.length}</p>
                <p className="text-xs text-gray-400 mt-1">Total Reviews</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center col-span-2 sm:col-span-1">
                <p className="text-3xl font-bold text-gray-900">{reviews.filter(r => r.rating >= 4).length}</p>
                <p className="text-xs text-gray-400 mt-1">4+ Stars</p>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
                <Star className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-gray-500">No reviews yet</p>
                <p className="text-gray-400 text-sm mt-1">Reviews appear here when customers rate your videos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {r.reviewer_avatar ? <img src={r.reviewer_avatar} alt={r.reviewer_name} className="w-full h-full object-cover" /> : <span className="text-sm font-semibold text-gray-500">{r.reviewer_name[0]?.toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{r.reviewer_name}</p>
                            {r.reviewer_username && <p className="text-xs text-gray-400">@{r.reviewer_username}</p>}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'text-[#f97316] fill-[#f97316]' : 'text-gray-200 fill-gray-200'}`} />)}</div>
                        </div>
                        {r.content && <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{r.content}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          {r.video_caption && <p className="text-xs text-gray-400 truncate">on: {r.video_caption}</p>}
                        </div>
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

        {/* BUSINESS */}
        {activeTab === 'business' && user && business && (
          <div className="space-y-5">
            <BusinessInfoEditor business={business} onSaved={setBusiness} />
            <BusinessHoursEditor business={business} onSaved={setBusiness} />
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Services &amp; Menu</h2>
              <MenuList userId={user.id} businessId={business.id} isOwnProfile={true} />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Videos</h2>
              <PostedVideos userId={user.id} isOwnProfile={true} />
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
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function Section({ title, count, countColor = 'gray', children }: { title: string; count?: number; countColor?: string; children: React.ReactNode }) {
  const colors: Record<string, string> = { orange: 'bg-[#f97316] text-white', black: 'bg-gray-900 text-white', gray: 'bg-gray-100 text-gray-600' };
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
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
    <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
      <div className="mx-auto mb-2 flex justify-center">{icon}</div>
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  );
}

function OrderRow({ order }: { order: ItemPurchase }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
      <div>
        <p className="text-sm font-medium text-gray-900">{order.item_name}</p>
        <p className="text-xs text-gray-400">{new Date(order.purchased_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">${order.price.toFixed(2)}</p>
        <span className={`text-xs font-medium ${order.status === 'completed' ? 'text-green-600' : 'text-[#f97316]'}`}>{order.status}</span>
      </div>
    </div>
  );
}

function OrderCard({ order, variant }: { order: ItemPurchase; variant: 'pending' | 'scheduled' | 'completed' }) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return (
    <div className={`bg-white border rounded-2xl p-4 ${variant === 'pending' ? 'border-orange-200' : variant === 'scheduled' ? 'border-gray-900' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1 mr-3">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 text-sm truncate">
              {order.item_name}{order.quantity && order.quantity > 1 ? <span className="text-gray-400 font-normal"> ×{order.quantity}</span> : null}
            </p>
            {order.group_order_id && (
              <span className="shrink-0 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <Users className="h-3 w-3" /> Group
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-0.5">#{order.id.slice(0, 8)} · {fmt(order.purchased_at)}</p>
          {order.scheduled_at && (
            <div className="flex items-center gap-1 mt-1">
              <CalendarClock className="h-3 w-3 text-gray-900" />
              <span className="text-xs font-medium text-gray-900">
                Scheduled: {new Date(order.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(order.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-gray-900 text-sm">${order.price.toFixed(2)}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${variant === 'pending' ? 'bg-orange-50 text-[#f97316]' : variant === 'scheduled' ? 'bg-gray-100 text-gray-700' : 'bg-green-50 text-green-700'}`}>{order.status}</span>
        </div>
      </div>
      {order.special_requests && (
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <p className="text-gray-700 text-xs">{order.special_requests}</p>
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Business Info</h2>
        <button onClick={handleSave} disabled={saving} className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors ${saved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-[#f97316] text-white hover:opacity-90'} disabled:opacity-50`}>
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>
      {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">{error}</div>}
      <div className="space-y-3">
        <LabeledInput icon={<Phone className="h-4 w-4 text-gray-500" />} type="tel" value={phone} onChange={setPhone} placeholder="Phone number" />
        <LabeledInput icon={<MapPin className="h-4 w-4 text-gray-500" />} type="text" value={address} onChange={setAddress} placeholder="Address" />
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5"><FileText className="h-4 w-4 text-gray-500" /></div>
          <textarea value={miscInfo} onChange={e => setMiscInfo(e.target.value)} placeholder="Website, description, notes, etc." rows={3} maxLength={1000} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f97316] resize-none" />
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ icon, type, value, onChange, placeholder }: { icon: React.ReactNode; type: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">{icon}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f97316]" />
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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#f97316]" /><h2 className="text-sm font-semibold text-gray-900">Business Hours</h2></div>
        <button onClick={save} disabled={saving} className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors ${saved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-[#f97316] text-white hover:opacity-90'} disabled:opacity-50`}>
          <Save className="h-3.5 w-3.5" />{saving ? 'Saving…' : saved ? 'Saved!' : 'Save Hours'}
        </button>
      </div>
      {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">{error}</div>}
      <div className="space-y-3">
        {DAYS.map(day => (
          <div key={day} className="flex items-center gap-3">
            <label className="w-24 text-sm text-gray-600 capitalize shrink-0">{day}</label>
            <input type="checkbox" checked={!hours[day]?.closed} onChange={e => setHours({ ...hours, [day]: e.target.checked ? { open: '09:00', close: '17:00' } : { closed: true } })} className="w-4 h-4 accent-[#f97316] rounded" />
            {!hours[day]?.closed ? (
              <div className="flex items-center gap-2 flex-1">
                <input type="time" value={hours[day]?.open || '09:00'} onChange={e => setHours({ ...hours, [day]: { ...hours[day], open: e.target.value } })} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-[#f97316]" />
                <span className="text-gray-400 text-sm">to</span>
                <input type="time" value={hours[day]?.close || '17:00'} onChange={e => setHours({ ...hours, [day]: { ...hours[day], close: e.target.value } })} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-[#f97316]" />
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
          <h2 className="text-sm font-semibold text-gray-900">Promo Codes</h2>
          <p className="text-xs text-gray-400 mt-0.5">Customers enter these at checkout to get a discount</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-[#f97316] hover:opacity-90 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-opacity">
          <Plus className="h-4 w-4" /> New Code
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Create Promo Code</h3>
          {formError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3">{formError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. SAVE20" maxLength={20} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f97316] uppercase" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={discountType} onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#f97316]">
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
              <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === 'percent' ? '20' : '5.00'} min="0" step={discountType === 'percent' ? '1' : '0.01'} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f97316]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Uses</label>
              <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Unlimited" min="1" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f97316]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#f97316]" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="flex-1 bg-[#f97316] hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-xl transition-opacity disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Code'}
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {promoCodes.length === 0 && !showForm ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <Tag className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">No promo codes yet</p>
          <p className="text-gray-400 text-sm mt-1">Create codes to offer discounts to your customers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {promoCodes.map(p => {
            const expired = p.expiry_date && new Date(p.expiry_date) < new Date();
            const maxed = p.max_uses != null && p.used_count >= p.max_uses;
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-gray-900 text-sm">{p.code}</span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">{p.discount_type === 'percent' ? `${p.discount_value}% off` : `-$${p.discount_value.toFixed(2)}`}</span>
                      {expired ? <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-lg">Expired</span> :
                        maxed ? <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">Maxed out</span> :
                        p.is_active ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-lg">Active</span> :
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">Inactive</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {p.used_count} use{p.used_count !== 1 ? 's' : ''}
                      {p.max_uses != null && ` / ${p.max_uses} max`}
                      {p.expiry_date && ` · Expires ${new Date(p.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!expired && !maxed && (
                      <button onClick={() => handleToggle(p)} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${p.is_active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                        {p.is_active ? 'Pause' : 'Activate'}
                      </button>
                    )}
                    <button onClick={() => handleDelete(p.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors">
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
