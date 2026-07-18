"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { ThemeToggle } from "@/lib/ThemeToggle";
import type { StockSummary, NewsArticle } from "@/lib/types";

import { Search } from "./search";
import { Overview } from "./overview";
import { News } from "./news";

type OverviewData = {
  totalStocks: number;
  topGainer: StockSummary | null;
  topLoser: StockSummary | null;
  popular: StockSummary[];
};

export default function Dashboard() {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [newsDataState, setNewsDataState] = useState<{ news: NewsArticle[] } | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    function fetchOverview() {
      fetch("/api/home/customScans", { cache: "no-store" })
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
    const interval = setInterval(fetchOverview, 600_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    function fetchNews() {
      fetch("/api/home/liveNews?limit=20", { cache: "no-store" })
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
        className="bg-grain-fixed"
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
        </section>

        {/* Stock Search Input & Popular Ticker Tags */}
        <Search popular={overviewData?.popular ?? []} loading={overviewLoading} />

        {/* Market Overview Statistics Cards */}
        <Overview
          totalStocks={overviewData?.totalStocks ?? 0}
          topGainer={overviewData?.topGainer ?? null}
          topLoser={overviewData?.topLoser ?? null}
          loading={overviewLoading}
        />

        {/* Global Financial News Feed */}
        <News news={newsDataState?.news ?? null} loading={newsLoading} />

        <footer className="mt-16 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          Singest · Data refreshed live from the markets. Not investment advice.
        </footer>
      </main>
    </div>
  );
}
