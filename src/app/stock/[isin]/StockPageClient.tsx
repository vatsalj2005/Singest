"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Percent,
  PieChart as PieIcon,
  Briefcase,
  Wallet,
  Gauge,
  LineChart as LineChartIcon,
  Coins,
  Layers,
  Newspaper,
} from "lucide-react";
import { CorporateActions } from "@/components/CorporateActions";
import { PeerComparison } from "@/components/PeerComparison";
import { ThemeToggle } from "@/components/ThemeToggle";
import { num, fmtPrice, fmtPct, fmtCr, fmtN, pctCls, mcapBadge, timeAgo } from "@/lib/format";
import type { NewsHeadline } from "@/lib/types";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from "recharts";

type Row = Record<string, string | number | null>;

function sentimentColor(s: string | null) {
  if (!s) return "bg-muted/60 text-muted-foreground";
  const k = s.toLowerCase();
  if (k.includes("positive") || k.includes("bull"))
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (k.includes("negative") || k.includes("bear"))
    return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  return "bg-amber-500/15 text-amber-300 border-amber-500/30";
}

export function StockPageClient({ stock, news }: { stock: Row; news: NewsHeadline[] }) {
  const pct = num(stock.pperchange);
  const up = (pct ?? 0) >= 0;
  const TrendIcon = up ? ArrowUpRight : ArrowDownRight;
  const trendColor = up ? "text-emerald-400" : "text-rose-400";

  const kpis: Array<{
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    tone?: string;
    raw?: unknown;
  }> = [
    { label: "Market Cap", value: fmtCr(stock.mcap), icon: Briefcase },
    { label: "P/E Ratio", value: fmtN(stock.pe), icon: BarChart3 },
    { label: "P/B Ratio", value: fmtN(stock.pb), icon: Layers },
    { label: "EPS", value: fmtPrice(stock.eps), icon: Coins },
    { label: "Industry P/E", value: fmtN(stock.ind_pe), icon: BarChart3 },
    {
      label: "Dividend Yield",
      value: fmtPct(stock.div_yeild),
      icon: Percent,
      raw: stock.div_yeild,
    },
    { label: "ROCE", value: fmtPct(stock.roce), icon: Gauge, raw: stock.roce },
    { label: "ROE", value: fmtPct(stock.roe), icon: Gauge, raw: stock.roe },
    {
      label: "EBITDA Margin",
      value: fmtPct(stock.ebidta_margin),
      icon: PieIcon,
      raw: stock.ebidta_margin,
    },
    {
      label: "Net Profit Margin",
      value: fmtPct(stock.net_profit_margin),
      icon: PieIcon,
      raw: stock.net_profit_margin,
    },
    { label: "Revenue", value: fmtCr(stock.revenue), icon: DollarSign },
    {
      label: "Revenue Growth (1Y)",
      value: fmtPct(stock.year_1_revenue_growth),
      icon: TrendingUp,
      raw: stock.year_1_revenue_growth,
    },
    {
      label: "QoQ Profit Growth",
      value: fmtPct(stock.yoy_last_qtrly_profit_growth),
      icon: TrendingUp,
      raw: stock.yoy_last_qtrly_profit_growth,
    },
    {
      label: "EPS Growth (1Y CAGR)",
      value: fmtPct(stock.year_1_cagr_eps_growth),
      icon: TrendingUp,
      raw: stock.year_1_cagr_eps_growth,
    },
    { label: "Free Cash Flow", value: fmtCr(stock.free_cash_flow), icon: Wallet },
    {
      label: "OCF Growth",
      value: fmtPct(stock.ocf_growth_on_yr),
      icon: Activity,
      raw: stock.ocf_growth_on_yr,
    },
  ];

  const perf = [
    { period: "1W", value: num(stock.price_perchng_1week) },
    { period: "2W", value: num(stock.price_perchng_2week) },
    { period: "1M", value: num(stock.price_perchng_1mon) },
    { period: "3M", value: num(stock.price_perchng_3mon) },
    { period: "1Y", value: num(stock.price_perchng_1year) },
    { period: "3Y", value: num(stock.price_perchng_3year) },
    { period: "5Y", value: num(stock.price_perchng_5year) },
  ].map((p) => ({ ...p, value: p.value ?? 0 }));

  const ltp = num(stock.ltp);
  const h1w = num(stock.high_1wk);
  const h1y = num(stock.high_1yr);
  const h3y = num(stock.high_3yr);
  const h5y = num(stock.high_5yr);

  const displayHigh1w = ltp != null && h1w != null && ltp > h1w ? ltp : stock.high_1wk;
  const displayHigh1y = ltp != null && h1y != null && ltp > h1y ? ltp : stock.high_1yr;
  const displayHigh3y = ltp != null && h3y != null && ltp > h3y ? ltp : stock.high_3yr;
  const displayHigh5y = ltp != null && h5y != null && ltp > h5y ? ltp : stock.high_5yr;

  const rawAway = num(stock.rt_away_from_5_year_high);
  const safeAway = ltp != null && h5y != null && ltp >= h5y ? 0 : rawAway;

  const highlights: Array<[string, string]> = [
    ["Open", fmtPrice(stock.open)],
    ["Prev Close", fmtPrice(stock.bc_close)],
    ["1-Week High", fmtPrice(displayHigh1w)],
    ["1-Year High", fmtPrice(displayHigh1y)],
    ["1-Year Low", fmtPrice(stock.low_1yr)],
    ["3-Year High", fmtPrice(displayHigh3y)],
    ["5-Year High", fmtPrice(displayHigh5y)],
    ["Away from 5Y High", fmtPct(safeAway)],
  ];

  const sma50 = num(stock.day_sma_50_current_candle);
  const sma200 = num(stock.day_sma_200_current_candle);
  const rsi = num(stock.day_rsi_14_current_candle);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 backdrop-blur-md bg-background/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Singest
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <section className="stagger flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {(stock.disp_sym as string) ?? (stock.sym as string)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{stock.sym as string}</span>
              {stock.exch != null && (
                <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs">
                  {stock.exch as string}
                </span>
              )}
              {stock.mcapclass != null && (
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium ${mcapBadge(
                    stock.mcapclass as string,
                  )}`}
                >
                  {stock.mcapclass as string}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold tabular-nums">{fmtPrice(stock.ltp)}</div>
            <div
              className={`mt-1 inline-flex items-center gap-1 text-sm font-medium ${trendColor}`}
            >
              <TrendIcon className="h-4 w-4" />
              {fmtN(stock.pchange)} ({fmtPct(stock.pperchange)})
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Last updated: {timeAgo(stock.fetched_at as string | null)}
            </div>
          </div>
        </section>

        {/* KPI Grid */}
        <section className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((k, i) => {
              const Icon = k.icon;
              const isPct = k.raw !== undefined;
              return (
                <div
                  key={k.label}
                  className="stagger glass-card group rounded-xl p-5"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      {k.label}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground/70" />
                  </div>
                  <div
                    className={`mt-3 text-2xl font-semibold tabular-nums ${
                      isPct ? pctCls(k.raw) : ""
                    }`}
                  >
                    {k.value}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Performance Chart */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">📈 Price Performance</h2>
          <div className="glass-card rounded-xl p-5">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perf} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />

                  <XAxis
                    dataKey="period"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                  />

                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickFormatter={(v) => `${v}%`}
                    width={45}
                  />

                  <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />

                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    itemStyle={{ color: "var(--foreground)" }}
                    labelStyle={{ color: "var(--muted-foreground)" }}
                    formatter={(v: number) => [`${v.toFixed(2)}%`, "Change"]}
                  />

                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                    animationDuration={900}
                  >
                    <LabelList
                      dataKey="value"
                      position="top"
                      fill="var(--foreground)"
                      fontSize={11}
                      formatter={(v: number) => `${v.toFixed(1)}%`}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Peer Comparison */}
        <PeerComparison isin={stock.isin as string} />

        {/* Price Highlights */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">🎯 Price Highlights</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map(([label, val], i) => (
              <div
                key={label}
                className="stagger glass-card rounded-xl p-4"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                <div className="mt-2 text-lg font-semibold tabular-nums">{val}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Technical Indicators */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">⚙️ Technical Indicators</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <RsiGauge value={rsi} />
            <SmaCard label="SMA 50" sma={sma50} ltp={ltp} />
            <SmaCard label="SMA 200" sma={sma200} ltp={ltp} />
            <IndicatorCard
              label="Bollinger Width"
              value={fmtN(stock.day_bb_upper_sub_bb_lower)}
              icon={Activity}
            />
            <IndicatorCard
              label="ATR (14) × 2"
              value={fmtN(stock.day_atr_14_current_candle_mul_2)}
              icon={LineChartIcon}
            />
          </div>
        </section>

        <CorporateActions isin={stock.isin as string} />

        {/* News */}
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Newspaper className="h-5 w-5" />
            Latest News for {(stock.disp_sym as string) ?? (stock.sym as string)}
          </h2>
          {news.length === 0 ? (
            <div className="glass rounded-xl p-6 text-sm text-muted-foreground">
              No recent news available for this stock.
            </div>
          ) : (
            <div className="grid gap-3">
              {news.map((n, i) => (
                <div
                  key={String(n.article_id)}
                  className="stagger glass-card rounded-xl p-4"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {n.overall_sentiment && (
                      <span
                        className={`rounded-md border px-2 py-0.5 capitalize ${sentimentColor(
                          n.overall_sentiment,
                        )}`}
                      >
                        {n.overall_sentiment}
                      </span>
                    )}
                    {n.category && (
                      <span className="rounded-md bg-muted/60 px-2 py-0.5 text-muted-foreground">
                        {n.category}
                      </span>
                    )}
                    <span className="text-muted-foreground">{timeAgo(n.publish_date)}</span>
                  </div>
                  <div className="mt-2 text-sm font-medium leading-snug">{n.title}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function IndicatorCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground/70" />
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SmaCard({ label, sma, ltp }: { label: string; sma: number | null; ltp: number | null }) {
  const above = sma != null && ltp != null && ltp > sma;
  const below = sma != null && ltp != null && ltp < sma;
  const tone = above ? "text-emerald-400" : below ? "text-rose-400" : "text-muted-foreground";
  const msg =
    sma == null || ltp == null ? "—" : above ? `Price above ${label}` : `Price below ${label}`;
  const Icon = above ? TrendingUp : TrendingDown;
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{fmtPrice(sma)}</div>
      <div className={`mt-1 text-xs font-medium ${tone}`}>{msg}</div>
    </div>
  );
}

function RsiGauge({ value }: { value: number | null }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  // Semicircle: 180deg -> 0deg corresponds to value 0 -> 100
  const angle = 180 - (v / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const cx = 80;
  const cy = 80;
  const r = 60;
  const x = Number((cx + r * Math.cos(rad)).toFixed(4));
  const y = Number((cy - r * Math.sin(rad)).toFixed(4));

  const zone = value == null ? "—" : v < 30 ? "Oversold" : v > 70 ? "Overbought" : "Neutral";
  const zoneColor =
    value == null
      ? "text-muted-foreground"
      : v < 30
        ? "text-emerald-400"
        : v > 70
          ? "text-rose-400"
          : "text-muted-foreground";

  // Arc paths for color zones
  const arc = (from: number, to: number) => {
    const a1 = ((180 - (from / 100) * 180) * Math.PI) / 180;
    const a2 = ((180 - (to / 100) * 180) * Math.PI) / 180;
    const x1 = (cx + r * Math.cos(a1)).toFixed(4);
    const y1 = (cy - r * Math.sin(a1)).toFixed(4);
    const x2 = (cx + r * Math.cos(a2)).toFixed(4);
    const y2 = (cy - r * Math.sin(a2)).toFixed(4);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">RSI (14)</span>
        <Gauge className="h-4 w-4 text-muted-foreground/70" />
      </div>
      <div className="mt-2 flex justify-center">
        <svg width="160" height="100" viewBox="0 0 160 100">
          <path
            d={arc(0, 30)}
            stroke="rgb(52,211,153)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          <path d={arc(30, 70)} stroke="rgba(148,163,184,0.4)" strokeWidth="10" fill="none" />
          <path
            d={arc(70, 100)}
            stroke="rgb(244,63,94)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          {value != null && (
            <>
              <line
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="var(--foreground)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx={cx} cy={cy} r="4" fill="var(--foreground)" />
            </>
          )}
        </svg>
      </div>
      <div className="text-center">
        <div className="text-2xl font-semibold tabular-nums">
          {value == null ? "—" : v.toFixed(1)}
        </div>
        <div className={`text-xs font-medium ${zoneColor}`}>{zone}</div>
      </div>
    </div>
  );
}
