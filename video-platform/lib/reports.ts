/**
 * Business Manager — Reports engine.
 *
 * Pure, deterministic data + calculations for the Reports tab. Real orders/reviews
 * are normalized; when a demo business has none, realistic demo data is generated
 * deterministically (stable per session) so charts/tables/filters all work. Every
 * total is computed from the same filtered rows, so numbers always reconcile.
 */
import type { ItemPurchase } from '@/models/Order';
import type { BusinessReview } from '@/lib/supabase/reviews';

export interface ReportOrder {
  id: string;
  itemName: string;
  category: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  buyerId: string;
  date: string; // ISO
}

export interface DateRange {
  start: Date;
  end: Date;
}

/* ----------------------------- normalize real orders ----------------------------- */
export function normalizeOrders(orders: ItemPurchase[]): ReportOrder[] {
  return orders
    .filter((o) => o.item_name && o.purchased_at)
    .map((o) => {
      const qty = o.quantity && o.quantity > 0 ? o.quantity : 1;
      const unit = Number(o.price) || 0;
      return {
        id: o.id,
        itemName: o.item_name,
        category: 'Menu',
        unitPrice: unit,
        quantity: qty,
        lineTotal: Math.round(unit * qty * 100) / 100,
        buyerId: o.buyer_id || 'unknown',
        date: o.purchased_at,
      };
    });
}

/* ----------------------------- deterministic demo data ----------------------------- */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_MENU: { name: string; category: string; price: number }[] = [
  { name: 'Classic Burger', category: 'Burgers', price: 11.99 },
  { name: 'Oklahoma Onion Burger', category: 'Burgers', price: 13.49 },
  { name: 'Patty Melt', category: 'Burgers', price: 12.5 },
  { name: 'Curly Fries', category: 'Sides', price: 5.49 },
  { name: 'Cheese Burger Poutine', category: 'Sides', price: 8.99 },
  { name: 'Popcorn Chicken', category: 'Sides', price: 7.25 },
  { name: 'Cookies and Cream Milkshake', category: 'Drinks', price: 6.49 },
  { name: 'Fountain Drink', category: 'Drinks', price: 2.99 },
  { name: 'Banana Pudding', category: 'Desserts', price: 4.99 },
];

/**
 * ~220 orders across the last 90 days, weighted toward recent days, with a pool of
 * repeat buyers so "returning customers" is meaningful. Deterministic (seeded).
 */
export function generateDemoOrders(now: number, count = 220): ReportOrder[] {
  const rand = mulberry32(20260627);
  const out: ReportOrder[] = [];
  const DAY = 86400000;
  for (let i = 0; i < count; i++) {
    // Bias toward recent days: square of a uniform → more weight near 0 days ago.
    const daysAgo = Math.floor(Math.pow(rand(), 1.7) * 90);
    const hour = 9 + Math.floor(rand() * 13); // 9am–9pm
    const menu = DEMO_MENU[Math.floor(rand() * DEMO_MENU.length)];
    const quantity = 1 + Math.floor(rand() * 3); // 1–3
    // ~70 buyers, but a third of orders come from a small loyal core (returning).
    const buyerId = rand() < 0.34
      ? `cust-${Math.floor(rand() * 18)}`
      : `cust-${Math.floor(rand() * 70)}`;
    const d = new Date(now - daysAgo * DAY);
    d.setHours(hour, Math.floor(rand() * 60), 0, 0);
    out.push({
      id: `demo-${i}`,
      itemName: menu.name,
      category: menu.category,
      unitPrice: menu.price,
      quantity,
      lineTotal: Math.round(menu.price * quantity * 100) / 100,
      buyerId,
      date: d.toISOString(),
    });
  }
  return out;
}

/* ----------------------------- filtering ----------------------------- */
export function filterOrders(
  orders: ReportOrder[],
  range: DateRange,
  category: string,
  item: string,
): ReportOrder[] {
  const startMs = range.start.getTime();
  const endMs = range.end.getTime();
  return orders.filter((o) => {
    const t = new Date(o.date).getTime();
    if (t < startMs || t > endMs) return false;
    if (category !== 'All' && o.category !== category) return false;
    if (item !== 'All' && o.itemName !== item) return false;
    return true;
  });
}

export function categoriesOf(orders: ReportOrder[]): string[] {
  return Array.from(new Set(orders.map((o) => o.category))).sort();
}
export function itemsOf(orders: ReportOrder[], category: string): string[] {
  return Array.from(
    new Set(orders.filter((o) => category === 'All' || o.category === category).map((o) => o.itemName)),
  ).sort();
}

/* ----------------------------- calculations ----------------------------- */
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface SalesSummary {
  revenue: number;
  orders: number;
  units: number;
  avgOrderValue: number;
  uniqueCustomers: number;
}
export function salesSummary(orders: ReportOrder[]): SalesSummary {
  const revenue = round2(orders.reduce((s, o) => s + o.lineTotal, 0));
  const units = orders.reduce((s, o) => s + o.quantity, 0);
  const customers = new Set(orders.map((o) => o.buyerId));
  return {
    revenue,
    orders: orders.length,
    units,
    avgOrderValue: orders.length ? round2(revenue / orders.length) : 0,
    uniqueCustomers: customers.size,
  };
}

