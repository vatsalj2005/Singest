"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  Newspaper,
  ArrowUpRight,
  ArrowDownRight,
  LineChart as LineChartIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fmtPct, fmtPrice, timeAgo } from "@/lib/format";
import type { StockSummary, NewsArticle } from "@/lib/types";

type Overview = {
  totalStocks: number;
  topGainer: StockSummary | null;
  topLoser: StockSummary | null;
  popular: StockSummary[];
};

export default function Dashboard() {
  const [overviewData, setOverviewData] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [newsDataState, setNewsDataState] = useState<{ news: NewsArticle[] } | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    function fetchOverview() {
      fetch("/api/market-overview", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (active) {
            setOverviewData(data);
            setOverviewLoading(false);
          }
        })
        .catch((err) => {
          console.error(err);
          if (active) {
            setOverviewLoading(false);
          }
        });
    }

    fetchOverview();
    const interval = setInterval(fetchOverview, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    function fetchNews() {
      fetch("/api/news?limit=20", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (active) {
            setNewsDataState(data);
            setNewsLoading(false);
          }
        })
        .catch((err) => {
          console.error(err);
          if (active) {
            setNewsLoading(false);
          }
        });
    }

    fetchNews();
    const interval = setInterval(fetchNews, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 80% -10%, oklch(0.35 0.12 155 / 0.35), transparent 60%), radial-gradient(50% 40% at 0% 0%, oklch(0.35 0.12 250 / 0.25), transparent 60%)",
        }}
      />

      <header className="border-b border-border/60 sticky top-0 z-30 backdrop-blur-md bg-background/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-lg font-semibold tracking-tight">Singest</span>
              <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                Indian Equity Markets
              </span>
            </Link>
            <Link
              href="/screener"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Screener
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-xs text-muted-foreground sm:block">Live • NSE / BSE</div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Screen every listed stock.
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Search across NSE & BSE, watch today's movers, and stay on top of the news that moves
            the market.
          </p>
          <div className="mt-6">
            <StockSearch />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground min-h-[2rem]">
            <span>Or explore:</span>
            {overviewLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-6 w-20 animate-pulse rounded-full bg-white/[0.04]"
                    style={{ animationDelay: `${i * 60}ms` }}
                  />
                ))
              : overviewData?.popular?.map((p, i) => (
                  <Link
                    key={p.isin}
                    href={`/stock/${p.isin}`}
                    className="stagger rounded-full border border-border bg-white/[0.03] px-3 py-1 text-xs text-foreground transition-all hover:border-primary/60 hover:bg-primary/10 hover:shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {p.disp_sym || p.sym}
                  </Link>
                ))}
          </div>
        </section>

        <section className="mb-10 grid gap-4 sm:grid-cols-3">
          {overviewLoading ? (
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
                value={overviewData?.totalStocks?.toLocaleString("en-IN") ?? "—"}
                icon={<LineChartIcon className="h-4 w-4" />}
              />
              <MoverCard label="Top gainer" row={overviewData?.topGainer ?? null} positive />
              <MoverCard label="Top loser" row={overviewData?.topLoser ?? null} positive={false} />
            </>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">Latest news</h2>
          </div>
          <div className="grid gap-3">
            {newsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-32 animate-pulse rounded-xl bg-white/[0.04]"
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))
              : newsDataState?.news.map((n) => <NewsCard key={n.article_id} item={n} />)}
            {newsDataState?.news && newsDataState.news.length === 0 && (
              <div className="text-sm text-muted-foreground">No news yet.</div>
            )}
          </div>
        </section>

        <footer className="mt-16 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          Singest · Data refreshed live from the markets. Not investment advice.
        </footer>
      </main>
    </div>
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

function NewsCard({ item }: { item: NewsArticle }) {
  const sentiment = (item.overall_sentiment ?? "").toLowerCase();
  const sentColor =
    sentiment === "positive"
      ? "text-emerald-400 bg-emerald-400/10"
      : sentiment === "negative"
        ? "text-rose-400 bg-rose-400/10"
        : "text-muted-foreground bg-muted/40";
  return (
    <article className="glass rounded-xl p-5 transition-colors hover:bg-card/80">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {item.category && (
          <span className="rounded-md bg-muted/60 px-2 py-0.5">{item.category}</span>
        )}
        {item.overall_sentiment && (
          <span className={`rounded-md px-2 py-0.5 capitalize ${sentColor}`}>
            {item.overall_sentiment}
          </span>
        )}
        <span>{timeAgo(item.publish_date)}</span>
        {item.display_symbol && item.isin_code && (
          <Link
            href={`/stock/${item.isin_code}`}
            className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
          >
            {item.display_symbol} <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <h3 className="mt-2 text-base font-medium leading-snug">{item.title}</h3>
      {item.text && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.text}</p>}
    </article>
  );
}

function StockSearch() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  const enabled = debounced.length >= 1;
  const [results, setResults] = useState<StockSummary[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (debounced.length < 1) {
      setResults([]);
      setIsFetching(false);
      return;
    }

    let active = true;
    setIsFetching(true);

    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setResults(data?.results ?? []);
          setIsFetching(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setResults([]);
          setIsFetching(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debounced]);

  return (
    <div className="relative">
      <div className="glass flex items-center gap-3 rounded-xl px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by symbol or company name (e.g. RELIANCE, TCS)"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {enabled && (
        <div className="glass slide-down absolute z-20 mt-2 w-full overflow-hidden rounded-xl">
          {isFetching && <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>}
          {!isFetching && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">No matches.</div>
          )}
          {results.map((r) => {
            const up = (r.pperchange ?? 0) >= 0;
            return (
              <Link
                key={r.isin}
                href={`/stock/${r.isin}`}
                className="flex items-center justify-between gap-3 border-t border-border/40 px-4 py-3 first:border-t-0 hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.disp_sym}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.sym} · {r.mcapclass ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{fmtPrice(r.ltp)}</div>
                  <div
                    className={`flex items-center justify-end gap-1 text-xs ${
                      up ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {up ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {fmtPct(r.pperchange)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
