"use client";

import { num, fmtPrice, fmtPct } from "@/lib/format";

type Row = Record<string, string | number | null>;

export function PriceHighlights({ stock }: { stock: Row }) {
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

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">🎯 Price Highlights</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map(([label, val], i) => (
          <div
            key={label}
            className="stagger glass-card rounded-xl p-4"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-2 text-lg font-semibold tabular-nums">{val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
