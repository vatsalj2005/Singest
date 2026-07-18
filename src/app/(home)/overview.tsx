"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, LineChart as LineChartIcon } from "lucide-react";
import { fmtPrice, fmtPct } from "@/lib/format";
import type { StockSummary } from "@/lib/types";

export function Overview({
  totalStocks,
  topGainer,
  topLoser,
  loading,
}: {
  totalStocks: number;
  topGainer: StockSummary | null;
  topLoser: StockSummary | null;
  loading: boolean;
}) {
  return (
    <section className="mb-10 grid gap-4 sm:grid-cols-3">
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-white/[0.04]"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))
      ) : (
        <>
          <OverviewCard
            label="Stocks tracked"
            value={totalStocks?.toLocaleString("en-IN") ?? "—"}
            icon={<LineChartIcon className="h-4 w-4" />}
          />
          <MoverCard label="Top gainer" row={topGainer} positive />
          <MoverCard label="Top loser" row={topLoser} positive={false} />
        </>
      )}
    </section>
  );
}

function OverviewCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function MoverCard({
  label,
  row,
  positive,
}: {
  label: string;
  row: StockSummary | null;
  positive: boolean;
}) {
  const Color = positive ? "text-emerald-400" : "text-rose-400";
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <Icon className={`h-4 w-4 ${Color}`} />
      </div>
      {row ? (
        <Link href={`/stock/${row.isin}`} className="mt-2 block">
          <div className="text-lg font-semibold tracking-tight">{row.disp_sym || row.sym}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-base">{fmtPrice(row.ltp)}</span>
            <span className={`text-sm font-medium ${Color}`}>{fmtPct(row.pperchange)}</span>
          </div>
          {row.mcapclass && (
            <div className="mt-1 text-xs text-muted-foreground">{row.mcapclass}</div>
          )}
        </Link>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">…</div>
      )}
    </div>
  );
}
