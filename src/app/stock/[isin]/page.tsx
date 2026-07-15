import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { query } from "@/lib/db.server";
import { ThemeToggle } from "@/lib/ThemeToggle";
import { num, fmtPrice, fmtPct, fmtN, mcapBadge, timeAgo } from "@/lib/format";
import type { Metadata } from "next";

import { SectionErrorBoundary } from "./sectionErrorBoundary";
import { Scans } from "./scans";
import { PricePerformance } from "./pricePerformance";
import { PeerComparison } from "./peerComparison";
import { PriceHighlights } from "./priceHighlights";
import { TechnicalIndicators } from "./technicalIndicators";
import { CorporateActions } from "./corporateActions";
import { LatestNews } from "./latestNews";

type Row = Record<string, string | number | null>;

const getStockData = cache(async (isin: string) => {
  const rows = await query<Row>(`SELECT * FROM custom_scan WHERE isin = $1 LIMIT 1`, [isin]);
  return rows[0] || null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ isin: string }>;
}): Promise<Metadata> {
  const { isin } = await params;
  const stock = await getStockData(isin);
  if (!stock) {
    return {
      title: "Stock Not Found — Singest",
      description: "No stock matching this ISIN could be found.",
    };
  }
  const name = (stock.disp_sym as string) ?? (stock.sym as string) ?? "Stock";
  return {
    title: `${name} — Stock Analysis | Singest`,
    description: `Fundamentals, technicals, performance, and news for ${name}.`,
  };
}

export default async function StockPage({ params }: { params: Promise<{ isin: string }> }) {
  const { isin } = await params;
  const stock = await getStockData(isin);

  if (!stock) {
    notFound();
  }

  const pct = num(stock.pperchange);
  const up = (pct ?? 0) >= 0;
  const TrendIcon = up ? ArrowUpRight : ArrowDownRight;
  const trendColor = up ? "text-emerald-400" : "text-rose-400";

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

        {/* 16 KPI Scans Grid */}
        <SectionErrorBoundary sectionName="Key Metrics Scans">
          <Scans stock={stock} />
        </SectionErrorBoundary>

        {/* Price Performance Timeline */}
        <SectionErrorBoundary sectionName="Price Performance Chart">
          <PricePerformance stock={stock} />
        </SectionErrorBoundary>

        {/* Peer Comparison Grid */}
        <SectionErrorBoundary sectionName="Peer Comparison Table">
          <PeerComparison isin={stock.isin as string} />
        </SectionErrorBoundary>

        {/* 8 Price Highlights Cards */}
        <SectionErrorBoundary sectionName="Price Highlights">
          <PriceHighlights stock={stock} />
        </SectionErrorBoundary>

        {/* 5 Technical Indicators */}
        <SectionErrorBoundary sectionName="Technical Indicators">
          <TechnicalIndicators stock={stock} />
        </SectionErrorBoundary>

        {/* Corporate Actions Tabs */}
        <SectionErrorBoundary sectionName="Corporate Actions Timeline">
          <CorporateActions isin={stock.isin as string} />
        </SectionErrorBoundary>

        {/* Live News list */}
        <SectionErrorBoundary sectionName="Latest Headlines">
          <LatestNews stock={stock} isin={stock.isin as string} />
        </SectionErrorBoundary>
      </main>
    </div>
  );
}
