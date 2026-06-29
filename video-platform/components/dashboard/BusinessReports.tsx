'use client';

/**
 * BusinessReports — the Reports tab of the Business Manager (sales/items/customers + PDF/CSV export).
 * Purpose: Gives a business interactive, filterable reports (by date range, category, item) with charts
 *   and tables, and exports a polished branded PDF or CSV. Falls back to realistic demo data when the
 *   business has fewer than 5 real orders so the reports are never empty.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useMemo, useRef, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileText, SlidersHorizontal } from 'lucide-react';
import type { ItemPurchase } from '@/models/Order';
import type { BusinessReview } from '@/lib/supabase/reviews';
import {
  normalizeOrders, generateDemoOrders, filterOrders, categoriesOf, itemsOf,
  salesSummary, revenueOverTime, topItems, customerStats, ratingTrend,
  categoryBreakdown, rangeForPreset, toCSV, type DateRange,
} from '@/lib/reports';

const ORANGE = '#f97316';
/** Orange-family + grays only — keeps multi-series charts on-brand (no blue/green/yellow). */
const SLICE_COLORS = ['#f97316', '#111111', '#fdba74', '#9ca3af', '#fb923c', '#d1d5db', '#c2410c'];
type ReportKind = 'sales' | 'items' | 'customers';
type Preset = '7d' | '30d' | '90d' | 'custom';

const METRICS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'orders', label: 'Orders' },
  { key: 'aov', label: 'Avg Order Value' },
  { key: 'units', label: 'Units Sold' },
  { key: 'customers', label: 'Customers' },
] as const;
type MetricKey = (typeof METRICS)[number]['key'];

