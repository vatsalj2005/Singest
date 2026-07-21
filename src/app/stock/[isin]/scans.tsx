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
  const groups: Array<{
    category: string;
    items: Array<{
      label: string;
      value: string;
      icon: React.ComponentType<{ className?: string }>;
      raw?: unknown;
    }>;
  }> = [
    {
      category: "Valuation & Size",
      items: [
        { label: "Market Cap", value: fmtCr(stock.mcap), icon: Briefcase },
        { label: "P/E Ratio", value: fmtN(stock.pe), icon: BarChart3 },
        { label: "P/B Ratio", value: fmtN(stock.pb), icon: Layers },
        { label: "Industry P/E", value: fmtN(stock.ind_pe), icon: BarChart3 },
      ],
    },
    {
      category: "Profitability & Returns",
      items: [
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
      ],
    },
    {
      category: "Earnings & Growth",
      items: [
        { label: "EPS", value: fmtPrice(stock.eps), icon: Coins },
        {
          label: "Dividend Yield",
          value: fmtPct(stock.div_yeild),
          icon: Percent,
          raw: stock.div_yeild,
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
      ],
    },
    {
      category: "Revenue & Cash Flow",
      items: [
        { label: "Revenue", value: fmtCr(stock.revenue), icon: DollarSign },
        {
          label: "Revenue Growth (1Y)",
          value: fmtPct(stock.year_1_revenue_growth),
          icon: TrendingUp,
          raw: stock.year_1_revenue_growth,
        },
        { label: "Free Cash Flow", value: fmtCr(stock.free_cash_flow), icon: Wallet },
        {
          label: "OCF Growth",
          value: fmtPct(stock.ocf_growth_on_yr),
          icon: Activity,
          raw: stock.ocf_growth_on_yr,
        },
      ],
    },
  ];

  return (
    <section className="mt-10">
      <div className="glass rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8 backdrop-blur-md">
        <div className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Key Performance Indicators</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Consolidated fundamentals &amp; financial metrics overview
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-2 text-muted-foreground">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <div key={group.category} className="space-y-3">
              <h3 className="border-b border-border/30 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group.category}
              </h3>
              <div className="grid gap-2.5">
                {group.items.map((k) => {
                  const Icon = k.icon;
                  const isPct = k.raw !== undefined;
                  return (
                    <div
                      key={k.label}
                      className="flex min-h-[4.25rem] flex-col justify-between rounded-lg border border-border/40 bg-background/40 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        <span className="truncate text-xs font-medium text-muted-foreground">
                          {k.label}
                        </span>
                      </div>
                      <div className="mt-2 text-right">
                        <span
                          className={`text-base font-semibold tabular-nums ${
                            isPct ? pctCls(k.raw) : "text-foreground"
                          }`}
                        >
                          {k.value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
