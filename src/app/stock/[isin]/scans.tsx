"use client";

import {
  Briefcase,
  BarChart3,
  Layers,
  Coins,
  Percent,
  Gauge,
  PieChart as PieIcon,
  DollarSign,
  TrendingUp,
  Wallet,
  Activity,
} from "lucide-react";
import { fmtCr, fmtN, fmtPrice, fmtPct, pctCls } from "@/lib/format";

type Row = Record<string, string | number | null>;

export function Scans({ stock }: { stock: Row }) {
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

  return (
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
                className={`mt-3 text-2xl font-semibold tabular-nums ${isPct ? pctCls(k.raw) : ""}`}
              >
                {k.value}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