function fmtMoney(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** Orange/black/white brand colors as RGB tuples for jsPDF. */
const PDF_ORANGE: [number, number, number] = [249, 115, 22];
const PDF_INK: [number, number, number] = [17, 17, 17];
const PDF_MUTED: [number, number, number] = [110, 110, 110];

interface CapturedImage { dataUrl: string; w: number; h: number }

/** "#f97316" → [249, 115, 22] for jsPDF. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Rasterize a rendered recharts node to a PNG by serializing its inner <svg>
 * directly (NOT html2canvas — that throws on Tailwind v4's `oklch()` colors,
 * which was making every chart export as "(chart unavailable)"). Recharts emits
 * plain hex fills/strokes, so the serialized SVG draws cleanly onto a canvas.
 */
async function nodeToImage(node: HTMLElement | null): Promise<CapturedImage | null> {
  if (!node) return null;
  const svg = node.querySelector('svg');
  if (!svg) return null;
  try {
    const rect = svg.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width || Number(svg.getAttribute('width')) || 744));
    const h = Math.max(1, Math.round(rect.height || Number(svg.getAttribute('height')) || 284));
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(w));
    clone.setAttribute('height', String(h));
    const xml = new XMLSerializer().serializeToString(clone);
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(); };
      img.onerror = () => reject(new Error('SVG image load failed'));
      img.src = src;
    });
    return { dataUrl: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height };
  } catch (e) {
    console.error('Chart capture failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

// Renders the reports UI. `orders`/`reviews` are the real data; everything below derives filtered
// metrics from them and renders charts/tables plus the export buttons.
export function BusinessReports({
  orders, reviews, businessName = 'Your Business',
}: {
  orders: ItemPurchase[];
  reviews: BusinessReview[];
  businessName?: string;
}) {
  const now = useMemo(() => Date.now(), []);
  // Use real orders only when there are enough to be meaningful (>=5); otherwise show demo data so the
  // reports look populated for new businesses.
  const allOrders = useMemo(() => {
    const real = normalizeOrders(orders);
    return real.length >= 5 ? real : generateDemoOrders(now);
  }, [orders, now]);
  const usingDemo = normalizeOrders(orders).length < 5;

  const [report, setReport] = useState<ReportKind>('sales');
  const [preset, setPreset] = useState<Preset>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [category, setCategory] = useState('All');
  const [item, setItem] = useState('All');
  const [hidden, setHidden] = useState<Set<MetricKey>>(new Set());
  const [showToggles, setShowToggles] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Off-screen chart nodes captured into the PDF (always mounted; see render bottom).
  const revChartRef = useRef<HTMLDivElement>(null);
  const catChartRef = useRef<HTMLDivElement>(null);
  const itemsChartRef = useRef<HTMLDivElement>(null);

  const range: DateRange = useMemo(() => {
    if (preset === 'custom' && customStart && customEnd) {
      const start = new Date(customStart); start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd); end.setHours(23, 59, 59, 999);
      return start <= end ? { start, end } : rangeForPreset('30d', now);
    }
    return rangeForPreset(preset === 'custom' ? '30d' : preset, now);
  }, [preset, customStart, customEnd, now]);

  const categories = useMemo(() => categoriesOf(allOrders), [allOrders]);
  const items = useMemo(() => itemsOf(allOrders, category), [allOrders, category]);

  const filtered = useMemo(
    () => filterOrders(allOrders, range, category, item),
    [allOrders, range, category, item],
  );

  const summary = useMemo(() => salesSummary(filtered), [filtered]);
  const overTime = useMemo(() => revenueOverTime(filtered, range), [filtered, range]);
  const items5 = useMemo(() => topItems(filtered), [filtered]);
  const byCategory = useMemo(() => categoryBreakdown(filtered), [filtered]);
  const custs = useMemo(() => customerStats(filtered), [filtered]);
  const ratings = useMemo(() => ratingTrend(reviews, range), [reviews, range]);

  // Previous equal-length period (immediately before the current range) for % change.
  const prevSummary = useMemo(() => {
    const spanMs = range.end.getTime() - range.start.getTime();
    const prevRange: DateRange = {
      start: new Date(range.start.getTime() - spanMs),
      end: new Date(range.start.getTime() - 1),
    };
    return salesSummary(filterOrders(allOrders, prevRange, category, item));
  }, [allOrders, range, category, item]);

  const rangeLabel = `${range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const filterLabel = `${rangeLabel}${category !== 'All' ? ` · ${category}` : ''}${item !== 'All' ? ` · ${item}` : ''}`;

  const isVisible = (k: MetricKey) => !hidden.has(k);
  const toggleMetric = (k: MetricKey) =>
    setHidden((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const metricCards: { key: MetricKey; label: string; value: string }[] = [
    { key: 'revenue', label: 'Total Revenue', value: fmtMoney(summary.revenue) },
    { key: 'orders', label: 'Orders', value: String(summary.orders) },
    { key: 'aov', label: 'Avg Order Value', value: fmtMoney(summary.avgOrderValue) },
    { key: 'units', label: 'Units Sold', value: String(summary.units) },
    { key: 'customers', label: 'Customers', value: String(summary.uniqueCustomers) },
  ];

  /* ----- export current report (respects filters) ----- */
  const buildExport = (): { headers: string[]; rows: (string | number)[][]; footer: (string | number)[]; title: string } => {
    if (report === 'sales') {
      return {
        title: 'Sales & Revenue Report',
        headers: ['Date', 'Orders', 'Revenue'],
        rows: overTime.map((b) => [b.label, b.orders, b.revenue.toFixed(2)]),
        footer: ['Total', summary.orders, summary.revenue.toFixed(2)],
      };
    }
    if (report === 'items') {
      return {
        title: 'Top-Selling Items Report',
        headers: ['Rank', 'Item', 'Category', 'Quantity', 'Revenue', '% of Sales'],
        rows: items5.map((it) => [it.rank, it.name, it.category, it.quantity, it.revenue.toFixed(2), `${it.pctOfSales}%`]),
        footer: ['', 'Total', '', summary.units, summary.revenue.toFixed(2), '100%'],
      };
    }
    return {
      title: 'Customer & Engagement Report',
      headers: ['Customer', 'Orders', 'Revenue'],
      rows: custs.topCustomers.map((c) => [c.buyerId, c.orders, c.revenue.toFixed(2)]),
      footer: ['Total customers', custs.total, summary.revenue.toFixed(2)],
    };
  };

  const handleCSV = () => {
    const { headers, rows, title } = buildExport();
    downloadCSV(`${title.replace(/\s+/g, '-').toLowerCase()}.csv`, toCSV(headers, rows));
  };

  // % change vs the previous equal-length period.
  const pctChange = (cur: number, prev: number) => (prev <= 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100);
  const fmtPct = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}%`;

  /**
   * Full, presentable PDF: header, a Revenue Performance summary (with % change vs
   * the previous period), all three charts rendered as images, and the top-items +
   * revenue-by-category tables. Always populated (demo data fills in when empty).
   */
  const handlePDF = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const [revImg, catImg, itemsImg] = await Promise.all([
        nodeToImage(revChartRef.current),
        nodeToImage(catChartRef.current),
        nodeToImage(itemsChartRef.current),
      ]);

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 40;
      const contentW = pageW - marginX * 2;

      // Header — title, business name, date range
      doc.setTextColor(...PDF_INK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(businessName, marginX, 48);
      doc.setFontSize(13);
      doc.setTextColor(...PDF_ORANGE);
      doc.text('Business Performance Report', marginX, 68);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...PDF_MUTED);
      doc.text(filterLabel, marginX, 84);
      doc.setDrawColor(...PDF_ORANGE);
      doc.setLineWidth(2);
      doc.line(marginX, 92, pageW - marginX, 92);

      const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;

      // Revenue Performance summary (with vs-previous-period column)
      autoTable(doc, {
        startY: 104,
        head: [['Revenue Performance', 'Value', 'vs Previous']],
        body: [
          ['Total Revenue', fmtMoney(summary.revenue), fmtPct(pctChange(summary.revenue, prevSummary.revenue))],
          ['Total Orders', String(summary.orders), fmtPct(pctChange(summary.orders, prevSummary.orders))],
          ['Avg Order Value', fmtMoney(summary.avgOrderValue), fmtPct(pctChange(summary.avgOrderValue, prevSummary.avgOrderValue))],
          ['Units Sold', String(summary.units), fmtPct(pctChange(summary.units, prevSummary.units))],
          ['Unique Customers', String(summary.uniqueCustomers), fmtPct(pctChange(summary.uniqueCustomers, prevSummary.uniqueCustomers))],
        ],
        theme: 'grid',
        headStyles: { fillColor: PDF_ORANGE, textColor: 255, fontStyle: 'bold' },
        bodyStyles: { textColor: PDF_INK },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'right' } },
        styles: { fontSize: 10, cellPadding: 6 },
        margin: { left: marginX, right: marginX },
      });

      // Charts as images, with page-break handling. The recharts HTML <Legend> isn't
      // part of the serialized SVG, so we draw legends here from the same data.
      let y = lastY() + 20;
      const addChart = (
        title: string,
        img: CapturedImage | null,
        legend?: { label: string; color: [number, number, number] }[],
      ) => {
        const drawW = contentW;
        const drawH = img ? img.h * (drawW / img.w) : 0;
        const legendH = legend && legend.length ? 16 : 0;
        if (y + 16 + legendH + drawH > pageH - 40) { doc.addPage(); y = 48; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...PDF_INK);
        doc.text(title, marginX, y);
        y += 8;
        if (legend && legend.length) {
          let lx = marginX;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          for (const item of legend) {
            doc.setFillColor(...item.color);
            doc.rect(lx, y, 8, 8, 'F');
            doc.setTextColor(...PDF_INK);
            const tw = doc.getTextWidth(item.label);
            doc.text(item.label, lx + 11, y + 7);
            lx += 11 + tw + 14;
            if (lx > pageW - marginX - 80) { lx = marginX; y += 12; }
          }
          y += 14;
        }
        if (img) {
          doc.addImage(img.dataUrl, 'PNG', marginX, y, drawW, drawH);
          y += drawH + 20;
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...PDF_MUTED);
          doc.text('(chart unavailable)', marginX, y + 12);
          y += 28;
        }
      };
      addChart('Revenue & Orders Over Time', revImg, [
        { label: 'Revenue', color: hexToRgb(ORANGE) },
        { label: 'Orders', color: hexToRgb('#fdba74') },
      ]);
      addChart('Revenue by Category', catImg, byCategory.map((c, i) => ({
        label: `${c.category} (${c.pct}%)`,
        color: hexToRgb(SLICE_COLORS[i % SLICE_COLORS.length]),
      })));
      addChart('Top Items by Revenue', itemsImg);

      // Top-selling items table
      autoTable(doc, {
        startY: y,
        head: [['Rank', 'Item', 'Category', 'Qty Sold', 'Revenue']],
        body: items5.map((it) => [String(it.rank), it.name, it.category, String(it.quantity), fmtMoney(it.revenue)]),
        foot: [['', 'Total', '', String(summary.units), fmtMoney(summary.revenue)]],
        theme: 'striped',
        headStyles: { fillColor: PDF_ORANGE, textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [250, 247, 245], textColor: PDF_INK, fontStyle: 'bold' },
        bodyStyles: { textColor: PDF_INK },
        alternateRowStyles: { fillColor: [250, 247, 245] },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
        styles: { fontSize: 9, cellPadding: 5 },
        margin: { left: marginX, right: marginX },
      });

      // Revenue-by-category table
      autoTable(doc, {
        startY: lastY() + 16,
        head: [['Category', 'Revenue', '% of Total']],
        body: byCategory.map((c) => [c.category, fmtMoney(c.revenue), `${c.pct}%`]),
        foot: [['Total', fmtMoney(summary.revenue), '100%']],
        theme: 'striped',
        headStyles: { fillColor: PDF_ORANGE, textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [250, 247, 245], textColor: PDF_INK, fontStyle: 'bold' },
        bodyStyles: { textColor: PDF_INK },
        alternateRowStyles: { fillColor: [250, 247, 245] },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        styles: { fontSize: 9, cellPadding: 5 },
        margin: { left: marginX, right: marginX },
      });

      // Footer note on every page
      const pageCount = doc.getNumberOfPages();
      const generated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...PDF_MUTED);
        doc.text(`Generated by Localy Business Manager · ${generated}`, marginX, pageH - 24);
      }

      doc.save(`${businessName}-performance-report`.replace(/\s+/g, '-').toLowerCase() + '.pdf');
    } catch (err) {
      console.error('PDF export failed:', err instanceof Error ? err.message : err);
    } finally {
      setPdfBusy(false);
    }
  };

  const REPORTS: { key: ReportKind; label: string }[] = [
    { key: 'sales', label: 'Sales / Revenue' },
    { key: 'items', label: 'Top Items' },
    { key: 'customers', label: 'Customers' },
  ];

  return (
    <div className="space-y-5">
      {/* Report selector + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {REPORTS.map((r) => (
            <button
              key={r.key}
              onClick={() => setReport(r.key)}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                report === r.key ? 'bg-[#f97316] text-white' : 'border border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleCSV} className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:border-[#f97316] hover:text-[#f97316] transition-colors">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={handlePDF} disabled={pdfBusy} className="flex items-center gap-1.5 rounded-xl bg-black px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60">
            <FileText className="h-4 w-4" /> {pdfBusy ? 'Preparing…' : 'PDF'}
          </button>
        </div>
      </div>

      {usingDemo && (
        <p className="rounded-xl border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
          Showing realistic demo data — your real orders will populate these reports automatically.
        </p>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Date range */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-foreground">Date range</p>
            <div className="flex flex-wrap gap-1.5">
              {(['7d', '30d', '90d', 'custom'] as Preset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    preset === p ? 'bg-[#f97316] text-white' : 'bg-muted text-foreground hover:bg-gray-200'
                  }`}
                >
                  {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : p === '90d' ? 'Last 90 days' : 'Custom'}
                </button>
              ))}
            </div>
          </div>

          {preset === 'custom' && (
            <div className="flex items-end gap-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-foreground">From</p>
                <input type="date" aria-label="Custom range start date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs text-foreground focus:border-[#f97316] focus:outline-none" />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-foreground">To</p>
                <input type="date" aria-label="Custom range end date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs text-foreground focus:border-[#f97316] focus:outline-none" />
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-foreground">Category</p>
            <select
              aria-label="Filter by category"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setItem('All'); }}
              className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs text-foreground focus:border-[#f97316] focus:outline-none"
            >
              <option value="All">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Item */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-foreground">Item</p>
            <select
              aria-label="Filter by item"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs text-foreground focus:border-[#f97316] focus:outline-none"
            >
              <option value="All">All items</option>
              {items.map((it) => <option key={it} value={it}>{it}</option>)}
            </select>
          </div>

          <button
            aria-label="Toggle which metric cards are shown"
            onClick={() => setShowToggles((s) => !s)}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-[#f97316] hover:text-[#f97316] transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Metrics
          </button>
        </div>

        {showToggles && (
          <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-100 pt-3">
            {METRICS.map((m) => (
              <label key={m.key} className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <input type="checkbox" checked={isVisible(m.key)} onChange={() => toggleMetric(m.key)} className="accent-[#f97316]" />
                {m.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metricCards.filter((c) => isVisible(c.key)).map((c) => (
          <div key={c.key} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      {/* ---- SALES ---- */}
      {report === 'sales' && (
        <>
          <ChartCard title="Revenue & orders over time" subtitle={rangeLabel}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={overTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(v: number | undefined, name) => name === 'Revenue' ? [fmtMoney(v ?? 0), 'Revenue'] : [String(v ?? 0), 'Orders']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  cursor={{ fill: '#f97316', opacity: 0.06 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="ord" dataKey="orders" name="Orders" fill="#fdba74" radius={[4, 4, 0, 0]} barSize={14} />
                <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke={ORANGE} strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <TableCard
            headers={['Date', 'Orders', 'Revenue']}
            rows={overTime.map((b) => [b.label, String(b.orders), fmtMoney(b.revenue)])}
            footer={['Total', String(summary.orders), fmtMoney(summary.revenue)]}
          />
        </>
      )}

      {/* ---- TOP ITEMS ---- */}
      {report === 'items' && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Top items by revenue" subtitle={rangeLabel}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={items5.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number | undefined) => [fmtMoney(v ?? 0), 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} cursor={{ fill: '#f97316', opacity: 0.06 }} />
                  <Bar dataKey="revenue" fill={ORANGE} radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue share by category" subtitle={rangeLabel}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="revenue" nameKey="category" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                    {byCategory.map((_, i) => <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number | undefined, name) => [fmtMoney(v ?? 0), name as string]} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <TableCard
            headers={['#', 'Item', 'Category', 'Qty', 'Revenue', '% of Sales']}
            rows={items5.map((it) => [String(it.rank), it.name, it.category, String(it.quantity), fmtMoney(it.revenue), `${it.pctOfSales}%`])}
            footer={['', 'Total', '', String(summary.units), fmtMoney(summary.revenue), '100%']}
          />
        </>
      )}

      {/* ---- CUSTOMERS ---- */}
      {report === 'customers' && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="New vs returning customers" subtitle={rangeLabel}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { label: 'New', value: custs.newCustomers },
                  { label: 'Returning', value: custs.returning },
                ]} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} cursor={{ fill: '#f97316', opacity: 0.06 }} />
                  <Bar dataKey="value" fill={ORANGE} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Average rating trend" subtitle="By month">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ratings} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number | undefined) => [`${v ?? 0}`, 'Avg rating']} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Line type="monotone" dataKey="rating" stroke={ORANGE} strokeWidth={2.5} dot={{ r: 3, fill: ORANGE }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Total Customers" value={String(custs.total)} />
            <MiniStat label="Returning" value={`${custs.returning} (${custs.returningPct}%)`} />
            <MiniStat label="New" value={String(custs.newCustomers)} />
            <MiniStat label="Reviews" value={String(reviews.length || ratings.reduce((s, r) => s + r.count, 0))} />
          </div>

          <ChartCard title="Top customers by revenue" subtitle={rangeLabel}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={custs.topCustomers} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="buyerId" width={120} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number | undefined) => [fmtMoney(v ?? 0), 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} cursor={{ fill: '#f97316', opacity: 0.06 }} />
                <Bar dataKey="revenue" fill={ORANGE} radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <TableCard
            headers={['Customer', 'Orders', 'Revenue']}
            rows={custs.topCustomers.map((c) => [c.buyerId, String(c.orders), fmtMoney(c.revenue)])}
            footer={['Total customers', String(custs.total), fmtMoney(summary.revenue)]}
          />
        </>
      )}

      {/* Off-screen, fixed-size charts — always mounted so the PDF export can rasterize
          all three regardless of the active tab. Animations off for a clean capture. */}
      <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0" style={{ width: 780 }}>
        <div ref={revChartRef} style={{ width: 760, height: 300, background: '#fff', padding: 8 }}>
          <ComposedChart width={744} height={284} data={overTime}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `$${v}`} />
            <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
            <Bar yAxisId="ord" dataKey="orders" name="Orders" fill="#fdba74" radius={[4, 4, 0, 0]} barSize={14} isAnimationActive={false} />
            <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke={ORANGE} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </div>
        <div ref={catChartRef} style={{ width: 760, height: 300, background: '#fff', padding: 8 }}>
          <PieChart width={744} height={284}>
            <Pie data={byCategory} dataKey="revenue" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={104} paddingAngle={2} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
              {byCategory.map((_, i) => <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />)}
            </Pie>
          </PieChart>
        </div>
        <div ref={itemsChartRef} style={{ width: 760, height: 320, background: '#fff', padding: 8 }}>
          <BarChart width={744} height={304} data={items5.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `$${v}`} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <Bar dataKey="revenue" fill={ORANGE} radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={false} />
          </BarChart>
        </div>
      </div>
    </div>
  );
}

// Reusable card wrapper for an on-screen chart (title + optional subtitle + fixed-height body).
function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <span className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      <div className="h-56">{children}</div>
    </div>
  );
}

// Reusable data table with a header row, body rows, an optional bold footer (totals), and an empty state.
function TableCard({ headers, rows, footer }: { headers: string[]; rows: string[][]; footer?: string[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-muted text-left">
              {headers.map((h, i) => (
                <th key={h} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${i === 0 ? '' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-gray-400">No data for this filter</td></tr>
            ) : rows.map((r, ri) => (
              <tr key={ri} className="border-b border-gray-50 last:border-0 hover:bg-muted">
                {r.map((cell, ci) => (
                  <td key={ci} className={`px-4 py-2.5 ${ci === 0 ? 'font-medium text-foreground' : 'text-right text-foreground'}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-orange-50/50 font-bold text-foreground">
                {footer.map((cell, ci) => (
                  <td key={ci} className={`px-4 py-2.5 ${ci === 0 ? '' : 'text-right'}`}>{cell}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// Small labelled stat tile used in the customer report's summary row.
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