export interface TimeBucket { label: string; dateKey: string; revenue: number; orders: number }
/** Daily buckets when the span is short, weekly when it's long. Covers the full range. */
export function revenueOverTime(orders: ReportOrder[], range: DateRange): TimeBucket[] {
  const DAY = 86400000;
  const spanDays = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / DAY));
  const weekly = spanDays > 31;
  const step = weekly ? 7 : 1;
  const buckets: TimeBucket[] = [];
  const startOfDay = new Date(range.start); startOfDay.setHours(0, 0, 0, 0);
  for (let offset = 0; offset <= spanDays; offset += step) {
    const bStart = new Date(startOfDay.getTime() + offset * DAY);
    const bEnd = new Date(bStart.getTime() + step * DAY);
    const inBucket = orders.filter((o) => {
      const t = new Date(o.date).getTime();
      return t >= bStart.getTime() && t < bEnd.getTime();
    });
    buckets.push({
      label: weekly
        ? bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dateKey: bStart.toISOString().slice(0, 10),
      revenue: round2(inBucket.reduce((s, o) => s + o.lineTotal, 0)),
      orders: inBucket.length,
    });
  }
  return buckets;
}

export interface TopItem { rank: number; name: string; category: string; quantity: number; revenue: number; pctOfSales: number }
export function topItems(orders: ReportOrder[]): TopItem[] {
  const map = new Map<string, { name: string; category: string; quantity: number; revenue: number }>();
  for (const o of orders) {
    const cur = map.get(o.itemName) || { name: o.itemName, category: o.category, quantity: 0, revenue: 0 };
    cur.quantity += o.quantity;
    cur.revenue = round2(cur.revenue + o.lineTotal);
    map.set(o.itemName, cur);
  }
  const total = orders.reduce((s, o) => s + o.lineTotal, 0) || 1;
  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((it, i) => ({ ...it, rank: i + 1, pctOfSales: Math.round((it.revenue / total) * 100) }));
}

export interface CategorySlice { category: string; revenue: number; units: number; pct: number }
/** Revenue + units grouped by category, sorted by revenue. Totals reconcile with the report. */
export function categoryBreakdown(orders: ReportOrder[]): CategorySlice[] {
  const map = new Map<string, { revenue: number; units: number }>();
  for (const o of orders) {
    const cur = map.get(o.category) || { revenue: 0, units: 0 };
    cur.revenue = round2(cur.revenue + o.lineTotal);
    cur.units += o.quantity;
    map.set(o.category, cur);
  }
  const total = orders.reduce((s, o) => s + o.lineTotal, 0) || 1;
  return Array.from(map.entries())
    .map(([category, v]) => ({ category, ...v, pct: Math.round((v.revenue / total) * 100) }))
    .sort((a, b) => b.revenue - a.revenue);
}

export interface CustomerStats {
  total: number;
  returning: number;
  newCustomers: number;
  returningPct: number;
  topCustomers: { buyerId: string; orders: number; revenue: number }[];
}
export function customerStats(orders: ReportOrder[]): CustomerStats {
  const map = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const cur = map.get(o.buyerId) || { orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue = round2(cur.revenue + o.lineTotal);
    map.set(o.buyerId, cur);
  }
  const entries = Array.from(map.entries());
  const returning = entries.filter(([, v]) => v.orders > 1).length;
  const total = entries.length;
  return {
    total,
    returning,
    newCustomers: total - returning,
    returningPct: total ? Math.round((returning / total) * 100) : 0,
    topCustomers: entries
      .map(([buyerId, v]) => ({ buyerId, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8),
  };
}

export interface RatingPoint { label: string; rating: number; count: number }
/** Average rating per month over the range. Uses real reviews, else stable demo. */
export function ratingTrend(reviews: BusinessReview[], range: DateRange): RatingPoint[] {
  const months: { key: string; label: string; start: number; end: number }[] = [];
  const cur = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  const last = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
  while (cur <= last) {
    const start = new Date(cur.getFullYear(), cur.getMonth(), 1).getTime();
    const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 1).getTime();
    months.push({
      key: `${cur.getFullYear()}-${cur.getMonth()}`,
      label: cur.toLocaleDateString('en-US', { month: 'short' }),
      start, end,
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  const real = reviews.filter((r) => r.created_at);
  return months.map((m, i) => {
    const inMonth = real.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= m.start && t < m.end;
    });
    if (inMonth.length > 0) {
      const avg = inMonth.reduce((s, r) => s + r.rating, 0) / inMonth.length;
      return { label: m.label, rating: Math.round(avg * 10) / 10, count: inMonth.length };
    }
    // Deterministic demo: 4.5–4.9, gently trending up.
    const demo = 4.5 + ((i * 7 + 3) % 5) / 10;
    return { label: m.label, rating: Math.round(Math.min(4.9, demo) * 10) / 10, count: 6 + ((i * 13) % 18) };
  });
}

/* ----------------------------- presets + CSV ----------------------------- */
export function rangeForPreset(preset: '7d' | '30d' | '90d', now: number): DateRange {
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const end = new Date(now);
  const start = new Date(now - (days - 1) * 86400000);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/** RFC-4180-safe CSV from a header row + data rows. */
export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}
